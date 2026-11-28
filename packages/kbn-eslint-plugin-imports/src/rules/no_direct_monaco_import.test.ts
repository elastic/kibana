/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { rules } from '../..';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/imports/no_direct_monaco_import', rules.no_direct_monaco_import, {
  valid: [
    { code: `import { CodeEditor } from '@kbn/code-editor';` },
    {
      filename: 'src/platform/packages/shared/kbn-monaco/src/register_globals.ts',
      code: `import { monaco } from '@kbn/monaco';`,
    },
    {
      filename: 'src/platform/packages/shared/shared-ux/code_editor/impl/code_editor.tsx',
      code: `import { monaco } from '@kbn/monaco/src/monaco_imports';`,
    },
  ],
  invalid: [
    {
      code: `import { monaco } from '@kbn/monaco';`,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      code: `jest.mock('@kbn/monaco/src/monaco_imports');`,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco/src/monaco_imports' } }],
    },
    {
      code: `export { CodeEditor } from '@kbn/code-editor/code_editor';`,
      errors: [
        {
          messageId: 'noCodeEditorSubpathImport',
          data: { source: '@kbn/code-editor/code_editor' },
        },
      ],
    },
  ],
});
