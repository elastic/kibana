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

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { DLL_NAME, REPO_ROOT, DLL_DIST_DIR } = require('./constants');

// This is the Webpack config for the DLL of CSS and JS assets that are
// not expected to change during development.  This saves compile and run
// times considerably.
module.exports = {
  context: REPO_ROOT,
  mode: 'development',

  // This is a (potentially growing) list of modules that can be safely
  // included in the DLL.  Only add to this list modules or other code
  // which Storybook stories and their components would require, but don't
  // change during development.
  entry: [
    '@elastic/eui/dist/eui_theme_light.css',
    '@kbn/ui-framework/dist/kui_light.css',
    '@storybook/addon-info',
    '@storybook/addon-knobs',
    '@storybook/addon-knobs/react',
    '@storybook/addon-knobs/register',
    '@storybook/addon-options',
    '@storybook/addon-options/register',
    '@storybook/core',
    '@storybook/core/dist/server/common/polyfills.js',
    '@storybook/react',
    '@storybook/theming',
    'angular-mocks',
    'angular',
    'brace',
    'chroma-js',
    'highlight.js',
    'html-entities',
    'jquery',
    'lodash',
    'markdown-it',
    'mocha',
    'prop-types',
    'react-ace',
    'react-beautiful-dnd',
    'react-dom',
    'react-focus-lock',
    'react-markdown',
    'react-resize-detector',
    'react-virtualized',
    'react',
    'recompose',
    'redux-actions',
    'remark-parse',
    'rxjs',
    'sinon',
    'tinycolor2',
    './src/legacy/ui/public/styles/bootstrap/bootstrap_light.less',
  ],
  plugins: [
    // Produce the DLL and its manifest
    new webpack.DllPlugin({
      name: DLL_NAME,
      path: path.resolve(DLL_DIST_DIR, 'manifest.json'),
    }),
    // Produce the DLL CSS file
    new MiniCssExtractPlugin({
      filename: 'dll.css',
    }),
  ],
  // Output the DLL JS file
  output: {
    path: DLL_DIST_DIR,
    filename: 'dll.js',
    library: DLL_NAME,
  },
  // Include a require alias for legacy UI code and styles
  resolve: {
    alias: {
      ui: path.resolve(REPO_ROOT, 'src/legacy/ui/public'),
    },
    mainFields: ['browser', 'main'],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {},
          },
          { loader: 'css-loader' },
          {
            loader: 'string-replace-loader',
            options: {
              search: '__REPLACE_WITH_PUBLIC_PATH__',
              replace: '/',
              flags: 'g',
            },
          },
        ],
      },
      {
        test: /\.less$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader', options: { importLoaders: 2 } },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: path.resolve(REPO_ROOT, 'src/optimize/postcss.config.js'),
              },
            },
          },
          { loader: 'less-loader' },
        ],
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
        loader: 'file-loader',
      },
    ],
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
  },
};
