/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints literal number types', async () => {
  const output = await run(`
    export const NUM = 3;
    const NUM2 = 4;
    export type PoN = Promise<typeof NUM2>;
  `);

  expect(output.code).toMatchInlineSnapshot(`
    "export const NUM = 3;
    declare const NUM2 = 4;
    export type PoN = Promise<typeof NUM2>
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "aAAa,G;cACP,I;YACM,G",
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
    debug Ignoring 5 global declarations for \\"Promise\\"
    "
  `);
});
