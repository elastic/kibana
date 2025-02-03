/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_async_foreach');
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

ruleTester.run('@kbn/eslint/no_async_foreach', rule, {
  valid: [
    {
      code: dedent`
        array.forEach((a) => {
          b(a)
        })
      `,
    },
    {
      code: dedent`
        array.forEach(function (a) {
          b(a)
        })
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        array.forEach(async (a) => {
          await b(a)
        })
      `,
      errors: [
        {
          line: 1,
          message:
            'Passing an async function to .forEach() prevents promise rejections from being handled. Use asyncForEach() or similar helper from "@kbn/std" instead.',
        },
      ],
    },
    {
      code: dedent`
        array.forEach(async function (a) {
          await b(a)
        })
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
