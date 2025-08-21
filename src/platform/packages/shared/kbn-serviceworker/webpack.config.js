/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-check
const path = require('path');
const { InjectManifest } = require('workbox-webpack-plugin');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');

const { SERVICEWORKER_FILENAME } = require('./src/constants');

/**
 * @type {import('webpack').Configuration}
 */
const serviceWorkerConfig = {
  // @ts-expect-error we are unable to type NODE_ENV
  mode: process.env.NODE_ENV || 'development',
  entry: path.resolve(__dirname, './index.ts'),
  output: {
    filename: '[name].js',
  },
  stats: 'errors-only',
  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules(?!\/@kbn\/)(\/[^\/]+\/)/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: process.env.NODE_ENV || 'development',
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
      {
        test: /.*\.wasm$/,
        exclude: /node_modules(?!\/@mlc-ai\/)(\/[^\/]+\/)/,
        type: 'javascript/auto', // ← !!
        loader: 'file-loader',
      },
    ],
  },
  target: 'webworker',
  plugins: [
    new NodeLibsBrowserPlugin(),
    new InjectManifest({
      swSrc: path.resolve(__dirname, 'src/worker', 'sw.ts'),
      swDest: SERVICEWORKER_FILENAME,
      mode: process.env.NODE_ENV || 'development',
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};

module.exports = serviceWorkerConfig;
