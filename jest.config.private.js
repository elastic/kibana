// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./jest.config');

module.exports = {
  ...config,

  // only include (private) tests that cannot run on CI because they require credentials and thus exclude external contributors
  testRegex: ['.*.private.test.ts$'],
  modulePathIgnorePatterns: [],
};
