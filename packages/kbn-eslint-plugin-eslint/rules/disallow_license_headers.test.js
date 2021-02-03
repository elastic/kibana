/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./disallow_license_headers');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('babel-eslint'),
  parserOptions: {
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/disallow-license-headers', rule, {
  valid: [
    {
      code: dedent`
        /* license */

        console.log('foo')
      `,

      options: [
        {
          licenses: ['// license'],
        },
      ],
    },
    {
      code: dedent`
        // license

        console.log('foo')
      `,

      options: [
        {
          licenses: ['/* license */'],
        },
      ],
    },
  ],

  invalid: [
    // missing license option
    {
      code: dedent`
        console.log('foo')
      `,

      options: [],
      errors: [
        {
          message: '"licenses" option is required',
        },
      ],
    },

    // license cannot contain multiple block comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: ['/* one *//* two */'],
        },
      ],
      errors: [
        {
          message: '"licenses[0]" option must only include a single comment',
        },
      ],
    },

    // license cannot contain multiple line comments
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: [`// one\n// two`],
        },
      ],
      errors: [
        {
          message: '"licenses[0]" option must only include a single comment',
        },
      ],
    },

    // license cannot contain expressions
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: [
            '// old license',
            dedent`
            /* license */
            console.log('hello world');
          `,
          ],
        },
      ],
      errors: [
        {
          message: '"licenses[1]" option must only include a single comment',
        },
      ],
    },

    // license is not a single comment
    {
      code: dedent`
        console.log('foo')
      `,

      options: [
        {
          licenses: ['// old license', '// older license', `console.log('hello world');`],
        },
      ],
      errors: [
        {
          message: '"licenses[2]" option must only include a single comment',
        },
      ],
    },
  ],
});
