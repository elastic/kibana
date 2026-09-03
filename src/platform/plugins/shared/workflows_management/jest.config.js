/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @elastic/charts and @elastic/eui each ship a nested node_modules/uuid (v9+, ESM-only).
// The base preset's transformIgnorePatterns exempts top-level uuid but the regex anchors
// at the first node_modules boundary, so nested paths aren't covered. Extending the
// pattern here (plugin-scoped) avoids a repo-wide overhead change in jest-preset.js.
const { transformIgnorePatterns } = require('@kbn/test/jest-preset');

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  transformIgnorePatterns: transformIgnorePatterns.map((p) =>
    p.replace(
      '@apidevtools/json-schema-ref-parser|',
      '@apidevtools/json-schema-ref-parser|@elastic/charts|@elastic/eui|'
    )
  ),
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
};
