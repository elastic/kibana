/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  // Doesn't need Elasticsearch, so it uses the node preset the sibling configs' TODO asks for.
  preset: '@kbn/jest/jest_integration_node',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/src/core/packages/core/server/integration_tests/threads'],
  // must override to match all test given there is no `integration_tests` subfolder
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
};
