/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @kbn/babel-register is installed by the calling process (@kbn/setup-node-env).
// This file is a plain .js module so webpack can require() it directly without
// additional transpilation; TypeScript is handled by babel-loader for source files.

const path = require('path');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');

const entry = path.resolve(__dirname, 'browser_entry.tsx');

/**
 * Build a standalone browser bundle that renders a single workflow graph page.
 *
 * Unlike the Console packaging (which externalises React/EUI so they are
 * re-injected by Kibana at runtime) this bundle is self-contained — it ships
 * React 18, EUI, @xyflow/react, and the @kbn/workflows-ui canvas so the page
 * can run in a bare Chromium context with no Kibana server present.
 *
 * @param {string} outputPath  Absolute path to the directory for bundle.js
 * @returns {import('webpack').Configuration}
 */
module.exports = function buildWebpackConfig(outputPath) {
  return {
    mode: 'production',
    entry,
    context: __dirname,
    devtool: false,
    output: {
      filename: 'bundle.js',
      path: outputPath,
      publicPath: '/',
    },
    target: 'web',
    // No externals: we bundle React/EUI/ReactFlow so the page is fully self-contained.
    module: {
      rules: [
        // TypeScript + JavaScript (Kibana packages use TS source directly)
        {
          test: /\.(js|tsx?)$/,
          exclude: /node_modules\/(?!@kbn\/)/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              envName: 'production',
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            },
          },
        },
        // Peggy grammars — used by some @kbn/* packages (e.g. kbn-esql-language)
        {
          test: /\.peggy$/,
          loader: require.resolve('@kbn/peggy-loader'),
        },
        // CSS — React Flow and EUI global styles injected at runtime via style-loader
        {
          test: /\.css$/,
          use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
          sideEffects: true,
        },
        // Binary assets inlined as data URIs so the server only needs to serve bundle.js
        {
          test: /\.(woff|woff2|ttf|eot|png|jpg|gif|jpeg)(\?|$)/,
          type: 'asset/inline',
        },
        // SVGs inlined as data URIs
        {
          test: /\.svg(\?|$)/,
          type: 'asset/inline',
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.css'],
      // Use standard Node.js walk-up resolution. Webpack will walk up the directory
      // tree from each importing file and find node_modules (including the monorepo
      // root's node_modules where @kbn/* symlinks live). This preserves correct
      // per-package version isolation (e.g. EUI's private node_modules are found
      // before the root's) without needing an explicit REPO_ROOT path.
      modules: ['node_modules'],
      alias: {
        // Some EUI internals reference react-dom/server which is unneeded here.
        // Alias to an empty stub so the bundle stays browser-only.
        'react-dom/server': path.resolve(__dirname, 'stub_empty.js'),
      },
    },
    plugins: [new NodeLibsBrowserPlugin()],
    optimization: {
      minimize: false, // keeps build fast; screenshots are a dev-time tool
      splitChunks: false,
      runtimeChunk: false,
    },
    performance: {
      // The bundle will be large (~5–8 MB) because React/EUI/ReactFlow are included.
      // Suppress the size warning since this is a dev tool, not a production bundle.
      hints: false,
    },
    // Suppress verbose stats; only errors are shown by build_browser_bundle.ts
    stats: 'errors-only',
  };
};
