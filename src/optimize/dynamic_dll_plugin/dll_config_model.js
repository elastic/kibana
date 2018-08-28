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

import { IS_KIBANA_DISTRIBUTABLE } from '../../utils';
import webpack from 'webpack';
import webpackMerge from 'webpack-merge';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

function generateDLL(config) {
  const {
    dllContext,
    dllEntry,
    dllOutputPath,
    dllPublicPath,
    dllBundleName,
    dllBundleFilename,
    dllStyleFilename,
    dllManifestPath
  } = config;

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
      mainFields: ['browser', 'browserify', 'main']
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
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
      ]
    },
    plugins: [
      new webpack.DllPlugin({
        context: dllContext,
        name: dllBundleName,
        path: dllManifestPath
      }),
      new MiniCssExtractPlugin({
        filename: dllStyleFilename
      })
    ]
  };
}

function extendRawConfig(rawConfig) {
  // Build all extended configs from raw config
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
  dllEntry[dllEntryName] = `${dllOutputPath}/${dllEntryName}${dllEntryExt}`;

  // Export dll config map
  return {
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
      mode: 'production'
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
