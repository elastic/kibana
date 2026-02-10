/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import banPlugin from 'eslint-plugin-ban';
import importPlugin from 'eslint-plugin-import';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';
import eslintCommentsPlugin from 'eslint-plugin-eslint-comments';
import { fixupPluginRules } from '@eslint/compat';

// Sanitize globals keys – the `globals` package ships entries like
// "AudioWorkletGlobalScope " that contain trailing whitespace which
// ESLint 9 rejects.
const sanitize = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.trim(), v]));

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        // NOTE: project is undefined to avoid performance issues
        // https://github.com/typescript-eslint/typescript-eslint/issues/389
        project: undefined,
      },
      globals: {
        ...sanitize(globals.es2015),
        ...sanitize(globals.node),
        ...sanitize(globals.mocha),
        ...sanitize(globals.browser),
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      ban: banPlugin,
      import: fixupPluginRules(importPlugin),
      'no-unsanitized': noUnsanitizedPlugin,
      'eslint-comments': eslintCommentsPlugin,
    },
    rules: {
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/array-type': 'off',
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
      camelcase: 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
        },
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
          filter: { regex: '^UNSAFE_', match: true },
          prefix: ['UNSAFE_'],
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allowSingleOrDouble',
        },
        {
          selector: 'variable',
          modifiers: ['destructured'],
          format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
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
          format: ['camelCase', 'PascalCase'],
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
      '@typescript-eslint/no-undef': 'off',
      'no-undef': 'off',
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { path: 'never', types: 'never', lib: 'never' },
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
      '@typescript-eslint/no-unused-expressions': ['error', { allowTaggedTemplates: true }],
      'no-unused-labels': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'one-var': ['error', 'never'],
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      radix: 'error',
      'spaced-comment': ['error', 'always', { exceptions: ['/'] }],
      'use-isnan': 'error',

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
  },
];
