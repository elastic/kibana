/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/babel-register').install();
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require('path');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');

const BABEL_PRESET = require.resolve('@kbn/babel-preset/webpack_preset');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: require.resolve('../index.ts'),
  context: __dirname,
  devtool: 'cheap-source-map',
  output: {
    libraryTarget: 'commonjs',
    path: path.resolve(__dirname, '../target'),
    filename: 'index.js',
  },
  devtool: 'source-map',
  externals: {
    '@elastic/eui': 'commonjs @elastic/eui',
    '@emotion/css': 'commonjs @emotion/css',
    '@emotion/react': 'commonjs @emotion/react',
    classnames: 'commonjs classnames',
    'react-use/lib/useObservable': 'commonjs react-use/lib/useObservable',
    rxjs: 'commonjs rxjs',
    react: 'commonjs react',
    '@kbn/i18n': 'commonjs @kbn/i18n',
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

  plugins: [new NodeLibsBrowserPlugin(), new CleanWebpackPlugin()],
};
