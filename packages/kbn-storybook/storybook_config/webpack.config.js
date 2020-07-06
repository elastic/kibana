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

const { parse, resolve } = require('path');
const webpack = require('webpack');
const { stringifyRequest } = require('loader-utils');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { REPO_ROOT, DLL_DIST_DIR } = require('../lib/constants');
// eslint-disable-next-line import/no-unresolved
const { currentConfig } = require('../../../built_assets/storybook/current.config');

// Extend the Storybook Webpack config with some customizations
module.exports = async ({ config }) => {
  // Find and alter the CSS rule to replace the Kibana public path string with a path
  // to the route we've added in middleware.js
  const cssRule = config.module.rules.find((rule) => rule.test.source.includes('.css$'));
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

  config.module.rules.push({
    test: /\.(html|md|txt|tmpl)$/,
    use: {
      loader: 'raw-loader',
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

  // Enable SASS
  config.module.rules.push({
    test: /\.scss$/,
    exclude: /\.module.(s(a|c)ss)$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader', options: { importLoaders: 2 } },
      {
        loader: 'postcss-loader',
        options: {
          config: {
            path: resolve(REPO_ROOT, 'src/optimize/'),
          },
        },
      },
      {
        loader: 'resolve-url-loader',
        options: {
          // If you don't have arguments (_, __) to the join function, the
          // resolve-url-loader fails with a loader misconfiguration error.
          //
          // eslint-disable-next-line no-unused-vars
          join: (_, __) => (uri, base) => {
            if (!base || !parse(base).dir.includes('legacy')) {
              return null;
            }

            // URIs on mixins in src/legacy/public/styles need to be resolved.
            if (uri.startsWith('ui/assets')) {
              return resolve(REPO_ROOT, 'src/core/server/core_app/', uri.replace('ui/', ''));
            }

            return null;
          },
        },
      },
      {
        loader: 'sass-loader',
        options: {
          prependData(loaderContext) {
            return `@import ${stringifyRequest(
              loaderContext,
              resolve(REPO_ROOT, 'src/legacy/ui/public/styles/_globals_v7light.scss')
            )};\n`;
          },
          sassOptions: {
            includePaths: [resolve(REPO_ROOT, 'node_modules')],
          },
        },
      },
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
    })
  );

  // Tell Webpack about the ts/x extensions
  config.resolve.extensions.push('.ts', '.tsx', '.scss');

  // Load custom Webpack config specified by a plugin.
  if (currentConfig.webpackHook) {
    // eslint-disable-next-line import/no-dynamic-require
    config = await require(currentConfig.webpackHook)({ config });
  }

  return config;
};
