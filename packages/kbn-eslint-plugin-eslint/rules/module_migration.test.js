/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./module_migration');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('babel-eslint'),
  parserOptions: {
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/module-migration', rule, {
  valid: [
    {
      code: dedent`
        import "bar"
        require('bar')
        export { foo } from "bar"
        export const foo2 = 'bar'
      `,

      options: [
        [
          {
            from: 'foo',
            to: 'bar',
          },
        ],
      ],
    },
  ],

  invalid: [
    {
      code: dedent`
        import "foo"
        require('foo/foo2')
        export { foo } from 'foo'
        export const foo2 = 'bar'
      `,

      options: [
        [
          {
            from: 'foo',
            to: 'bar',
          },
        ],
      ],
      errors: [
        {
          line: 1,
          message: 'Imported module "foo" should be "bar"',
        },
        {
          line: 2,
          message: 'Imported module "foo/foo2" should be "bar/foo2"',
        },
        {
          line: 3,
          message: 'Re-exported module "foo" should be "bar"',
        },
      ],
    },
  ],
});
