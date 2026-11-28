/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { RuleTester } from 'eslint';
import { rules } from '../..';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

// requests resolve against the real repository, relative to this rule's own source file
const filename = Path.resolve(__dirname, 'no_unresolvable_imports.ts');

ruleTester.run('@kbn/imports/no_unresolvable_imports', rules.no_unresolvable_imports, {
  valid: [
    { filename, code: `import { report } from '../helpers/report';` },
    { filename, code: `import Path from 'path';` },
    { filename, code: `import { REPO_ROOT } from '@kbn/repo-info';` },
    { filename, code: `jest.mock('../get_import_resolver');` },
    { filename, code: 'const helper = require(`../helpers/${name}`);' },
  ],
  invalid: [
    {
      filename,
      code: `import { foo } from './does_not_exist';`,
      errors: [{ line: 1, message: 'Unable to resolve import [./does_not_exist]' }],
    },
    {
      filename,
      code: `const foo = require('@kbn/package-that-does-not-exist');`,
      errors: [{ line: 1, message: 'Unable to resolve import [@kbn/package-that-does-not-exist]' }],
    },
  ],
});
