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
import jestPlugin from 'eslint-plugin-jest';

// Sanitize globals keys – the `globals` package ships entries with trailing
// whitespace which ESLint 9 rejects.
const sanitize = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.trim(), v]));

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: [
      '**/*.test.{js,mjs,ts,tsx}',
      '**/*.test.mocks.{js,mjs,ts,tsx}',
      '**/*.mock.{js,mjs,ts,tsx}',
      '**/__mocks__/**/*.{js,mjs,ts,tsx}',
    ],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...sanitize(globals.jest),
      },
    },
    rules: {
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'import/order': 'off',
    },
  },
];
