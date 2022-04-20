/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UiSharedDepsNpm = require('@kbn/ui-shared-deps-npm');

const { distDir: UiSharedDepsSrcDistDir } = require('./src/definitions');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

const REPO_ROOT = Path.resolve(__dirname, '..', '..');

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
    'kbn-ui-shared-deps-src': './src/entry.js',
  },
  context: __dirname,
  devtool: 'cheap-source-map',
  output: {
    path: UiSharedDepsSrcDistDir,
    filename: '[name].js',
    chunkFilename: 'kbn-ui-shared-deps-src.chunk.[id].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `kbn-ui-shared-deps-src/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    library: '__kbnSharedDeps__',
    futureEmitAssets: true,
  },

  module: {
    rules: [
      {
        include: [require.resolve('./src/entry.js')],
        use: [
          {
            loader: UiSharedDepsNpm.publicPathLoader,
            options: {
              key: 'kbn-ui-shared-deps-src',
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
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
    extensions: ['.js', '.ts'],
    symlinks: false,
    alias: {
      '@elastic/eui$': '@elastic/eui/optimize/es',
      moment: MOMENT_SRC,
      // NOTE: Used to include react profiling on bundles
      // https://gist.github.com/bvaughn/25e6233aeb1b4f0cdb8d8366e54a3977#webpack-4
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    },
  },

  optimization: {
    minimize: false,
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

    new webpack.DllReferencePlugin({
      context: REPO_ROOT,
      manifest: require(UiSharedDepsNpm.dllManifestPath), // eslint-disable-line
    }),
  ],
};
