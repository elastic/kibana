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

const createLangWorkerConfig = (lang) => ({
  mode: 'production',
  entry: path.resolve(__dirname, 'src', lang, 'worker', `${lang}.worker.ts`),
  output: {
    path: path.resolve(__dirname, 'target/public'),
    filename: `${lang}.editor.worker.js`,
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.ts', '.tsx'],
  },
  stats: 'errors-only',
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
    ],
  },
});

module.exports = [createLangWorkerConfig('xjson')];
