/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    translation_resilience: path.resolve(__dirname, 'src', 'bootstrap.ts'),
  },
  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'target_translation_resilience'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.ts'],
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser', 'module', 'import', 'require', 'default'],
  },
  stats: 'errors-only',
  performance: {
    hints: false,
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: process.env.NODE_ENV || 'development',
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
    ],
  },
};
