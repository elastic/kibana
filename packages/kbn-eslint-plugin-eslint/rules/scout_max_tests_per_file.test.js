/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_max_tests_per_file');
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

const UI_FILENAME =
  'x-pack/solutions/security/plugins/security_solution/test/scout/timelines/ui/parallel_tests/create.spec.ts';
const API_FILENAME =
  'x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/tests/leads.spec.ts';

/**
 * @param {number} count
 * @param {string} caller
 */
const nTests = (count, caller = 'test') => {
  const tests = Array.from(
    { length: count },
    (_, i) => `${caller}('case ${i + 1}', async () => {});`
  ).join('\n');
  return `${caller}.describe('suite', () => {\n${tests}\n});`;
};

ruleTester.run('@kbn/eslint/scout_max_tests_per_file', rule, {
  valid: [
    {
      code: nTests(8, 'test'),
      filename: UI_FILENAME,
    },
    {
      code: nTests(8, 'spaceTest'),
      filename: UI_FILENAME,
    },
    {
      code: nTests(15, 'apiTest'),
      filename: API_FILENAME,
    },
    {
      code: dedent`
        test.describe('suite', () => {
          test('one', async () => {});
          test.skip('two', async () => {});
          test.only('three', async () => {});
          test.fixme('four', async () => {});
          test.step('not a test', async () => {});
          test.beforeEach(async () => {});
        });
      `,
      filename: UI_FILENAME,
    },
    {
      code: nTests(20, 'apiTest'),
      filename: API_FILENAME,
      options: [{ apiMaxTests: 20 }],
    },
    {
      code: dedent`
        test.describe('suite', () => {
          test('one', async () => {});
          test('two', async () => {});
          test('three', async () => {});
          test('four', async () => {});
          test('five', async () => {});
          test('six', async () => {});
          test('seven', async () => {});
          test('eight', async () => {
            test.skip();
            await test.step('not a test', async () => {});
          });
        });
      `,
      filename: UI_FILENAME,
    },
    {
      code: nTests(9, 'test'),
      filename:
        'x-pack/solutions/security/plugins/security_solution/test/scout/timelines/ui/fixtures/helpers.ts',
    },
    {
      // A for-loop around test() is one syntactic call site, even if it generates many runtime tests.
      code: dedent`
        test.describe('suite', () => {
          for (const x of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
            test(\`case \${x}\`, async () => {});
          }
        });
      `,
      filename: UI_FILENAME,
    },
    {
      code: dedent`
        const title = 'case';
        test.describe('suite', () => {
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
        });
      `,
      filename: UI_FILENAME,
    },
  ],

  invalid: [
    {
      code: nTests(9, 'test'),
      filename: UI_FILENAME,
      errors: [{ messageId: 'tooManyTests' }],
    },
    {
      code: nTests(9, 'spaceTest'),
      filename: UI_FILENAME,
      errors: [{ messageId: 'tooManyTests' }],
    },
    {
      code: nTests(16, 'apiTest'),
      filename: API_FILENAME,
      errors: [{ messageId: 'tooManyTests' }],
    },
    {
      code: nTests(6, 'test'),
      filename: UI_FILENAME,
      options: [{ uiMaxTests: 5 }],
      errors: [{ messageId: 'tooManyTests' }],
    },
    {
      code: dedent`
        test.describe('suite', () => {
          test('one', async () => {});
          test.skip('two', async () => {});
          test.only('three', async () => {});
          test.fixme('four', async () => {});
          test('five', async () => {});
          test('six', async () => {});
          test('seven', async () => {});
          test('eight', async () => {});
          test('nine', async () => {});
        });
      `,
      filename: UI_FILENAME,
      errors: [{ messageId: 'tooManyTests' }],
    },
    {
      code: dedent`
        const title = 'case';
        test.describe('suite', () => {
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
          test(title, async () => {});
        });
      `,
      filename: UI_FILENAME,
      errors: [{ messageId: 'tooManyTests' }],
    },
    {
      code: dedent`
        test.describe('suite', () => {
          test('one', { tag: '@local-stateful-classic' }, async () => {});
          test('two', { tag: '@local-stateful-classic' }, async () => {});
          test('three', { tag: '@local-stateful-classic' }, async () => {});
          test('four', { tag: '@local-stateful-classic' }, async () => {});
          test('five', { tag: '@local-stateful-classic' }, async () => {});
          test('six', { tag: '@local-stateful-classic' }, async () => {});
          test('seven', { tag: '@local-stateful-classic' }, async () => {});
          test('eight', { tag: '@local-stateful-classic' }, async () => {});
          test('nine', { tag: '@local-stateful-classic' }, async () => {});
        });
      `,
      filename: UI_FILENAME,
      errors: [{ messageId: 'tooManyTests' }],
    },
  ],
});
