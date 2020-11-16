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

export default {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: [
    '<rootDir>/src/plugins',
    '<rootDir>/src/legacy/ui',
    '<rootDir>/src/core',
    '<rootDir>/src/legacy/server',
    '<rootDir>/src/cli',
    '<rootDir>/src/cli_keystore',
    '<rootDir>/src/cli_encryption_key',
    '<rootDir>/src/cli_plugin',
    '<rootDir>/packages/kbn-test/target/functional_test_runner',
    '<rootDir>/src/dev',
    '<rootDir>/src/optimize',
    '<rootDir>/src/legacy/utils',
    '<rootDir>/src/setup_node_env',
    '<rootDir>/packages',
    '<rootDir>/src/test_utils',
    '<rootDir>/test/functional/services/remote',
    '<rootDir>/src/dev/code_coverage/ingest_coverage',
  ],
  collectCoverageFrom: [
    'src/plugins/**/*.{ts,tsx}',
    '!src/plugins/**/{__test__,__snapshots__,__examples__,mocks,tests}/**/*',
    '!src/plugins/**/*.d.ts',
    '!src/plugins/**/test_helpers/**',
    'packages/kbn-ui-framework/src/components/**/*.js',
    '!packages/kbn-ui-framework/src/components/index.js',
    '!packages/kbn-ui-framework/src/components/**/*/index.js',
    'packages/kbn-ui-framework/src/services/**/*.js',
    '!packages/kbn-ui-framework/src/services/index.js',
    '!packages/kbn-ui-framework/src/services/**/*/index.js',
  ],
  testRunner: 'jasmine2',
};
