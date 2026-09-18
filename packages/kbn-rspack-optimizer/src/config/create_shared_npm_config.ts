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
import { resolveSharedAssetPaths } from './shared_asset_paths';

export const SHARED_NPM_COMPILER = 'shared-npm';

export function createSharedNpmConfig({
  repoRoot,
  outputRoot = repoRoot,
  dist = false,
}: {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
}): Configuration {
  const { npmPackageRoot, npmOutput } = resolveSharedAssetPaths(repoRoot, outputRoot);
  const momentSource = require.resolve('moment/min/moment-with-locales.js');

  return {
    name: SHARED_NPM_COMPILER,
    context: npmPackageRoot,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-source-map',
    target: 'web',
    externals: {
      module: 'module',
    },
    entry: {
      'kbn-ui-shared-deps-npm': [
        Path.resolve(npmPackageRoot, 'src/set_public_path.js'),
        'core-js/stable',
        'symbol-observable',
        'buffer',
        'punycode',
        'util',
        'url',
        'qs',
        '@babel/runtime/helpers/assertThisInitialized',
        '@babel/runtime/helpers/classPrivateFieldGet',
        '@babel/runtime/helpers/classPrivateFieldSet',
        '@babel/runtime/helpers/defineProperty',
        '@babel/runtime/helpers/extends',
        '@babel/runtime/helpers/inheritsLoose',
        '@babel/runtime/helpers/taggedTemplateLiteralLoose',
        '@babel/runtime/helpers/wrapNativeSuper',
        '@elastic/apm-rum-core',
        '@elastic/charts',
        '@elastic/esql',
        '@elastic/esql/types',
        '@elastic/eui',
        '@elastic/eui/optimize/es/components/provider/nested',
        '@elastic/eui/optimize/es/services/theme/warning',
        '@elastic/eui-theme-borealis/lib/eui_theme_borealis_light.json',
        '@elastic/eui-theme-borealis/lib/eui_theme_borealis_dark.json',
        '@elastic/eui-theme-borealis',
        '@elastic/numeral',
        '@emotion/cache',
        '@emotion/react',
        '@emotion/react/jsx-runtime',
        '@emotion/react/jsx-dev-runtime',
        '@hello-pangea/dnd/dist/dnd.js',
        '@reduxjs/toolkit',
        'redux',
        'react-redux',
        'immer',
        'redux-toolkit-v1',
        'redux-v4',
        'react-redux-v7',
        'reselect-v4',
        '@tanstack/react-query',
        '@tanstack/react-query-devtools',
        'classnames',
        'fastest-levenshtein',
        'history',
        'fp-ts',
        'io-ts',
        'jquery',
        'lodash',
        'lodash/fp',
        'moment-timezone/moment-timezone',
        'moment-timezone/data/packed/latest.json',
        'moment',
        'react-dom',
        'react-dom/server',
        'react-router-dom',
        'react-router',
        'react',
        'reselect',
        'rxjs',
        'styled-components',
        'tslib',
        'uuid',
        'zod/v4',
      ],
    },
    output: {
      path: npmOutput,
      filename: '[name].dll.js',
      chunkFilename: 'kbn-ui-shared-deps-npm.chunk.[id].js',
      devtoolModuleFilenameTemplate: (info) =>
        `kbn-ui-shared-deps-npm/${Path.relative(repoRoot, info.absoluteResourcePath)}`,
      library: '__kbnSharedDeps_npm__',
      clean: true,
    },
    module: {
      noParse: [momentSource, require.resolve('webpack')],
      rules: [
        {
          test: /\.css$/,
          use: [rspack.CssExtractRspackPlugin.loader, require.resolve('css-loader')],
        },
      ],
    },
    resolve: {
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
        moment: momentSource,
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
        buffer: [
          Path.resolve(repoRoot, 'node_modules/node-stdlib-browser/node_modules/buffer'),
          require.resolve('buffer'),
        ],
        punycode: [
          Path.resolve(repoRoot, 'node_modules/node-stdlib-browser/node_modules/punycode'),
          require.resolve('punycode'),
        ],
      },
      extensions: ['.js', '.ts'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
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
    watchOptions: {
      ignored: /[\\/]node_modules[\\/](?!@elastic[\\/]eui)/,
    },
    cache: false,
    plugins: [
      new NodeLibsBrowserPlugin() as any,
      new rspack.CssExtractRspackPlugin({
        filename: '[name].css',
      }),
      new rspack.DllPlugin({
        context: repoRoot,
        entryOnly: false,
        path: Path.resolve(npmOutput, '[name]-manifest.json'),
        name: '__kbnSharedDeps_npm__',
      }),
      new rspack.BannerPlugin({
        banner: '/* Built with Rspack */',
        raw: true,
      }),
    ],
    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}
