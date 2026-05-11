/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const dedent = require('dedent');
const rule = require('./ui_settings_require_propagation_delay');

const MESSAGE =
  "Calls to uiSettings.update() in these tests must be followed in the same helper, hook, or test by uiSettings.withPropagationDelay(...). This guards dependent assertions against Kibana's multi-node uiSettings cache propagation window. See https://github.com/elastic/kibana/issues/265720.";

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/ui_settings_require_propagation_delay', rule, {
  valid: [
    {
      code: dedent`
        before(async () => {
          await kibanaServer.uiSettings.update({ foo: true });
          await kibanaServer.uiSettings.withPropagationDelay();
        });
      `,
    },
    {
      code: dedent`
        const helper = async () => {
          await uiSettings.replace({});
          await uiSettings.withPropagationDelay({
            assertion: async () => {
              expect(true).toBe(true);
            },
          });
        };
      `,
    },
    {
      code: dedent`
        after(async () => {
          await scoutSpace.uiSettings.unset('workflows:ui:enabled');
          await scoutSpace.uiSettings.withPropagationDelay();
        });
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        before(async () => {
          await kibanaServer.uiSettings.update({ foo: true });
        });
      `,
      errors: [{ message: MESSAGE }],
    },
    {
      code: dedent`
        before(async () => {
          await kibanaServer.uiSettings.withPropagationDelay();
          await kibanaServer.uiSettings.update({ foo: true });
        });
      `,
      errors: [{ message: MESSAGE }],
    },
    {
      code: dedent`
        const updateSettings = async () => {
          await kibanaServer.uiSettings.update({ foo: true });
        };

        before(async () => {
          await updateSettings();
          await kibanaServer.uiSettings.withPropagationDelay();
        });
      `,
      errors: [{ message: MESSAGE }],
    },
  ],
});
