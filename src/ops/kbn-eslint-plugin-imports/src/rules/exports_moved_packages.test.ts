/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTester } from 'eslint';
import { ExportsMovedPackagesRule, MovedExportsRule } from './exports_moved_packages';
import dedent from 'dedent';

const fmt = (str: TemplateStringsArray) => dedent(str) + '\n';

const OPTIONS: MovedExportsRule[][] = [
  [
    {
      exportNames: ['foo', 'bar'],
      fromPackage: 'old',
      toPackage: 'new',
    },
  ],
];

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
    tester.run('@kbn/imports/exports_moved_packages', ExportsMovedPackagesRule, {
      valid: [
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            import { foo, bar as Bar } from 'new'
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            const { foo, bar: Bar } = require('new')
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export async function x () {
              const { foo, bar: Bar } = await import('new')
              return { foo, Bar }
            }
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            const Old = require('old')
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            import Old from 'old'
          `,
        },
        {
          // we aren't going to try to figure out which imports you use from an async import in
          // a Promise.all
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            const [{ foo }] = Promise.all([
              import('old')
            ])
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export * from 'old'
          `,
        },
      ],

      invalid: [
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            import { foo, bar as Bar } from 'old'
          `,
          errors: [
            {
              line: 1,
              message: 'Exports "foo", "bar" are now in package "new"',
            },
          ],
          output: fmt`
            import { foo, bar as Bar } from 'new';
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            import type { foo, bar as Bar } from 'old'
          `,
          errors: [
            {
              line: 1,
              message: 'Exports "foo", "bar" are now in package "new"',
            },
          ],
          output: fmt`
            import type { foo, bar as Bar } from 'new';
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export { foo, box } from 'old';
          `,
          errors: [
            {
              line: 1,
              message: 'Export "foo" is now in package "new"',
            },
          ],
          output: fmt`
            export {  box } from 'old';
            export { foo } from 'new';
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export { foo, bar as Bar } from 'old';
          `,
          errors: [
            {
              line: 1,
              message: 'Exports "foo", "bar" are now in package "new"',
            },
          ],
          output: fmt`
            export { foo, bar as Bar } from 'new';
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export type { foo, bar as Bar } from 'old'
          `,
          errors: [
            {
              line: 1,
              message: 'Exports "foo", "bar" are now in package "new"',
            },
          ],
          output: fmt`
            export type { foo, bar as Bar } from 'new';
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export type { foo, box } from 'old';
          `,
          errors: [
            {
              line: 1,
              message: 'Export "foo" is now in package "new"',
            },
          ],
          output: fmt`
            export type {  box } from 'old';
            export type { foo } from 'new';
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            const { foo, bar: Bar } = require('old')
          `,
          errors: [
            {
              line: 1,
              message: 'Exports "foo", "bar" are now in package "new"',
            },
          ],
          output: fmt`
            const { foo, bar: Bar } = require('new');
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export async function x () {
              const { foo, bar: Bar } = await import('old')
              return { foo, Bar }
            }
          `,
          errors: [
            {
              line: 2,
              message: 'Exports "foo", "bar" are now in package "new"',
            },
          ],
          output: fmt`
            export async function x () {
              const { foo, bar: Bar } = await import('new');
              return { foo, Bar }
            }
          `,
        },
        {
          filename: 'foo.ts',
          options: OPTIONS,
          code: fmt`
            export async function x () {
              const { foo, box } = await import('old')
              return { foo, box }
            }
          `,
          errors: [
            {
              line: 2,
              message: 'Export "foo" is now in package "new"',
            },
          ],
          output: fmt`
            export async function x () {
              const {  box } = await import('old')
            const { foo } = await import('new');
              return { foo, box }
            }
          `,
        },
      ],
    });
  });
}
