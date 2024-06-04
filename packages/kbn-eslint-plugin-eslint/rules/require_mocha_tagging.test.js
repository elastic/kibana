/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./require_mocha_tagging');
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

ruleTester.run('@kbn/eslint/require_mocha_tagging', rule, {
  valid: [
    {
      code: dedent`
        describe('@ess @serverless API Integration test', () => {})
      `,
    },
    {
      code: dedent`
        describe('@ess API Integration test', () => {})
      `,
    },
    {
      code: dedent`
        describe('@serverless API Integration test', () => {})
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        describe('API Integration test', () => {})
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to .forEach() prevents promise rejections from being handled. Use asyncForEach() or similar helper from "@kbn/std" instead.',
        },
      ],
    },
  ],
});
