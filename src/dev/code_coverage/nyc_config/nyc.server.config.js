/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');

module.exports = {
  extends: '@istanbuljs/nyc-config-typescript',
  'report-dir': process.env.KIBANA_DIR
    ? path.resolve(process.env.KIBANA_DIR, 'target/kibana-coverage/server')
    : 'target/kibana-coverage/server',
  reporter: ['json'],
  all: true,
  include: [
    'src/{core,plugins}/**/*.{js,mjs,jsx,ts,tsx}',
    'x-pack/plugins/**/*.{js,mjs,jsx,ts,tsx}',
  ],
  exclude: [
    '**/{__test__,__snapshots__,__examples__,*mock*,.storybook,target,tests,test_helpers,integration_tests,types}/**/*',
    '**/*mock*.{ts,tsx}',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/types.ts',
    '**/*.d.ts',
    '**/index.{js,ts,tsx}',
  ],
};
