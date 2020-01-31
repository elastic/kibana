const semver = require('semver');
const { readdirSync } = require('fs');
const PKG = require('../../package.json');
const RESTRICTED_GLOBALS = require('./restricted_globals');
const RESTRICTED_MODULES = { paths: ['gulp-util'] };

module.exports = {
  overrides: [
    /**
     * Main JS configuration
     */
    {
      files: ['**/*.js'],
      parser: 'babel-eslint',

      plugins: [
        'mocha',
        'babel',
        'react',
        'react-hooks',
        'import',
        'no-unsanitized',
        'prefer-object-spread',
        'jsx-a11y',
      ],

      settings: {
        react: {
          version: semver.valid(semver.coerce(PKG.dependencies.react)),
        },
        'import/resolver': {
          '@kbn/eslint-import-resolver-kibana': {
            forceNode: true,
          },
        },
      },

      env: {
        es6: true,
        node: true,
        mocha: true,
        browser: true,
      },

      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 6,
        ecmaFeatures: { experimentalObjectRestSpread: true },
      },

      rules: {
        'block-scoped-var': 'error',
        camelcase: [ 'error', { properties: 'never' } ],
        'consistent-return': 'off',
        'dot-notation': [ 'error', { allowKeywords: true } ],
        eqeqeq: [ 'error', 'allow-null' ],
        'guard-for-in': 'error',
        'new-cap': [ 'error', { capIsNewExceptions: [ 'Private' ] } ],
        'no-bitwise': 'off',
        'no-caller': 'error',
        'no-cond-assign': 'off',
        'no-const-assign': 'error',
        'no-debugger': 'error',
        'no-empty': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-global-assign': 'error',
        'no-irregular-whitespace': 'error',
        'no-iterator': 'error',
        'no-loop-func': 'error',
        'no-multi-str': 'off',
        'no-nested-ternary': 'error',
        'no-new': 'off',
        'no-path-concat': 'off',
        'no-proto': 'error',
        'no-redeclare': 'error',
        'no-restricted-globals': ['error', ...RESTRICTED_GLOBALS],
        'no-restricted-imports': [2, RESTRICTED_MODULES],
        'no-restricted-modules': [2, RESTRICTED_MODULES],
        'no-return-assign': 'off',
        'no-script-url': 'error',
        'no-sequences': 'error',
        'no-shadow': 'off',
        'no-undef': 'error',
        'no-underscore-dangle': 'off',
        'no-unsanitized/method': 'error',
        'no-unsanitized/property': 'error',
        'no-unused-expressions': 'off',
        'no-unused-vars': [ 'error' ],
        'no-use-before-define': [ 'error', 'nofunc' ],
        'no-var': 'error',
        'no-with': 'error',
        'one-var': [ 'error', 'never' ],
        'prefer-const': 'error',
        strict: [ 'error', 'never' ],
        'valid-typeof': 'error',
        yoda: 'off',

        'react/jsx-uses-react': 'error',
        'react/react-in-jsx-scope': 'error',
        'react/jsx-uses-vars': 'error',
        'react/jsx-no-undef': 'error',
        'react/jsx-pascal-case': 'error',
        'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
        'react/no-danger': 'error',
        'react/self-closing-comp': 'error',
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
        'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
        'jsx-a11y/accessible-emoji': 'error',
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/anchor-has-content': 'error',
        'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-role': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/heading-has-content': 'error',
        'jsx-a11y/html-has-lang': 'error',
        'jsx-a11y/iframe-has-title': 'error',
        'jsx-a11y/interactive-supports-focus': 'error',
        'jsx-a11y/media-has-caption': 'error',
        'jsx-a11y/mouse-events-have-key-events': 'error',
        'jsx-a11y/no-access-key': 'error',
        'jsx-a11y/no-distracting-elements': 'error',
        'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
        'jsx-a11y/no-noninteractive-element-interactions': 'error',
        'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
        'jsx-a11y/no-redundant-roles': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',
        'jsx-a11y/role-supports-aria-props': 'error',
        'jsx-a11y/scope': 'error',
        'jsx-a11y/tabindex-no-positive': 'error',
        'jsx-a11y/label-has-associated-control': 'error',
        'react/no-will-update-set-state': 'error',
        'react/no-is-mounted': 'error',
        'react/no-multi-comp': ['error', { ignoreStateless: true }],
        'react/no-unknown-property': 'error',
        'react/prefer-es6-class': ['error', 'always'],
        'react/prefer-stateless-function': ['error', { ignorePureComponents: true }],
        'react/no-unescaped-entities': 'error',

        'mocha/handle-done-callback': 'error',
        'mocha/no-exclusive-tests': 'error',

        'import/no-unresolved': [ 'error', { 'amd': true, 'commonjs': true } ],
        'import/named': 'error',
        'import/namespace': 'error',
        'import/default': 'error',
        'import/export': 'error',
        'import/no-named-as-default': 'error',
        'import/no-named-as-default-member': 'error',
        'import/no-duplicates': 'error',
        'import/no-dynamic-require': 'error',

        'prefer-object-spread/prefer-object-spread': 'error',
      }
    },
  ]
};
