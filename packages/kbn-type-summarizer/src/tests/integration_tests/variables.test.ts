/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints basic variable exports with sourcemaps', async () => {
  const output = await run(`
    /**
     * What is a type
     */
    type Type = 'bar' | 'baz'

    /** some comment */
    export const bar: Type = 'bar'

    export var
      /**
       * checkout bar
       */
      baz: Type = 'baz',
      /**
       * this is foo
       */
      foo: Type = 'bar'

    export let types = [bar, baz, foo]
  `);

  expect(output.code).toMatchInlineSnapshot(`
    "/**
     * What is a type
     */
    type Type = 'bar' | 'baz'
    /** some comment */
    export const bar: Type;
    /**
     * checkout bar
     */
    export var baz: Type;
    /**
     * this is foo
     */
    export var foo: Type;
    export let types: (\\"bar\\" | \\"baz\\")[];
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";;;KAGK,I;;aAGQ,G;;;;WAMX,G;;;;WAIA,G;WAES,K",
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
