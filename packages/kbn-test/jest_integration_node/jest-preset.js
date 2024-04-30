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

/** @type {import("@jest/types").Config.InitialOptions} */
module.exports = {
  ...presetClone,
  testMatch: ['**/integration_tests**/*.test.{js,mjs,ts,tsx}'],
  testPathIgnorePatterns: preset.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  // An array of regexp pattern strings that are matched against, matched files will skip transformation:
  transformIgnorePatterns: [
    // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
    '[/\\\\]node_modules(?![\\/\\\\](langchain|langsmith|gpt-tokenizer|flat|@langchain))[/\\\\].+\\.js$',
    '[/\\\\]node_modules(?![\\/\\\\](langchain|langsmith|@langchain))/dist/[/\\\\].+\\.js$',
    '[/\\\\]node_modules(?![\\/\\\\](langchain|langsmith|@langchain))/dist/util/[/\\\\].+\\.js$',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/packages/kbn-test/src/jest/setup/after_env.integration.js',
    '<rootDir>/packages/kbn-test/src/jest/setup/mocks.moment_timezone.js',
  ],
  reporters: [
    'default',
    [
      '<rootDir>/packages/kbn-test/src/jest/junit_reporter',
      {
        rootDirectory: '.',
        reportName: 'Jest Integration Tests',
      },
    ],
    [
      '<rootDir>/packages/kbn-test/src/jest/ci_stats_jest_reporter.ts',
      {
        testGroupType: 'Jest Integration Tests',
      },
    ],
  ],
  coverageReporters: !!process.env.CI
    ? [['json', { file: 'jest-integration.json' }]]
    : ['html', 'text'],

  snapshotSerializers: [],
  setupFiles: ['<rootDir>/src/setup_node_env/polyfill.ts'],
  haste: {
    ...preset.haste,
    throwOnModuleCollision: true,
  },
};
