/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_wrapped_error_in_logger');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/no_wrapped_error_in_logger', rule, {
  valid: [
    // Correct usage: passing error directly
    {
      code: dedent`
        logger.error('Something went wrong', { error });
      `,
    },
    // Correct usage: explicit property shorthand
    {
      code: dedent`
        logger.error('Something went wrong', { error: error });
      `,
    },
    // Correct usage: passing error directly with other meta
    {
      code: dedent`
        logger.error('Something went wrong', { error, requestId: '123' });
      `,
    },
    // Correct usage: logger.warn
    {
      code: dedent`
        logger.warn('Warning occurred', { error });
      `,
    },
    // Correct usage: logger.fatal
    {
      code: dedent`
        logger.fatal('Fatal error', { error });
      `,
    },
    // Non-error methods should not be flagged
    {
      code: dedent`
        logger.info('Info message', { error: { message: error } });
      `,
    },
    {
      code: dedent`
        logger.debug('Debug message', { error: { message: error } });
      `,
    },
    // Object without message property is fine
    {
      code: dedent`
        logger.error('Something went wrong', { error: { code: 'E001' } });
      `,
    },
    // String literal in message is fine (not a variable)
    {
      code: dedent`
        logger.error('Something went wrong', { error: { message: 'static message' } });
      `,
    },
    // No meta argument
    {
      code: dedent`
        logger.error('Something went wrong');
      `,
    },
    // Only message argument
    {
      code: dedent`
        logger.error(error);
      `,
    },
  ],

  invalid: [
    // The problematic pattern: { error: { message: error } }
    {
      code: dedent`
        logger.error('Error happened during validation.', { error: { message: error } });
      `,
      output: dedent`
        logger.error('Error happened during validation.', { error: error });
      `,
      errors: [
        {
          line: 1,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
    // Using 'e' as variable name
    {
      code: dedent`
        logger.error('Something failed', { error: { message: e } });
      `,
      output: dedent`
        logger.error('Something failed', { error: e });
      `,
      errors: [
        {
          line: 1,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
    // Using member expression: error.message
    {
      code: dedent`
        logger.error('Something failed', { error: { message: err.message } });
      `,
      output: dedent`
        logger.error('Something failed', { error: err.message });
      `,
      errors: [
        {
          line: 1,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
    // logger.warn with the problematic pattern
    {
      code: dedent`
        logger.warn('Warning occurred', { error: { message: error } });
      `,
      output: dedent`
        logger.warn('Warning occurred', { error: error });
      `,
      errors: [
        {
          line: 1,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
    // logger.fatal with the problematic pattern
    {
      code: dedent`
        logger.fatal('Fatal error', { error: { message: error } });
      `,
      output: dedent`
        logger.fatal('Fatal error', { error: error });
      `,
      errors: [
        {
          line: 1,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
    // With additional properties in meta
    {
      code: dedent`
        logger.error('Error occurred', { error: { message: error }, requestId: '123' });
      `,
      output: dedent`
        logger.error('Error occurred', { error: error, requestId: '123' });
      `,
      errors: [
        {
          line: 1,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
    // Multiline
    {
      code: dedent`
        logger.error('Something went wrong', {
          error: { message: error }
        });
      `,
      output: dedent`
        logger.error('Something went wrong', {
          error: error
        });
      `,
      errors: [
        {
          line: 2,
          message:
            'Avoid wrapping errors in logger meta. Use { error } instead of { error: { message: error } } to prevent error details from being swallowed.',
        },
      ],
    },
  ],
});
