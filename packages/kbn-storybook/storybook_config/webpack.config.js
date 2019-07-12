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
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { REPO_ROOT, DLL_DIST_DIR } = require('../lib/constants');
const { currentConfig } = require('../../../built_assets/storybook/current.config');

// Extend the Storybook Webpack config with some customizations
module.exports = async ({ config }) => {
  // Find and alter the CSS rule to replace the Kibana public path string with a path
  // to the route we've added in middleware.js
  const cssRule = config.module.rules.find(rule => rule.test.source.includes('.css$'));
  cssRule.use.push({
    loader: 'string-replace-loader',
    options: {
      search: '__REPLACE_WITH_PUBLIC_PATH__',
      replace: '/',
      flags: 'g',
    },
  });

  // Include the React preset from Kibana for Storybook JS files.
  config.module.rules.push({
    test: /\.js$/,
    exclude: /node_modules/,
    loaders: 'babel-loader',
    options: {
      presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
    },
  });

  // Handle Typescript files
  config.module.rules.push({
    test: /\.tsx?$/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
        },
      },
    ],
  });

  // Parse props data for .tsx files
  config.module.rules.push({
    test: /\.tsx$/,
    // Exclude example files, as we don't display props info for them
    exclude: /\.examples.tsx$/,
    use: [
      // Parse TS comments to create Props tables in the UI
      require.resolve('react-docgen-typescript-loader'),
    ],
  });

  // Reference the built DLL file of static(ish) dependencies, which are removed
  // during kbn:bootstrap and rebuilt if missing.
  config.plugins.push(
    new webpack.DllReferencePlugin({
      manifest: resolve(DLL_DIST_DIR, 'manifest.json'),
      context: REPO_ROOT,
    })
  );

  // Copy the DLL files to the Webpack build for use in the Storybook UI
  config.plugins.push(
    new CopyWebpackPlugin([
      {
        from: resolve(DLL_DIST_DIR, 'dll.js'),
        to: 'dll.js',
      },
      {
        from: resolve(DLL_DIST_DIR, 'dll.css'),
        to: 'dll.css',
      },
    ])
  );

  // Tell Webpack about the ts/x extensions
  config.resolve.extensions.push('.ts', '.tsx');

  // Load custom Webpack config specified by a plugin.
  if (currentConfig.webpackHook) {
    // eslint-disable-next-line import/no-dynamic-require
    config = await require(currentConfig.webpackHook)({ config });
  }

  return config;
};
