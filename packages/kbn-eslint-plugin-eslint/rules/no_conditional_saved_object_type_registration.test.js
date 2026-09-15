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
const rule = require('./no_conditional_saved_object_type_registration');

const errorMessage =
  'Saved object type registration must be unconditional. Move savedObjects.registerType() outside conditional control flow to avoid migration ON/OFF conflicts.';

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

ruleTester.run('@kbn/eslint/no_conditional_saved_object_type_registration', rule, {
  valid: [
    {
      code: dedent`
        core.savedObjects.registerType(myType);
      `,
    },
    {
      code: dedent`
        savedObjects.registerType(myType);
      `,
    },
    {
      code: dedent`
        if (shouldRegister) {
          plugins.alerting.registerType(myType);
        }
      `,
    },
    {
      // NOTE: This is a known limitation of the rule. It shouldn't be allowed because it still conditionally registers the type.
      // Not implemented because that would require to walk the siblings, which could be expensive.
      code: dedent`
        if (!shouldRegister) {
          return;
        }
        savedObjects.registerType(myType);
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        if (config.enabled) {
          core.savedObjects.registerType(myType);
        }
      `,
      errors: [{ message: errorMessage }],
    },
    {
      code: dedent`
        config.enabled && core.savedObjects.registerType(myType);
      `,
      errors: [{ message: errorMessage }],
    },
    {
      code: dedent`
        config.enabled ?? core.savedObjects.registerType(myType);
      `,
      errors: [{ message: errorMessage }],
    },
    {
      code: dedent`
        config.enabled ?? (client = core.savedObjects.registerType(myType));
      `,
      errors: [{ message: errorMessage }],
    },
    {
      code: dedent`
        const register = config.enabled ? savedObjects.registerType(myType) : undefined;
      `,
      errors: [{ message: errorMessage }],
    },
    {
      code: dedent`
        switch (featureState) {
          case 'enabled':
            coreSetup.savedObjects.registerType(myType);
            break;
          default:
            break;
        }
      `,
      errors: [{ message: errorMessage }],
    },
  ],
});
