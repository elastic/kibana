/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  // This test boots ES + all-solutions Kibana and makes HTTP calls to Kibana's routes
  // (see `waitForSchemaRoute`). The `jest_integration` preset inherits `testEnvironment:
  // 'jest-environment-jsdom'` from the base preset and installs an XHR-backed `fetch`
  // (polyfills.jsdom.js -> whatwg-fetch). jsdom's document origin is `http://localhost`
  // (no port), so any XHR to `http://localhost:<kibanaPort>` is cross-origin and is
  // rejected with "Cross origin http://localhost forbidden" — causing an opaque timeout.
  //
  // `jest_integration_node` deletes `testEnvironment` and sets `setupFiles: []`, giving
  // Node's native undici `fetch` with no CORS enforcement. This is the same preset used
  // by the identical `createRootWithCorePlugins({}, { oss: false })` boot in
  // x-pack/platform/plugins/shared/encrypted_saved_objects/jest.integration.config.js.
  preset: '@kbn/test/jest_integration_node',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/src/platform/packages/private/kbn-workflow-step-schema-cli/integration_tests'],
  forceExit: true,
};
