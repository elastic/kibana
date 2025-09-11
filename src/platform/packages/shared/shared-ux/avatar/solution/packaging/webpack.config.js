/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/babel-register').install();
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');
const path = require('path');

const BABEL_PRESET = require.resolve('@kbn/babel-preset/webpack_preset');

/** @returns {import('webpack').Configuration} */
module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: require.resolve('../index.tsx'),
  context: __dirname,
  devtool: 'cheap-source-map',
  output: {
    libraryTarget: 'commonjs',
    path: path.resolve(__dirname, '../target'),
    filename: 'index.js',
  },
  devtool: 'source-map',
  plugins: [],
  externals: {
    '@emotion/react': 'commonjs @emotion/react',
    '@emotion/styled': 'commonjs @emotion/styled',
    '@elastic/eui': 'commonjs @elastic/eui',
    react: 'commonjs react',
  },
  module: {
    rules: [
      {
        test: /\.(woff|woff2|ttf|eot|svg|ico|png|jpg|gif|jpeg)(\?|$)/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192,
          },
        },
      },
      {
        test: /\.(js|tsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: 'development',
            presets: [BABEL_PRESET],
          },
        },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    alias: {},
    extensions: ['.js', '.ts', '.tsx'],
  },

  optimization: {
    minimize: false,
    noEmitOnErrors: true,
  },

  plugins: [new NodeLibsBrowserPlugin()],
};
