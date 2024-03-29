/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/src/platform/controls'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/src/platform/controls',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: ['<rootDir>/src/platform/controls/{common,public,server}/**/*.{ts,tsx}'],
  setupFiles: ['<rootDir>/src/platform/controls/jest_setup.ts'],
};
