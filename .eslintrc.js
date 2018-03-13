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
      files: [
        '.eslintrc.js',
        'packages/kbn-pm/**/*',
        'packages/kbn-es/**/*',
        'packages/kbn-datemath/**/*.js',
        'packages/kbn-plugin-generator/**/*',
      ],
      plugins: ['prettier'],
      rules: Object.assign(
        { 'prettier/prettier': 'error' },
        require('eslint-config-prettier').rules,
        require('eslint-config-prettier/react').rules
      ),
    },

    // files not transpiled by babel can't using things like object-spread
    {
      files: [
        '.eslintrc.js',
        'packages/kbn-plugin-helpers/**/*',
        'packages/kbn-plugin-generator/**/*',
      ],
      rules: {
        'prefer-object-spread/prefer-object-spread': 'off',
      },
    },
  ],
};
