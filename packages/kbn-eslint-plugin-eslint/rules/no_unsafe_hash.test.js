/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
const { RuleTester } = require('eslint');
const { allowedAlgorithms, ...rule } = require('./no_unsafe_hash');
const findKibanaRoot = require('../helpers/find_kibana_root');

const dedent = require('dedent');

const KIBANA_ROOT = findKibanaRoot();

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
    // valid: sha1 in a file that has an allowlist entry for sha1
    {
      code: dedent`
       import { createHash } from 'crypto';
       createHash('sha1');
      `,
      filename: path.resolve(KIBANA_ROOT, 'packages/kbn-optimizer/src/common/dll_manifest.ts'),
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
    // invalid: sha1 in a file with no allowlist entry
    {
      code: dedent`
       import { createHash } from 'crypto';
       createHash('sha1');
      `,
      filename: path.resolve(KIBANA_ROOT, 'src/some/random/file.ts'),
      errors: [
        {
          line: 2,
          message: `Usage of createHash with "sha1" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
        },
      ],
    },
    // invalid: md5 in a file whose allowlist only allows sha1
    {
      code: dedent`
       import { createHash } from 'crypto';
       createHash('md5');
      `,
      filename: path.resolve(KIBANA_ROOT, 'packages/kbn-optimizer/src/common/dll_manifest.ts'),
      errors: [
        {
          line: 2,
          message: `Usage of createHash with "md5" is not allowed. Only the following algorithms are allowed: ${joinedAllowedAlgorithms}. If you need to use a different algorithm, please contact the Kibana security team.`,
        },
      ],
    },
  ],
});
