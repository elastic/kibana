/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

const pkgMap = require('@kbn/synthetic-package-map').readPackageMap();

/** @typedef {import("@jest/types").Config.InitialOptions} JestConfig */
/** @type {JestConfig} */
module.exports = {
  // The directory where Jest should output its coverage files
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts', 'jest\\.config\\.js'],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: !!process.env.CODE_COVERAGE
    ? [['json', { file: 'jest.json' }]]
    : ['html', 'text'],

  // An array of file extensions your modules use
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts', 'tsx', 'node'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '@elastic/eui/lib/(.*)?': '<rootDir>/node_modules/@elastic/eui/test-env/$1',
    '@elastic/eui$': '<rootDir>/node_modules/@elastic/eui/test-env',
    'elastic-apm-node':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/apm_agent_mock.js',
    '\\.module.(css|scss)$':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/css_module_mock.js',
    '\\.(css|less|scss)$':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/style_mock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/file_mock.js',
    '\\.ace\\.worker$':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/worker_module_mock.js',
    '\\.editor\\.worker(\\.js)?$':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/worker_module_mock.js',
    '^(!!)?file-loader!':
      '<rootDir>/node_modules/@kbn/test/target_node/src/jest/mocks/file_mock.js',
    ...Object.fromEntries(
      Array.from(pkgMap.entries()).map(([pkgId, repoRelativeDir]) => [
        `^${pkgId}(/.*)?$`,
        `<rootDir>/${repoRelativeDir}$1`,
      ])
    ),
  },

  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: ['__fixtures__/', 'target/'],

  // Use this configuration option to add custom reporters to Jest
  reporters: [
    'default',
    [
      '@kbn/test/target_node/src/jest/junit_reporter',
      {
        rootDirectory: '.',
      },
    ],
    ...(process.env.TEST_GROUP_TYPE_UNIT
      ? [
          [
            '@kbn/test/target_node/src/jest/ci_stats_jest_reporter',
            {
              testGroupType: process.env.TEST_GROUP_TYPE_UNIT,
            },
          ],
        ]
      : []),
  ],

  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: [
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/babel_polyfill.js',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/polyfills.jsdom.js',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/enzyme.js',
  ],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/setup_test.js',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/mocks.moment_timezone.js',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/mocks.eui.js',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/react_testing_library.js',
    process.env.CI
      ? '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/disable_console_logs.js'
      : [],
  ].flat(),

  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  snapshotSerializers: [
    '<rootDir>/src/plugins/kibana_react/public/util/test_helpers/react_mount_serializer.ts',
    '<rootDir>/node_modules/enzyme-to-json/serializer',
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/emotion.js',
  ],

  // The test environment that will be used for testing
  testEnvironment: 'jest-environment-jsdom',

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '<rootDir>/packages/kbn-ui-framework/dist/',
    '<rootDir>/packages/kbn-pm/dist/',
    `integration_tests/`,
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.(js|tsx?)$': '<rootDir>/node_modules/@kbn/test/target_node/src/jest/transforms/babel.js',
    '^.+\\.(txt|html)?$': '<rootDir>/node_modules/@kbn/test/target_node/src/jest/transforms/raw.js',
    '^.+\\.peggy?$': '<rootDir>/node_modules/@kbn/test/target_node/src/jest/transforms/peggy.js',
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    // ignore all node_modules except monaco-editor and react-monaco-editor which requires babel transforms to handle dynamic import()
    // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
    '[/\\\\]node_modules(?![\\/\\\\](byte-size|monaco-editor|monaco-yaml|vscode-languageserver-types|react-monaco-editor|d3-interpolate|d3-color))[/\\\\].+\\.js$',
    'packages/kbn-pm/dist/index.js',
  ],

  // An array of regexp pattern strings that are matched against all source file paths, matched files to include/exclude for code coverage
  collectCoverageFrom: [
    '**/*.{js,mjs,jsx,ts,tsx}',
    '!**/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!**/*mock*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
    '!**/index.{js,ts,tsx}',
  ],

  // A custom resolver to preserve symlinks by default
  resolver:
    '<rootDir>/node_modules/@kbn/test/target_node/src/jest/setup/preserve_symlinks_resolver.js',

  watchPathIgnorePatterns: ['.*/__tmp__/.*'],
};
