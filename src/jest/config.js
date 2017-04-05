import { resolve } from 'path';

export const config = {
  roots: ['<rootDir>/ui_framework/'],
  collectCoverageFrom: [
    'ui_framework/components/**/*.js',
    '!ui_framework/components/index.js',
    '!ui_framework/components/**/*/index.js',
  ],
  coverageDirectory: '<rootDir>/target/jest-coverage',
  coverageReporters: ['html'],
  moduleFileExtensions: ['jsx', 'js', 'json'],
  testPathIgnorePatterns: [
    '<rootDir>[/\\\\]ui_framework[/\\\\](dist|doc_site|jest)[/\\\\]'
  ],
  transform: {
    '^.+\\.(js|jsx)$': resolve(__dirname, './babelTransform.js')
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'],
  snapshotSerializers: ['<rootDir>/node_modules/enzyme-to-json/serializer']
};
