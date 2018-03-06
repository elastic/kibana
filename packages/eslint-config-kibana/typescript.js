module.exports = {
  parser: 'typescript-eslint-parser',
  plugins: ['typescript', 'prettier'],
  rules: {
    'prettier/prettier': ['error', { parser: 'typescript' }],
  },
};
