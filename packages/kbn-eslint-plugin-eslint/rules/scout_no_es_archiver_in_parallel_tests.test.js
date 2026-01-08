/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_es_archiver_in_parallel_tests');
const dedent = require('dedent');

const ERROR_MSG =
  '`esArchiver` should not be used in parallel tests. Use `globalSetupHook` in `global.setup.ts` to load archives before tests run.';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/scout_no_es_archiver_in_parallel_tests', rule, {
  valid: [
    // esArchiver in global.setup.ts is allowed
    {
      code: dedent`
        globalSetupHook('Ingest data', async ({ esArchiver }) => {
          await esArchiver.loadIfNeeded('test/archive');
        });
      `,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/global.setup.ts',
    },
    // Test without esArchiver
    {
      code: `test('should work', async ({ page }) => {});`,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/my_test.spec.ts',
    },
    // Test outside parallel_tests directory
    {
      code: `test('should work', async ({ esArchiver }) => {});`,
      filename: '/path/to/plugin/test/scout/ui/tests/my_test.spec.ts',
    },
  ],

  invalid: [
    // test with esArchiver
    {
      code: `test('should work', async ({ esArchiver }) => {});`,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/my_test.spec.ts',
      errors: [{ message: ERROR_MSG }],
    },
    // test.beforeAll with esArchiver
    {
      code: `test.beforeAll(async ({ esArchiver }) => {});`,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/my_test.spec.ts',
      errors: [{ message: ERROR_MSG }],
    },
    // apiTest with esArchiver
    {
      code: `apiTest('should call API', async ({ esArchiver }) => {});`,
      filename: '/path/to/plugin/test/scout/api/parallel_tests/api_test.spec.ts',
      errors: [{ message: ERROR_MSG }],
    },
  ],
});
