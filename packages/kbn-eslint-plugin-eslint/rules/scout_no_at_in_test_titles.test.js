/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_at_in_test_titles');
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

ruleTester.run('@kbn/eslint/scout_no_at_in_test_titles', rule, {
  valid: [
    {
      code: dedent`
        test.describe('my test suite', () => {
          test('should work', () => {});
        });
      `,
    },
    {
      code: dedent`
        test.describe('sends email to user @ company', () => {
          test('should work', () => {});
        });
      `,
    },
    {
      code: dedent`
        describe('suite with @timestamp in title', () => {
          it('test with @field', () => {});
        });
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        test.describe('renders x-axis for @timestamp', () => {
          test('should work', () => {});
        });
      `,
      errors: [{ messageId: 'atInTitle' }],
    },
    {
      code: dedent`
        test('filters by @timestamp field', async () => {});
      `,
      errors: [{ messageId: 'atInTitle' }],
    },
    {
      code: dedent`
        test(\`filters by @timestamp\`, async () => {});
      `,
      errors: [{ messageId: 'atInTitle' }],
    },
  ],
});
