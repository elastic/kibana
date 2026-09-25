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

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

ruleTester.run('@kbn/eslint/security_imports_restriction', rule, {
  valid: [
    {
      code: "import set from '@kbn/safer-lodash-set/set';",
      options: [{ name: 'lodash/set', message: 'Use @kbn/safer-lodash-set/set instead' }],
    },
    {
      code: "import fetch from './fetch';",
      options: [{ paths: [{ name: 'axios', message: 'Use fetch instead' }] }],
    },
  ],
  invalid: [
    {
      code: "import set from 'lodash/set';",
      options: [{ name: 'lodash/set', message: 'Use @kbn/safer-lodash-set/set instead' }],
      errors: [{ message: /Use @kbn\/safer-lodash-set\/set instead/u }],
    },
    {
      code: "import axios from 'axios';",
      options: [{ paths: [{ name: 'axios', message: 'Use fetch instead' }] }],
      errors: [{ message: /Use fetch instead/u }],
    },
  ],
});
