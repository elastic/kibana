/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../..',
  roots: ['<rootDir>/packages/kbn-grouping'],
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/packages/kbn-grouping/**/*.{ts,tsx}',
    '!<rootDir>/packages/kbn-grouping/**/*.test',
    '!<rootDir>/packages/kbn-grouping/**/types/*',
    '!<rootDir>/packages/kbn-grouping/**/*.type',
    '!<rootDir>/packages/kbn-grouping/**/*.styles',
    '!<rootDir>/packages/kbn-grouping/**/mocks/*',
    '!<rootDir>/packages/kbn-grouping/**/*.config',
    '!<rootDir>/packages/kbn-grouping/**/translations',
    '!<rootDir>/packages/kbn-grouping/**/types/*',
  ],
  setupFilesAfterEnv: ['<rootDir>/packages/kbn-grouping/setup_tests.ts'],
};
