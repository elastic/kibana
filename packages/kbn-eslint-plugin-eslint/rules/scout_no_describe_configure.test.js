/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_describe_configure');
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

ruleTester.run('@kbn/eslint/scout_no_describe_configure', rule, {
  valid: [
    {
      code: dedent`
        test('should work', () => {
          expect(true).toBe(true);
        });
      `,
    },
    {
      code: dedent`
        test.describe('my test suite', () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    {
      code: dedent`
        spaceTest.describe('my space-aware test suite', () => {
          spaceTest('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    {
      code: dedent`
        describe('my test suite', () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    {
      code: dedent`
        const describeBlock = test.describe;
        describeBlock('my test suite', () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        test.describe.configure({ mode: 'parallel' });
      `,
      errors: [
        {
          message: 'Using describe.configure is not allowed in Scout tests.',
        },
      ],
    },
    {
      code: dedent`
        test.describe.configure({ 
          mode: 'parallel',
          retries: 2 
        });
      `,
      errors: [
        {
          message: 'Using describe.configure is not allowed in Scout tests.',
        },
      ],
    },
    {
      code: dedent`
        test.describe('my suite', () => {
          test.describe.configure({ mode: 'serial' });
          
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
      errors: [
        {
          message: 'Using describe.configure is not allowed in Scout tests.',
        },
      ],
    },
    {
      code: dedent`
        const myTest = test;
        myTest.describe.configure({ mode: 'parallel' });
      `,
      errors: [
        {
          message: 'Using describe.configure is not allowed in Scout tests.',
        },
      ],
    },
    {
      code: dedent`
        // Different object with describe.configure should also be caught
        spaceTest.describe.configure({});
      `,
      errors: [
        {
          message: 'Using describe.configure is not allowed in Scout tests.',
        },
      ],
    },
  ],
});
