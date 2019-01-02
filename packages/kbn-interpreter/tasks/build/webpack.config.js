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

const { resolve } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { createServerCodeTransformer } = require('./server_code_transformer');

const {
  PLUGIN_SOURCE_DIR,
  PLUGIN_BUILD_DIR,
  BABEL_PRESET_PATH,
} = require('./paths');

module.exports = function ({ sourceMaps }, { watch }) {
  return {
    devtool: sourceMaps ? 'inline-cheap-module-source-map' : undefined,

    mode: 'none',
    entry: {
      'types/all': resolve(PLUGIN_SOURCE_DIR, 'types/register.js'),
      'functions/browser/all': resolve(PLUGIN_SOURCE_DIR, 'functions/browser/register.js'),
      'functions/browser/common': resolve(PLUGIN_SOURCE_DIR, 'functions/common/register.js'),
    },

    // there were problems with the node and web targets since this code is actually
    // targetting both the browser and node.js. If there was a hybrid target we'd use
    // it, but this seems to work either way.
    target: 'webworker',

    output: {
      path: PLUGIN_BUILD_DIR,
      filename: '[name].js', // Need long paths here.
      libraryTarget: 'umd',
      // Note: this is needed due to a not yet resolved bug on
      // webpack 4 with umd modules generation.
      // For now we have 2 quick workarounds: one is what is implemented
      // below another is to change the libraryTarget to commonjs
      //
      // The issues can be followed on:
      // https://github.com/webpack/webpack/issues/6642
      // https://github.com/webpack/webpack/issues/6525
      // https://github.com/webpack/webpack/issues/6677
      globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },

    resolve: {
      extensions: ['.js', '.json'],
      mainFields: ['browser', 'main'],
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          include: PLUGIN_SOURCE_DIR,
          loaders: 'babel-loader',
          options: {
            babelrc: false,
            presets: [BABEL_PRESET_PATH],
          },
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

    stats: 'errors-only',

    plugins: [
      new CopyWebpackPlugin([
        {
          from: resolve(PLUGIN_SOURCE_DIR, 'functions/common'),
          to: resolve(PLUGIN_BUILD_DIR, 'functions/common'),
          ignore: '**/__tests__/**',
          transform: createServerCodeTransformer(sourceMaps)
        },
      ]),

      function LoaderFailHandlerPlugin() {
        if (!watch) {
          return;
        }

        let lastBuildFailed = false;

        // bails on error, including loader errors
        // see https://github.com/webpack/webpack/issues/708, which does not fix loader errors
        this.hooks.done.tapPromise('LoaderFailHandlerPlugin', async stats => {
          if (stats.hasErrors() || stats.hasWarnings()) {
            lastBuildFailed = true;
            return;
          }

          if (lastBuildFailed) {
            lastBuildFailed = false;
            console.log('✅ Webpack error resolved');
          }
        });
      },
    ]
  };
};
