// NOTE: This is the configuration to apply the typescript eslint parser
// in order to lint typescript files with eslint.
// Some IDEs could not be running eslint with the correct extensions yet
// as this package was moved from typescript-eslint-parser to @typescript-eslint/parser

const eslintConfigPrettierTypescriptEslintRules = require('eslint-config-prettier/@typescript-eslint').rules;

module.exports = {
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',

      plugins: [
        '@typescript-eslint',
        'ban',
        'prefer-object-spread',
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
        ecmaFeatures: {
          jsx: true
        },
        // NOTE: That is to avoid a known performance issue related with the `ts.Program` used by
        // typescript eslint. As we are not using rules that need types information, we can safely
        // disabling that feature setting the project to undefined. That issue is being addressed
        // by the typescript eslint team. More info could be found here:
        // https://github.com/typescript-eslint/typescript-eslint/issues/389
        // https://github.com/typescript-eslint/typescript-eslint/issues/243
        // https://github.com/typescript-eslint/typescript-eslint/pull/361
        project: undefined
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
          '@typescript-eslint/array-type': ['error', { default: 'array-simple', readonly: 'array-simple' }],
          '@typescript-eslint/ban-types': ['error', {
            types: {
              SFC: {
                message: 'Use FC or FunctionComponent instead.',
                fixWith: 'FC'
              },
              'React.SFC': {
                message: 'Use FC or FunctionComponent instead.',
                fixWith: 'React.FC'
              },
              StatelessComponent: {
                message: 'Use FunctionComponent instead.',
                fixWith: 'FunctionComponent'
              },
              'React.StatelessComponent': {
                message: 'Use FunctionComponent instead.',
                fixWith: 'React.FunctionComponent'
              }
            }
          }],
          'camelcase': 'off',
          '@typescript-eslint/camelcase': ['error', {
            'properties': 'never',
            'ignoreDestructuring': true,
            'allow': ['^[A-Z0-9_]+$', '^UNSAFE_']
          }],
          '@typescript-eslint/class-name-casing': 'error',
          '@typescript-eslint/explicit-member-accessibility': ['error',
            {
              accessibility: 'off',
              overrides: {
                accessors: 'explicit',
                constructors: 'no-public',
                parameterProperties: 'explicit'
              }
            }
          ],
          '@typescript-eslint/prefer-function-type': 'error',
          '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
          '@typescript-eslint/member-ordering': ['error', {
            'default': ['public-static-field', 'static-field', 'instance-field']
          }],
          '@typescript-eslint/consistent-type-assertions': 'error',
          '@typescript-eslint/no-empty-interface': 'error',
          '@typescript-eslint/no-extra-non-null-assertion': 'error',
          '@typescript-eslint/no-misused-new': 'error',
          '@typescript-eslint/no-namespace': 'error',
          '@typescript-eslint/triple-slash-reference': ['error', {
            path: 'never',
            types: 'never',
            lib: 'never'
          }],
          '@typescript-eslint/no-var-requires': 'error',
          '@typescript-eslint/unified-signatures': 'error',
          'constructor-super': 'error',
          'dot-notation': 'error',
          'eqeqeq': ['error', 'always', {'null': 'ignore'}],
          'guard-for-in': 'error',
          'import/order': ['error', {
            'groups': [
              ['external', 'builtin'],
              'internal',
              ['parent', 'sibling', 'index'],
            ],
          }],
          'max-classes-per-file': ['error', 1],
          'no-bitwise': 'error',
          'no-caller': 'error',
          'no-cond-assign': 'error',
          'no-console': 'error',
          'no-debugger': 'error',
          'no-empty': 'error',
          'no-extend-native': 'error',
          'no-eval': 'error',
          'no-new-wrappers': 'error',
          'no-shadow': 'error',
          'no-throw-literal': 'error',
          'no-undef-init': 'error',
          'no-unsafe-finally': 'error',
          'no-unused-expressions': 'error',
          'no-unused-labels': 'error',
          'no-var': 'error',
          'object-shorthand': 'error',
          'one-var': [ 'error', 'never' ],
          'prefer-const': 'error',
          'prefer-rest-params': 'error',
          'radix': 'error',
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
          'import/no-default-export': 'error',
        },
        eslintConfigPrettierTypescriptEslintRules
      )
    },
  ]
};
