/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints basic type alias', async () => {
  const output = await run(`
    export type Name = 'foo' | string

    function hello(name: Name) {
      console.log('hello', name)
    }

    hello('john')
  `);

  expect(output.code).toMatchInlineSnapshot(`
    "export type Name = 'foo' | string
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "YAAY,I",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "index.ts",
      ],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [ 'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts' ]
    "
  `);
});

it(`prints export type'd type alias`, async () => {
  const output = await run(
    `
      export type { Name } from './name'
    `,
    {
      otherFiles: {
        ['name.ts']: `
          export type Name = 'foo';
        `,
      },
    }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "export type Name = 'foo'
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "YAAY,I",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "name.ts",
      ],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [
      'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/name.d.ts'
    ]
    "
  `);
});
