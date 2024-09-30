/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// setup ts/pkg support in this webpack process
require('@kbn/babel-register').install();

const Path = require('path');

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UiSharedDepsNpm = require('@kbn/ui-shared-deps-npm');

const { distDir: UiSharedDepsSrcDistDir } = require('./src/definitions');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

const REPO_ROOT = Path.resolve(__dirname, '..', '..');

if (process.env.REACT_18 === 'true') {
  console.warn('Building shared dependencies for and with React 18.');
}

module.exports = {
  node: {
    child_process: 'empty',
    fs: 'empty',
  },
  externals: {
    module: 'module',
  },
  mode: process.env.NODE_ENV || 'development',
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
        test: /\.peggy$/,
        use: [require.resolve('@kbn/peggy-loader')],
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
      {
        test: /\.(js|tsx?)$/,
        exclude: /[\/\\]node_modules[\/\\](?!@kbn)([^\/\\]+)[\/\\]/,
        loader: 'babel-loader',
        options: {
          babelrc: false,
          envName: process.env.NODE_ENV || 'development',
          presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
        },
      },
      {
        /**
         * further process the modules exported by both monaco-editor and monaco-yaml, because;
         * 1). they both use non-standard language APIs
         * 2). monaco-yaml exports it's src as is see, https://www.npmjs.com/package/monaco-yaml#does-it-work-without-a-bundler
         */
        test: /(monaco-editor\/esm\/vs\/|monaco-languageserver-types|monaco-marker-data-provider|monaco-worker-manager).*(t|j)sx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: process.env.NODE_ENV || 'development',
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            plugins: [require.resolve('@babel/plugin-transform-numeric-separator')],
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
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
      manifest: require(UiSharedDepsNpm.dllManifestPath), // eslint-disable-line import/no-dynamic-require
    }),
  ],
};
