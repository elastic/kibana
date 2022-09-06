/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import { RuleTester } from 'eslint';
import { NoNakedESLintDisableRule, NAKED_DISABLE_MSG_ID } from './no_naked_eslint_disable';

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
    tester.run('@kbn/disable/no_naked_eslint_disable', NoNakedESLintDisableRule, {
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
            /* eslint-disable no-console, no-control-regex*/
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
            /* eslint-disable */
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: NAKED_DISABLE_MSG_ID,
            },
          ],
          output: '\nconst a = 1;',
        },
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable-next-line
            const a = 1;
          `,
          errors: [
            {
              line: 1,
              messageId: NAKED_DISABLE_MSG_ID,
            },
          ],
          output: `\nconst a = 1;`,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            /* eslint-disable */
          `,
          errors: [
            {
              line: 1,
              messageId: NAKED_DISABLE_MSG_ID,
            },
          ],
          output: '',
        },
        {
          filename: 'foo.ts',
          code: dedent`
            // eslint-disable-next-line
          `,
          errors: [
            {
              line: 1,
              messageId: NAKED_DISABLE_MSG_ID,
            },
          ],
          output: '',
        },
        {
          filename: 'foo.ts',
          code: dedent`
            alert('foo');// eslint-disable-line
          `,
          errors: [
            {
              line: 1,
              messageId: NAKED_DISABLE_MSG_ID,
            },
          ],
          output: `alert('foo');`,
        },
        {
          filename: 'foo.ts',
          code: dedent`
            const foo = 'foo';
            let bar = 'ba';
            /* eslint-disable */
            alert(foo);
            /* eslint-enable */
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: NAKED_DISABLE_MSG_ID,
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
            /* eslint-disable */
            alert(foo);
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: NAKED_DISABLE_MSG_ID,
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
            /* eslint-disable-next-line */
            alert(foo);
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: NAKED_DISABLE_MSG_ID,
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
            alert(foo);/* eslint-disable-line */
            bar += 'r';
          `,
          errors: [
            {
              line: 3,
              messageId: NAKED_DISABLE_MSG_ID,
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
