/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./eui_link_href_with_onclick');
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

ruleTester.run('@kbn/eslint/eui_link_href_with_onclick', rule, {
  valid: [
    {
      code: dedent`
        <EuiLink href="/foo" onClick={handler}>Click me</EuiLink>
      `,
    },
    {
      code: dedent`
        <EuiLink href="/foo">Click me</EuiLink>
      `,
    },
    {
      code: dedent`
        <EuiLink>Click me</EuiLink>
      `,
    },
    {
      code: dedent`
        <EuiButton onClick={handler}>Click me</EuiButton>
      `,
    },
    {
      code: dedent`
        <EuiButtonEmpty onClick={handler}>Click me</EuiButtonEmpty>
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        <EuiLink onClick={handler}>Click me</EuiLink>
      `,
      errors: [
        {
          messageId: 'euiLinkHrefWithOnclick',
        },
      ],
    },
    {
      code: dedent`
        <EuiLink onClick={handler} color="primary">Click me</EuiLink>
      `,
      errors: [
        {
          messageId: 'euiLinkHrefWithOnclick',
        },
      ],
    },
  ],
});
