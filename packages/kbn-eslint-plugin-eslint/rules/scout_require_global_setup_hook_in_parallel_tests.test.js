/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_require_global_setup_hook_in_parallel_tests');
const dedent = require('dedent');
const fs = require('fs');

const ERROR_MSG_MISSING_HOOK =
  '`global.setup.ts` must explicitly call `globalSetupHook`. Without it, ES security indexes are not pre-generated and tests become flaky.';

const ERROR_MSG_MISSING_FILE =
  'The `parallel_tests` directory must contain a `global.setup.ts` file and call `globalSetupHook`. Without it, ES security indexes are not pre-generated and tests become flaky.';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

// Mock fs.existsSync for testing
const originalExistsSync = fs.existsSync;

ruleTester.run('@kbn/eslint/scout_require_global_setup_hook_in_parallel_tests', rule, {
  valid: [
    // global.setup.ts in parallel_tests with globalSetupHook
    {
      code: dedent`
        import { globalSetupHook } from '@kbn/scout-security';

        globalSetupHook('Ingest archives', async ({ esArchiver }) => {});
      `,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/global.setup.ts',
    },
    // global.setup.ts outside of parallel_tests (rule should not apply)
    {
      code: `export const setup = () => {};`,
      filename: '/path/to/plugin/test/scout/ui/global.setup.ts',
    },
  ],

  invalid: [
    // globalSetupHook not present in global.setup.ts
    {
      code: `export const setup = async () => {};`,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/global.setup.ts',
      errors: [{ message: ERROR_MSG_MISSING_HOOK }],
    },
    // globalSetupHook imported but not called
    {
      code: dedent`
        import { globalSetupHook } from '@kbn/scout-security';

        export const setup = async () => {};
      `,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/global.setup.ts',
      errors: [{ message: ERROR_MSG_MISSING_HOOK }],
    },
  ],
});

// Test for missing global.setup.ts file (requires mocking fs.existsSync)
describe('missing global.setup.ts file check', () => {
  beforeEach(() => {
    fs.existsSync = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    fs.existsSync = originalExistsSync;
  });

  const ruleTesterWithMock = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2020,
    },
  });

  ruleTesterWithMock.run('missing file check', rule, {
    valid: [],
    invalid: [
      // Test file in parallel_tests without global.setup.ts
      {
        code: dedent`
          import { test } from '../fixtures';

          test.describe('My test', () => {});
        `,
        filename: '/path/to/plugin/test/scout/ui/parallel_tests/tests/my_test.spec.ts',
        errors: [{ message: ERROR_MSG_MISSING_FILE }],
      },
    ],
  });
});

// Test that rule passes when global.setup.ts exists
describe('global.setup.ts file exists check', () => {
  beforeEach(() => {
    fs.existsSync = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    fs.existsSync = originalExistsSync;
  });

  const ruleTesterWithMock = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2020,
    },
  });

  ruleTesterWithMock.run('file exists check', rule, {
    valid: [
      // Test file in parallel_tests with global.setup.ts present
      {
        code: dedent`
          import { test } from '../fixtures';

          test.describe('My test', () => {});
        `,
        filename: '/path/to/plugin/test/scout/ui/parallel_tests/tests/my_test.spec.ts',
      },
    ],
    invalid: [],
  });
});
