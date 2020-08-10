// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./jest.config');

module.exports = {
  ...config,

  modulePathIgnorePatterns: [],
  testSequencer: './jest.testSequencer.js',
};
