/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./security_imports_restriction');

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
