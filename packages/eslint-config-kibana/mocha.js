module.exports = function(options) {
  return Object.assign(
    {
      plugins: ['mocha'],

      env: {
        mocha: true,
      },

      rules: {
        'mocha/handle-done-callback': 'error',
        'mocha/no-exclusive-tests': 'error',
      },
    },
    options
  );
};
