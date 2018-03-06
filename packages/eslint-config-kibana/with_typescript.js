const merge = require('./merge');

module.exports = function(options) {
  return merge(
    {
      parser: 'typescript-eslint-parser',
      plugins: ['typescript'],

      rules: {
        'typescript/no-unused-vars': 'error',
        'import/no-unresolved': 'off',
      },
    },
    options
  );
};
