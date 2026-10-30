/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findValueImports } from './find_value_imports';

const find = (source: string) => findValueImports('/repo/file.tsx', source);

describe('findValueImports', () => {
  it('returns value imports, re-exports and literal requires', () => {
    expect(
      find(`
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

  it('skips type-only import and export statements', () => {
    expect(
      find(`
        import type { Foo } from './foo';
        import type Bar from './bar';
        export type { Baz } from './baz';
        import { type A, type B } from './all_type_specifiers';
        export { type C, type D } from './all_type_exports';
      `)
    ).toEqual([]);
  });

  it('keeps statements that mix value and type specifiers', () => {
    expect(
      find(`
        import { type A, b } from './mixed';
        import Default, { type A } from './default_with_type';
        export { type C, d } from './mixed_export';
      `)
    ).toEqual(['./mixed', './default_with_type', './mixed_export']);
  });

  it('follows dynamic imports with a literal specifier', () => {
    expect(
      find(`
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
      find(`
        const dynamic = require(process.env.SOMETHING);
        const lazy = (name) => import(name);
      `)
    ).toEqual([]);
  });

  it('ignores imports mentioned in comments and strings', () => {
    expect(
      find(`
        // import { EuiBadge } from '@elastic/eui';
        /* import x from 'y' */
        const s = "import z from 'z'";
        import real from './real';
      `)
    ).toEqual(['./real']);
  });
});
