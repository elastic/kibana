/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ImportLocator, type ImportLocatorOptions } from './import_locator';

const get = (source: string, options: ImportLocatorOptions = { ignoreTypeOnly: true }) => [
  ...new ImportLocator(options).get('/repo/file.tsx', source),
];

describe('ImportLocator', () => {
  it('returns value imports, re-exports and literal requires', () => {
    expect(
      get(`
        import React from 'react';
        import { EuiBadge } from '@elastic/eui';
        import * as lodash from 'lodash';
        import './side_effect';
        export { foo } from './foo';
        export * from './bar';
        const x = require('./baz');
      `)
    ).toEqual(['react', '@elastic/eui', 'lodash', './side_effect', './foo', './bar', './baz']);
  });

  it('follows dynamic imports with a literal specifier', () => {
    expect(
      get(`
        export async function plugin() {
          const { Plugin } = await import('./plugin');
          return new Plugin();
        }
        import('./another_lazy').then(() => {});
      `)
    ).toEqual(['./plugin', './another_lazy']);
  });

  it('skips requires and dynamic imports without a literal specifier', () => {
    expect(
      get(`
        const dynamic = require(process.env.SOMETHING);
        const lazy = (name) => import(name);
      `)
    ).toEqual([]);
  });

  it('ignores imports mentioned in comments and strings', () => {
    expect(
      get(`
        // import { EuiBadge } from '@elastic/eui';
        /* import x from 'y' */
        const s = "import z from 'z'";
        import real from './real';
      `)
    ).toEqual(['./real']);
  });

  describe('ignoreTypeOnly', () => {
    const typeOnly = `
      import type { Foo } from './foo';
      import type Bar from './bar';
      export type { Baz } from './baz';
      import { type A, type B } from './all_type_specifiers';
      export { type C, type D } from './all_type_exports';
    `;

    it('skips type-only import and export statements', () => {
      expect(get(typeOnly)).toEqual([]);
    });

    it('keeps type-only statements by default', () => {
      expect(get(typeOnly, {})).toEqual([
        './foo',
        './bar',
        './baz',
        './all_type_specifiers',
        './all_type_exports',
      ]);
    });

    it('keeps statements that mix value and type specifiers', () => {
      expect(
        get(`
          import { type A, b } from './mixed';
          import Default, { type A } from './default_with_type';
          export { type C, d } from './mixed_export';
        `)
      ).toEqual(['./mixed', './default_with_type', './mixed_export']);
    });
  });
});
