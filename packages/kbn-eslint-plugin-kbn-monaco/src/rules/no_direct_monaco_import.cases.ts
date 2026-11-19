/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CONSUMER = 'x-pack/platform/plugins/shared/some_plugin/public/some_file.tsx';

/** Rule test cases, replayed through Oxlint's RuleTester by `__fixtures__/run_rule_tests.mjs`. */
export const noDirectMonacoImportCases = {
  valid: [
    {
      name: 'importing from the @kbn/code-editor root is the way',
      code: `import { CodeEditor } from '@kbn/code-editor';`,
      filename: CONSUMER,
    },
    {
      name: 'a package that only starts with the name is not @kbn/monaco',
      code: `import { thing } from '@kbn/monaco-extras';`,
      filename: CONSUMER,
    },
    {
      name: 'a package that only starts with @kbn/code-editor is not one of its subpaths',
      code: `import { thing } from '@kbn/code-editor-mock';`,
      filename: CONSUMER,
    },
    {
      name: 'a dynamic request cannot be known, so it is left alone',
      code: 'require(`@kbn/monaco/${name}`);',
      filename: CONSUMER,
    },
    {
      name: 'a request held in a variable cannot be known, so it is left alone',
      code: `const m = require(moduleName);`,
      filename: CONSUMER,
    },
    {
      name: 'a method named mock on something other than jest is not a jest mock',
      code: `other.mock('@kbn/monaco');`,
      filename: CONSUMER,
    },
    {
      name: 'a computed jest member is not a jest mock',
      code: `jest[method]('@kbn/monaco');`,
      filename: CONSUMER,
    },
    {
      name: 'the @kbn/monaco package may import itself',
      code: `import { monaco } from '@kbn/monaco';`,
      filename: 'src/platform/packages/shared/kbn-monaco/src/register_globals.ts',
    },
    {
      name: 'the @kbn/code-editor package may import @kbn/monaco and its own subpaths',
      code: `import { monaco } from '@kbn/monaco/src/monaco_imports';`,
      filename: 'src/platform/packages/shared/shared-ux/code_editor/impl/code_editor.tsx',
    },
  ],

  invalid: [
    {
      name: 'importing @kbn/monaco',
      code: `import { monaco } from '@kbn/monaco';`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'importing a subpath of @kbn/monaco',
      code: `import { monaco } from '@kbn/monaco/src/monaco_imports';`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco/src/monaco_imports' } }],
    },
    {
      name: 'a type-only import is still an import of the package',
      code: `import type { Language } from '@kbn/monaco';`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'a side-effect import',
      code: `import '@kbn/monaco';`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 're-exporting by name',
      code: `export { monaco } from '@kbn/monaco';`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 're-exporting everything',
      code: `export * from '@kbn/monaco';`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'a dynamic import',
      code: `const load = () => import('@kbn/monaco');`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'a require call',
      code: `const { monaco } = require('@kbn/monaco');`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'a template literal without holes is as good as a string',
      code: 'require(`@kbn/monaco`);',
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'require.resolve',
      code: `require.resolve('@kbn/monaco');`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'jest.mock',
      code: `jest.mock('@kbn/monaco/src/monaco_imports');`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco/src/monaco_imports' } }],
    },
    {
      name: 'jest.requireActual',
      code: `const actual = jest.requireActual('@kbn/monaco');`,
      filename: CONSUMER,
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
    {
      name: 'a subpath of @kbn/code-editor, in a re-export',
      code: `export { CodeEditor } from '@kbn/code-editor/code_editor';`,
      filename: CONSUMER,
      errors: [
        {
          messageId: 'noCodeEditorSubpathImport',
          data: { source: '@kbn/code-editor/code_editor' },
        },
      ],
    },
    {
      name: 'a subpath of @kbn/code-editor, in an import',
      code: `import { CodeEditor } from '@kbn/code-editor/impl/code_editor';`,
      filename: CONSUMER,
      errors: [
        {
          messageId: 'noCodeEditorSubpathImport',
          data: { source: '@kbn/code-editor/impl/code_editor' },
        },
      ],
    },
    {
      name: 'tests are not exempt outside of the owning packages',
      code: `import { monaco } from '@kbn/monaco';`,
      filename: 'x-pack/platform/plugins/shared/some_plugin/public/some_file.test.tsx',
      errors: [{ messageId: 'noMonacoImport', data: { source: '@kbn/monaco' } }],
    },
  ],
};
