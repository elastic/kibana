/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-check
const path = require('path');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');

/**
 * @typedef {(import('./src/languages/worker_factory').LangSpecificWorkerIds)} WorkerType - list of supported languages to build workers for
 */

/**
 * @param {WorkerType[number]} language
 */
const getWorkerEntry = (language) => {
  switch (language) {
    case 'editorWorkerService':
      return 'monaco-editor/editor/editor.worker.js';
    case 'json':
      return 'monaco-editor/language/json/json.worker.js';
    default:
      return path.resolve.apply(path, [
        __dirname,
        'src',
        'languages',
        'definitions',
        language,
        'worker',
        `${language}.worker.ts`,
      ]);
  }
};

/**
 * @param {WorkerType} languages
 * @returns {import('webpack').Configuration}
 */
const workerConfig = (languages) => ({
  // @ts-expect-error we are unable to type NODE_ENV
  mode: process.env.NODE_ENV || 'development',
  entry: languages.reduce((entries, language) => {
    entries[language] = getWorkerEntry(language);
    return entries;
  }, /** @type {Record<WorkerType[number], string>} */ ({})),
  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'target_workers'),
    filename: ({ chunk }) => {
      if (!chunk) {
        throw new Error('Chunk for worker is required, but was not provided');
      }

      return `${chunk.name}.editor.worker.js`;
    },
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    alias: {
      // swap default umd import for the esm one provided in vscode-uri package
      'vscode-uri$': require.resolve('vscode-uri').replace(/\/umd\/index.js/, '/esm/index.mjs'),
    },
  },
  plugins: [new NodeLibsBrowserPlugin()],
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
      {
        test: /(monaco-worker-manager|monaco-yaml)\/.*m?(t|j)sx?$/,
        resolve: {
          alias: {
            // monaco-editor 0.56 added an "exports" map that remaps all subpaths relative to
            // esm/vs/, so pre-0.56 deep specifiers like monaco-editor/esm/vs/... no longer resolve.
            // Third-party deps (e.g. monaco-worker-manager, pulled in by monaco-yaml's
            // worker) still import those old specifiers, so we add this an alias resolver to point these packages at the real directory.
            'monaco-editor/esm/vs': path.resolve(
              require.resolve('monaco-editor/editor/editor.api.js'),
              '..',
              '..'
            ),
          },
        },
      },
      {
        /**
         * further process the modules exported by monaco-editor and monaco-yaml
         * because their exports leverage some none-standard language APIs at this time.
         */
        test: /(monaco-editor\/language|monaco-yaml|vscode-uri)\/.*m?(t|j)sx?$/,
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

module.exports = workerConfig([
  'editorWorkerService',
  'json',
  'xjson',
  'painless',
  'yaml',
  'console',
]);
