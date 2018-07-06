module.exports = {
  plugins: ['prettier'],
  rules: Object.assign(
    {
      'prettier/prettier': ['error'],
    },
    require('eslint-config-prettier').rules,
    require('eslint-config-prettier/react').rules
  ),
};
