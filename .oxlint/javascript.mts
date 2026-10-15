/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap, OxlintOverride } from 'oxlint';

export const javascriptRules: DummyRuleMap = {
  'dot-notation': ['error', { allowKeywords: true }],
  'block-scoped-var': 'error',
  // 'camelcase': ['error', { 'properties': 'never', 'allow': ['^UNSAFE_'] }],
  'consistent-return': 'off',
  'constructor-super': 'error',
  // 'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
  // '@eslint-community/eslint-comments/no-unused-disable': 'error',
  // '@eslint-community/eslint-comments/no-unused-enable': 'error',
  'guard-for-in': 'error',
  // 'import/default': 'error',
  // 'import/export': 'error',
  // 'import/named': 'error',
  // 'import/namespace': 'error',
  // 'import/no-default-export': 'error',
  // 'import/no-dynamic-require': 'error',
  // 'import/no-named-as-default': 'error',
  // 'import/no-named-as-default-member': 'error',
  // 'import/order': [
  //   'error',
  //   {
  //     'groups': [['external', 'builtin'], 'internal', ['parent', 'sibling', 'index']]
  //   }
  // ],

  // 'max-classes-per-file': ['error', 1],
  // 'mocha/handle-done-callback': 'error',
  // 'mocha/no-exclusive-tests': 'error',
  // 'new-cap': ['error', { 'capIsNewExceptions': ['Private'] }],
  // 'no-bitwise': 'error',
  'no-caller': 'error',
  'no-cond-assign': 'error',
  // 'no-console': 'error',
  'no-const-assign': 'error',
  'no-debugger': 'error',
  'no-empty': 'error',
  'no-eval': 'error',
  'no-extend-native': 'error',
  // 'no-global-assign': 'error',
  // 'no-irregular-whitespace': 'error',
  'no-iterator': 'error',
  // 'no-loop-func': 'error',
  // 'no-multi-str': 'error',
  // 'no-nested-ternary': 'error',
  // 'no-new': 'error',
  'no-new-wrappers': 'error',
  // 'no-path-concat': 'error',
  // 'no-proto': 'error',
  // 'no-redeclare': 'error',
  // 'no-restricted-globals': ['error', ...RESTRICTED_GLOBALS],
  // 'no-restricted-imports': [2, RESTRICTED_MODULES],
  // 'no-restricted-modules': [2, RESTRICTED_MODULES],
  // 'no-restricted-syntax': [
  //   'error',
  //   {
  //     'selector': 'TSEnumDeclaration[const=true]',
  //     'message': 'Do not use `const` with enum declarations'
  //   }
  // ],
  // 'no-return-assign': 'error',
  'no-script-url': 'error',
  // 'no-sequences': 'error',
  // 'no-shadow': 'error',
  // 'no-throw-literal': 'error',
  // 'no-undef': 'error',
  // 'no-undef-init': 'error',
  'no-underscore-dangle': 'off',
  // 'no-unsafe-finally': 'error',
  // 'no-unsanitized/method': 'error',
  // 'no-unsanitized/property': 'error',
  // 'no-unused-expressions': 'error',
  'no-unused-labels': 'error',
  // 'no-unused-vars': ['error'],
  // 'no-use-before-define': ['error', 'nofunc'],
  // 'no-var': 'error',
  'no-with': 'error',
  // 'object-shorthand': 'error',
  // 'one-var': ['error', 'never'],
  // 'prefer-const': 'error',
  // 'prefer-object-spread': 'error',
  // 'prefer-rest-params': 'error',
  // 'radix': 'error',

  // 'spaced-comment': [
  //   'error',
  //   'always',
  //   {
  //     'exceptions': ['/']
  //   }
  // ],
  // 'strict': ['error', 'never'],
  'use-isnan': 'error',
  // 'valid-typeof': 'error',
  // 'yoda': 'off',
};

/** `import/no-duplicates` keeps the file scope it had in ESLint: all JS plus the TS packages that opted in. */
export const javascriptOverrides: OxlintOverride[] = [
  {
    files: [
      '**/*.{js,mjs}',
      'x-pack/platform/plugins/shared/automatic_import/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/ecs_data_quality_dashboard/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-elastic-assistant-common/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/packages/shared/kbn-langchain/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/packages/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_ess/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution_serverless/**/*.{js,mjs,ts,tsx}',
      'x-pack/solutions/security/plugins/timelines/**/*.{js,mjs,ts,tsx}',
      'x-pack/platform/plugins/shared/cases/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-cell-actions/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-connector-specs/**/*.{js,mjs,ts,tsx}',
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
      'src/platform/plugins/shared/workflows_management/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_execution_engine/**/*.{js,mjs,ts,tsx}',
      'src/platform/plugins/shared/workflows_extensions/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-workflows-ui/**/*.{js,mjs,ts,tsx}',
    ],
    rules: {
      'import/no-duplicates': 'error',
    },
  },
];
