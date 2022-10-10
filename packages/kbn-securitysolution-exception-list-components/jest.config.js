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
  roots: ['<rootDir>/packages/kbn-securitysolution-exception-list-components'],
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/packages/kbn-securitysolution-exception-list-components/**/*.{ts,tsx}',
    '!<rootDir>/packages/kbn-securitysolution-exception-list-components/**/*.test',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/packages/kbn-securitysolution-exception-list-components/setup_test.ts',
  ],
};
