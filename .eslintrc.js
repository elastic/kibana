module.exports = {
  extends: [
    '@elastic/eslint-config-kibana',
    '@elastic/eslint-config-kibana/jest',
  ],

  settings: {
    'import/resolver': {
      '@elastic/eslint-import-resolver-kibana': {
        rootPackageName: 'kibana',
        kibanaPath: '.',
      },
    },
  },

  overrides: [
    // Enable Prettier
    {
      files: ['.eslintrc.js', 'packages/kbn-build/**/*.js'],
      plugins: ['prettier'],
      rules: Object.assign(
        { 'prettier/prettier': 'error' },
        require('eslint-config-prettier').rules,
        require('eslint-config-prettier/react').rules
      ),
    },

    // files not transpiled by babel can't using things like object-spread
    {
      files: ['.eslintrc.js'],
      rules: {
        'prefer-object-spread/prefer-object-spread': 'off',
      },
    },
  ],
};
