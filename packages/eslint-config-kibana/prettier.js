module.exports = function(options) {
  return Object.assign(
    {
      plugins: ['prettier'],
      rules: Object.assign(
        { 'prettier/prettier': 'error' },
        require('eslint-config-prettier').rules,
        require('eslint-config-prettier/react').rules
      ),
    },
    options
  );
};
