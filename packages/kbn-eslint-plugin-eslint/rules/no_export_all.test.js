/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');

const { RuleTester } = require('eslint');
const dedent = require('dedent');

const rule = require('./no_export_all');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('@kbn/eslint/no_export_all', rule, {
  valid: [
    {
      code: dedent`
        export { bar } from './foo';
        export { bar as box } from './foo';
      `,
    },
  ],

  invalid: [
    {
      filename: Path.resolve(__dirname, '../__fixtures__/index.ts'),
      code: dedent`
        export * as baz from './baz';
        export * from './foo';
      `,

      errors: [
        {
          line: 1,
          message:
            '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs',
        },
        {
          line: 2,
          message:
            '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs',
        },
      ],

      output: dedent`
        import { one, two, three } from "./baz";
        export const baz = {
          one,
          two,
          three
        };
        export type { ReexportedClass, SomeInterface, TypeAlias } from "./foo";
        export { someConst, someLet, someFunction, SomeClass, SomeEnum } from "./foo";
      `,
    },
  ],
});
