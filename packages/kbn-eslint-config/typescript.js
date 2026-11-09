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

      // `ban/*` and `@eslint-community/eslint-comments/*` rules run in oxlint (.oxlint/ban.mts,
      // .oxlint/eslint_comments.mts); registered so `eslint-disable` directives naming them resolve.
      plugins: ['@typescript-eslint', 'ban', 'import', '@eslint-community/eslint-comments'],

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
          '@typescript-eslint/array-type': 'off',
          // ##
          // Replacing old @typescript-eslint/ban-types
          '@typescript-eslint/no-unsafe-function-type': 'off',
          '@typescript-eslint/no-empty-object-type': 'off',
          // ##
          // rely on typescript
          'no-undef': 'off',

          '@typescript-eslint/no-var-requires': 'error',
          'import/order': [
            'error',
            {
              groups: [['external', 'builtin'], 'internal', ['parent', 'sibling', 'index']],
            },
          ],
          'no-unused-expressions': 'off',
        },
        eslintConfigPrettierRules
      ),
    },
  ],
};
