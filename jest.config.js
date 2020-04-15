module.exports = {
  snapshotSerializers: ['jest-snapshot-serializer-ansi'],
  setupFiles: ['./src/test/setupFiles/automatic-mocks.ts'],
  preset: 'ts-jest',
  testRegex: '(test|src)/.*test.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
