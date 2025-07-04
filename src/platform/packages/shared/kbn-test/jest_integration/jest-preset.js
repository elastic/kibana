/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const preset = require('../jest-preset');

/** @type {import("@jest/types").Config.InitialOptions} */
module.exports = {
  ...preset,
  testMatch: ['**/integration_tests/**/*.test.{js,mjs,ts,tsx}'],
  testPathIgnorePatterns: preset.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  setupFilesAfterEnv: [
    ...preset.setupFilesAfterEnv,
    '<rootDir>/src/platform/packages/shared/kbn-test/src/jest/setup/after_env.integration.js',
  ],
  reporters: [
    'default',
    [
      '<rootDir>/src/platform/packages/shared/kbn-test/src/jest/junit_reporter',
      {
        rootDirectory: '.',
        reportName: 'Jest Integration Tests',
      },
    ],
    ...(process.env.TEST_GROUP_TYPE_INTEGRATION
      ? [
          [
            '<rootDir>/src/platform/packages/shared/kbn-test/src/jest/ci_stats_jest_reporter.ts',
            {
              testGroupType: process.env.TEST_GROUP_TYPE_INTEGRATION,
            },
          ],
        ]
      : []),
    ...(['1', 'yes', 'true'].includes(process.env.SCOUT_REPORTER_ENABLED)
      ? [
          [
            '<rootDir>/src/platform/packages/private/kbn-scout-reporting/src/reporting/jest',
            { name: 'Jest tests (integration)', configCategory: 'unit-integration-test' },
          ],
        ]
      : []),
  ],
  coverageReporters: !!process.env.CI
    ? [['json', { file: 'jest-integration.json' }]]
    : ['html', 'text'],
};
