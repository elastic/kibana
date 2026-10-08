/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRuleMap } from 'oxlint';

export const typescriptRules: DummyRuleMap = {
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
  '@typescript-eslint/adjacent-overload-signatures': 'error',
  // '@typescript-eslint/array-type': 'error',
  '@typescript-eslint/consistent-type-assertions': 'error',
  // '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  // '@typescript-eslint/consistent-type-imports': [
  //   'error',
  //   {
  //     'prefer': 'type-imports',
  //     'disallowTypeAnnotations': false,
  //     'fixStyle': 'separate-type-imports'
  //   }
  // ],
  // '@typescript-eslint/member-ordering': [
  //   'error',
  //   {
  //     'default': ['public-static-field', 'static-field', 'instance-field']
  //   }
  // ],
  // '@typescript-eslint/naming-convention': [
  //   'error',
  //   {
  //     'selector': 'default',
  //     'format': ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
  //     'leadingUnderscore': 'allowSingleOrDouble',
  //     'trailingUnderscore': 'allowSingleOrDouble'
  //   },
  //   {
  //     'selector': 'classMethod',
  //     'filter': {
  //       'regex': '^UNSAFE_',
  //       'match': true
  //     },
  //     'prefix': ['UNSAFE_'],
  //     'format': ['camelCase']
  //   },
  //   {
  //     'selector': 'variable',
  //     'format': [
  //       'camelCase',
  //       'UPPER_CASE', // e.g. const SOMETHING = ...
  //       'PascalCase' // e.g. React.FunctionComponent =
  //     ],
  //     'leadingUnderscore': 'allowSingleOrDouble',
  //     'trailingUnderscore': 'allowSingleOrDouble'
  //   },
  //   {
  //     'selector': 'variable',
  //     'modifiers': ['destructured'],
  //     'format': [
  //       'camelCase',
  //       'snake_case', // e.g. properties from ES response objects
  //       'UPPER_CASE', // e.g. const SOMETHING = ...
  //       'PascalCase' // e.g. React.FunctionComponent =
  //     ],
  //     'leadingUnderscore': 'allowSingleOrDouble',
  //     'trailingUnderscore': 'allowSingleOrDouble'
  //   },
  //   {
  //     'selector': 'parameter',
  //     'format': ['camelCase', 'PascalCase', 'snake_case'],
  //     'leadingUnderscore': 'allowSingleOrDouble',
  //     'trailingUnderscore': 'allowSingleOrDouble'
  //   },
  //   {
  //     'selector': 'function',
  //     'format': [
  //       'camelCase',
  //       'PascalCase' // React.FunctionComponent =
  //     ],
  //     'leadingUnderscore': 'allowSingleOrDouble',
  //     'trailingUnderscore': 'allowSingleOrDouble'
  //   },
  //   {
  //     'selector': 'typeLike',
  //     'format': ['PascalCase', 'UPPER_CASE'],
  //     'leadingUnderscore': 'allow',
  //     'trailingUnderscore': 'allow'
  //   },
  //   {
  //     'selector': 'enum',
  //     'format': ['PascalCase', 'UPPER_CASE', 'camelCase']
  //   },
  //   // https://typescript-eslint.io/rules/naming-convention/#ignore-properties-that-require-quotes
  //   // restore check behavior before https://github.com/typescript-eslint/typescript-eslint/pull/4582
  //   {
  //     'selector': [
  //       'classProperty',
  //       'objectLiteralProperty',
  //       'typeProperty',
  //       'classMethod',
  //       'objectLiteralMethod',
  //       'typeMethod',
  //       'accessor',
  //       'enumMember'
  //     ],
  //     'format': null,
  //     'modifiers': ['requiresQuotes']
  //   }
  // ],
  '@typescript-eslint/no-empty-interface': 'error',
  // '@typescript-eslint/no-empty-object-type': 'off',
  '@typescript-eslint/no-extra-non-null-assertion': 'error',
  '@typescript-eslint/no-misused-new': 'error',
  '@typescript-eslint/no-namespace': 'error',
  // '@typescript-eslint/no-shadow': 'error',
  // '@typescript-eslint/no-undef': 'error',
  // '@typescript-eslint/no-unsafe-function-type': 'error',
  // '@typescript-eslint/no-unused-expressions': ['error', { 'allowTaggedTemplates': true }],
  // '@typescript-eslint/no-var-requires': 'error',
  // '@typescript-eslint/no-wrapper-object-types': 'error',
  '@typescript-eslint/prefer-function-type': 'error',
  // '@typescript-eslint/triple-slash-reference': [
  //   'error',
  //   {
  //     'path': 'never',
  //     'types': 'never',
  //     'lib': 'never'
  //   }
  // ],
  '@typescript-eslint/unified-signatures': 'error',
  // 'ban/ban': [
  //   2,
  //   { 'name': ['describe', 'only'], 'message': 'No exclusive suites.' },
  //   { 'name': ['it', 'only'], 'message': 'No exclusive tests.' },
  //   { 'name': ['test', 'only'], 'message': 'No exclusive tests.' },
  //   { 'name': ['testSuggestions', 'only'], 'message': 'No exclusive tests.' },
  //   { 'name': ['testErrorsAndWarnings', 'only'], 'message': 'No exclusive tests.' }
  // ],
};
