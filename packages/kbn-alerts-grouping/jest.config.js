/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../..',
  roots: ['<rootDir>/packages/kbn-alerts-grouping'],
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/packages/kbn-alerts-grouping/**/*.{ts,tsx}',
    '!<rootDir>/packages/kbn-alerts-grouping/**/*.test',
    '!<rootDir>/packages/kbn-alerts-grouping/**/types/*',
    '!<rootDir>/packages/kbn-alerts-grouping/**/*.type',
    '!<rootDir>/packages/kbn-alerts-grouping/**/*.styles',
    '!<rootDir>/packages/kbn-alerts-grouping/**/mocks/*',
    '!<rootDir>/packages/kbn-alerts-grouping/**/*.config',
    '!<rootDir>/packages/kbn-alerts-grouping/**/translations',
    '!<rootDir>/packages/kbn-alerts-grouping/**/types/*',
  ],
  setupFilesAfterEnv: ['<rootDir>/packages/kbn-alerts-grouping/setup_test.ts'],
};
