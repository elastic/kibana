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
const { REPO_ROOT } = require('@kbn/dev-utils');
const webpack = require('webpack');

const SharedDeps = require('./index');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

exports.getWebpackConfig = ({ dev = false } = {}) => ({
  mode: dev ? 'development' : 'production',
  entry: {
    [SharedDeps.distFilename.replace(/\.js$/, '')]: './entry.js',
    [SharedDeps.darkCssDistFilename.replace(/\.css$/, '')]: [
      '@elastic/eui/dist/eui_theme_dark.css',
      '@elastic/charts/dist/theme_only_dark.css',
    ],
    [SharedDeps.lightCssDistFilename.replace(/\.css$/, '')]: [
      '@elastic/eui/dist/eui_theme_light.css',
      '@elastic/charts/dist/theme_only_light.css',
    ],
  },
  context: __dirname,
  devtool: dev ? '#cheap-source-map' : false,
  output: {
    path: SharedDeps.distDir,
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    publicPath: '__REPLACE_WITH_PUBLIC_PATH__',
    devtoolModuleFilenameTemplate: info =>
      `kbn-ui-shared-deps/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    library: '__kbnSharedDeps__',
  },

  module: {
    noParse: [MOMENT_SRC],
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },

  resolve: {
    alias: {
      moment: MOMENT_SRC,
    },
  },

  optimization: {
    noEmitOnErrors: true,
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
  ],
});
