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
        import { readFile } from 'fs';
      `,
    },
    {
      code: dedent`
        import * as fs from 'fs';
      `,
    },
    {
      code: dedent`
        import { readFile, readFileSync } from 'fs';
      `,
      options: [{ restrictedMethods: ['writeFile'] }],
    },
    // fs/promises read operations are allowed
    {
      code: dedent`
        import { readFile } from 'fs/promises';
      `,
    },
    // node:fs read operations are allowed
    {
      code: dedent`
        import { readFile } from 'node:fs';
      `,
    },
    {
      code: dedent`
        import { readFile } from 'node:fs/promises';
      `,
    },
    // Default import from fs/promises with read operations
    {
      code: dedent`
        import promises from 'fs/promises';
        await promises.readFile('file.txt');
      `,
    },
    {
      code: dedent`
        import fsPromises from 'node:fs/promises';
        await fsPromises.readFile('file.txt');
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        import { writeFile } from 'fs';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile } from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        import { writeFile, writeFileSync, createWriteStream } from 'fs';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile, writeFileSync, createWriteStream } from '@kbn/fs';
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
        import * as fs from 'fs';
        fs.writeFileSync('file.txt', 'content');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
    },
    {
      code: dedent`
        import fs from 'fs';
        fs.writeFileSync('file.txt', 'content');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
    },
    // Custom error message
    {
      code: dedent`
        import { writeFile } from 'fs';
      `,
      options: [
        {
          restrictedMethods: ['writeFile', 'writeFileSync'],
          disallowedMessage:
            'Use `@kbn/fs` for file write operations instead of direct `fs` in production code',
        },
      ],
      errors: [
        {
          message:
            'Use `@kbn/fs` for file write operations instead of direct `fs` in production code',
        },
      ],
      output: dedent`
        import { writeFile } from '@kbn/fs';
      `,
    },
    // Empty restrictedMethods - restricts all named imports, but namespace imports still allowed
    {
      code: dedent`
        import { readFile } from 'fs';
      `,
      options: [{ restrictedMethods: [] }],
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { readFile } from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        import * as fs from 'fs';
        fs.readFile('file.txt');
      `,
      options: [{ restrictedMethods: [] }],
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
    },
    // Custom restrictedMethods
    {
      code: dedent`
        import { writeFile } from 'fs';
      `,
      options: [{ restrictedMethods: ['writeFile'] }],
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile } from '@kbn/fs';
      `,
    },
    // fs/promises imports
    {
      code: dedent`
        import { writeFile } from 'fs/promises';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile } from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        import { writeFile, writeFileSync } from 'fs/promises';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile, writeFileSync } from '@kbn/fs';
      `,
    },
    // node:fs imports
    {
      code: dedent`
        import { writeFile } from 'node:fs';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile } from '@kbn/fs';
      `,
    },
    {
      code: dedent`
        import { writeFile } from 'node:fs/promises';
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
      output: dedent`
        import { writeFile } from '@kbn/fs';
      `,
    },
    // Default import from fs/promises with write operations
    {
      code: dedent`
        import promises from 'fs/promises';
        await promises.writeFile('file.txt', 'content');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
    },
    {
      code: dedent`
        import fsPromises from 'node:fs/promises';
        await fsPromises.writeFile('file.txt', 'content');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
    },
    {
      code: dedent`
        import * as fs from 'fs';
        fs.writeFile('file.txt', 'content');
      `,
      errors: [
        {
          message: 'Use `@kbn/fs` instead of direct `fs` imports',
        },
      ],
    },
  ],
});
