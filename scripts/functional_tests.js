/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// eslint-disable-next-line no-restricted-syntax
const alwaysImportedTests = [
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/plugin_functional/config.js'),
  require.resolve('../test/ui_capabilities/newsfeed_err/config.ts'),
  require.resolve('../test/new_visualize_flow/config.js'),
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
