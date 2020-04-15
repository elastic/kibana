module.exports = {
  snapshotSerializers: ['jest-snapshot-serializer-ansi'],
  setupFiles: ['./src/test/setupFiles/automatic-mocks.ts'],
  preset: 'ts-jest',
  testRegex: '(test|src)/.*test.ts$',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
