module.exports = {
  env: {
    es6: true,
    node: true,
  },
  ignorePatterns: ['dist/', 'node_modules/'],
  plugins: ['@typescript-eslint', 'jest', 'import'],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    // This setting is required if you want to use rules which require type information
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/parser#parseroptionsproject
    project: ['./tsconfig.eslint.json'],
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    'plugin:jest/recommended',
    'eslint:recommended',
  ],
  rules: {
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc' },
        'newlines-between': 'never',
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
      },
    ],
    'no-console': 'error',

    // prefer typescript specific `no-unused-vars` rule
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],

    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/prefer-ts-expect-error': 'error',

    // disabled rules
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
  },
};
