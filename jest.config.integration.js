/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const preset = require('@kbn/test/jest-preset');

module.exports = {
  preset: '@kbn/test',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/packages'],
  testMatch: ['**/integration_tests**/*.test.{js,mjs,ts,tsx}'],
  testRunner: 'jasmine2',
  testPathIgnorePatterns: preset.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  setupFilesAfterEnv: ['<rootDir>/packages/kbn-test/target/jest/setup/after_env.integration.js'],
  reporters: [
    'default',
    [
      '<rootDir>/packages/kbn-test/target/jest/junit_reporter',
      { reportName: 'Jest Integration Tests' },
    ],
  ],
  coverageReporters: !!process.env.CI
    ? [['json', { file: 'jest-integration.json' }]]
    : ['html', 'text'],
};
