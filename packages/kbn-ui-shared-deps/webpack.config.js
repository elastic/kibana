/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const Path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { REPO_ROOT } = require('@kbn/dev-utils');
const webpack = require('webpack');

const UiSharedDeps = require('./index');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

exports.getWebpackConfig = ({ dev = false } = {}) => ({
  mode: dev ? 'development' : 'production',
  entry: {
    'kbn-ui-shared-deps': './entry.js',
    'kbn-ui-shared-deps.v7.dark': [
      '@elastic/eui/dist/eui_theme_dark.css',
      '@elastic/charts/dist/theme_only_dark.css',
    ],
    'kbn-ui-shared-deps.v7.light': [
      '@elastic/eui/dist/eui_theme_light.css',
      '@elastic/charts/dist/theme_only_light.css',
    ],
    'kbn-ui-shared-deps.v8.dark': [
      '@elastic/eui/dist/eui_theme_amsterdam_dark.css',
      '@elastic/charts/dist/theme_only_dark.css',
    ],
    'kbn-ui-shared-deps.v8.light': [
      '@elastic/eui/dist/eui_theme_amsterdam_light.css',
      '@elastic/charts/dist/theme_only_light.css',
    ],
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
