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
import { SHARED_NPM_COMPILER } from './create_shared_npm_config';

export const SHARED_SRC_COMPILER = 'shared-src';

export function createSharedSrcConfig({
  repoRoot,
  outputRoot = repoRoot,
  dist = false,
}: {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
}): Configuration {
  const { srcPackageRoot, srcOutput, npmManifest } = resolveSharedAssetPaths(repoRoot, outputRoot);
  const momentSource = require.resolve('moment/min/moment-with-locales.js');
  const swcOptions = getSwcOptions(dist);

  return {
    name: SHARED_SRC_COMPILER,
    dependencies: [SHARED_NPM_COMPILER],
    context: srcPackageRoot,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-source-map',
    target: 'web',
    externals: {
      module: 'module',
    },
    entry: {
      'kbn-ui-shared-deps-src': [
        Path.resolve(srcPackageRoot, 'src/set_public_path.js'),
        Path.resolve(srcPackageRoot, 'src/entry.js'),
      ],
    },
    output: {
      path: srcOutput,
      filename: '[name].js',
      chunkFilename: 'kbn-ui-shared-deps-src.chunk.[id].js',
      sourceMapFilename: '[file].map',
      devtoolModuleFilenameTemplate: (info) =>
        `kbn-ui-shared-deps-src/${Path.relative(repoRoot, info.absoluteResourcePath)}`,
      library: '__kbnSharedDeps__',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.peggy$/,
          use: [require.resolve('@kbn/peggy-loader')],
        },
        {
          test: /\.text$/,
          use: [require.resolve('@kbn/dot-text-loader')],
        },
        {
          test: /\.css$/,
          use: [rspack.CssExtractRspackPlugin.loader, require.resolve('css-loader')],
        },
        {
          test: /\.(js|tsx?)$/,
          exclude: /[\/\\]node_modules[\/\\](?!@kbn)([^\/\\]+)[\/\\]/,
          loader: 'builtin:swc-loader',
          options: swcOptions,
        },
        {
          test: /(monaco-editor\/esm\/vs\/|monaco-languageserver-types|monaco-marker-data-provider|monaco-worker-manager).*(t|j)sx?$/,
          loader: 'builtin:swc-loader',
          options: swcOptions,
        },
        {
          test: /\.(ttf)(\?|$)/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8192,
            },
          },
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
        '@elastic/eui/lib/components/provider/nested$':
          '@elastic/eui/optimize/es/components/provider/nested',
        '@elastic/eui/lib/services/theme/warning$':
          '@elastic/eui/optimize/es/services/theme/warning',
        moment: momentSource,
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      },
    },
    optimization: {
      moduleIds: dist ? 'deterministic' : 'natural',
      chunkIds: dist ? 'deterministic' : 'natural',
      minimize: false,
      emitOnErrors: false,
    },
    performance: {
      hints: false,
    },
    cache: false,
    plugins: [
      new NodeLibsBrowserPlugin() as any,
      new rspack.CssExtractRspackPlugin({
        filename: '[name].css',
      }),
      new rspack.DllReferencePlugin({
        context: repoRoot,
        manifest: npmManifest,
      }),
      new rspack.NormalModuleReplacementPlugin(
        /(\.\.\/)*(\.\/)?dompurify[/\\]dompurify\.js$/,
        require.resolve('dompurify/purify.js')
      ),
    ],
    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}
