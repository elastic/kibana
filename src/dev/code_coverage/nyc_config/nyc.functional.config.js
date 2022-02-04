/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const defaultExclude = require('@istanbuljs/schema/default-exclude');
const extraExclude = [
  'data/optimize/**',
  '**/{__test__,__snapshots__,__examples__,*mock*,.storybook,target,tests,test_helpers,integration_tests,types}/**/*',
  '**/*mock*.{ts,tsx}',
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  '**/types.ts',
  '**/*.d.ts',
  '**/index.{js,ts,tsx}',
];
const path = require('path');

module.exports = {
  'temp-dir': process.env.COVERAGE_TEMP_DIR
    ? path.resolve(process.env.COVERAGE_TEMP_DIR, 'functional')
    : 'target/kibana-coverage/functional',
  'report-dir': 'target/kibana-coverage/functional-combined',
  reporter: ['html', 'json-summary'],
  include: [
    'src/{core,plugins}/**/*.{js,mjs,jsx,ts,tsx}',
    'x-pack/plugins/**/*.{js,mjs,jsx,ts,tsx}',
  ],
  exclude: extraExclude.concat(defaultExclude),
};
