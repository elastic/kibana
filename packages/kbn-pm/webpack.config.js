/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');

module.exports = {
  mode: 'none',
  entry: {
    index: './src/index.ts',
  },
  target: 'node',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },

  resolve: {
    extensions: ['.ts', '.js'],
    symlinks: false,
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      },
      // Removing an unnecessary require from
      // https://github.com/ForbesLindesay/spawn-sync/blob/8ba6d1bd032917ff5f0cf68508b91bb628d16336/index.js#L3
      //
      // This require would cause warnings when building with Webpack, and it's
      // only required for Node <= 0.12.
      {
        test: /spawn-sync\/index\.js$/,
        use: {
          loader: 'string-replace-loader',
          options: {
            search: ` || require('./lib/spawn-sync')`,
            replace: '',
            strict: true,
          },
        },
      },
    ],
  },

  node: {
    // Don't replace built-in globals
    __filename: false,
    __dirname: false,
  },

  externals: {
    worker_threads: {
      commonjs: 'worker_threads',
    },
  },

  watchOptions: {
    ignored: [/node_modules/, /vendor/],
  },

  optimization: {
    moduleIds: 'named',
    nodeEnv: 'production',
    usedExports: true,
    sideEffects: true,
    minimize: false,
  },
};
