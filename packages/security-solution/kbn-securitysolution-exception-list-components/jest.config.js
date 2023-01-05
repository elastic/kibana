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
  roots: ['<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components'],
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/*.{ts,tsx}',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/*.test',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/types/*',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/*.type',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/*.styles',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/mocks/*',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/*.config',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/translations',
    '!<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/**/types/*',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/packages/security-solution/kbn-securitysolution-exception-list-components/setup_test.ts',
  ],
};
