/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const entry = path.resolve(__dirname, '../index.ts');
const outputPath = process.env.BUILD_OUTPUT_DIR || path.resolve(__dirname, '../target');
const mode = process.env.NODE_ENV || 'production';

module.exports = {
  mode,
  entry,
  context: path.dirname(entry),
  devtool: 'source-map',

  output: {
    libraryTarget: 'commonjs',
    path: outputPath,
    filename: 'index.js',
    publicPath: 'auto',
  },

  target: 'web',

  externals: {
    '@elastic/eui': 'commonjs @elastic/eui',
  },

  module: {
    rules: [
      {
        test: /\.(js|tsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: mode,
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    alias: {
      // Resolve @kbn/ui-chrome-layout-constants from its built output so this
      // package can be bundled without the full Kibana monorepo at build time.
      '@kbn/ui-chrome-layout-constants': path.resolve(
        __dirname,
        '../../chrome-layout-constants/target/index.js'
      ),
    },
  },

  optimization: {
    minimize: mode === 'production',
    noEmitOnErrors: true,
  },

  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*'],
      dangerouslyAllowCleanPatternsOutsideProject: true,
    }),
  ],
};
