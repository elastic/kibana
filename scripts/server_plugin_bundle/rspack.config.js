/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var path = require('path');
var paths = require('./paths');
var rspack = require('@rspack/core');
var REPO = paths.REPO;
var OUT = paths.OUT;

var alias = {
  'mdast-util-to-hast/lib/all': path.join(__dirname, 'empty.js'),
  'entities/decode': path.join(REPO, 'node_modules/entities/lib/decode.js'),
  'entities/escape': path.join(REPO, 'node_modules/entities/lib/escape.js'),
  long: path.join(REPO, 'node_modules/long/umd/index.js'),
  y18n: path.join(REPO, 'node_modules/y18n/build/index.cjs'),
};
alias[
  path.join(
    REPO,
    'x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/api/schema_closure.ts'
  )
] = path.join(__dirname, 'schema_closure.js');

module.exports = {
  mode: 'production',
  context: REPO,
  target: 'node',
  devtool: false,
  cache: false,
  entry: path.join(OUT, 'entry.js'),
  output: {
    path: OUT,
    filename: 'plugins.cjs',
    library: { type: 'commonjs2' },
    asyncChunks: false,
    chunkFormat: 'commonjs',
  },
  node: {
    __dirname: true,
    __filename: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
    // CJS bundle: prefer require/node over import so packages like `long`
    // resolve to UMD constructors instead of ESM namespaces.
    conditionNames: ['node', 'require', 'default', 'import'],
    // Prefer package.json "main" (CJS) over the "module" field. Several
    // packages (y18n) ship an ESM "module" entry that is not callable from CJS.
    mainFields: ['main'],
    // Walk nested node_modules from the importer first. An absolute repo
    // node_modules entry ahead of that picks the hoisted unicorn-magic@0.3.0,
    // which does not export "./node", over globby's nested 0.4.0 which does.
    modules: ['node_modules', path.join(REPO, 'node_modules')],
    alias: alias,
  },
  externalsPresets: { node: true },
  externals: [
    function (ctx, callback) {
      var request = ctx.request;
      if (!request) return callback();
      if (
        request === 'fsevents' ||
        request === 'canvas' ||
        request.endsWith('.node') ||
        request === '@kbn/core' ||
        request.startsWith('@kbn/core/') ||
        request.startsWith('@kbn/core-') ||
        request.startsWith('@elastic/schemas')
      ) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ],
  module: {
    parser: {
      javascript: {
        exportsPresence: 'warn',
        exprContextCritical: false,
        unknownContextCritical: false,
      },
    },
    rules: [
      { test: /\.d\.ts$/, type: 'asset/source' },
      { test: /\.map$/, type: 'asset/source' },
      {
        test: /\.(html|md|text|txt|tmpl|yaml|yml|prompt|toml|xml|graphql|proto|sh|py|csv|ndjson|jsonl)$/,
        type: 'asset/source',
      },
      { test: /(^|\/)(LICENSE|README)(\.[^.]+)?$/, type: 'asset/source' },
      {
        test: /\.peggy$/,
        loader: path.join(__dirname, 'peggy_loader.js'),
      },
      { test: /\.pegjs$/, type: 'asset/source' },
      {
        test: /\.[cm]?[jt]sx?$/,
        exclude: /node_modules|\.d\.ts$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true, decorators: true },
            transform: { legacyDecorator: true, decoratorMetadata: true },
            target: 'es2022',
            keepClassNames: true,
          },
          module: { type: 'es6' },
        },
        type: 'javascript/auto',
      },
      {
        test: /(?:pattern_extraction_service|regex_worker_service)\.ts$/,
        loader: path.join(__dirname, 'resolve_filename_loader.js'),
        enforce: 'pre',
      },
      { test: /\.css$/, type: 'asset/source' },
      { test: /\.(png|jpg|gif|svg|webp|woff2?)$/, type: 'asset/inline' },
    ],
  },
  plugins: [],
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true,
    concatenateModules: true,
    // One non-Latin-1 character stores the whole plugins.cjs source as UTF-16.
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: {
          compress: true,
          mangle: true,
          format: { asciiOnly: true },
        },
      }),
      new rspack.LightningCssMinimizerRspackPlugin(),
    ],
  },
  ignoreWarnings: [
    /Critical dependency/,
    /the request of a dependency is an expression/,
    /export .* was not found in/,
  ],
  stats: 'errors-warnings',
};
