/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.security_imports_restriction;

const LODASH_OPTIONS = [
  {
    name: 'lodash',
    importNames: ['set', 'setWith', 'template'],
    message: 'Use @kbn/safer-lodash-set instead',
  },
  { name: 'lodash/set', message: 'Use @kbn/safer-lodash-set/set instead' },
];
const AXIOS_OPTIONS = [{ paths: [{ name: 'axios', message: 'Use fetch instead' }] }];

const tsRuleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

// The rule is typescript-eslint's `no-restricted-imports`; these cases (including import syntax
// variants and report locations) prove it behaves the same through Oxlint's ESLint-compatible API.
tsRuleTester.run('@kbn/eslint/security_imports_restriction', rule, {
  valid: [
    {
      code: "import set from '@kbn/safer-lodash-set/set';",
      options: LODASH_OPTIONS,
    },
    {
      code: "import { get } from 'lodash';",
      options: LODASH_OPTIONS,
    },
    {
      code: "import fetch from './fetch';",
      options: AXIOS_OPTIONS,
    },
    {
      // only the imported name is restricted, not the local one
      code: "import { get as set } from 'lodash';",
      options: LODASH_OPTIONS,
    },
    {
      // default, side-effect, and `import = require()` imports do not import a restricted name
      code: "import _ from 'lodash';\nimport 'lodash';\nimport lodash = require('lodash');",
      options: LODASH_OPTIONS,
    },
    {
      // only static imports and re-exports are checked
      code: "const axios = require('axios');\nimport('axios');",
      options: AXIOS_OPTIONS,
    },
  ],
  invalid: [
    {
      code: "import set from 'lodash/set';",
      options: LODASH_OPTIONS,
      errors: [{ message: /Use @kbn\/safer-lodash-set\/set instead/u }],
    },
    {
      code: "import { set } from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [{ message: /'set' import from 'lodash' is restricted/u }],
    },
    {
      code: "import * as _ from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [{ message: /\* import is invalid/u }],
    },
    {
      code: "export { template } from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [{ message: /'template' import from 'lodash' is restricted/u }],
    },
    {
      code: "import axios from 'axios';",
      options: AXIOS_OPTIONS,
      errors: [{ message: /Use fetch instead/u }],
    },
    {
      code: "import type { AxiosInstance } from 'axios';",
      options: AXIOS_OPTIONS,
      errors: [{ message: /Use fetch instead/u }],
    },
    {
      code: "import axios = require('axios');",
      options: AXIOS_OPTIONS,
      errors: [{ message: /Use fetch instead/u }],
    },
    {
      code: "import 'lodash/set';",
      options: LODASH_OPTIONS,
      errors: [
        {
          message:
            "'lodash/set' import is restricted from being used. Use @kbn/safer-lodash-set/set instead",
          column: 1,
          endColumn: 21,
        },
      ],
    },
    {
      code: "import { set as safeSet, template } from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [
        {
          message: "'set' import from 'lodash' is restricted. Use @kbn/safer-lodash-set instead",
          column: 10,
          endColumn: 24,
        },
        {
          message:
            "'template' import from 'lodash' is restricted. Use @kbn/safer-lodash-set instead",
          column: 26,
          endColumn: 34,
        },
      ],
    },
    {
      code: "import _, { type setWith } from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [
        {
          message:
            "'setWith' import from 'lodash' is restricted. Use @kbn/safer-lodash-set instead",
          column: 13,
          endColumn: 25,
        },
      ],
    },
    {
      code: "export * from 'lodash';\nexport * as _ from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [
        {
          message:
            "* import is invalid because 'set,setWith,template' from 'lodash' is restricted. Use @kbn/safer-lodash-set instead",
          line: 1,
          column: 8,
          endColumn: 9,
        },
        {
          message:
            "* import is invalid because 'set,setWith,template' from 'lodash' is restricted. Use @kbn/safer-lodash-set instead",
          line: 2,
          column: 8,
          endColumn: 9,
        },
      ],
    },
    {
      code: "export * from 'axios';\nexport type * from 'axios';\nexport type { AxiosInstance } from 'axios';",
      options: AXIOS_OPTIONS,
      errors: [
        {
          message: "'axios' import is restricted from being used. Use fetch instead",
          line: 1,
          column: 1,
          endColumn: 23,
        },
        {
          message: "'axios' import is restricted from being used. Use fetch instead",
          line: 2,
        },
        {
          message: "'axios' import is restricted from being used. Use fetch instead",
          line: 3,
        },
      ],
    },
  ],
});

const jsRuleTester = new RuleTester({
  parser: require.resolve('@babel/eslint-parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    requireConfigFile: false,
  },
});

jsRuleTester.run('@kbn/eslint/security_imports_restriction (JavaScript)', rule, {
  valid: [
    {
      code: "import set from '@kbn/safer-lodash-set/set';",
      options: LODASH_OPTIONS,
    },
  ],
  invalid: [
    {
      code: "import { set } from 'lodash';",
      options: LODASH_OPTIONS,
      errors: [{ message: /'set' import from 'lodash' is restricted/u }],
    },
    {
      code: "import axios from 'axios';",
      options: AXIOS_OPTIONS,
      errors: [{ message: /Use fetch instead/u }],
    },
  ],
});
