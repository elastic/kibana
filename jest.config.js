module.exports = {
  setupFiles: ['./test/unit/automatic-mocks.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: 'test/(unit|integration)/.*test.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  }
};
