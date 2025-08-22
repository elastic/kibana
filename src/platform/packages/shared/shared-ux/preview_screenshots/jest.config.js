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
  rootDir: '../../../../../..',
  roots: ['<rootDir>/src/platform/packages/shared/shared-ux/preview_screenshots'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/src/platform/packages/shared/shared-ux/preview_screenshots',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/src/platform/packages/shared/shared-ux/preview_screenshots/**/*.{ts,tsx}',
  ],
  coveragePathIgnorePatterns: ['.stories.'],
  setupFiles: ['jest-canvas-mock'],
};
