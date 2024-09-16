/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { RuleTester } = require('eslint');
const { allowedAlgorithms, ...rule } = require('./no_unsafe_hash');

const dedent = require('dedent');

const joinedAllowedAlgorithms = `[${allowedAlgorithms.join(', ')}]`;

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

ruleTester.run('@kbn/eslint/no_unsafe_hash', rule, {
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
    // valid import and call of hash with a variable containing a compliant aglorithm
    {
      code: dedent`
       import { hash } from 'crypto';
       const myHash = 'sha256';
       hash(myHash);
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
          line: 2,
          message: `Usage of createHash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
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
          line: 2,
          message: `Usage of createHash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
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
          message: `Usage of createHash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
        },
      ],
    },
    // invalid import and call of hash when importing directly
    {
      code: dedent`
       import { hash } from 'crypto';
       hash('md5');
      `,
      errors: [
        {
          line: 2,
          message: `Usage of hash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
        },
      ],
    },
    {
      code: dedent`
       import _crypto from 'crypto';
       _crypto.hash('md5');
      `,
      errors: [
        {
          line: 2,
          message: `Usage of hash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
        },
      ],
    },

    {
      code: dedent`
       import { hash as _hash } from 'crypto';
       _hash('md5');
      `,
      errors: [
        {
          line: 2,
          message: `Usage of hash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
        },
      ],
    },
  ],
});
