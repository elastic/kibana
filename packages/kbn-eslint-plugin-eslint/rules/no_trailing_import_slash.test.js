/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_trailing_import_slash');
const dedent = require('dedent');

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

ruleTester.run('@kbn/eslint/no_trailing_import_slash', rule, {
  valid: [
    {
      code: dedent`
        import foo from 'bar';
      `,
    },
    {
      code: dedent`
        import foo from './bar';
      `,
    },
    {
      code: dedent`
        import foo from './bar/';
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        import foo from 'bar/';
      `,
      errors: [
        {
          line: 1,
          message:
            'Using a trailing slash in package import statements causes issues with webpack and is inconsistent with the rest of the repository.',
        },
      ],
      output: dedent`
        import foo from 'bar';
      `,
    },
    {
      code: dedent`
        import foo from 'bar/box/';
      `,
      errors: [
        {
          line: 1,
          message:
            'Using a trailing slash in package import statements causes issues with webpack and is inconsistent with the rest of the repository.',
        },
      ],
      output: dedent`
        import foo from 'bar/box';
      `,
    },
  ],
});
