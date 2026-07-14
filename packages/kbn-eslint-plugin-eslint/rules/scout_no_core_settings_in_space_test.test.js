/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_core_settings_in_space_test');
const dedent = require('dedent');

const errors = [{ messageId: 'noCoreSettingsInSpaceTest' }];

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/scout_no_core_settings_in_space_test', rule, {
  valid: [
    // apiServices.core.settings in a sequential `test` hook is allowed
    {
      code: dedent`
        test.beforeAll(async ({ apiServices }) => {
          await apiServices.core.settings({
            'feature_flags.overrides': { 'my-plugin.my-flag': true },
          });
        });
      `,
    },
    // apiServices.core.settings in globalSetupHook is allowed
    {
      code: dedent`
        globalSetupHook('Enable feature flags', async ({ apiServices }) => {
          await apiServices.core.settings({
            'feature_flags.overrides': { 'my-plugin.my-flag': true },
          });
        });
      `,
    },
    // apiServices.core.settings in globalTeardownHook is allowed
    {
      code: dedent`
        globalTeardownHook('Revert feature flags', async ({ apiServices }) => {
          await apiServices.core.settings({
            'feature_flags.overrides': { 'my-plugin.my-flag': false },
          });
        });
      `,
    },
    // spaceTest without apiServices.core.settings is allowed
    {
      code: dedent`
        spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
          await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
        });
      `,
    },
    // Other apiServices calls inside spaceTest are allowed
    {
      code: dedent`
        spaceTest('should work', async ({ apiServices }) => {
          await apiServices.core.someOtherMethod();
        });
      `,
    },
  ],

  invalid: [
    // spaceTest.describe > beforeAll
    {
      code: dedent`
        spaceTest.describe('My suite', () => {
          spaceTest.beforeAll(async ({ apiServices }) => {
            await apiServices.core.settings({
              'feature_flags.overrides': { 'my-plugin.my-flag': true },
            });
          });
        });
      `,
      errors,
    },
    // spaceTest.describe > afterAll
    {
      code: dedent`
        spaceTest.describe('My suite', () => {
          spaceTest.afterAll(async ({ apiServices }) => {
            await apiServices.core.settings({
              'feature_flags.overrides': { 'my-plugin.my-flag': null },
            });
          });
        });
      `,
      errors,
    },
    // Directly inside a spaceTest(...) test body
    {
      code: dedent`
        spaceTest('should work', async ({ apiServices }) => {
          await apiServices.core.settings({
            'feature_flags.overrides': { 'my-plugin.my-flag': true },
          });
        });
      `,
      errors,
    },
    // Nested inside a spaceTest.step
    {
      code: dedent`
        spaceTest('should work', async ({ apiServices }) => {
          await spaceTest.step('enable flag', async () => {
            await apiServices.core.settings({
              'feature_flags.overrides': { 'my-plugin.my-flag': true },
            });
          });
        });
      `,
      errors,
    },
  ],
});
