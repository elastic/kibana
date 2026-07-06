/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_sync_import_from_plugin');
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const ERR = { messageId: 'noSyncImportFromPlugin' };

ruleTester.run('@kbn/eslint/no_sync_import_from_plugin', rule, {
  valid: [
    {
      code: dedent`
        import type { PluginInitializerContext } from '@kbn/core/server';
        import type { MyPluginSetup } from './plugin';
        export const plugin = async (ctx: PluginInitializerContext) => {
          const { MyPlugin } = await import('./plugin');
          return new MyPlugin(ctx);
        };
      `,
    },
    {
      code: dedent`
        import { config } from './config';
        export const plugin = async () => {
          const { Plugin } = await import('./plugin');
          return new Plugin();
        };
        export { config };
      `,
    },
    {
      code: dedent`
        export type { FooSetup } from './plugin';
      `,
    },
    {
      code: dedent`
        import type { Foo } from './other';
      `,
    },
    {
      code: dedent`
        const m = await import('./plugin');
      `,
    },
  ],

  invalid: [
    {
      code: `import { FooPlugin } from './plugin';`,
      errors: [ERR],
    },
    {
      code: dedent`
        import type { Setup } from './plugin';
        import { FooPlugin } from './plugin';
      `,
      errors: [ERR],
    },
    {
      code: `import './plugin';`,
      errors: [ERR],
    },
    {
      code: `export { FooPlugin } from './plugin';`,
      errors: [ERR],
    },
    {
      code: `export * from './plugin';`,
      errors: [ERR],
    },
    {
      code: `require('./plugin');`,
      errors: [ERR],
    },
  ],
});
