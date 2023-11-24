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
    default:
      return path.resolve(__dirname, 'src', language, 'worker', `${language}.worker.ts`);
  }
};

/**
 * @param {string} language
 * @returns {import('webpack').Configuration}
 */
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
    alias: {
      // swap default umd import for the esm one provided in vscode-uri package
      'vscode-uri$': require.resolve('vscode-uri').replace(/\/umd\/index.js/, '/esm/index.mjs'),
    },
  },
  stats: 'errors-only',
  module: {
    rules: [
      {
        test: /\.m?(t|j)sx?$/,
        exclude:
          /node_modules(?!\/(@kbn|monaco-editor|monaco-yaml|yaml\/browser|vscode-uri)\/)(\/[^\/]+\/)/,
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
