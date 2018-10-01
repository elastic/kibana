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

const sourceDir = path.resolve(__dirname, '../plugin_src');
const buildDir = path.resolve(__dirname, '../plugin');

module.exports = {
  entry: {
    'types/all': path.join(sourceDir, 'types/register.js'),
    'functions/browser/all': path.join(sourceDir, 'functions/browser/register.js'),
    'functions/common/all': path.join(sourceDir, 'functions/common/register.js'),
    'functions/server/all': path.join(sourceDir, 'functions/server/register.js'),
  },
  target: 'webworker',

  output: {
    path: buildDir,
    filename: '[name].js', // Need long paths here.
    libraryTarget: 'umd',
  },

  resolve: {
    extensions: ['.js', '.json'],
  },

  plugins: [
    function loaderFailHandler() {
      // bails on error, including loader errors
      // see https://github.com/webpack/webpack/issues/708, which does not fix loader errors
      let isWatch = true;

      this.plugin('run', function (compiler, callback) {
        isWatch = false;
        callback.call(compiler);
      });

      this.plugin('done', function (stats) {
        if (stats.compilation.errors && stats.compilation.errors.length) {
          if (isWatch) console.error(stats.compilation.errors[0]);
          else throw stats.compilation.errors[0];
        }
      });
    },
  ],

  module: {
    rules: [
      // There's some React 15 propTypes funny business in EUI, this strips out propTypes and fixes it
      {
        test: /(@elastic\/eui|moment)\/.*\.js$/,
        loaders: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            'react',
            [
              'env',
              {
                targets: {
                  node: 'current',
                },
              },
            ],
          ],
          plugins: [
            'transform-react-remove-prop-types', // specifically this, strips out propTypes
            'pegjs-inline-precompile',
            'transform-object-rest-spread',
            'transform-async-to-generator',
            'transform-class-properties',
            [
              'inline-react-svg',
              {
                ignorePattern: 'images/*',
                svgo: {
                  plugins: [{ cleanupIDs: false }, { removeViewBox: false }],
                },
              },
            ],
          ],
        },
      },
      {
        test: /\.js$/,
        loaders: 'babel-loader',
        options: {
          plugins: [
            'transform-object-rest-spread',
            'transform-async-to-generator',
            'transform-class-properties',
          ],
          presets: [
            'react',
            [
              'env',
              {
                targets: {
                  node: 'current',
                },
              },
            ],
          ],
        },
        exclude: [/node_modules/],
      },
      {
        test: /\.(png|jpg|gif|jpeg|svg)$/,
        loaders: ['url-loader'],
      },
      {
        test: /\.(css|scss)$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },

  node: {
    // Don't replace built-in globals
    __filename: false,
    __dirname: false,
  },

  watchOptions: {
    ignored: [/node_modules/],
  },
};
