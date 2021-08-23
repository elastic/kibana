/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_export_all');
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

ruleTester.run('@kbn/eslint/no_export_all', rule, {
  valid: [
    {
      code: dedent`
        export { bar } from './foo';
        export { bar as box } from './foo';
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        export * from './foo';
        export * as foo from './foo';
      `,

      errors: [
        {
          line: 1,
          message:
            '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs',
        },
        {
          line: 2,
          message:
            '`export *` is not allowed in the index files of plugins to prevent accidentally exporting too many APIs',
        },
      ],
    },
  ],
});
