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
  roots: [
    '<rootDir>/src/platform/plugins/shared/workflows_management/common',
    '<rootDir>/src/platform/plugins/shared/workflows_management/public',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/src/platform/plugins/shared/workflows_management',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/src/platform/plugins/shared/workflows_management/{common,public}/**/*.{js,ts,tsx}',
  ],
  // @elastic/charts and @elastic/eui each ship a nested node_modules/uuid (v9+, ESM-only).
  // The preset's transformIgnorePatterns anchors at the first node_modules boundary, so the
  // nested path isn't covered by the top-level uuid exception. Mapping uuid to the top-level
  // package (which is already excepted and Babel-transformed) fixes the parse error without
  // changing the shared preset.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
  },
};
