/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// setup ts/pkg support in this rspack process
// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/babel-register').install();

const Path = require('path');

// eslint-disable-next-line import/no-extraneous-dependencies
const rspack = require('@rspack/core');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');
const UiSharedDepsNpm = require('@kbn/ui-shared-deps-npm');
// eslint-disable-next-line import/no-extraneous-dependencies
const { getSharedConfig } = require('@kbn/transpiler-config');

const { distDir: UiSharedDepsSrcDistDir } = require('./src/definitions');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');
const DOMPURIFY_SRC = require.resolve('dompurify/purify.js');
const { REPO_ROOT } = require('@kbn/repo-info');

const dist = process.env.NODE_ENV === 'production';
const sharedConfig = getSharedConfig();

const swcOptions = {
  jsc: {
    parser: {
      syntax: 'typescript',
      tsx: true,
      decorators: true,
    },
    transform: {
      legacyDecorator: sharedConfig.typescript.decoratorsLegacy,
      decoratorMetadata: true,
      react: {
        runtime: sharedConfig.react.runtime,
        development: !dist,
        importSource: '@emotion/react',
      },
    },
    target: 'es2020',
    keepClassNames: true,
    externalHelpers: true,
  },
  sourceMaps: !dist,
  inlineSourcesContent: !dist,
};

/** @returns {import('@rspack/core').Configuration} */
module.exports = {
  externals: {
    module: 'module',
  },
  mode: process.env.NODE_ENV || 'development',
  entry: {
    'kbn-ui-shared-deps-src': [
      // Set public path before any other module loads
      './src/set_public_path.js',
      './src/entry.js',
    ],
  },
  context: __dirname,
  devtool: 'cheap-source-map',
  target: 'web',
  output: {
    path: UiSharedDepsSrcDistDir,
    filename: '[name].js',
    chunkFilename: 'kbn-ui-shared-deps-src.chunk.[id].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `kbn-ui-shared-deps-src/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    library: '__kbnSharedDeps__',
  },

  module: {
    rules: [
      {
        test: /\.peggy$/,
        use: [require.resolve('@kbn/peggy-loader')],
      },
      {
        test: /\.text$/,
        type: 'asset/source',
      },
      {
        test: /\.css$/,
        use: [rspack.CssExtractRspackPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(js|tsx?)$/,
        exclude: /[\/\\]node_modules[\/\\](?!@kbn)([^\/\\]+)[\/\\]/,
        loader: 'builtin:swc-loader',
        options: swcOptions,
      },
      {
        test: /(monaco-editor\/esm\/vs\/|monaco-languageserver-types|monaco-marker-data-provider|monaco-worker-manager).*(t|j)sx?$/,
        loader: 'builtin:swc-loader',
        options: swcOptions,
      },
      {
        test: /\.(ttf)(\?|$)/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192,
          },
        },
      },
    ],
  },

  cache: false,

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser', 'module', 'import', 'require', 'default'],
    alias: {
      '@elastic/eui$': '@elastic/eui/optimize/es',
      '@elastic/eui/lib/components/provider/nested$':
        '@elastic/eui/optimize/es/components/provider/nested',
      '@elastic/eui/lib/services/theme/warning$': '@elastic/eui/optimize/es/services/theme/warning',
      moment: MOMENT_SRC,
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    },
  },

  optimization: {
    moduleIds: process.env.NODE_ENV === 'production' ? 'deterministic' : 'natural',
    chunkIds: process.env.NODE_ENV === 'production' ? 'deterministic' : 'natural',
    minimize: false,
    emitOnErrors: false,
  },

  performance: {
    hints: false,
  },

  plugins: [
    new NodeLibsBrowserPlugin(),
    new rspack.CssExtractRspackPlugin({
      filename: '[name].css',
    }),

    new rspack.DllReferencePlugin({
      context: REPO_ROOT,
      manifest: require(UiSharedDepsNpm.dllManifestPath), // eslint-disable-line import/no-dynamic-require
    }),

    new rspack.NormalModuleReplacementPlugin(
      /(\.\.\/)*(\.\/)?dompurify[/\\]dompurify\.js$/,
      DOMPURIFY_SRC
    ),
  ],
};
