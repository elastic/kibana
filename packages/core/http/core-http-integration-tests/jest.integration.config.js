/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  // TODO replace the line below with
  // preset: '@kbn/test/jest_integration_node
  // to do so, we must fix all integration tests first
  // see https://github.com/elastic/kibana/pull/130255/
  preset: '@kbn/test/jest_integration',
  rootDir: '../../../..',
  roots: ['<rootDir>/packages/core/http/core-http-integration-tests'],
  // must override to match all test given there is no `integration_tests` subfolder
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
};
