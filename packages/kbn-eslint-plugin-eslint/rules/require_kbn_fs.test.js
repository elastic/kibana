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

const rule = require('./require_kbn_fs');

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

ruleTester.run('@kbn/eslint/require_kbn_fs', rule, {
  valid: [
    {
      code: dedent`
        import { readFile, writeFile } from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        import * as fs from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        const fs = require('@kbn/fs');
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        import * as fs from 'fs';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import * as fs from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        import { readFile, writeFile } from 'fs';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { readFile, writeFile } from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        const fs = require('fs');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        const fs = require('@kbn/fs');
      `,
    },
    {
      code: dedent`
        const { readFile, writeFile } = require('fs');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        const { readFile, writeFile } = require('@kbn/fs');
      `,
    },
  ],
});
