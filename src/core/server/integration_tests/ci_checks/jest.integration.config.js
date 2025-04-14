/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  bail: true, // only report 1 issue
  // TODO remove the line below once we've addressed all the open handles
  // We stop the server very soon, and plugins installing (and retrying indices) might keep Kibana running until a timeout occurs.
  // to do so, we must fix all integration tests first
  // see https://github.com/elastic/kibana/pull/130255/
  forceExit: true,
  preset: '@kbn/test/jest_integration_node',
  rootDir: '../../../../..',
  roots: ['<rootDir>/src/core/server/integration_tests/ci_checks'],
  // must override to match all test given there is no `integration_tests` subfolder
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
};
