/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_deprecated_tags');
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

ruleTester.run('@kbn/eslint/scout_no_deprecated_tags', rule, {
  valid: [
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
        import { tags } from '@kbn/scout';
        test.describe('my test suite', { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] }, () => {
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      `,
    },
    {
      code: dedent`
        import { tags } from '@kbn/scout-oblt';
        apiTest.describe('API test', { tag: [...tags.stateful.classic] }, () => {
          apiTest('should work', () => {});
        });
      `,
    },
    {
      code: dedent`
        spaceTest.describe('space test', { tag: tags.stateful.classic }, () => {
          spaceTest('should work', () => {});
        });
      `,
    },
    {
      code: dedent`
        test.describe('my test suite', { tag: ['@perf'] }, () => {
          test('should work', () => {});
        });
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        test.describe('my test suite', { tag: ['@ess'] }, () => {
          test('should work', () => {});
        });
      `,
      errors: [{ messageId: 'deprecatedTag' }],
    },
    {
      code: dedent`
        test.describe('my test suite', { tag: ['@ess', '@svlOblt'] }, () => {
          test('should work', () => {});
        });
      `,
      errors: [{ messageId: 'deprecatedTag' }],
    },
    {
      code: dedent`
        apiTest.describe('API test', { tag: ['@svlSecurity', '@svlSearch'] }, () => {
          apiTest('should work', () => {});
        });
      `,
      errors: [{ messageId: 'deprecatedTag' }],
    },
    {
      code: dedent`
        spaceTest.describe('space test', { tag: ['@ess', '@svlOblt', '@svlSecurity'] }, () => {
          spaceTest('should work', () => {});
        });
      `,
      errors: [{ messageId: 'deprecatedTag' }],
    },
  ],
});
