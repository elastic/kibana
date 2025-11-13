/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  root: true,
  ignorePatterns: [
    '**/node_modules/**',
    'bazel-*/**',
    'bazel-bin/**',
    'bazel-out/**',
    'bazel-testlogs/**',
    'build/**',
    'target/**',
    '**/*.md',
  ],
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@kbn/perf-suggestions'],
  rules: {
    '@kbn/perf-suggestions/code_should_be_performant': 'error',
  },
};
