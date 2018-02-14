import config from './config';

export default {
  ...config,
  testMatch: [
    '**/*.integration_test.js',
  ],
};
