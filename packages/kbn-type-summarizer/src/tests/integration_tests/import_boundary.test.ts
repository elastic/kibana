/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

const nodeModules = {
  'node_modules/foo/index.ts': `
    export class Foo {
      render() {
        return 'hello'
      }
    }
  `,
  'node_modules/bar/index.ts': `
    export default class Bar {
      render() {
        return 'hello'
      }
    }
  `,
};

it('output type links to named import from node modules', async () => {
  const output = await run(
    `
      import { Foo } from 'foo'
      export type ValidName = string | Foo
    `,
    { otherFiles: nodeModules }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "import { Foo } from 'foo';
    export type ValidName = string | Foo
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";YACY,S",
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

it('output type links to default import from node modules', async () => {
  const output = await run(
    `
      import Bar from 'bar'
      export type ValidName = string | Bar
    `,
    { otherFiles: nodeModules }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "import { Bar } from 'bar';
    export type ValidName = string | Bar
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";YACY,S",
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
