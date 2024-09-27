/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import { RuleTester } from 'eslint';
import {
  NoProtectedESLintDisableRule,
  PROTECTED_DISABLE_MSG_ID,
} from './no_protected_eslint_disable';

jest.mock('../helpers/protected_rules', () => {
  return {
    PROTECTED_RULES: new Set(['@kbn/disable/no_protected_eslint_disable', 'no-console']),
  };
});

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
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable-next-line no-use-before-define
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable-line no-use-before-define
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var */
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var, no-control-regex*/
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            alert('foo'); // eslint-disable-line no-alert
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            /* eslint-disable no-alert */
            alert(foo);
            /* eslint-enable no-alert */
            bar += 'r';
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            /* eslint-disable-next-line no-alert */
            alert(foo);
            bar += 'r';
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            alert(foo);/* eslint-disable-line no-alert */
            bar += 'r';
          `,
        },
      ],

      invalid: [
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var,no-console */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var,no-console*/
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /*eslint-disable no-var,no-console*/
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable no-var,no-console
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            // eslint-disable no-var
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            //eslint-disable no-var,no-console
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            // eslint-disable no-var
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var,@kbn/disable/no_protected_eslint_disable */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: '@kbn/disable/no_protected_eslint_disable',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var, @kbn/disable/no_protected_eslint_disable */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: '@kbn/disable/no_protected_eslint_disable',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable @kbn/disable/no_protected_eslint_disable, no-var */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: '@kbn/disable/no_protected_eslint_disable',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable prefer-const, @kbn/disable/no_protected_eslint_disable, no-var */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: '@kbn/disable/no_protected_eslint_disable',
              },
            },
          ],
          output: dedent`
            /* eslint-disable prefer-const, no-var */
            const a = 1;
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-var, @kbn/disable/no_protected_eslint_disable, prefer-const */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: '@kbn/disable/no_protected_eslint_disable',
              },
            },
          ],
          output: dedent`
            /* eslint-disable no-var, prefer-const */
            const a = 1;
          `,
        },
        // generic invalid tests for disable comments
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-console */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: '\nconst a = 1;',
        },
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable-next-line no-console
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: `\nconst a = 1;`,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable no-console*/
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: '',
        },
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable-next-line no-console
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: '',
        },
        {
          filename: 'foo.ts',
          code: dedent`
            alert('foo');// eslint-disable-line no-console
          `,
          errors: [
            {
              line: 1,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: `alert('foo');`,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            /* eslint-disable no-console */
            alert(foo);
            /* eslint-enable */
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            const foo = 'foo';
            let bar = 'ba';

            alert(foo);
            /* eslint-enable */
            bar += 'r';
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            /* eslint-disable no-console */
            alert(foo);
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            const foo = 'foo';
            let bar = 'ba';

            alert(foo);
            bar += 'r';
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            /* eslint-disable-next-line no-console */
            alert(foo);
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            const foo = 'foo';
            let bar = 'ba';

            alert(foo);
            bar += 'r';
          `,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            alert(foo);/* eslint-disable-line no-console */
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: PROTECTED_DISABLE_MSG_ID,
              data: {
                disabledRuleName: 'no-console',
              },
            },
          ],
          output: dedent`
            const foo = 'foo';
            let bar = 'ba';
            alert(foo);
            bar += 'r';
          `,
        },
      ],
    });
  });
}
