module.exports = {
  extends: [
    '@elastic/eslint-config-kibana',
    '@elastic/eslint-config-kibana/jest',
  ],

  settings: {
    'import/resolver': {
      '@kbn/eslint-import-resolver-kibana': {
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
        'packages/eslint-plugin-kibana-custom/**/*',
        'packages/kbn-pm/**/*',
        'packages/kbn-es/**/*',
        'packages/kbn-datemath/**/*',
        'packages/kbn-dev-utils/**/*',
        'packages/kbn-plugin-helpers/**/*',
        'packages/kbn-plugin-generator/**/*',
        'packages/kbn-test-subj-selector/**/*',
        'packages/kbn-eslint-import-resolver-kibana/**/*',
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

    // files that are not allowed to use devDepenedncies
    {
      files: ['packages/kbn-ui-framework/**/*'],
      excludedFiles: [
        'packages/kbn-ui-framework/**/*.test.js',
        'packages/kbn-ui-framework/doc_site/**/*',
        'packages/kbn-ui-framework/generator-kui/**/*',
        'packages/kbn-ui-framework/Gruntfile.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: false,
            peerDependencies: true,
          },
        ],
      },
    },

    // files that are allowed to use devDepenedncies
    {
      files: [
        'packages/kbn-ui-framework/**/*.test.js',
        'packages/kbn-ui-framework/doc_site/**/*',
        'packages/kbn-ui-framework/generator-kui/**/*',
        'packages/kbn-ui-framework/Gruntfile.js',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
            peerDependencies: true,
          },
        ],
      },
    },
  ],
};
