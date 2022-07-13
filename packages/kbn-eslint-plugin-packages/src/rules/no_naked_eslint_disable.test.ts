/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_naked_eslint_disable');
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

ruleTester.run('@kbn/eslint/no_naked_eslint_disable', rule, {
  valid: [
    {
      code: dedent`
        // eslint-disable no-var
      `,
    },
    {
      code: dedent`
        // eslint-disable-next-line no-use-before-define
      `,
    },
    {
      code: dedent`
        // eslint-disable-line no-use-before-define
      `,
    },
    {
      code: dedent`
        /* eslint-disable no-var */
      `,
    },
    {
      code: dedent`
        /* eslint-disable no-console, no-control-regex*/
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        /* eslint-disable */
        const a = 1;
      `,
      errors: [
        {
          line: 1,
          message:
            'Using a naked eslint disable is not allowed. Please specify the specific rules to disable.',
        },
      ],
      output: dedent`
        const a = 1;
      `,
    },
    {
      code: dedent`
        // eslint-disable-next-line
      `,
      errors: [
        {
          line: 1,
          message:
            'Using a naked eslint disable is not allowed. Please specify the specific rules to disable.',
        },
      ],
      output: '',
    },
  ],
});
