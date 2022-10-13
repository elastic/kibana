/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getImportRequests } from './get_import_requests';

describe('getImportRequests()', () => {
  it('should get requests from `require`', () => {
    const rawCode = `/*foo*/require('dep1'); const bar = 1;`;
    const foundDeps = getImportRequests(rawCode);
    expect(foundDeps).toMatchInlineSnapshot(`
      Array [
        "dep1",
      ]
    `);
  });

  it('should get requests from `require.resolve`', () => {
    const rawCode = `/*foo*/require.resolve('dep2'); const bar = 1;`;
    const foundDeps = getImportRequests(rawCode);
    expect(foundDeps).toMatchInlineSnapshot(`
      Array [
        "dep2",
      ]
    `);
  });

  it('should get requests from `import`', () => {
    const rawCode = `/*foo*/import dep1 from 'dep1'; import dep2 from 'dep2';const bar = 1;`;
    const foundDeps = getImportRequests(rawCode);
    expect(foundDeps).toMatchInlineSnapshot(`
      Array [
        "dep1",
        "dep2",
      ]
    `);
  });

  it('should get requests from `export from`', () => {
    const rawCode = `/*foo*/export dep1 from 'dep1'; import dep2 from 'dep2';const bar = 1;`;
    const foundDeps = getImportRequests(rawCode);
    expect(foundDeps).toMatchInlineSnapshot(`
      Array [
        "dep1",
        "dep2",
      ]
    `);
  });

  it('should get requests from `export * from`', () => {
    const rawCode = `/*foo*/export * from 'dep1'; export dep2 from 'dep2';const bar = 1;`;
    const foundDeps = getImportRequests(rawCode);
    expect(foundDeps).toMatchInlineSnapshot(`
      Array [
        "dep1",
        "dep2",
      ]
    `);
  });
});
