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

import { RESERVED_DIR_JEST_INTEGRATION_TESTS } from '../constants';

export default {
  rootDir: '../../..',
  roots: [
    '<rootDir>/src/plugins',
    '<rootDir>/src/legacy/ui',
    '<rootDir>/src/core',
    '<rootDir>/src/legacy/core_plugins',
    '<rootDir>/src/legacy/server',
    '<rootDir>/src/cli',
    '<rootDir>/src/cli_keystore',
    '<rootDir>/src/cli_plugin',
    '<rootDir>/packages/kbn-test/target/functional_test_runner',
    '<rootDir>/src/dev',
    '<rootDir>/src/legacy/utils',
    '<rootDir>/src/setup_node_env',
    '<rootDir>/packages',
    '<rootDir>/src/test_utils',
    '<rootDir>/test/functional/services/remote',
  ],
  collectCoverageFrom: [
    'src/plugins/**/*.{ts,tsx}',
    '!src/plugins/**/*.d.ts',
    'packages/kbn-ui-framework/src/components/**/*.js',
    '!packages/kbn-ui-framework/src/components/index.js',
    '!packages/kbn-ui-framework/src/components/**/*/index.js',
    'packages/kbn-ui-framework/src/services/**/*.js',
    '!packages/kbn-ui-framework/src/services/index.js',
    '!packages/kbn-ui-framework/src/services/**/*/index.js',
    'src/legacy/core_plugins/**/*.{js,jsx,ts,tsx}',
    '!src/legacy/core_plugins/**/{__test__,__snapshots__}/**/*',
    'src/legacy/ui/public/{agg_types,vis}/**/*.{ts,tsx}',
    '!src/legacy/ui/public/{agg_types,vis}/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^src/plugins/(.*)': '<rootDir>/src/plugins/$1',
    '^plugins/([^/.]*)(.*)': '<rootDir>/src/legacy/core_plugins/$1/public$2',
    '^ui/(.*)': '<rootDir>/src/legacy/ui/public/$1',
    '^uiExports/(.*)': '<rootDir>/src/dev/jest/mocks/file_mock.js',
    '^test_utils/(.*)': '<rootDir>/src/test_utils/public/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/dev/jest/mocks/file_mock.js',
    '\\.(css|less|scss)$': '<rootDir>/src/dev/jest/mocks/style_mock.js',
  },
  setupFiles: [
    '<rootDir>/src/dev/jest/setup/babel_polyfill.js',
    '<rootDir>/src/dev/jest/setup/polyfills.js',
    '<rootDir>/src/dev/jest/setup/enzyme.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/dev/jest/setup/mocks.js'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest',
  coverageReporters: ['html', 'text'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  modulePathIgnorePatterns: ['__fixtures__/', 'target/'],
  testMatch: ['**/*.test.{js,ts,tsx}'],
  testPathIgnorePatterns: [
    '<rootDir>/packages/kbn-ui-framework/(dist|doc_site|generator-kui)/',
    '<rootDir>/packages/kbn-pm/dist/',
    `${RESERVED_DIR_JEST_INTEGRATION_TESTS}/`,
  ],
  transform: {
    '^.+\\.(js|tsx?)$': '<rootDir>/src/dev/jest/babel_transform.js',
    '^.+\\.txt?$': 'jest-raw-loader',
    '^.+\\.html?$': 'jest-raw-loader',
  },
  transformIgnorePatterns: [
    // ignore all node_modules except @elastic/eui and monaco-editor which both require babel transforms to handle dynamic import()
    // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
    '[/\\\\]node_modules(?![\\/\\\\]@elastic[\\/\\\\]eui)(?![\\/\\\\]monaco-editor)[/\\\\].+\\.js$',
    'packages/kbn-pm/dist/index.js',
  ],
  snapshotSerializers: [
    '<rootDir>/src/plugins/kibana_react/public/util/test_helpers/react_mount_serializer.ts',
    '<rootDir>/node_modules/enzyme-to-json/serializer',
  ],
  reporters: ['default', '<rootDir>/src/dev/jest/junit_reporter.js'],
};
