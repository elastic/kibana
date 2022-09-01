/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const preset = require('../jest-preset');

const presetClone = { ...preset };

delete presetClone.testEnvironment; // simply redefining as `testEnvironment: 'node'` has some weird side-effects (https://github.com/elastic/kibana/pull/138877)

/** @typedef {import("@jest/types").Config.InitialOptions} JestConfig */
/** @type {JestConfig} */
module.exports = {
  ...presetClone,
  testMatch: ['**/integration_tests**/*.test.{js,mjs,ts,tsx}'],
  testPathIgnorePatterns: preset.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/after_env.integration.js',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/mocks.moment_timezone.js',
  ],
  reporters: [
    'default',
    [
      '@kbn/test/target_node/src/jest/junit_reporter',
      {
        rootDirectory: '.',
        reportName: 'Jest Integration Tests',
      },
    ],
    [
      '@kbn/test/target_node/src/jest/ci_stats_jest_reporter',
      {
        testGroupType: 'Jest Integration Tests',
      },
    ],
  ],
  coverageReporters: !!process.env.CI
    ? [['json', { file: 'jest-integration.json' }]]
    : ['html', 'text'],

  snapshotSerializers: [],
  setupFiles: ['<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/babel_polyfill.js'],
  haste: {
    ...preset.haste,
    throwOnModuleCollision: true,
  },
};
