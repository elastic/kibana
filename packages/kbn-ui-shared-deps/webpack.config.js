/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { REPO_ROOT } = require('@kbn/utils');

const UiSharedDeps = require('./src/index');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');
const WEBPACK_SRC = require.resolve('webpack');

module.exports = {
  node: {
    child_process: 'empty',
    fs: 'empty',
  },
  externals: {
    module: 'module',
  },
  mode: 'production',
  entry: {
    'kbn-ui-shared-deps': './src/entry.js',
    'kbn-ui-shared-deps.v7.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
    'kbn-ui-shared-deps.v7.light': ['@elastic/eui/dist/eui_theme_light.css'],
    'kbn-ui-shared-deps.v8.dark': ['@elastic/eui/dist/eui_theme_amsterdam_dark.css'],
    'kbn-ui-shared-deps.v8.light': ['@elastic/eui/dist/eui_theme_amsterdam_light.css'],
  },
  context: __dirname,
  devtool: 'cheap-source-map',
  output: {
    path: UiSharedDeps.distDir,
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `kbn-ui-shared-deps/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    library: '__kbnSharedDeps__',
    futureEmitAssets: true,
  },

  module: {
    noParse: [MOMENT_SRC, WEBPACK_SRC],
    rules: [
      {
        include: [require.resolve('./src/entry.js')],
        use: [
          {
            loader: UiSharedDeps.publicPathLoader,
            options: {
              key: 'kbn-ui-shared-deps',
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        include: [require.resolve('./src/theme.ts')],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            },
          },
        ],
      },
      {
        test: /[\\\/]@elastic[\\\/]eui[\\\/].*\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                [
                  require.resolve('babel-plugin-transform-react-remove-prop-types'),
                  {
                    mode: 'remove',
                    removeImport: true,
                  },
                ],
              ],
            },
          },
        ],
      },
      {
        test: /\.(ttf)(\?|$)/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
    ],
  },

  resolve: {
    alias: {
      moment: MOMENT_SRC,
      // NOTE: Used to include react profiling on bundles
      // https://gist.github.com/bvaughn/25e6233aeb1b4f0cdb8d8366e54a3977#webpack-4
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    },
    extensions: ['.js', '.ts'],
    symlinks: false,
  },

  optimization: {
    minimize: false,
    noEmitOnErrors: true,
    splitChunks: {
      cacheGroups: {
        'kbn-ui-shared-deps.@elastic': {
          name: 'kbn-ui-shared-deps.@elastic',
          test: (m) => m.resource && m.resource.includes('@elastic'),
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },

  performance: {
    // NOTE: we are disabling this as those hints
    // are more tailored for the final bundles result
    // and not for the webpack compilations performance itself
    hints: false,
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
};
