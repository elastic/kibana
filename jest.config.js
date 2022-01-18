// ensure timezone is always in UTC
process.env.TZ = 'UTC';

module.exports = {
  snapshotSerializers: ['jest-snapshot-serializer-ansi'],
  setupFiles: ['./src/test/setupFiles/automatic-mocks.ts'],
  preset: 'ts-jest',
  testRegex: 'src/.*test.ts$',
  testEnvironment: 'node',

  // exclude "private" tests that requires credentials and can therefore not run on CI for external contributors
  // exclude "mutation" tests that cannot run on in parallel (like they are on CI) because they mutate shared state
  modulePathIgnorePatterns: ['.*.private.test.ts$', '.*.mutation.test.ts$'],

  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
