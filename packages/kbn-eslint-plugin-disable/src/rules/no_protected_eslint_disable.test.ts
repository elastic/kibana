/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import { RuleTester } from 'eslint';
import {
  NoProtectedESLintDisableRule,
  PROTECTED_DISABLE_MSG_ID,
} from './no_protected_eslint_disable';

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      ecmaFeatures: {
        jsx: true,
      },
    },
  }),
] as const;

const babelTester = [
  '@babel/eslint-parser',
  new RuleTester({
    parser: require.resolve('@babel/eslint-parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      requireConfigFile: false,
      babelOptions: {
        presets: ['@kbn/babel-preset/node_preset'],
      },
    },
  }),
] as const;

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/disable/no_protected_eslint_disable', NoProtectedESLintDisableRule, {
      valid: [
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable no-var
          `,
        },
      ],

      invalid: [
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
            },
          ],
          output: '\nconst a = 1;',
        },
      ],
    });
  });
}
