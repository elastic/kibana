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
      ],
      plugins: [
        'prettier',
      ],
      rules: Object.assign(
        { 'prettier/prettier': 'error' },
        require('eslint-config-prettier').rules,
        require('eslint-config-prettier/react').rules
      ),
    },
  ]
}
