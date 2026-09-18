/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Configuration } from '@rspack/core';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { rspack } from '../rspack_runtime';
import { getSwcOptions } from './shared_config';
import { resolveSharedAssetPaths } from './shared_asset_paths';

export const MONACO_WORKERS_COMPILER = 'monaco-workers';

export function createMonacoWorkersConfig({
  repoRoot,
  outputRoot = repoRoot,
  dist = false,
}: {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
}): Configuration {
  const { monacoPackageRoot, monacoOutput } = resolveSharedAssetPaths(repoRoot, outputRoot);
  const swcOptions = getSwcOptions(dist);

  return {
    name: MONACO_WORKERS_COMPILER,
    context: monacoPackageRoot,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-source-map',
    target: 'web',
    entry: {
      default: 'monaco-editor/esm/vs/editor/editor.worker.js',
      json: 'monaco-editor/esm/vs/language/json/json.worker.js',
      xjson: Path.resolve(monacoPackageRoot, 'src/languages/xjson/worker/xjson.worker.ts'),
      painless: Path.resolve(monacoPackageRoot, 'src/languages/painless/worker/painless.worker.ts'),
      yaml: Path.resolve(monacoPackageRoot, 'src/languages/yaml/worker/yaml.worker.ts'),
      console: Path.resolve(monacoPackageRoot, 'src/languages/console/worker/console.worker.ts'),
    },
    output: {
      path: monacoOutput,
      filename: '[name].editor.worker.js',
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      alias: {
        'vscode-uri$': require
          .resolve('vscode-uri')
          .replace(/[\\/]umd[\\/]index\.js$/, '/esm/index.mjs'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(jsx?|tsx?)$/,
          exclude: /node_modules(?![\\/]@kbn[\\/])([\\/][^\\/]+[\\/])/,
          loader: 'builtin:swc-loader',
          options: swcOptions,
        },
        {
          test: /(monaco-editor\/esm\/vs\/language|monaco-yaml|vscode-uri)\/.*m?(t|j)sx?$/,
          loader: 'builtin:swc-loader',
          options: swcOptions,
        },
      ],
    },
    optimization: dist
      ? {
          minimize: true,
          minimizer: [
            new rspack.SwcJsMinimizerRspackPlugin({
              exclude: /monaco-editor[\\/]esm[\\/]vs[\\/]base[\\/]common[\\/]map\.js/,
              extractComments: false,
            }),
          ],
        }
      : {
          minimize: false,
        },
    performance: {
      hints: false,
    },
    cache: false,
    plugins: [new NodeLibsBrowserPlugin() as any],
    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}
