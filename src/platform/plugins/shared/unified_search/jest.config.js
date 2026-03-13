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
  rootDir: '../../../../..',
  roots: ['<rootDir>/src/platform/plugins/shared/unified_search'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/src/platform/plugins/shared/unified_search',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/src/platform/plugins/shared/unified_search/public/**/*.{ts,tsx}',
  ],
  setupFiles: ['jest-canvas-mock'],
  moduleNameMapper: {
    // react-day-picker uses ESM-only syntax incompatible with Jest's CJS transform;
    // use the same mock that kbn-date-range-picker's own test suite uses.
    '^react-day-picker$':
      '<rootDir>/src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker/calendar/__mocks__/react-day-picker.tsx',
  },
};
