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

import { fromRoot, IS_KIBANA_DISTRIBUTABLE } from '../../utils';
import webpack from 'webpack';
import webpackMerge from 'webpack-merge';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';

function generateDLL(config) {
  const {
    dllAlias,
    dllNoParseRules,
    dllContext,
    dllEntry,
    dllOutputPath,
    dllPublicPath,
    dllBundleName,
    dllBundleFilename,
    dllStyleFilename,
    dllManifestPath
  } = config;

  const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');
  const BABEL_EXCLUDE_RE = [
    /[\/\\](webpackShims|node_modules|bower_components)[\/\\]/,
  ];

  return {
    entry: dllEntry,
    context: dllContext,
    output: {
      filename: dllBundleFilename,
      path: dllOutputPath,
      publicPath: dllPublicPath,
      library: dllBundleName
    },
    node: { fs: 'empty', child_process: 'empty', dns: 'empty', net: 'empty', tls: 'empty' },
    resolve: {
      extensions: ['.js', '.json'],
      mainFields: ['browser', 'browserify', 'main'],
      alias: dllAlias,
      modules: [
        'webpackShims',
        fromRoot('webpackShims'),

        'node_modules',
        fromRoot('node_modules'),
      ],
    },
    module: {
      rules: [
        {
          resource: [
            {
              test: /\.js$/,
              exclude: BABEL_EXCLUDE_RE.concat(dllNoParseRules),
            },
            {
              test: /\.js$/,
              include: /[\/\\]node_modules[\/\\]x-pack[\/\\]/,
              exclude: /[\/\\]node_modules[\/\\]x-pack[\/\\](.+?[\/\\])*node_modules[\/\\]/,
            }
          ],
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [
                BABEL_PRESET_PATH,
              ],
            },
          }
        },
        {
          test: /\.(html|tmpl)$/,
          loader: 'raw-loader'
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader'
          ],
        },
        {
          test: /\.png$/,
          loader: 'url-loader'
        },
        {
          test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
          loader: 'file-loader'
        },
      ],
      noParse: dllNoParseRules,
    },
    plugins: [
      new webpack.DllPlugin({
        context: dllContext,
        name: dllBundleName,
        path: dllManifestPath
      }),
      new MiniCssExtractPlugin({
        filename: dllStyleFilename
      }),
    ],
    performance: {
      // NOTE: we are disabling this as those hints
      // are more tailored for the final bundles result
      // and not for the webpack compilations performance itself
      hints: false
    }
  };
}

function extendRawConfig(rawConfig) {
  // Build all extended configs from raw config
  const dllAlias = rawConfig.alias;
  const dllNoParseRules = rawConfig.noParseRules;
  const dllContext = rawConfig.context;
  const dllEntry = {};
  const dllEntryName = rawConfig.entryName;
  const dllBundleName = rawConfig.dllName;
  const dllManifestName = rawConfig.dllName;
  const dllStyleName = rawConfig.styleName;
  const dllEntryExt = rawConfig.entryExt;
  const dllBundleExt = rawConfig.dllExt;
  const dllManifestExt = rawConfig.manifestExt;
  const dllStyleExt = rawConfig.styleExt;
  const dllOutputPath = rawConfig.outputPath;
  const dllPublicPath = rawConfig.publicPath;
  const dllBundleFilename = `${dllBundleName}${dllBundleExt}`;
  const dllManifestPath = `${dllOutputPath}/${dllManifestName}${dllManifestExt}`;
  const dllStyleFilename = `${dllStyleName}${dllStyleExt}`;

  // Create webpack entry object key with the provided dllEntryName
  dllEntry[dllEntryName] = [
    `${dllOutputPath}/${dllEntryName}${dllEntryExt}`
  ];

  // Export dll config map
  return {
    dllAlias,
    dllNoParseRules,
    dllContext,
    dllEntry,
    dllOutputPath,
    dllPublicPath,
    dllBundleName,
    dllBundleFilename,
    dllStyleFilename,
    dllManifestPath
  };
}

function common(rawConfig) {
  return webpackMerge(
    generateDLL(extendRawConfig(rawConfig))
  );
}

function optimized() {
  return webpackMerge(
    {
      mode: 'production',
      optimization: {
        minimize: true,
        minimizer: [
          new UglifyJsPlugin({
            parallel: true,
            sourceMap: false,
            uglifyOptions: {
              compress: {
                // The following is required for dead-code the removal
                // check in React DevTools
                //
                // default
                unused: true,
                dead_code: true,
                conditionals: true,
                evaluate: true,

                // changed
                keep_fnames: true,
                keep_infinity: true,
                comparisons: false,
                sequences: false,
                properties: false,
                drop_debugger: false,
                booleans: false,
                loops: false,
                toplevel: false,
                top_retain: false,
                hoist_funs: false,
                if_return: false,
                join_vars: false,
                collapse_vars: false,
                reduce_vars: false,
                warnings: false,
                negate_iife: false,
                side_effects: false
              },
              mangle: false
            }
          }),
        ]
      }
    }
  );
}

function unoptimized() {
  return webpackMerge(
    {
      mode: 'development'
    }
  );
}

export function configModel(rawConfig = {}) {
  if (IS_KIBANA_DISTRIBUTABLE) {
    return webpackMerge(common(rawConfig), optimized());
  }

  return webpackMerge(common(rawConfig), unoptimized());
}
