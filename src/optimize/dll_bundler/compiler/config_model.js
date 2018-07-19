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

function generateDLLS({ context, entries, output }) {
  const finalEntries = {};

  entries.forEach((entry) => {
    finalEntries[entry.name] = [`${output.path}/${entry.name}.entry.dll.js`];
  });

  return {
    entry: finalEntries,
    context,
    output: {
      filename: `${output.dllName}.dll.js`,
      path: output.path,
      publicPath: output.publicPath,
      library: output.dllName
    },
    plugins: [
      new webpack.DllPlugin({
        context,
        name: output.dllName,
        path: `${output.path}/${output.manifestName}.json`
      })
    ]
  };
}

function common(options) {
  return webpackMerge(
    generateDLLS({
      context: options.context,
      entries: options.dllEntries,
      output: {
        manifestName: '[name]',
        dllName: '[name]',
        path: options.outputPath,
        publicPath: options.publicPath
      }
    })
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

export default (options = {}) => {
  if (options.isDistributable) {
    return webpackMerge(common(options), optimized(), options.mergeConfig);
  }

  return webpackMerge(common(options), unoptimized(), options.mergeConfig);
};
