/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./require_include_in_check_a11y');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

const MESSAGE =
  'We recommend running checkA11y with the include parameter set to the root element you are testing. This makes the tests more isolated and reduces the time required to analyze the DOM structure.';

ruleTester.run('@kbn/eslint/require_include_in_check_a11y', rule, {
  valid: [
    {
      code: dedent`
        page.checkA11y({ include: '#root' });
      `,
    },
    {
      code: dedent`
        page.checkA11y({ include: rootEl });
      `,
    },
    {
      code: dedent`
        something.checkA11y({ include: '#app', exclude: ['#legacy'] });
      `,
    },
    {
      code: dedent`
        page['checkA11y']({ include: '#root' });
      `,
    },
    {
      code: dedent`
        page.checkA11y({ include: '#root', other: true });
      `,
    },
    {
      code: dedent`
        page.checkA11y({ ['include']: '#root' });
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        page.checkA11y();
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      code: dedent`
        page.checkA11y({});
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      code: dedent`
        page.checkA11y({ foo: 1 });
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      code: dedent`
        page.checkA11y({ 'include ': '#root' });
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      code: dedent`
        page.checkA11y(config);
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      code: dedent`
        page['checkA11y']();
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      // include only in second arg (rule checks first arg)
      code: dedent`
        page.checkA11y({}, { include: '#root' });
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
    {
      // Non-object first argument
      code: dedent`
        page.checkA11y('not an object');
      `,
      errors: [{ line: 1, message: MESSAGE }],
    },
  ],
});
