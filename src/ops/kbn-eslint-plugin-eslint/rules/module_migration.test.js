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
  parser: require.resolve('@babel/eslint-parser'),
  parserOptions: {
    ecmaVersion: 2018,
    requireConfigFile: false,
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
      output: dedent`
        import 'bar'
        require('bar/foo2')
        export { foo } from 'bar'
        export const foo2 = 'bar'
      `,
    },
    /**
     * Given this tree:
     * x-pack/
     *  - common/
     *    - foo.ts <-- the target import
     *    - other/
     *      - folder/
     *        - bar.ts <-- the linted fle
     * import "x-pack/common/foo" should be
     * import ../../foo
     */
    {
      code: dedent`
        import "x-pack/common/foo"
      `,
      filename: 'x-pack/common/other/folder/bar.ts',
      options: [
        [
          {
            from: 'x-pack',
            to: 'foo',
            toRelative: 'x-pack',
          },
        ],
      ],
      errors: [
        {
          line: 1,
          message: 'Imported module "x-pack/common/foo" should be "../../foo"',
        },
      ],
      output: dedent`
        import '../../foo'
      `,
    },
    /**
     * Given this tree:
     * x-pack/
     *  - common/
     *    - foo.ts <-- the target import
     *  - another/
     *     - posible
     *        - example <-- the linted file
     *
     * import "x-pack/common/foo" should be
     * import ../../common/foo
     */
    {
      code: dedent`
        import "x-pack/common/foo"
      `,
      filename: 'x-pack/another/possible/example.ts',
      options: [
        [
          {
            from: 'x-pack',
            to: 'foo',
            toRelative: 'x-pack',
          },
        ],
      ],
      errors: [
        {
          line: 1,
          message: 'Imported module "x-pack/common/foo" should be "../../common/foo"',
        },
      ],
      output: dedent`
        import '../../common/foo'
      `,
    },
  ],
});
