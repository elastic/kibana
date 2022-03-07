/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints the whole interface, including comments', async () => {
  const result = await run(`
    /**
     * This is an interface
     */
    export interface Foo<Bar> {
      /**
       * method
       */
      name(): string

      /**
       * hello
       */
      close(): Promise<void>
    }
  `);

  expect(result.code).toMatchInlineSnapshot(`
    "/**
     * This is an interface
     */
    export interface Foo<Bar> {
        /**
         * method
         */
        name(): string;
        /**
         * hello
         */
        close(): Promise<void>;
    }
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(result.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";;;iBAGiB,G",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "index.ts",
      ],
      "version": 3,
    }
  `);
  expect(result.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [ 'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts' ]
    debug Ignoring 5 global declarations for \\"Promise\\"
    "
  `);
});
