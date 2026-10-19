/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  preset: '@kbn/test/jest_integration_node',
  rootDir: '../../../../..',
  roots: ['<rootDir>/src/core/server/integration_tests/elasticsearch'],
  // must override to match all test given there is no `integration_tests` subfolder
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
  // Force exit after tests complete - necessary for Docker-based integration tests
  // to avoid hanging on lingering async operations from Docker containers
  forceExit: true,
};
