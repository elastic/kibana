const RESTRICTED_MODULES = { paths: ['gulp-util'] };

module.exports = {
  overrides: [
    /**
     * Main JS configuration
     */
    {
      files: ['**/*.js', '**/*.mjs'],
      parser: require.resolve('@babel/eslint-parser'),

      plugins: [
        'mocha',
        'import',
        'no-unsanitized',
      ],

      env: {
        es6: true,
        node: true,
        mocha: true,
        browser: true,
      },

      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2018,
        requireConfigFile: false,
        babelOptions: {
          presets: ['@kbn/babel-preset/node_preset'],
          parserOpts: {
            plugins: ['importAttributes']
          }
        },
      },

      rules: {
        camelcase: [ 'error', { properties: 'never', allow: ['^UNSAFE_'] } ],
        'consistent-return': 'off',
        'no-multi-str': 'off',
        'no-new': 'off',
        'no-path-concat': 'off',
        'no-restricted-imports': [2, RESTRICTED_MODULES],
        'no-restricted-modules': [2, RESTRICTED_MODULES],
        'no-return-assign': 'off',
        'no-shadow': 'off',
        'no-undef': 'error',
        'no-underscore-dangle': 'off',
        'no-unsanitized/method': 'error',
        'no-unsanitized/property': 'error',
        'no-unused-expressions': 'off',
        strict: [ 'error', 'never' ],
        yoda: 'off',

        'mocha/handle-done-callback': 'error',
        'mocha/no-exclusive-tests': 'error',

        'import/named': 'error',
        'import/namespace': 'error',
        'import/no-named-as-default-member': 'error',
        'import/no-duplicates': 'error',

      }
    },
  ]
};
