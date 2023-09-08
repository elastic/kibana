/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');

const getWorkerEntry = (language) => {
  switch (language) {
    case 'default':
      return 'monaco-editor/esm/vs/editor/editor.worker.js';
    case 'json':
      return 'monaco-editor/esm/vs/language/json/json.worker.js';
    case 'yaml':
      return 'monaco-yaml/lib/esm/yaml.worker.js';
    default:
      return path.resolve(__dirname, 'src', language, 'worker', `${language}.worker.ts`);
  }
};

const getWorkerConfig = (language) => ({
  mode: process.env.NODE_ENV || 'development',
  entry: getWorkerEntry(language),
  devtool: process.env.NODE_ENV === 'production' ? false : '#cheap-source-map',
  output: {
    path: path.resolve(__dirname, 'target_workers'),
    filename: `${language}.editor.worker.js`,
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  stats: 'errors-only',
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules(?!\/@kbn\/)(\/[^\/]+\/)/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: process.env.NODE_ENV || 'development',
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
    ],
  },
});

module.exports = ['default', 'json', 'painless', 'xjson', 'esql', 'yaml'].map(getWorkerConfig);
