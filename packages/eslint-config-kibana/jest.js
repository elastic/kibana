module.exports = {
  plugins: [
    'jest',
  ],

  env: {
    'jest/globals': true,
  },

  rules: {
    'jest/no-disabled-tests': 'error',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
  },
};
