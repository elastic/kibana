/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const rule = require('./no_md5_hash');
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

ruleTester.run('@kbn/eslint/no_md5_hash', rule, {
  valid: [
    // valid import of crypto and call of createHash
    {
      code: dedent`
       import crypto from 'crypto';

       crypto.createHash('sha256');
      `,
    },
    // valid import and call of createHash
    {
      code: dedent`
       import { createHash } from 'crypto';

       createHash('sha256');
      `,
    },
    // valid import and call of createHash with a variable containing a compliant aglorithm
    {
      code: dedent`
       import { createHash } from 'crypto';
       const myHash = 'sha256';
       createHash(myHash);
      `,
    },
  ],

  invalid: [
    // invalid call of createHash when calling from crypto
    {
      code: dedent`
       import crypto from 'crypto';

       crypto.createHash('md5');
      `,
      errors: [
        {
          line: 3,
          message: 'Usage of createHash with "md5" is not allowed.',
        },
      ],
    },
    // invalid call of createHash when importing directly
    {
      code: dedent`
       import { createHash } from 'crypto';

       createHash('md5');
      `,
      errors: [
        {
          line: 3,
          message: 'Usage of createHash with "md5" is not allowed.',
        },
      ],
    },
    // invalid call of createHash when calling with a variable containing md5
    {
      code: dedent`
       import { createHash } from 'crypto';
       const myHash = 'md5';
       createHash(myHash);
      `,
      errors: [
        {
          line: 3,
          message: 'Usage of createHash with "md5" is not allowed.',
        },
      ],
    },
  ],
});
