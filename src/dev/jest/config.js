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
  rootDir: '../../..',
  roots: [
    '<rootDir>/src/ui',
    '<rootDir>/src/core_plugins',
    '<rootDir>/src/server',
    '<rootDir>/src/cli',
    '<rootDir>/src/cli_keystore',
    '<rootDir>/src/cli_plugin',
    '<rootDir>/src/dev',
    '<rootDir>/src/utils',
    '<rootDir>/src/setup_node_env',
    '<rootDir>/packages',
  ],
  collectCoverageFrom: [
    'packages/kbn-ui-framework/src/components/**/*.js',
    '!packages/kbn-ui-framework/src/components/index.js',
    '!packages/kbn-ui-framework/src/components/**/*/index.js',
    'packages/kbn-ui-framework/src/services/**/*.js',
    '!packages/kbn-ui-framework/src/services/index.js',
    '!packages/kbn-ui-framework/src/services/**/*/index.js',
  ],
  moduleNameMapper: {
    '^ui/(.*)': '<rootDir>/src/ui/public/$1',
    '^test_utils/(.*)': '<rootDir>/src/test_utils/public/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/dev/jest/mocks/file_mock.js',
    '\\.(css|less|scss)$': '<rootDir>/src/dev/jest/mocks/style_mock.js',
  },
  setupFiles: [
    '<rootDir>/src/dev/jest/setup/babel_polyfill.js',
    '<rootDir>/src/dev/jest/setup/enzyme.js',
    '<rootDir>/src/dev/jest/setup/throw_on_console_error.js',
  ],
  coverageDirectory: '<rootDir>/target/jest-coverage',
  coverageReporters: [
    'html',
  ],
  globals: {
    'ts-jest': {
      skipBabel: true,
    },
  },
  moduleFileExtensions: [
    'js',
    'json',
    'ts',
    'tsx',
  ],
  modulePathIgnorePatterns: [
    '__fixtures__/',
    'target/',
  ],
  testMatch: [
    '**/*.test.{js,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/packages/kbn-ui-framework/(dist|doc_site|generator-kui)/',
    '<rootDir>/packages/kbn-pm/dist/',
    'integration_tests/'
  ],
  transform: {
    '^.+\\.js$': '<rootDir>/src/dev/jest/babel_transform.js',
    '^.+\\.tsx?$': '<rootDir>/src/dev/jest/ts_transform.js',
    '^.+\\.txt?$': 'jest-raw-loader',
    '^.+\\.html?$': 'jest-raw-loader',
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.js$',
    'packages/kbn-pm/dist/index.js'
  ],
  snapshotSerializers: [
    '<rootDir>/node_modules/enzyme-to-json/serializer',
  ],
  reporters: [
    'default',
    '<rootDir>/src/dev/jest/junit_reporter.js',
  ],
};
