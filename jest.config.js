module.exports = {
  setupFiles: ['./src/test/automatic-mocks.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(test|src)/.*test.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  }
};
