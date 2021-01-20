/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const Path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { REPO_ROOT } = require('@kbn/utils');
const webpack = require('webpack');

const UiSharedDeps = require('./index');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

exports.getWebpackConfig = ({ dev = false } = {}) => ({
  mode: dev ? 'development' : 'production',
  entry: {
    'kbn-ui-shared-deps': './entry.js',
    'kbn-ui-shared-deps.v7.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
    'kbn-ui-shared-deps.v7.light': ['@elastic/eui/dist/eui_theme_light.css'],
    'kbn-ui-shared-deps.v8.dark': ['@elastic/eui/dist/eui_theme_amsterdam_dark.css'],
    'kbn-ui-shared-deps.v8.light': ['@elastic/eui/dist/eui_theme_amsterdam_light.css'],
  },
  context: __dirname,
  devtool: dev ? '#cheap-source-map' : false,
  output: {
    path: UiSharedDeps.distDir,
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `kbn-ui-shared-deps/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    library: '__kbnSharedDeps__',
  },

  module: {
    noParse: [MOMENT_SRC],
    rules: [
      {
        include: [require.resolve('./entry.js')],
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
        include: [require.resolve('./theme.ts')],
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
        test: !dev ? /[\\\/]@elastic[\\\/]eui[\\\/].*\.js$/ : () => false,
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
    ],
  },

  resolve: {
    alias: {
      moment: MOMENT_SRC,
    },
    extensions: ['.js', '.ts'],
  },

  optimization: {
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
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': dev ? '"development"' : '"production"',
    }),
    ...(dev
      ? []
      : [
          new CompressionPlugin({
            algorithm: 'brotliCompress',
            filename: '[path].br',
            test: /\.(js|css)$/,
            cache: false,
          }),
          new CompressionPlugin({
            algorithm: 'gzip',
            filename: '[path].gz',
            test: /\.(js|css)$/,
            cache: false,
          }),
        ]),
  ],
});
