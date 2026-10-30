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
import { MONACO_WORKER_ENTRIES } from '@kbn/monaco/server';
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
    entry: Object.fromEntries(
      Object.entries(MONACO_WORKER_ENTRIES).map(([workerId, entry]) => [
        workerId,
        resolveMonacoWorkerEntry(monacoPackageRoot, entry),
      ])
    ),
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
          test: /(monaco-worker-manager|monaco-yaml)\/.*m?(t|j)sx?$/,
          resolve: {
            alias: {
              // monaco-editor 0.56 remaps subpaths via "exports"; these deps still import
              // the old monaco-editor/esm/vs/... specifiers.
              'monaco-editor/esm/vs': Path.resolve(
                require.resolve('monaco-editor/editor/editor.api.js'),
                '..',
                '..'
              ),
            },
          },
        },
        {
          test: /(monaco-editor\/language|monaco-yaml|vscode-uri)\/.*m?(t|j)sx?$/,
          loader: 'builtin:swc-loader',
          options: swcOptions,
        },
      ],
    },
    optimization: dist
      ? {
          minimize: true,
          minimizer: [new rspack.SwcJsMinimizerRspackPlugin({ extractComments: false })],
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

function resolveMonacoWorkerEntry(monacoPackageRoot: string, entry: string): string {
  return entry.startsWith('src/') ? Path.resolve(monacoPackageRoot, entry) : entry;
}
