/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.no_deprecated_imports;

const OPTIONS = [
  {
    paths: [{ name: 'enzyme', message: 'Use @testing-library/react instead.' }],
    patterns: [{ group: ['hook_form_lib/**'], message: 'Use react-hook-form instead.' }],
  },
];

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

// The rule is typescript-eslint's `no-restricted-imports`; these cases prove it behaves the same
// through Oxlint's ESLint-compatible API.
ruleTester.run('@kbn/eslint/no_deprecated_imports', rule, {
  valid: [
    {
      code: "import { render } from '@testing-library/react';",
      options: OPTIONS,
    },
    {
      // patterns match sub-paths only
      code: "import { useForm } from 'hook_form_lib';",
      options: OPTIONS,
    },
  ],
  invalid: [
    {
      code: "import { mount } from 'enzyme';",
      options: OPTIONS,
      errors: [{ message: /Use @testing-library\/react instead\./u, line: 1, column: 1 }],
    },
    {
      code: "export { shallow } from 'enzyme';",
      options: OPTIONS,
      errors: [{ message: /Use @testing-library\/react instead\./u }],
    },
    {
      code: "import { useForm } from 'hook_form_lib/hooks';",
      options: OPTIONS,
      errors: [{ message: /Use react-hook-form instead\./u }],
    },
  ],
});
