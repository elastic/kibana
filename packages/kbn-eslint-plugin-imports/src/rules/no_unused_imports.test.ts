/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { NoUnusedImportsRule } from './no_unused_imports';
import dedent from 'dedent';

const fmt = (str: TemplateStringsArray) => dedent(str) + '\n';

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
    tester.run('@kbn/imports/no_unused_imports', NoUnusedImportsRule, {
      valid: [
        {
          filename: 'foo.ts',
          code: fmt`
            import { foo, bar as Bar } from 'new'
            use(foo, Bar)
          `,
        },
        {
          filename: 'foo.ts',
          code: fmt`
            import Old from 'old'
            use(Old)
          `,
        },
      ],

      invalid: [
        {
          filename: 'foo.ts',
          code: fmt`
            import { foo, bar as Bar } from 'old'
          `,
          errors: [
            {
              line: 1,
              message: 'All imports from "old" are unused and should be removed',
            },
          ],
          output: '',
        },
        {
          filename: 'foo.ts',
          code: fmt`
            import type { foo, bar as Bar } from 'old'
          `,
          errors: [
            {
              line: 1,
              message: 'All imports from "old" are unused and should be removed',
            },
          ],
          output: '',
        },
        {
          filename: 'foo.ts',
          code: fmt`
            import type { foo, bar as Bar } from 'old'
            use(foo)
          `,
          errors: [
            {
              line: 1,
              message: 'Bar is unused and should be removed',
            },
          ],
          output: fmt`
            import type { foo,  } from 'old'
            use(foo)
          `,
        },
        {
          filename: 'foo.ts',
          code: fmt`
            import type { foo, bar as Bar } from 'old'
            use(Bar)
          `,
          errors: [
            {
              line: 1,
              message: 'foo is unused and should be removed',
            },
          ],
          output: fmt`
            import type {  bar as Bar } from 'old'
            use(Bar)
          `,
        },
        {
          filename: 'foo.ts',
          code: fmt`
            // @ts-expect-error
            // @ts-ignore
            // foo message
            // eslint-disable-next-line some-other-rule
            import type { foo, bar as Bar } from 'old'
          `,
          errors: [
            {
              line: 4,
              message: `Definition for rule 'some-other-rule' was not found.`,
            },
            {
              line: 5,
              message: 'All imports from "old" are unused and should be removed',
            },
          ],
          output: fmt`
            // foo message
          `,
        },
      ],
    });
  });
}
