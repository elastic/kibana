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

import webpack from 'webpack';
import webpackMerge from 'webpack-merge';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { IS_KIBANA_DISTRIBUTABLE, fromRoot } from '../../utils';
import { PUBLIC_PATH_PLACEHOLDER } from '../public_path_placeholder';

function generateDLL(dllConfig) {
  const dllContext = dllConfig.context;
  const dllEntryName = dllConfig.entryName;
  const dllName = dllConfig.dllName;
  const dllManifestName = dllConfig.dllName;
  const dllStyleName = dllConfig.styleName;
  const dllOutputPath = dllConfig.outputPath;
  const dllPublicPath = dllConfig.publicPath;
  const dllEntry = {};

  // Create webpack entry object key with the provided dllEntryName
  dllEntry[dllEntryName] = `${dllOutputPath}/${dllEntryName}.entry.dll.js`;

  const dllFilename = `${dllName}.bundle.dll.js`;
  const dllManifestPath = `${dllOutputPath}/${dllManifestName}.manifest.dll.json`;
  const dllStyleFilename = `${dllStyleName}.style.dll.css`;


  return {
    entry: dllEntry,
    dllContext,
    output: {
      filename: dllFilename,
      path: dllOutputPath,
      publicPath: dllPublicPath,
      library: dllName
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
        name: dllName,
        path: dllManifestPath
      }),
      new MiniCssExtractPlugin({
        filename: dllStyleFilename
      })
    ]
  };
}

function common(dllConfig) {
  return webpackMerge(
    generateDLL(dllConfig)
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

function getDllConfig(outputPath) {
  return {
    context: fromRoot('.'),
    entryName: 'vendors',
    dllName: '[name]',
    manifestName: '[name]',
    styleName: '[name]',
    path: outputPath,
    publicPath: PUBLIC_PATH_PLACEHOLDER
  };
}

export default (outputPath) => {
  const dllConfig = getDllConfig(outputPath);

  if (IS_KIBANA_DISTRIBUTABLE) {
    return webpackMerge(common(dllConfig), optimized());
  }

  return webpackMerge(common(dllConfig), unoptimized());
};
