/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');
require('@kbn/test').runTestsCli([
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/api_integration/config.js'),
  require.resolve('../test/plugin_functional/config.ts'),
  require.resolve('../test/interpreter_functional/config.ts'),
  require.resolve('../test/ui_capabilities/newsfeed_err/config.ts'),
  require.resolve('../test/examples/config.js'),
  require.resolve('../test/new_visualize_flow/config.ts'),
  require.resolve('../test/security_functional/config.ts'),
<<<<<<< HEAD
  require.resolve('../test/functional/config.legacy.ts'),
=======
];
// eslint-disable-next-line no-restricted-syntax
const onlyNotInCoverageTests = [
  require.resolve('../test/api_integration/config.js'),
  require.resolve('../test/interpreter_functional/config.ts'),
  require.resolve('../test/examples/config.js'),
>>>>>>> 182533f5650... [Datatable] Removes the old implementation  (#111339)
  require.resolve('../test/functional_execution_context/config.ts'),
]);
