// NOTE: This is the configuration to apply the typescript eslint parser
// in order to lint typescript files with eslint.
// Some IDEs could not be running eslint with the correct extensions yet
// as this package was moved from typescript-eslint-parser to @typescript-eslint/parser

const eslintConfigPrettierRules = require('eslint-config-prettier').rules;

const commonOverridesConfig = {
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
};

const commonOverridesTSTypesConfig = {
  ...commonOverridesConfig,
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ...commonOverridesConfig.parserOptions,
    projectService: true,
  }
};

// The current implementation excluded all the variables matching the regexp.
// We should remove it as soon as multiple underscores are supported by the linter.
// https://github.com/typescript-eslint/typescript-eslint/issues/1712
// Due to the same reason we have to duplicate the "filter" option for "default" and other "selectors".
const allowedNameRegexp = '^(UNSAFE_|_{1,3})|_{1,3}$';
module.exports = {
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      ...commonOverridesConfig,

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
          '@typescript-eslint/naming-convention': [
            'error',
            {
              selector: 'default',
              format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
              filter: {
                regex: allowedNameRegexp,
                match: false,
              },
            },
            {
              selector: 'variable',
              format: [
                'camelCase',
                'UPPER_CASE', // const SOMETHING = ...
                'PascalCase', // React.FunctionComponent =
              ],
              filter: {
                regex: allowedNameRegexp,
                match: false,
              },
            },
            {
              selector: 'parameter',
              format: ['camelCase', 'PascalCase'],
              filter: {
                regex: allowedNameRegexp,
                match: false,
              },
            },
            {
              selector: 'memberLike',
              format: [
                'camelCase',
                'PascalCase',
                'snake_case', // keys in elasticsearch requests / responses
                'UPPER_CASE',
              ],
              filter: {
                regex: allowedNameRegexp,
                match: false,
              },
            },
            {
              selector: 'function',
              format: [
                'camelCase',
                'PascalCase', // React.FunctionComponent =
              ],
              filter: {
                regex: allowedNameRegexp,
                match: false,
              },
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
          '@typescript-eslint/no-unused-expressions': 'error',
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
    /**
     * Specific ts overrides
     */
    {
      files: ['**/*.{ts,tsx}'],
      excludedFiles: ['**/__fixtures__/**', '**/*.d.ts', '**/cypress.config*.ts', '**/x-pack/test/security_solution_playwright/**', '**/*.gen.ts'],
      ...commonOverridesTSTypesConfig,
      rules: {
        '@typescript-eslint/consistent-type-exports': 'error',
      },
    },
    {
      files: [
        // Root level packages
        'packages/kbn-mock-idp-plugin/**/*.{ts,tsx}',

        // X-pack Observability
        'x-pack/solutions/observability/packages/{kbn-alerts-grouping}/**/*.{ts,tsx}',
        'x-pack/solutions/observability/plugins/**/*.{ts,tsx}',

        // X-pack Security solution
        'x-pack/solutions/security/packages/{data-stream-adapter,features,navigation}/**/*.{ts,tsx}',
        'x-pack/solutions/security/plugins/{ecs_data_quality_dashboard,security_solution,security_solution_ess,security_solution_serverless}/**/*.{ts,tsx}',

        // X-pack test cases
        'x-pack/solutions/**/test/cases_api_integration/**/*.{ts,tsx}',
        'x-pack/test/api_integration/apis/cases/**/*.{ts,tsx}',

        // Platform and X-pack platform plugins
        'src/platform/plugins/private/{interactive_setup}/**/*.{ts,tsx}',
        'src/platform/plugins/shared/{discover,saved_search,osquery}/**/*.{ts,tsx}',
        'x-pack/platform/plugins/private/{data_visualizer,transform,file_upload}/**/*.{ts,tsx}',
        'x-pack/platform/plugins/shared/{fleet,automatic_import,aiops,ml,cases,encrypted_saved_objects,security,spaces,alerting,actions,stack_alerts,stack_connectors,triggers_actions_ui,event_log,rule_registry,task_manager,embeddable_alerts_table}/**/*.{ts,tsx}',

        // Platform and X-pack packages
        'src/platform/packages/private/{kbn-mock-idp-utils}/**/*.{ts,tsx}',
        'src/platform/packages/shared/{kbn-cell-actions,kbn-security-hardening,kbn-user-profile-components,response-ops,kbn-alerts-ui-shared,kbn-alerting-types,kbn-cases-components,kbn-actions-types,kbn-alerts-as-data-utils,kbn-grouping,kbn-rule,kbn-rule-data-utils,kbn-triggers-actions-ui-types}/**/*.{ts,tsx}',
        'x-pack/platform/packages/private/{ml,security}/**/*.{ts,tsx}',
        'x-pack/platform/packages/shared/{ml,security,kbn-alerting-comparators}/**/*.{ts,tsx}',

        // Tests and X-pack
        'src/platform/test/{interactive_setup_api_integration,interactive_setup_functional}/**/*.{ts,tsx}',
        'x-pack/platform/test/{spaces_api_integration,security_api_integration,security_functional,encrypted_saved_objects_api_integration,alerting_api_integration,cases_api_integration,rule_registry}/**/*.{ts,tsx}',
      ],
      excludedFiles: ['**/__fixtures__/**', '**/*.d.ts', '**/cypress.config*.ts', '**/x-pack/test/security_solution_playwright/**', '**/*.gen.ts'],
      ...commonOverridesTSTypesConfig,
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
      },
    },
    {
      files: ['server/**/*.{ts,tsx}', '*functional*/**/*.{ts,tsx}', '*api_integration*/**/*.{ts,tsx}'],
      ...commonOverridesTSTypesConfig,
      rules: {
        // Let's focus on server-side errors first to avoid server crashes.
        // We'll tackle /public eventually.
        '@typescript-eslint/no-floating-promises': 'error',
      },
    },
    {
      files: ['*spaces_api_integration/common/services/basic_auth_supertest.ts'],
      ...commonOverridesTSTypesConfig,
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
  ],
};
