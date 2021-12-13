"use strict";

import path from "path";
import glob from "glob";
import { sassPlugin } from "esbuild-sass-plugin";
import esbuild from "esbuild";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import cssnano from "cssnano";
import postcssNesting from "postcss-nesting";
import postcssPresetEnv from "postcss-preset-env";
import postcssFlexbugsFixes from "postcss-flexbugs-fixes";
import moment from "moment";

const minify = process.argv.includes("--minify");
const watch = process.argv.includes("--watch");
const debug = process.env.DEBUG || false;

const __dirname = path.resolve();
const prefixLog = "[CSS]";

function timestamp() {
  return moment().format("D MMM HH:mm:ss");
}

export async function compilationStarting(filename) {
  console.log(
    `🔵 [${timestamp()}] ${prefixLog} Compilating... ${
      filename ? filename : ""
    }`
  );
}

export async function compilationSuccess(filename) {
  console.log(
    `🟢 [${timestamp()}] ${prefixLog} Compilation ok ${
      filename ? filename : ""
    }`
  );
}

export async function compilationError(error) {
  console.log(
    `🔴 [${timestamp()}] ${prefixLog} Compilation failed. ↙️\n` + `(${error})`
  );
}

const paths = glob.sync(
  path.resolve(__dirname, `app/assets/stylesheets/*.scss`)
);

paths.forEach((entrypoint) => {
  const esbuildOptions = {
    entryPoints: [entrypoint],
    bundle: true,
    logLevel: debug ? "debug" : "error",
    outdir: path.resolve(__dirname, "app/assets/builds"),
    platform: "browser",
    watch: watch
      ? {
          onRebuild(error, result) {
            error ? compilationError(error) : compilationSuccess(entrypoint);
          },
        }
      : false,
    loader: {
      ".ttf": "file",
      ".otf": "file",
      ".svg": "file",
      ".eot": "file",
      ".woff": "file",
      ".woff2": "file",
      ".png": "file",
      ".jpg": "file",
      ".gif": "file",
    },
    plugins: [
      {
        name: "logger",
        setup(build) {
          build.onResolve(
            { filter: /app\/assets\/stylesheets.*scss/ },
            (args) => {
              console.log(`Compiling ${args.path}`);
            }
          );
        },
      },
      sassPlugin({
        includePaths: [
          path.resolve(__dirname, "node_modules"),
          path.resolve(__dirname, "node_modules/.pnpm/node_modules"),
        ],
        quietDeps: true,
        async transform(source, resolveDir) {
          const { css } = await postcss(
            [
              postcssNesting,
              autoprefixer,
              tailwindcss,
              minify ? cssnano({ safe: true }) : null,
              postcssFlexbugsFixes,
              postcssPresetEnv({ stage: 4 }),
            ].filter((plugin) => plugin)
          ).process(source, { from: undefined });
          return css;
        },
      }),
    ],
  };
  esbuild
    .build(esbuildOptions)
    .then((e) => {
      compilationSuccess(entrypoint);
    })
    .catch((e) => {
      compilationError(e.message);
      process.exit(1);
    });
});
