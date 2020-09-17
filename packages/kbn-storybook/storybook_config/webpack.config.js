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
const webpackMerge = require('webpack-merge');
const { stringifyRequest } = require('loader-utils');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { REPO_ROOT } = require('@kbn/utils');
const { DLL_DIST_DIR } = require('../lib/constants');
// eslint-disable-next-line import/no-unresolved
const { currentConfig } = require('../../../built_assets/storybook/current.config');

// Extend the Storybook Webpack config with some customizations
module.exports = async ({ config: storybookConfig }) => {
  let config = {
    module: {
      rules: [
        // Include the React preset from Kibana for JS(X) and TS(X)
        {
          test: /\.(j|t)sx?$/,
          exclude: /node_modules/,
          loaders: 'babel-loader',
          options: {
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
        {
          test: /\.(html|md|txt|tmpl)$/,
          use: {
            loader: 'raw-loader',
          },
        },
        // Parse props data for .tsx files
        // This is notoriously slow, and is making Storybook unusable.  Disabling for now.
        // See: https://github.com/storybookjs/storybook/issues/7998
        //
        // {
        //   test: /\.tsx$/,
        //   // Exclude example files, as we don't display props info for them
        //   exclude: /\.stories.tsx$/,
        //   use: [
        //     // Parse TS comments to create Props tables in the UI
        //     require.resolve('react-docgen-typescript-loader'),
        //   ],
        // },
        {
          test: /\.scss$/,
          exclude: /\.module.(s(a|c)ss)$/,
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader', options: { importLoaders: 2 } },
            {
              loader: 'postcss-loader',
              options: {
                config: {
                  path: require.resolve('@kbn/optimizer/postcss.config.js'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                prependData(loaderContext) {
                  return `@import ${stringifyRequest(
                    loaderContext,
                    resolve(REPO_ROOT, 'src/core/public/core_app/styles/_globals_v7light.scss')
                  )};\n`;
                },
                sassOptions: {
                  includePaths: [resolve(REPO_ROOT, 'node_modules')],
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [
      // Reference the built DLL file of static(ish) dependencies, which are removed
      // during kbn:bootstrap and rebuilt if missing.
      new webpack.DllReferencePlugin({
        manifest: resolve(DLL_DIST_DIR, 'manifest.json'),
        context: REPO_ROOT,
      }),
      // Copy the DLL files to the Webpack build for use in the Storybook UI

      new CopyWebpackPlugin({
        patterns: [
          {
            from: resolve(DLL_DIST_DIR, 'dll.js'),
            to: 'dll.js',
          },
          {
            from: resolve(DLL_DIST_DIR, 'dll.css'),
            to: 'dll.css',
          },
        ],
      }),
    ],
    resolve: {
      // Tell Webpack about the ts/x extensions
      extensions: ['.ts', '.tsx', '.scss'],
      alias: {
        core_app_image_assets: resolve(REPO_ROOT, 'src/core/public/core_app/images'),
      },
    },
  };

  // Find and alter the CSS rule to replace the Kibana public path string with a path
  // to the route we've added in middleware.js
  const cssRule = storybookConfig.module.rules.find((rule) => rule.test.source.includes('.css$'));
  cssRule.use.push({
    loader: 'string-replace-loader',
    options: {
      search: '__REPLACE_WITH_PUBLIC_PATH__',
      replace: '/',
      flags: 'g',
    },
  });

  config = webpackMerge(storybookConfig, config);

  // Load custom Webpack config specified by a plugin.
  if (currentConfig.webpackHook) {
    // eslint-disable-next-line import/no-dynamic-require
    return await require(currentConfig.webpackHook)({ config });
  }

  return config;
};
