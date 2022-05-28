/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints the whole enum, including comments', async () => {
  const result = await run(`
    /**
     * This is an enum
     */
    export enum Foo {
      /**
       * some comment
       */
      x,
      /**
       * some other comment
       */
      y,
      /**
       * some final comment
       */
      z = 1,
    }
  `);

  expect(result.code).toMatchInlineSnapshot(`
    "/**
     * This is an enum
     */
    export declare enum Foo {
        /**
         * some comment
         */
        x = 0,
        /**
         * some other comment
         */
        y = 1,
        /**
         * some final comment
         */
        z = 1
    }
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(result.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [],
      "version": 3,
    }
  `);
  expect(result.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [ 'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts' ]
    "
  `);
});

it(`handles export-type'd enums`, async () => {
  const result = await run(
    `
      export type { Foo } from './foo'
    `,
    {
      otherFiles: {
        ['foo.ts']: `
          export enum Foo {
            x = 1,
            y = 2,
            z = 3,
          }
        `,
      },
    }
  );

  expect(result.code).toMatchInlineSnapshot(`
    "export declare enum Foo {
        x = 1,
        y = 2,
        z = 3
    }
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(result.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [],
      "version": 3,
    }
  `);
  expect(result.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [
      'packages/kbn-type-summarizer/__tmp__/dist_dts/foo.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts'
    ]
    "
  `);
});
