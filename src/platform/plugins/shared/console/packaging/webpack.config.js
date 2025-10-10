/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/babel-register').install();
const path = require('path');
const { createStandaloneWebpackConfig } = require('@kbn/standalone-packaging-utils/src/webpack');

module.exports = [
  createStandaloneWebpackConfig({
    entry: require.resolve('./react/index.tsx'),
    outputPath: process.env.BUILD_OUTPUT_DIR || path.resolve(__dirname, '../target'),
    kibanaRoot: path.resolve(__dirname, '../../../../../..'),
    enableBundleAnalyzer: false,
    additionalExternals: {
      // Console-specific externals
      'react-markdown': 'commonjs react-markdown',
      'monaco-editor': 'commonjs monaco-editor',
      rxjs: 'commonjs rxjs',
      lodash: 'commonjs lodash',
    },
  }),
];
