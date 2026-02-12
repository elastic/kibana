/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_max_one_describe');
const dedent = require('dedent');

const ERROR_MSG =
  'Only one root-level describe block is allowed per file. This is required for auto-skip functionality in CI.';

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

ruleTester.run('@kbn/eslint/scout_max_one_describe', rule, {
  valid: [
    // No describe blocks at all
    {
      code: dedent`
        test('should work', () => {
          expect(true).toBe(true);
        });
      `,
    },
    // Single apiTest.describe()
    {
      code: dedent`
        apiTest.describe('my API test suite', () => {
          apiTest('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    // Single test.describe()
    {
      code: dedent`
        test.describe('my test suite', () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    // Single spaceTest.describe()
    {
      code: dedent`
        spaceTest.describe('my space-aware test suite', () => {
          spaceTest('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    // Two bare describe() calls
    {
      code: dedent`
        describe('my test suite', () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
        describe('my test suite', () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
  ],

  invalid: [
    // Two apiTest.describe() calls
    {
      code: dedent`
        apiTest.describe('first suite', () => {
          apiTest('test 1', () => {});
        });

        apiTest.describe('second suite', () => {
          apiTest('test 2', () => {});
        });
      `,
      errors: [
        {
          message: ERROR_MSG,
        },
      ],
    },
    // Two test.describe() calls
    {
      code: dedent`
        test.describe('first suite', () => {
          test('test 1', () => {});
        });

        test.describe('second suite', () => {
          test('test 2', () => {});
        });
      `,
      errors: [
        {
          message: ERROR_MSG,
        },
      ],
    },
    // Two spaceTest.describe() calls
    {
      code: dedent`
        spaceTest.describe('first suite', () => {
          spaceTest('test 1', () => {});
        });

        spaceTest.describe('second suite', () => {
          spaceTest('test 2', () => {});
        });
      `,
      errors: [
        {
          message: ERROR_MSG,
        },
      ],
    },
    // Two different method describe calls
    {
      code: dedent`
        apiTest.describe('api describe', () => {
          test('test 1', () => {});
        });

        test.describe('method describe', () => {
          test('test 2', () => {});
        });
      `,
      errors: [
        {
          message: ERROR_MSG,
        },
      ],
    },
    // Three test.describe() calls - should report 2 errors
    {
      code: dedent`
        test.describe('first suite', () => {
          test('test 1', () => {});
        });

        test.describe('second suite', () => {
          test('test 2', () => {});
        });

        test.describe('third suite', () => {
          test('test 3', () => {});
        });
      `,
      errors: [
        {
          message: ERROR_MSG,
        },
        {
          message: ERROR_MSG,
        },
      ],
    },
    // Multiple root describes of different types - now all count as violations
    {
      code: dedent`
        test.describe('test suite 1', () => {
          test('test 1', () => {});
        });

        test.describe('test suite 2', () => {
          test('test 2', () => {});
        });

        apiTest.describe('api suite 1', () => {
          apiTest('test 1', () => {});
        });

        apiTest.describe('api suite 2', () => {
          apiTest('test 2', () => {});
        });
      `,
      errors: [
        {
          message: ERROR_MSG,
        },
        {
          message: ERROR_MSG,
        },
        {
          message: ERROR_MSG,
        },
      ],
    },
  ],
});
