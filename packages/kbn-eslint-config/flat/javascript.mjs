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
import babelParser from '@babel/eslint-parser';
import mochaPlugin from 'eslint-plugin-mocha';
import importPlugin from 'eslint-plugin-import';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';
import { fixupPluginRules } from '@eslint/compat';
import RESTRICTED_GLOBALS from '../restricted_globals.js';

// Sanitize globals keys – the `globals` package ships entries like
// "AudioWorkletGlobalScope " that contain trailing whitespace which
// ESLint 9 rejects.
const sanitize = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.trim(), v]));

const RESTRICTED_MODULES = { paths: ['gulp-util'] };

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@kbn/babel-preset/node_preset'],
          parserOpts: {
            plugins: ['importAttributes'],
          },
        },
      },
      globals: {
        ...sanitize(globals.es2015),
        ...sanitize(globals.node),
        ...sanitize(globals.mocha),
        ...sanitize(globals.browser),
      },
    },
    plugins: {
      mocha: mochaPlugin,
      import: fixupPluginRules(importPlugin),
      'no-unsanitized': noUnsanitizedPlugin,
    },
    rules: {
      'block-scoped-var': 'error',
      camelcase: ['error', { properties: 'never', allow: ['^UNSAFE_'] }],
      'consistent-return': 'off',
      'dot-notation': ['error', { allowKeywords: true }],
      eqeqeq: ['error', 'allow-null'],
      'guard-for-in': 'error',
      'new-cap': ['error', { capIsNewExceptions: ['Private'] }],
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
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-use-before-define': ['error', 'nofunc'],
      'no-var': 'error',
      'no-with': 'error',
      'one-var': ['error', 'never'],
      'prefer-const': 'error',
      strict: ['error', 'never'],
      'valid-typeof': 'error',
      yoda: 'off',

      'mocha/handle-done-callback': 'error',
      'mocha/no-exclusive-tests': 'error',

      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',
      'import/no-named-as-default': 'error',
      'import/no-named-as-default-member': 'error',
      'import/no-duplicates': 'error',
      'import/no-dynamic-require': 'error',

      'prefer-object-spread': 'error',
    },
  },
];
