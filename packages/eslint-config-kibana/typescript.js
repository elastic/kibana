// NOTE: This is the configuration to apply the typescript eslint parser
// in order to lint typescript files with eslint.
// Some IDEs could not be running eslint with the correct extensions yet
// as this package was moved from typescript-eslint-parser to @typescript-eslint/parser
//
// As a matter of example in IntelliJ IDEA this would be fixed on 2019.1 release to be launched soon.
// In order to have it working for now, we should add the extensions `ts,tsx` to the option
// `eslint.additional.file.extensions` that can be found on Help > Find Action > Registry
// To read more about it please visit
// https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000225170-ESLint-and-ts-Typescript-files

const semver = require('semver');
const PKG = require('../../package.json');

const eslintConfigPrettierTypescriptEslintRules = require('eslint-config-prettier/@typescript-eslint').rules;

module.exports = {
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',

      plugins: [
        '@typescript-eslint',
        'ban',
        'import',
        'jsx-a11y',
        'prefer-object-spread',
      ],

      settings: {
        react: {
          version: semver.valid(semver.coerce(PKG.dependencies.react)),
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
        ecmaFeatures: {
          experimentalObjectRestSpread: true,
          jsx: true
        },
        project: './tsconfig.json'
      },

      // NOTE: we can't override the extends option here to apply
      // all the recommend rules as it is not allowed yet
      // more info on: https://github.com/eslint/rfcs/pull/13 and
      // https://github.com/eslint/eslint/issues/8813
      //
      // For now we are using an workaround to create
      // those extended rules arrays
      rules: Object.assign(
        {
          // Most of the ports were done according
          // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/ROADMAP.md
          //
          // Old recommended tslint rules
          '@typescript-eslint/adjacent-overload-signatures': 'error',
          '@typescript-eslint/array-type': ['error', 'array-simple'],
          '@typescript-eslint/ban-types': 'error',
          'camelcase': 'off',
          '@typescript-eslint/camelcase': ['error', {
            'properties': 'never',
            'ignoreDestructuring': true,
            'allow': ['^[A-Z0-9_]+$']
          }],
          '@typescript-eslint/class-name-casing': 'error',
          // TODO: disable this rule until a PR with more options to configure
          //       get merged and we can then reproduce the old behaviour
          // https://github.com/typescript-eslint/typescript-eslint/pull/322
          // '@typescript-eslint/explicit-member-accessibility': 'error',
          'indent': 'off',
          '@typescript-eslint/indent': [ 'error', 2, { SwitchCase: 1 } ],
          '@typescript-eslint/prefer-function-type': 'error',
          '@typescript-eslint/prefer-interface': 'error',
          '@typescript-eslint/member-ordering': ['error', {
            'default': ['public-static-field', 'static-field', 'instance-field']
          }],
          '@typescript-eslint/no-angle-bracket-type-assertion': 'error',
          '@typescript-eslint/no-empty-interface': 'error',
          '@typescript-eslint/no-misused-new': 'error',
          '@typescript-eslint/no-namespace': 'error',
          '@typescript-eslint/no-triple-slash-reference': 'error',
          '@typescript-eslint/no-var-requires': 'error',
          '@typescript-eslint/type-annotation-spacing': 'error',
          '@typescript-eslint/unified-signatures': 'error',
          'arrow-body-style': 'error',
          'arrow-parens': 'error',
          'comma-dangle': ['error', 'always-multiline'],
          'constructor-super': 'error',
          'curly': 'error',
          'dot-notation': 'error',
          'eol-last': 'error',
          'eqeqeq': ['error', 'always', {'null': 'ignore'}],
          'guard-for-in': 'error',
          // TODO: this should be replaced by a custom rule as this plugin
          //       don't identify individual groups
          // 'import/order': ['error', {
          //   'groups': [
          //     ['external', 'builtin'],
          //     'internal'
          //   ],
          // }],
          'max-classes-per-file': ['error', 1],
          'max-len': [ 'error', { code: 120, ignoreComments: true, ignoreUrls: true } ],
          'new-parens': 'error',
          'no-bitwise': 'error',
          'no-caller': 'error',
          'no-cond-assign': 'error',
          'no-console': 'error',
          'no-debugger': 'error',
          'no-empty': 'error',
          'no-eval': 'error',
          'no-multiple-empty-lines': 'error',
          'no-new-wrappers': 'error',
          'no-shadow': 'error',
          'no-throw-literal': 'error',
          'no-trailing-spaces': 'error',
          'no-undef-init': 'error',
          'no-unsafe-finally': 'error',
          'no-unused-expressions': 'error',
          'no-unused-labels': 'error',
          'no-var': 'error',
          'object-curly-spacing': 'error',
          'object-shorthand': 'error',
          'prefer-const': 'error',
          'quotes': ['error', 'double', { 'avoidEscape': true }],
          'quote-props': ['error', 'consistent-as-needed'],
          'radix': 'error',
          'semi': 'error',
          'space-before-function-paren': ['error', {
            'anonymous': 'never',
            'named': 'never',
            'asyncArrow': 'always'
          }],
          'spaced-comment': ["error", "always", {
            "exceptions": ["/"]
          }],
          'use-isnan': 'error',

          // Old tslint yml override or defined rules
          'ban/ban': [
            2,
            {'name': ['describe', 'only'], 'message': 'No exclusive suites.'},
            {'name': ['it', 'only'], 'message': 'No exclusive tests.'},
            {'name': ['test', 'only'], 'message': 'No exclusive tests.'},

          ],
          'jsx-a11y/accessible-emoji': 'error',
          'jsx-a11y/alt-text': 'error',
          'jsx-a11y/anchor-has-content': 'error',
          'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
          'jsx-a11y/aria-props': 'error',
          'jsx-a11y/aria-proptypes': 'error',
          'jsx-a11y/aria-role': 'error',
          'jsx-a11y/aria-unsupported-elements': 'error',
          'jsx-a11y/click-events-have-key-events': 'error',
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
          'jsx-a11y/no-onchange': 'error',
          'jsx-a11y/no-redundant-roles': 'error',
          'jsx-a11y/role-has-required-aria-props': 'error',
          'jsx-a11y/role-supports-aria-props': 'error',
          'jsx-a11y/scope': 'error',
          'jsx-a11y/tabindex-no-positive': 'error',
          'jsx-a11y/label-has-associated-control': 'error',
          '@kbn/eslint/no-default-export': 'error',
        },
        eslintConfigPrettierTypescriptEslintRules,
      )
    },
    {
      parserOptions: {
        project: 'x-pack/tsconfig.json'
      },
      files: ['x-pack/**/*.{ts,tsx}'],
    },
  ]
};
