/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const webpack = require('webpack');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const UiSharedDepsNpm = require('.');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');
const WEBPACK_SRC = require.resolve('webpack');

const REPO_ROOT = Path.resolve(__dirname, '..', '..', '..', '..', '..');

/** @returns {import('webpack').Configuration} */
module.exports = (_, argv) => {
  const outputPath = argv.outputPath ? Path.resolve(argv.outputPath) : UiSharedDepsNpm.distDir;

  return {
    externals: {
      module: 'module',
    },
    mode: process.env.NODE_ENV || 'development',
    entry: {
      'kbn-ui-shared-deps-npm': [
        // polyfill code
        'core-js/stable',
        'whatwg-fetch',
        'symbol-observable',
        // Parts of node-libs-browser that are used in many places across Kibana
        'buffer',
        'punycode',
        'util',

        /**
         * babel runtime helpers referenced from entry chunks
         * determined by running:
         *
         *  node scripts/build_kibana_platform_plugins --dist --profile
         *  node scripts/find_babel_runtime_helpers_in_use.js
         */
        '@babel/runtime/helpers/assertThisInitialized',
        '@babel/runtime/helpers/classPrivateFieldGet',
        '@babel/runtime/helpers/classPrivateFieldSet',
        '@babel/runtime/helpers/defineProperty',
        '@babel/runtime/helpers/extends',
        '@babel/runtime/helpers/inheritsLoose',
        '@babel/runtime/helpers/taggedTemplateLiteralLoose',
        '@babel/runtime/helpers/wrapNativeSuper',

        // modules from npm
        '@elastic/apm-rum-core',
        '@elastic/charts',
        '@elastic/eui',
        '@elastic/eui/optimize/es/components/provider/nested',
        '@elastic/eui/optimize/es/services/theme/warning',
        '@elastic/eui/dist/eui_theme_amsterdam_light.json',
        '@elastic/eui/dist/eui_theme_amsterdam_dark.json',
        '@elastic/eui/dist/eui_theme_borealis_light.json',
        '@elastic/eui/dist/eui_theme_borealis_dark.json',
        '@elastic/eui-theme-borealis',
        '@elastic/numeral',
        '@emotion/cache',
        '@emotion/react',
        '@hello-pangea/dnd/dist/dnd.js',
        '@reduxjs/toolkit',
        'redux',
        'react-redux',
        'immer',
        '@tanstack/react-query',
        '@tanstack/react-query-devtools',
        'classnames',
        'fflate',
        'fastest-levenshtein',
        'history',
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
        'react-router-dom-v5-compat',
        'react-router',
        'react',
        'reselect',
        'rxjs',
        'styled-components',
        'tslib',
        'uuid',
      ],
    },
    context: __dirname,
    devtool: 'cheap-source-map',
    target: 'web',
    output: {
      path: outputPath,
      filename: '[name].dll.js',
      chunkFilename: 'kbn-ui-shared-deps-npm.chunk.[id].js',
      devtoolModuleFilenameTemplate: (info) =>
        `kbn-ui-shared-deps-npm/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
      library: '__kbnSharedDeps_npm__',
    },

    module: {
      noParse: [MOMENT_SRC, WEBPACK_SRC],
      rules: [
        {
          include: [require.resolve('jquery')],
          use: [
            {
              loader: UiSharedDepsNpm.publicPathLoader,
              options: {
                key: 'kbn-ui-shared-deps-npm',
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },

    resolve: {
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
        moment: MOMENT_SRC,
        // NOTE: Used to include react profiling on bundles
        // https://gist.github.com/bvaughn/25e6233aeb1b4f0cdb8d8366e54a3977#webpack-4
        'react-dom$':
          process.env.REACT_18 === 'true' ? 'react-dom-18/profiling' : 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
        react: process.env.REACT_18 === 'true' ? 'react-18' : 'react',
      },
      extensions: ['.js', '.ts'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
    },

    optimization: {
      moduleIds: process.env.NODE_ENV === 'production' ? 'deterministic' : 'natural',
      chunkIds: process.env.NODE_ENV === 'production' ? 'deterministic' : 'natural',
      minimize: false,
      emitOnErrors: false,
    },

    performance: {
      // NOTE: we are disabling this as those hints
      // are more tailored for the final bundles result
      // and not for the webpack compilations performance itself
      hints: false,
    },

    plugins: [
      new NodeLibsBrowserPlugin(),
      new CleanWebpackPlugin({
        protectWebpackAssets: false,
        cleanAfterEveryBuildPatterns: [
          'kbn-ui-shared-deps-npm.v8.{dark,light}.{dll.js,dll.js.map}',
          'kbn-ui-shared-deps-npm.v8.{dark,light}-manifest.json',
        ],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new webpack.DllPlugin({
        context: REPO_ROOT,
        entryOnly: false,
        path: Path.resolve(outputPath, '[name]-manifest.json'),
        name: '__kbnSharedDeps_npm__',
      }),
    ],
  };
};
