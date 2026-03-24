// NOTE: This is the configuration to apply the typescript eslint parser
// in order to lint typescript files with eslint.
// Some IDEs could not be running eslint with the correct extensions yet
// as this package was moved from typescript-eslint-parser to @typescript-eslint/parser

const eslintConfigPrettierRules = require('eslint-config-prettier').rules;

module.exports = {
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',

      plugins: ['@typescript-eslint', 'ban', 'import', 'eslint-comments'],

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
          jsx: true,
        },
        // NOTE: That is to avoid a known performance issue related with the `ts.Program` used by
        // typescript eslint. As we are not using rules that need types information, we can safely
        // disabling that feature setting the project to undefined. That issue is being addressed
        // by the typescript eslint team. More info could be found here:
        // https://github.com/typescript-eslint/typescript-eslint/issues/389
        // https://github.com/typescript-eslint/typescript-eslint/issues/243
        // https://github.com/typescript-eslint/typescript-eslint/pull/361
        project: undefined,
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
          '@typescript-eslint/array-type': 'off',
          // ##
          // Replacing old @typescript-eslint/ban-types
          '@typescript-eslint/no-restricted-types': [
            'error',
            {
              types: {
                SFC: 'Use FC or FunctionComponent instead.',
                'React.SFC': 'Use React.FC instead.',
                StatelessComponent: 'Use FunctionComponent instead.',
                'React.StatelessComponent': 'Use React.FunctionComponent instead.',
              },
            },
          ],
          '@typescript-eslint/no-unsafe-function-type': 'off',
          '@typescript-eslint/no-wrapper-object-types': 'off',
          '@typescript-eslint/no-empty-object-type': 'off',
          // ##
          camelcase: 'off',
          "@typescript-eslint/consistent-type-imports": [
            "error",
            {
              "prefer": "type-imports",
              "disallowTypeAnnotations": false,
              "fixStyle": "separate-type-imports"
            }
          ],
          '@typescript-eslint/naming-convention': [
            'error',
            {
              selector: 'default',
              format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
              leadingUnderscore: 'allowSingleOrDouble',
              trailingUnderscore: 'allowSingleOrDouble',
            },
            {
              selector: 'classMethod',
              filter: {
                regex: '^UNSAFE_',
                match: true,
              },
              prefix: ['UNSAFE_'],
              format: ['camelCase'],
            },
            {
              selector: 'variable',
              format: [
                'camelCase',
                'UPPER_CASE', // e.g. const SOMETHING = ...
                'PascalCase', // e.g. React.FunctionComponent =
              ],
              leadingUnderscore: 'allowSingleOrDouble',
              trailingUnderscore: 'allowSingleOrDouble',
            },
            {
              selector: 'variable',
              modifiers: ['destructured'],
              format: [
                'camelCase',
                'snake_case', // e.g. properties from ES response objects
                'UPPER_CASE', // e.g. const SOMETHING = ...
                'PascalCase', // e.g. React.FunctionComponent =
              ],
              leadingUnderscore: 'allowSingleOrDouble',
              trailingUnderscore: 'allowSingleOrDouble',
            },
            {
              selector: 'parameter',
              format: ['camelCase', 'PascalCase', 'snake_case'],
              leadingUnderscore: 'allowSingleOrDouble',
              trailingUnderscore: 'allowSingleOrDouble',
            },
            {
              selector: 'function',
              format: [
                'camelCase',
                'PascalCase', // React.FunctionComponent =
              ],
              leadingUnderscore: 'allowSingleOrDouble',
              trailingUnderscore: 'allowSingleOrDouble',
            },
            {
              selector: 'typeLike',
              format: ['PascalCase', 'UPPER_CASE'],
              leadingUnderscore: 'allow',
              trailingUnderscore: 'allow',
            },
            {
              selector: 'enum',
              format: ['PascalCase', 'UPPER_CASE', 'camelCase'],
            },
            // https://typescript-eslint.io/rules/naming-convention/#ignore-properties-that-require-quotes
            // restore check behavior before https://github.com/typescript-eslint/typescript-eslint/pull/4582
            {
              selector: [
                'classProperty',
                'objectLiteralProperty',
                'typeProperty',
                'classMethod',
                'objectLiteralMethod',
                'typeMethod',
                'accessor',
                'enumMember',
              ],
              format: null,
              modifiers: ['requiresQuotes'],
            },
          ],
          '@typescript-eslint/explicit-member-accessibility': [
            'error',
            {
              accessibility: 'off',
              overrides: {
                accessors: 'explicit',
                constructors: 'no-public',
                parameterProperties: 'explicit',
              },
            },
          ],
          '@typescript-eslint/prefer-function-type': 'error',
          '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
          '@typescript-eslint/member-ordering': [
            'error',
            {
              default: ['public-static-field', 'static-field', 'instance-field'],
            },
          ],
          '@typescript-eslint/consistent-type-assertions': 'error',
          '@typescript-eslint/no-empty-interface': 'error',
          '@typescript-eslint/no-extra-non-null-assertion': 'error',
          '@typescript-eslint/no-misused-new': 'error',
          '@typescript-eslint/no-namespace': 'error',
          '@typescript-eslint/no-shadow': 'error',
          // rely on typescript
          '@typescript-eslint/no-undef': 'off',
          'no-undef': 'off',

          '@typescript-eslint/triple-slash-reference': [
            'error',
            {
              path: 'never',
              types: 'never',
              lib: 'never',
            },
          ],
          '@typescript-eslint/no-var-requires': 'error',
          '@typescript-eslint/unified-signatures': 'error',
          'constructor-super': 'error',
          'dot-notation': 'error',
          eqeqeq: ['error', 'always', { null: 'ignore' }],
          'guard-for-in': 'error',
          'import/order': [
            'error',
            {
              groups: [['external', 'builtin'], 'internal', ['parent', 'sibling', 'index']],
            },
          ],
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
          'no-script-url': 'error',
          'no-throw-literal': 'error',
          'no-undef-init': 'error',
          'no-unsafe-finally': 'error',
          'no-unsanitized/property': 'error',
          'no-unused-expressions': 'off',
          '@typescript-eslint/no-unused-expressions': ["error", { "allowTaggedTemplates": true }],
          'no-unused-labels': 'error',
          'no-var': 'error',
          'object-shorthand': 'error',
          'one-var': ['error', 'never'],
          'prefer-const': 'error',
          'prefer-rest-params': 'error',
          radix: 'error',
          'spaced-comment': [
            'error',
            'always',
            {
              exceptions: ['/'],
            },
          ],
          'use-isnan': 'error',

          // Old tslint yml override or defined rules
          'ban/ban': [
            2,
            { name: ['describe', 'only'], message: 'No exclusive suites.' },
            { name: ['it', 'only'], message: 'No exclusive tests.' },
            { name: ['test', 'only'], message: 'No exclusive tests.' },
            { name: ['testSuggestions', 'only'], message: 'No exclusive tests.' },
            { name: ['testErrorsAndWarnings', 'only'], message: 'No exclusive tests.' },
          ],
          'import/no-default-export': 'error',

          'eslint-comments/no-unused-disable': 'error',
          'eslint-comments/no-unused-enable': 'error',
          'no-restricted-syntax': [
            'error',
            {
              selector: 'TSEnumDeclaration[const=true]',
              message: 'Do not use `const` with enum declarations',
            },
          ],
        },
        eslintConfigPrettierRules
      ),
    },
  ],
};
