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
const filename = Path.resolve(__dirname, 'uniform_imports.ts');

ruleTester.run('@kbn/imports/uniform_imports', rules.uniform_imports, {
  valid: [
    { filename, code: `import { report } from '../helpers/report';` },
    { filename, code: `import { REPO_ROOT } from '@kbn/repo-info';` },
    { filename, code: `import Path from 'path';` },
    {
      filename,
      options: [{ preserveFileExtensions: true }],
      code: `import { report } from '../helpers/report.ts';`,
    },
  ],
  invalid: [
    {
      filename,
      code: `import { report } from '../helpers/report.ts';`,
      errors: [{ line: 1, message: 'Use import request [../helpers/report]' }],
      output: `import { report } from '../helpers/report';`,
    },
    {
      filename,
      code: `import { rules } from '@kbn/eslint-plugin-imports';`,
      errors: [{ line: 1, message: 'Use import request [../..]' }],
      output: `import { rules } from '../..';`,
    },
    {
      filename,
      code: `import { REPO_ROOT } from '../../../../src/platform/packages/shared/kbn-repo-info';`,
      errors: [{ line: 1, message: 'Use import request [@kbn/repo-info]' }],
      output: `import { REPO_ROOT } from '@kbn/repo-info';`,
    },
    {
      filename,
      options: [{ preserveFileExtensions: true }],
      code: `import { report } from '../helpers/report';`,
      errors: [{ line: 1, message: 'Use import request [../helpers/report.ts]' }],
      output: `import { report } from '../helpers/report.ts';`,
    },
  ],
});
