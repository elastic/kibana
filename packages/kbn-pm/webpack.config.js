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
