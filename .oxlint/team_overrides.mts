/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

import { RESTRICTED_GLOBALS } from './javascript.mts';

/**
 * Overrides moved from the root `.eslintrc.js`, in the same order. Comments are the ones on the
 * ESLint overrides. `plugin:`/`eslint:recommended` presets are expanded to the rules they enable.
 */
export const teamOverrides: OxlintOverride[] = [
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*.{js,mjs,ts,tsx}'],
    rules: { 'jsx-a11y/click-events-have-key-events': 'off' },
  },
  {
    files: ['x-pack/platform/plugins/private/cross_cluster_replication/**/*.{js,mjs,ts,tsx}'],
    rules: { 'jsx-a11y/click-events-have-key-events': 'off' },
  },
  /**
   * Allow default exports
   */
  {
    files: [
      '**/*.stories.tsx',
      '**/*.test.js',
      'src/platform/test/*/config.ts',
      'src/platform/test/*/config_open.ts',
      'src/platform/test/*/*.config.ts',
      'src/platform/test/*/{tests,test_suites,apis,apps}/**/*',
      'src/platform/test/server_integration/**/*.ts',
      'x-pack/solutions/observability/plugins/apm/**/*.js',
      'x-pack/platform/test/*/{tests,test_suites,apis,apps}/**/*',
      'x-pack/platform/test/*api_integration*/**/*',
      'x-pack/platform/test/*/*config.*ts',
      'x-pack/solutions/*/test/**/{tests,test_suites,apis,apps,fixtures,index.ts}/**/*',
      'x-pack/solutions/*/test/**/*config*.ts',
      'x-pack/solutions/*/test/**/tests/**/*',
      'x-pack/solutions/*/test/api_integration_deployment_agnostic/*configs/**/*',
      'x-pack/solutions/*/test/alerting_api_integration/**/*',
      'x-pack/solutions/*/test/serverless/*/configs/**/*',
      'x-pack/platform/test/saved_object_api_integration/*/apis/**/*',
      'x-pack/platform/test/ui_capabilities/*/tests/**/*',
      'x-pack/platform/test/upgrade_assistant_integration/**/*',
      '**/cypress.config.{js,ts}',
      'x-pack/platform/test/serverless/shared/config*.ts',
      'x-pack/platform/test/serverless/*/test_suites/**/*',
      'x-pack/platform/test/serverless/functional/config*.ts',
      'x-pack/platform/test/serverless/*/configs/**/*',
      'x-pack/solutions/security/test/security_solution_api_integration/*/test_suites/**/*',
      'x-pack/solutions/security/test/security_solution_api_integration/**/config*.ts',
      '**/playwright.config.ts',
      '**/playwright.v2.config.ts',
      '**/*.playwright.config.ts',
      '**/parallel.playwright.config.ts',
    ],
    rules: { 'import/no-default-export': 'off', 'import/no-named-as-default': 'off' },
  },
  /**
   * Files that run BEFORE node version check
   */
  {
    files: ['scripts/**/*.js', 'src/setup_node_env/**/*.js'],
    rules: {
      'prefer-object-spread': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'prefer-destructuring': 'off',
    },
  },
  /**
   * Files that run in the browser with only node-level transpilation
   */
  {
    files: [
      'src/platform/packages/shared/kbn-ftr-common-functional-ui-services/services/web_element_wrapper/scroll_into_view_if_necessary.js',
      '**/browser_exec_scripts/**/*.js',
    ],
    rules: {
      'prefer-object-spread': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'prefer-destructuring': 'off',
    },
  },
  /**
   * Files that run AFTER node version check
   * and are not also transpiled with babel
   */
  {
    files: [
      '**/.eslintrc.js',
      'packages/kbn-eslint-plugin-eslint/**/*',
      'x-pack/gulpfile.js',
      'x-pack/scripts/*.js',
      '**/jest.config.js',
    ],
    excludeFiles: ['**/integration_tests/**/*'],
    rules: { 'prefer-object-spread': 'off' },
  },
  /**
   * Jest specific rules
   */
  { files: ['**/*.test.{js,mjs,ts,tsx}'], rules: { 'jest/valid-describe-callback': 'error' } },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'lodash', property: 'set', message: 'Please use @kbn/safer-lodash-set instead' },
        { object: '_', property: 'set', message: 'Please use @kbn/safer-lodash-set instead' },
        {
          object: 'lodash',
          property: 'setWith',
          message: 'Please use @kbn/safer-lodash-set instead',
        },
        { object: '_', property: 'setWith', message: 'Please use @kbn/safer-lodash-set instead' },
        {
          object: 'lodash',
          property: 'assoc',
          message: 'Please use @kbn/safer-lodash-set instead',
        },
        { object: '_', property: 'assoc', message: 'Please use @kbn/safer-lodash-set instead' },
        {
          object: 'lodash',
          property: 'assocPath',
          message: 'Please use @kbn/safer-lodash-set instead',
        },
        { object: '_', property: 'assocPath', message: 'Please use @kbn/safer-lodash-set instead' },
        {
          object: 'lodash',
          property: 'template',
          message:
            'lodash.template is unsafe, and not compatible with our content security policy.',
        },
        {
          object: '_',
          property: 'template',
          message:
            'lodash.template is unsafe, and not compatible with our content security policy.',
        },
      ],
    },
  },
  /**
   * APM, UX and Observability overrides
   */
  {
    files: [
      'x-pack/solutions/observability/plugins/apm/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/observability/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/exploratory_view/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/ux/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/plugins/slo/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/observability/packages/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'no-console': ['warn', { allow: ['error'] }],
      'react/function-component-definition': [
        'warn',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
    },
  },
  {
    files: [
      'x-pack/solutions/observability/plugins/apm/**/*.stories.*',
      'x-pack/solutions/observability/plugins/observability/**/*.stories.*',
      'x-pack/solutions/observability/plugins/exploratory_view/**/*.stories.*',
      'x-pack/solutions/observability/plugins/slo/**/*.stories.*',
      'x-pack/solutions/observability/packages/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'react/function-component-definition': 'off' },
  },
  {
    files: ['x-pack/solutions/observability/plugins/apm/server/**/route.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowTypedFunctionExpressions: false },
      ],
    },
  },
  /**
   * Automatic Import overrides
   */
  {
    files: [
      'x-pack/platform/plugins/shared/automatic_import/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/common/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'import/no-nodejs-modules': 'error' },
  },
  /**
   * Security Solution overrides. These rules below are maintained and owned by
   * the people within the security-detection-engine team. Please see ping them
   * or check with them if you are encountering issues, have suggestions, or would
   * like to add, change, or remove any particular rule. Linters, Typescript, and rules
   * evolve and change over time just like coding styles, so please do not hesitate to
   * reach out.
   */
  {
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/common/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'import/no-nodejs-modules': 'error' },
  },
  /**
   * Allow node.js imports for security solution test packages
   */
  {
    files: [
      'x-pack/solutions/security/packages/test-api-clients/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/kbn-security-evals-matrix/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'import/no-nodejs-modules': 'off' },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
    ],
    excludeFiles: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{test,mock,test_helper}.{ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{test,mock,test_helper}.{ts,tsx}',
    ],
    rules: { '@typescript-eslint/no-non-null-assertion': 'error' },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-useless-constructor': 'error',
    },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/data-stream-adapter/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-func-assign': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-inner-declarations': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-param-reassign': 'error',
      'unicorn/no-process-exit': 'error',
      'no-prototype-builtins': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'react/button-has-type': 'error',
      'react/forbid-dom-props': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-did-mount-set-state': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-redundant-should-component-update': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-this-in-sfc': 'error',
      'react/no-unsafe': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-fragments': 'error',
      'symbol-description': 'error',
      'vars-on-top': 'error',
    },
  },
  /**
   * Lists overrides. These rules below are maintained and owned by
   * the people within the security-detection-engine team. Please see ping them
   * or check with them if you are encountering issues, have suggestions, or would
   * like to add, change, or remove any particular rule. Linters, Typescript, and rules
   * evolve and change over time just like coding styles, so please do not hesitate to
   * reach out.
   */
  {
    files: [
      'x-pack/solutions/security/plugins/lists/public/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'import/no-nodejs-modules': 'error' },
  },
  {
    files: [
      'x-pack/solutions/security/plugins/lists/public/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/lists/common/*.{ts,tsx}',
    ],
    rules: {
      'react/button-has-type': 'error',
      'react/forbid-dom-props': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-did-mount-set-state': 'error',
      'react/no-did-update-set-state': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-redundant-should-component-update': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-this-in-sfc': 'error',
      'react/no-unsafe': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-fragments': 'error',
    },
  },
  // Scout tests
  {
    files: [
      '**/kbn-scout*/src/playwright/**/*.ts',
      'src/platform/plugins/**/test/scout_*/**/*.ts',
      'src/platform/plugins/**/test/scout/**/*.ts',
      'src/platform/packages/**/test/scout_*/**/*.ts',
      'src/platform/packages/**/test/scout/**/*.ts',
      'src/core/plugins/**/test/scout_*/**/*.ts',
      'src/core/plugins/**/test/scout/**/*.ts',
      'src/core/packages/**/test/scout_*/**/*.ts',
      'src/core/packages/**/test/scout/**/*.ts',
      'x-pack/**/plugins/**/test/scout_*/**/*.ts',
      'x-pack/**/plugins/**/test/scout/**/*.ts',
      'x-pack/**/packages/**/test/scout_*/**/*.ts',
      'x-pack/**/packages/**/test/scout/**/*.ts',
      'examples/**/test/scout_*/**/*.ts',
      'examples/**/test/scout/**/*.ts',
      'x-pack/examples/**/test/scout_*/**/*.ts',
      'x-pack/examples/**/test/scout/**/*.ts',
      'src/core/test/scout_*/**/*.ts',
      'src/core/test/scout/**/*.ts',
      'packages/**/test/scout{_*,}/**/*.ts',
    ],
    excludeFiles: ['src/platform/packages/shared/kbn-scout/src/playwright/**/*.test.ts'],
    rules: {
      'no-empty-pattern': 'off',
      // Check all function arguments to catch unused destructured params
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // ESLint matched `public/**/!(*.test).{js,mjs,ts,tsx}`; oxlint globs have no extglobs.
    files: ['x-pack/solutions/security/plugins/lists/public/**/*.{js,mjs,ts,tsx}'],
    excludeFiles: ['x-pack/solutions/security/plugins/lists/public/**/*.test.{js,mjs,ts,tsx}'],
    rules: { 'react-perf/jsx-no-new-function-as-prop': 'error' },
  },
  {
    files: ['x-pack/solutions/security/plugins/lists/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      'func-style': ['error', 'expression'],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
          ignoreCase: false,
          ignoreMemberSort: false,
          allowSeparatedGroups: false,
        },
      ],
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-func-assign': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-inner-declarations': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-param-reassign': ['error', { props: true }],
      'unicorn/no-process-exit': 'error',
      'no-prototype-builtins': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-escape': 'error',
      'no-useless-rename': 'error',
      'no-void': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'symbol-description': 'error',
      'vars-on-top': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-useless-constructor': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-unused-vars': 'error',
      'no-template-curly-in-string': 'error',
      'prefer-destructuring': 'error',
    },
  },
  /**
   * Alerting Services overrides
   */
  {
    files: [
      'x-pack/platform/plugins/shared/actions/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/alerting/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/stack_alerts/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/task_manager/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/event_log/**/*.{ts,tsx}',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/stack_connectors/server/**/*.ts',
      'x-pack/platform/plugins/shared/triggers_actions_ui/server/**/*.ts',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  /**
   * Stack Connectors Specs package
   * This package contains common code for public and server side
   */
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'import/no-nodejs-modules': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      'no-unused-vars': 'error',
    },
  },
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/**/*.test.{ts,tsx}'],
    rules: { 'import/no-nodejs-modules': 'off' },
  },
  {
    files: ['src/platform/packages/shared/kbn-connector-specs/src/specs/**/icon/*.{ts,tsx}'],
    rules: { 'import/no-default-export': 'off' },
  },
  /**
   * Lens overrides
   */
  {
    files: ['x-pack/platform/plugins/shared/lens/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  /**
   * Onboarding team overrides
   */
  {
    files: [
      'x-pack/platform/plugins/shared/streams/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/streams_app/**/*.{ts,tsx}',
      'x-pack/solutions/observability/plugins/observability_onboarding/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/fields_metadata/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/dataset_quality/**/*.{ts,tsx}',
      'x-pack/platform/plugins/shared/data_quality/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-streams-schema/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-streams-ai/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-streamlang/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-streamlang-yaml-editor/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-streamlang-tests/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-sample-parser/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-grok-heuristics/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-evals-suite-streams/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-dissect-heuristics/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/kbn-content-packs-schema/**/*.{ts,tsx}',
      'x-pack/platform/packages/private/kbn-data-quality/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-xstate-utils/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-use-tracked-promise/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-timerange/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-synthtrace/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-synthtrace-client/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-react-hooks/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-otel-semantic-conventions/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-otel-demo/**/*.{ts,tsx}',
      'src/platform/packages/shared/kbn-grok-ui/**/*.{ts,tsx}',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  /**
   * Custom Content overrides
   */
  {
    files: [
      'x-pack/platform/plugins/shared/custom_content/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/custom-content/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Custom content renders LLM-generated HTML; it must stay inside the sandboxed iframe.
      'react/no-danger': 'error',
    },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/custom_content/**/*.{ts,tsx}',
      'x-pack/platform/packages/shared/custom-content/**/*.{ts,tsx}',
    ],
    excludeFiles: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'error' },
  },
  /**
   * Discover overrides
   */
  {
    files: [
      'src/platform/plugins/shared/discover/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/saved_search/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': false }],
    },
  },
  /**
   * Enterprise Search overrides
   * NOTE: We also have a single rule at the bottom of the file that
   * overrides Prettier's default of not linting unnecessary backticks
   */
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    rules: {
      'import/newline-after-import': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'no-unused-vars': [
        'error',
        { vars: 'all', args: 'after-used', ignoreRestSiblings: true, varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['x-pack/solutions/search/plugins/enterprise_search/**/*.{ts,tsx}'],
    excludeFiles: [
      'x-pack/solutions/search/plugins/enterprise_search/**/*.{test,mock,test_helper}.{ts,tsx}',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  /**
   * Canvas overrides
   */
  {
    files: ['x-pack/platform/plugins/private/canvas/**/*.js'],
    rules: {
      radix: 'error',
      'import/extensions': ['error', 'never', { json: 'always', less: 'always', svg: 'always' }],
      'react/no-did-mount-set-state': 'error',
      'react/no-did-update-set-state': 'error',
      'react/jsx-boolean-value': 'error',
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            { element: 'EuiConfirmModal', message: 'Use <ConfirmModal> instead' },
            { element: 'EuiPopover', message: 'Use <Popover> instead' },
            { element: 'EuiIconTip', message: 'Use <TooltipIcon> instead' },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-flot-charts/**/*.{js,ts,tsx,d.ts}',
      'x-pack/platform/plugins/private/canvas/public/**/*.{js,ts,tsx}',
      'x-pack/platform/plugins/private/canvas/canvas_plugin_src/**/*.{js,ts,tsx}',
      'x-pack/platform/plugins/private/monitoring/public/components/chart/**/*.{js,ts,tsx}',
      'x-pack/platform/plugins/private/monitoring/public/components/sparkline/**/*.{js,ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        ...RESTRICTED_GLOBALS,
        { name: '$', message: 'Import jQuery from @kbn/flot-charts instead of using the global.' },
        {
          name: 'jQuery',
          message: 'Import jQuery from @kbn/flot-charts instead of using the global.',
        },
      ],
    },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-flot-charts/index.js',
      'src/platform/packages/shared/kbn-flot-charts/index.d.ts',
    ],
    rules: { 'import/no-default-export': 'off' },
  },
  /**
   * TSVB overrides
   */
  {
    files: ['src/platform/plugins/shared/vis_types/timeseries/**/*.{js,mjs,ts,tsx}'],
    excludeFiles: ['src/platform/plugins/shared/vis_types/timeseries/**/*playwright.config.ts'],
    rules: { 'import/no-default-export': 'error' },
  },
  /**
   * Osquery overrides
   */
  {
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
    rules: {
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-delete-var': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-import-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-obj-calls': 'error',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'require-yield': 'error',
      'valid-typeof': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unsafe': 'off',
      'react/require-render-return': 'error',
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'getter-return': 'off',
      'no-class-assign': 'off',
      'no-dupe-class-members': 'off',
      'no-dupe-keys': 'off',
      'no-func-assign': 'off',
      'no-import-assign': 'off',
      'no-new-native-nonconstructor': 'off',
      'no-obj-calls': 'off',
      'no-redeclare': 'off',
      'no-setter-return': 'off',
      'no-this-before-super': 'off',
      'no-unreachable': 'off',
      'no-unsafe-negation': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-array-constructor': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
    },
  },
  {
    files: ['x-pack/platform/plugins/shared/osquery/**/*.{js,mjs}'],
    rules: {
      'no-unused-expressions': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
    },
  },
  {
    // ESLint matched `public/**/!(*.test).{js,mjs,ts,tsx}`; oxlint globs have no extglobs.
    files: ['x-pack/platform/plugins/shared/osquery/public/**/*.{js,mjs,ts,tsx}'],
    excludeFiles: ['x-pack/platform/plugins/shared/osquery/public/**/*.test.{js,mjs,ts,tsx}'],
    rules: { 'react-perf/jsx-no-new-function-as-prop': 'error' },
  },
  /**
   * Platform Security Team overrides
   */
  {
    files: [
      'src/platform/plugins/private/interactive_setup/**/*.{js,mjs,ts,tsx}',
      'packages/kbn-mock-idp-plugin/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/private/kbn-mock-idp-utils/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-security-hardening/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-user-profile-components/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/encrypted_saved_objects/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/encrypted_saved_objects_api_integration/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/security/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/private/security/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/security/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/security_api_integration/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/security_functional/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/spaces/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/test/spaces_api_integration/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          allowSeparatedGroups: false,
        },
      ],
    },
  },
  /**
   * Do not allow `any`
   */
  {
    files: [
      'src/platform/packages/shared/kbn-analytics/**',
      'src/platform/plugins/private/kibana_usage_collection/**',
      'src/platform/plugins/shared/usage_collection/**',
      'src/platform/plugins/shared/telemetry/**',
      'src/platform/plugins/shared/telemetry_collection_manager/**',
      'src/platform/plugins/shared/telemetry_management_section/**',
      'x-pack/platform/plugins/private/telemetry_collection_xpack/**',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: [
      'src/core/**',
      'x-pack/platform/plugins/shared/features/**',
      'x-pack/platform/plugins/shared/licensing/**',
      'x-pack/platform/plugins/shared/global_search/**',
      'x-pack/platform/plugins/shared/cloud/**',
      'src/platform/packages/shared/kbn-config-schema',
      'src/platform/plugins/shared/saved_objects_management/**',
      'src/platform/packages/shared/kbn-analytics/**',
      'src/platform/packages/private/kbn-telemetry-tools/**',
      'src/platform/plugins/private/kibana_usage_collection/**',
      'src/platform/plugins/shared/usage_collection/**',
      'src/platform/plugins/shared/telemetry/**',
      'src/platform/plugins/shared/telemetry_collection_manager/**',
      'src/platform/plugins/shared/telemetry_management_section/**',
      'x-pack/platform/plugins/private/telemetry_collection_xpack/**',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-check': false, 'ts-expect-error': false, 'ts-ignore': true, 'ts-nocheck': false },
      ],
    },
  },
  /**
   * Workflows Team: generic rules
   */
  {
    files: [
      'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-func-assign': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-inner-declarations': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-param-reassign': 'error',
      'unicorn/no-process-exit': 'error',
      'no-prototype-builtins': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'react/button-has-type': 'error',
      'react/forbid-dom-props': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-did-mount-set-state': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-redundant-should-component-update': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-this-in-sfc': 'error',
      'react/no-unsafe': 'error',
      'react/void-dom-elements-no-children': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-fragments': 'error',
      'symbol-description': 'error',
      'vars-on-top': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-useless-constructor': 'error',
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          allowSeparatedGroups: false,
        },
      ],
    },
  },
  /**
   * Workflows Team: public and common rules
   */
  {
    files: [
      'src/platform/plugins/shared/workflows_management/public/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_management/common/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/public/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/common/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'import/no-nodejs-modules': 'error' },
  },
  /**
   * Workflows Team: test files
   */
  {
    files: [
      'src/platform/plugins/shared/workflows_management/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{test,mock,test_helper}.{ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{test,mock,test_helper}.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  /**
   * Workflows Team: scripts files
   */
  {
    files: ['src/platform/packages/shared/kbn-workflows/scripts/**/*.{js,ts}'],
    rules: {
      'import/no-nodejs-modules': 'off',
      'no-console': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },
  /**
   * Code inside .buildkite runs separately from everything else in CI, before bootstrap, with Node. It needs a few tweaks because of this.
   */
  { files: ['.buildkite/**/*.{cjs,js,mjs,ts}'], rules: { 'no-console': 'off' } },
  /**
   * Repository tooling packages run outside the standard application bundles and need a few targeted lint overrides.
   */
  {
    files: [
      'src/platform/packages/*/kbn-repo-*/**/*',
      'packages/kbn-repo-*/**/*',
      'packages/kbn-validate-next-docs-cli/**/*',
      'packages/kbn-find-used-node-modules/**/*',
    ],
    rules: { 'max-classes-per-file': 'off' },
  },
  // These packages are CLI tools.
  { files: ['packages/kbn-dependency-usage/**/*.{ts,tsx}'], rules: { 'no-console': 'off' } },
  { files: ['packages/kbn-dependency-ownership/**/*.{ts,tsx}'], rules: { 'no-console': 'off' } },
  /**
   * Generated parser. Its `prefer-const` disable comments sit where ESLint reported, which is not where oxlint reports.
   */
  {
    files: [
      'x-pack/solutions/observability/plugins/synthetics/server/synthetics_service/formatters/variable_parser.js',
    ],
    rules: { 'prefer-const': 'off' },
  },
];

/**
 * Overrides moved from nested `.eslintrc` files. ESLint applied those after the root config, so
 * they stay last.
 */
export const nestedConfigOverrides: OxlintOverride[] = [
  {
    files: [
      'src/platform/plugins/shared/embeddable/**/*',
      'src/platform/plugins/shared/expressions/**/*',
      'src/platform/plugins/shared/kibana_utils/**/*',
      'x-pack/examples/embedded_lens_example/**/*',
      'x-pack/examples/exploratory_view_example/**/*',
      'x-pack/examples/lens_config_builder_example/**/*',
      'x-pack/examples/lens_embeddable_inline_editing_example/**/*',
      'x-pack/examples/testing_embedded_lens/**/*',
      'x-pack/examples/third_party_lens_navigation_prompt/**/*',
      'x-pack/examples/third_party_vis_lens_example/**/*',
      'x-pack/solutions/security/plugins/kubernetes_security/**/*',
      'x-pack/solutions/security/plugins/session_view/**/*',
    ],
    rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
  },
  {
    files: ['src/platform/plugins/shared/expressions/**/*'],
    rules: { '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }] },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-ambient-ui-types/**/*.d.ts',
      'x-pack/platform/plugins/shared/inference/scripts/evaluation/**/*.spec.ts',
      'x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/**/*.spec.ts',
    ],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-synthtrace-client/src/**/*',
      'src/platform/packages/shared/kbn-synthtrace/src/**/*',
      'x-pack/platform/plugins/shared/streams/test/scenarios/**/*',
      'x-pack/solutions/observability/plugins/apm/test/scenarios/**/*',
      'x-pack/solutions/observability/plugins/infra/test/scenarios/**/*',
      'x-pack/solutions/observability/plugins/synthetics/test/scenarios/**/*',
    ],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    // Node.js-only packages: Playwright eval suites and the MITRE ATT&CK server package.
    files: [
      'x-pack/solutions/security/packages/kbn-evals-suite-alert-analysis-workflow/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/kbn-evals-suite-alerts-rag/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-fp-tp/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/kbn-evals-suite-lead-generation/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/kbn-evals-suite-security-alert-triage/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/security-mitre-attack-server/**/*.{js,mjs,ts,tsx}',
    ],
    rules: { 'import/no-nodejs-modules': 'off' },
  },
];
