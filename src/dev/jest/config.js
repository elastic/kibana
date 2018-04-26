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
      tsConfigFile: 'src/dev/jest/tsconfig.json',
      skipBabel: true,
    },
  },
  moduleFileExtensions: [
    'js',
    'json',
    'ts',
  ],
  modulePathIgnorePatterns: [
    '__fixtures__/',
    'target/',
  ],
  testMatch: [
    '**/*.test.js',
    '**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/packages/kbn-ui-framework/(dist|doc_site|generator-kui)/',
    '<rootDir>/packages/kbn-pm/dist/',
    'integration_tests/'
  ],
  transform: {
    '^.+\\.js$': '<rootDir>/src/dev/jest/babel_transform.js',
    '^.+\\.ts$': 'ts-jest',
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
