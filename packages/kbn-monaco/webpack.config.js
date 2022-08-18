/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const createLangWorkerConfig = (lang) => {
  const entry =
    lang === 'default'
      ? 'monaco-editor/esm/vs/editor/editor.worker.js'
      : path.resolve(__dirname, 'src', lang, 'worker', `${lang}.worker.ts`);

  return {
    mode: 'production',
    entry,
    output: {
      path: path.resolve(__dirname, 'target_workers'),
      filename: `${lang}.editor.worker.js`,
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: { passes: 2 },
            keep_classnames: true,
            mangle: true,
          },
          minify: async (file, sourceMap, minimizerOptions) => {
            const swc = require('@swc/core');
            const { map, code } = await swc.minify(file, minimizerOptions.terserOptions);
            return { map, code, extractedComments: [] };
          },
        }),
      ],
    },
    stats: 'errors-only',
    module: {
      rules: [
        {
          test: /\.(js|ts)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            },
          },
        },
      ],
    },
  };
};

module.exports = [
  createLangWorkerConfig('xjson'),
  createLangWorkerConfig('painless'),
  createLangWorkerConfig('default'),
];
