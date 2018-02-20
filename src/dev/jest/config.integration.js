import config from './config';

export default {
  ...config,
  testMatch: [
    '**/integration_tests/**/*.test.js',
  ],
  testPathIgnorePatterns: config.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  reporters: [
    'default',
    ['<rootDir>/src/dev/jest/junit_reporter.js', { reportName: 'Jest Integration Tests' }],
  ],
};
