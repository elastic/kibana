/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_unsafe_console');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/no_unsafe_console', rule, {
  valid: [
    {
      code: dedent`
        unsafeConsole
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        unsafeConsole.debug('something to debug')
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
        unsafeConsole.error()
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
        unsafeConsole.info('some info')
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
        unsafeConsole.log('something to log')
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
        unsafeConsole.trace()
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
        unsafeConsole.warn('something to warn')
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
        unsafeConsole.anyOtherMethodName()
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
    {
      code: dedent`
          const { debug } = unsafeConsole
          debug('something to debug')
      `,
      errors: [
        {
          line: 1,
          message: 'Unexpected unsafeConsole statement.',
        },
      ],
    },
  ],
});
