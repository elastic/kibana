/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints the function declaration, including comments', async () => {
  const result = await run(
    `
      import { Bar } from './bar';

      /**
       * Convert a Bar to a string
       */
      export function foo<X>(
        /**
         * Important comment
         */
        name: Bar<X>
      ) {
        return name.toString();
      }
    `,
    {
      otherFiles: {
        'bar.ts': `
          export class Bar<T extends { toString(): string }> {
            constructor(
              private value: T
            ){}

            toString() {
              return this.value.toString()
            }
          }
        `,
      },
    }
  );

  expect(result.code).toMatchInlineSnapshot(`
    "class Bar<T extends {
        toString(): string;
    }> {
      private value;
      constructor(value: T);
      toString(): string;
    }
    /**
     * Convert a Bar to a string
     */
    export function foo<X>(
    /**
     * Important comment
     */
    name: Bar<X>): string;
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(result.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "MAAa,G;;;UAED,K;;EAGV,Q;;;;;gBCAc,G",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "bar.ts",
        "index.ts",
      ],
      "version": 3,
    }
  `);
  expect(result.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [
      'packages/kbn-type-summarizer/__tmp__/dist_dts/bar.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts'
    ]
    "
  `);
});

it('uses the export name when it is different', async () => {
  const output = await run(
    `
      export { foo as bar } from './foo';
    `,
    {
      otherFiles: {
        ['foo.ts']: `
          export function foo() {
            return 'foo'
          }
        `,
      },
    }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "export function bar(): string;
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "gBAAgB,G",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "foo.ts",
      ],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [
      'packages/kbn-type-summarizer/__tmp__/dist_dts/foo.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts'
    ]
    "
  `);
});
