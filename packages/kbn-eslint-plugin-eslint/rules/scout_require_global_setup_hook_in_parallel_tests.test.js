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

const ERROR_MSG_MISSING_HOOK =
  '`global.setup.ts` must explicitly call `globalSetupHook`. Without it, ES security indexes are not pre-generated and tests become flaky.';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/scout_require_global_setup_hook_in_parallel_tests', rule, {
  valid: [
    // global.setup.ts with globalSetupHook call
    {
      code: dedent`
        import { globalSetupHook } from '@kbn/scout-security';

        globalSetupHook('Ingest archives', async ({ esArchiver }) => {});
      `,
      filename: '/path/to/plugin/test/scout/ui/parallel_tests/global.setup.ts',
    },
    // Non global.setup.ts file (rule should not apply)
    {
      code: `export const setup = () => {};`,
      filename: '/path/to/plugin/test/scout/ui/some_other_file.ts',
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
