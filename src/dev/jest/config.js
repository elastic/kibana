export default {
  rootDir: '../../..',
  roots: [
    '<rootDir>/src/ui',
    '<rootDir>/src/core_plugins',
    '<rootDir>/ui_framework/',
    '<rootDir>/packages',
  ],
  collectCoverageFrom: [
    'ui_framework/src/components/**/*.js',
    '!ui_framework/src/components/index.js',
    '!ui_framework/src/components/**/*/index.js',
    'ui_framework/src/services/**/*.js',
    '!ui_framework/src/services/index.js',
    '!ui_framework/src/services/**/*/index.js',
  ],
  moduleNameMapper: {
    '^ui_framework/components': '<rootDir>/ui_framework/components',
    '^ui_framework/services': '<rootDir>/ui_framework/services',
    '^ui_framework/test': '<rootDir>/ui_framework/test',
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
  ],
  testMatch: [
    '**/*.test.js',
    '**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/ui_framework/dist/',
    '<rootDir>/ui_framework/doc_site/',
    '<rootDir>/ui_framework/generator-kui/',
    '<rootDir>/packages/kbn-pm/(dist|vendor)/',
    'integration_tests/'
  ],
  transform: {
    '^.+\\.js$': '<rootDir>/src/dev/jest/babel_transform.js',
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.js$',
  ],
  snapshotSerializers: [
    '<rootDir>/node_modules/enzyme-to-json/serializer',
  ],
  reporters: [
    'default',
    '<rootDir>/src/dev/jest/junit_reporter.js',
  ],
};
