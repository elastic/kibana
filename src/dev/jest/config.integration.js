import config from './config';

export default {
  ...config,
  testMatch: [
    '**/*.integration_test.js',
  ],
  reporters: [
    'default',
    ['<rootDir>/src/dev/jest/junit_reporter.js', { reportName: 'Jest Integration Tests' }],
  ],
};
