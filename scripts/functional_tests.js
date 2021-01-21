/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// eslint-disable-next-line no-restricted-syntax
const alwaysImportedTests = [
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/plugin_functional/config.ts'),
  require.resolve('../test/ui_capabilities/newsfeed_err/config.ts'),
  require.resolve('../test/new_visualize_flow/config.ts'),
  require.resolve('../test/security_functional/config.ts'),
  require.resolve('../test/functional/config.legacy.ts'),
];
// eslint-disable-next-line no-restricted-syntax
const onlyNotInCoverageTests = [
  require.resolve('../test/api_integration/config.js'),
  require.resolve('../test/interpreter_functional/config.ts'),
  require.resolve('../test/examples/config.js'),
];

require('../src/setup_node_env');
require('@kbn/test').runTestsCli([
  // eslint-disable-next-line no-restricted-syntax
  ...alwaysImportedTests,
  // eslint-disable-next-line no-restricted-syntax
  ...(!!process.env.CODE_COVERAGE ? [] : onlyNotInCoverageTests),
]);
