import { resolve } from 'path';

export const config = {
  roots: ['<rootDir>/ui_framework/'],
  collectCoverageFrom: [
    'ui_framework/services/**/*.js',
    '!ui_framework/services/index.js',
    '!ui_framework/services/**/*/index.js',
    'ui_framework/components/**/*.js',
    '!ui_framework/components/index.js',
    '!ui_framework/components/**/*/index.js',
  ],
  coverageDirectory: '<rootDir>/target/jest-coverage',
  coverageReporters: ['html'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>[/\\\\]ui_framework[/\\\\](dist|doc_site|jest)[/\\\\]'
  ],
  transform: {
    '^.+\\.js$': resolve(__dirname, './babelTransform.js')
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.js$'],
  snapshotSerializers: ['<rootDir>/node_modules/enzyme-to-json/serializer']
};
