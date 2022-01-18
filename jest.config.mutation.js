// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./jest.config');

module.exports = {
  ...config,

  // only include "mutation" tests that cannot run on in parallel (like they are on CI) because they mutate shared state
  testRegex: ['.*.mutation.test.ts$'],
  modulePathIgnorePatterns: [],
};
