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

// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const { resolve } = require('path');

module.exports = {
  // The directory where Jest should output its coverage files
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: !!process.env.CODE_COVERAGE ? ['json'] : ['html', 'text'],

  // An array of file extensions your modules use
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts', 'tsx', 'node'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '@elastic/eui/lib/(.*)?': '<rootDir>/node_modules/@elastic/eui/test-env/$1',
    '@elastic/eui$': '<rootDir>/node_modules/@elastic/eui/test-env',
    '\\.module.(css|scss)$': '<rootDir>/packages/kbn-test/target/jest/mocks/css_module_mock.js',
    '\\.(css|less|scss)$': '<rootDir>/packages/kbn-test/target/jest/mocks/style_mock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/packages/kbn-test/target/jest/mocks/file_mock.js',
    '\\.ace\\.worker.js$': '<rootDir>/packages/kbn-test/target/jest/mocks/worker_module_mock.js',
    '\\.editor\\.worker.js$': '<rootDir>/packages/kbn-test/target/jest/mocks/worker_module_mock.js',
    '^(!!)?file-loader!': '<rootDir>/packages/kbn-test/target/jest/mocks/file_mock.js',
    '^fixtures/(.*)': '<rootDir>/src/fixtures/$1',
    '^src/core/(.*)': '<rootDir>/src/core/$1',
    '^src/plugins/(.*)': '<rootDir>/src/plugins/$1',
  },

  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: ['__fixtures__/', 'target/'],

  // Use this configuration option to add custom reporters to Jest
  reporters: ['default', resolve(__dirname, './target/jest/junit_reporter')],

  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: [
    '<rootDir>/packages/kbn-test/target/jest/setup/babel_polyfill.js',
    '<rootDir>/packages/kbn-test/target/jest/setup/polyfills.js',
    '<rootDir>/packages/kbn-test/target/jest/setup/enzyme.js',
  ],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: [
    '<rootDir>/packages/kbn-test/target/jest/setup/setup_test.js',
    '<rootDir>/packages/kbn-test/target/jest/setup/mocks.js',
    '<rootDir>/packages/kbn-test/target/jest/setup/react_testing_library.js',
  ],

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  snapshotSerializers: [
    '<rootDir>/src/plugins/kibana_react/public/util/test_helpers/react_mount_serializer.ts',
    '<rootDir>/node_modules/enzyme-to-json/serializer',
  ],

  // The test environment that will be used for testing
  testEnvironment: 'jest-environment-jsdom-thirteen',

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '<rootDir>/packages/kbn-ui-framework/dist/',
    '<rootDir>/packages/kbn-pm/dist/',
    `integration_tests/`,
  ],

  // This option allows use of a custom test runner
  testRunner: 'jest-circus/runner',

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.(js|tsx?)$': '<rootDir>/packages/kbn-test/target/jest/babel_transform.js',
    '^.+\\.txt?$': 'jest-raw-loader',
    '^.+\\.html?$': 'jest-raw-loader',
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    // ignore all node_modules except monaco-editor which requires babel transforms to handle dynamic import()
    // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
    '[/\\\\]node_modules(?![\\/\\\\]monaco-editor)[/\\\\].+\\.js$',
    'packages/kbn-pm/dist/index.js',
  ],

  // An array of regexp pattern strings that are matched against all source file paths, matched files to include/exclude for code coverage
  collectCoverageFrom: [
    '**/*.{js,mjs,jsx,ts,tsx}',
    '!**/{__test__,__snapshots__,__examples__,mocks,tests,test_helpers,integration_tests,types}/**/*',
    '!**/*mock*.ts',
    '!**/*.test.ts',
    '!**/*.d.ts',
    '!**/index.{js,ts}',
  ],
};
