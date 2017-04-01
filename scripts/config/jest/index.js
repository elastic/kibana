const path = require('path');

module.exports = {
  roots: ['<rootDir>/ui_framework/'],
  collectCoverageFrom: [
    'ui_framework/components/**/*.js',
    // Seems to be a bug with jest or micromatch, in which the above glob
    // doesn't match subsequent levels of directories, making this glob necessary.
    'ui_framework/components/**/**/*.js',
    '!ui_framework/components/index.js',
    '!ui_framework/components/**/*/index.js',
  ],
  coverageDirectory: '<rootDir>/target/test_coverage',
  coverageReporters: ['html'],
  moduleFileExtensions: ['jsx', 'js', 'json'],
  testPathIgnorePatterns: [
    '<rootDir>[/\\\\]ui_framework[/\\\\](dist|doc_site|jest)[/\\\\]'
  ],
  transform: {
    '^.+\\.(js|jsx)$': path.resolve(__dirname, './babelTransform.js')
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'],
  snapshotSerializers: ['<rootDir>/node_modules/enzyme-to-json/serializer']
};
