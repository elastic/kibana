module.exports = function(options) {
  return Object.assign(
    {
      plugins: ['jest'],

      env: {
        jest: true,
      },

      rules: {
        'jest/no-disabled-tests': 'error',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
      },
    },
    options
  );
};
