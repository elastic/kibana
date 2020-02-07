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
      // In order to make it work with Node 10 we had the need to upgrade
      // the package cpy to a version >= 7.0.0. In this version cpy is
      // using the new globby that relies in the fast-glob which relies
      // in the new micromatch. The micromatch (use and class-utils) dependencies having a require
      // that uses the lazy-cache which cannot be correctly extracted by webpack.
      // According to the documentation we should use the unlazy-loader to solve
      // this situation: https://github.com/jonschlinkert/lazy-cache#heads-up
      // We can also found some issues arround this who also used unlazy-loader
      // to solve this: https://github.com/micromatch/micromatch/issues/55
      {
        test: /node_modules\/(use|class-utils)\/utils\.js$/,
        use: {
          loader: 'unlazy-loader',
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
};
