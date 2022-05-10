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

it('output links to named import from node modules', async () => {
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
      "mappings": ";;YACY,S",
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

it('output links to type exports from node modules', async () => {
  const output = await run(
    `
      export type { Foo } from 'foo'
    `,
    {
      otherFiles: nodeModules,
    }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "import type { Foo } from 'foo';

    export type { Foo };

    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [ 'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts' ]
    "
  `);
});

it('output links to default import from node modules', async () => {
  const output = await run(
    `
      import Bar from 'bar'
      export type ValidName = string | Bar
    `,
    { otherFiles: nodeModules }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "import Bar from 'bar';

    export type ValidName = string | Bar
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";;YACY,S",
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

it('handles symbols with multiple sources in node_modules', async () => {
  const output = await run(
    `
      export type { Moment } from 'foo';
    `,
    {
      otherFiles: {
        ['node_modules/foo/index.d.ts']: `
          import mo = require('./foo');
          export = mo;
        `,
        ['node_modules/foo/foo.d.ts']: `
          import mo = require('mo');
          export = mo;

          declare module "mo" {
            export interface Moment {
              foo(): string
            }
          }
        `,
        ['node_modules/mo/index.d.ts']: `
          declare namespace mo {
            interface Moment extends Object {
              add(amount?: number, unit?: number): Moment;
            }
          }

          export = mo;
          export as namespace mo;
        `,
      },
    }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "import type { Moment } from 'foo';

    export type { Moment };

    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": "",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [ 'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts' ]
    "
  `);
});

it('deduplicates multiple imports to the same type', async () => {
  const output = await run(
    `
      export { Foo1 } from './foo1';
      export { Foo2 } from './foo2';
      export { Foo3 } from './foo3';
    `,
    {
      otherFiles: {
        ...nodeModules,
        ['foo1.ts']: `
          import { Foo } from 'foo';
          export class Foo1 extends Foo {}
        `,
        ['foo2.ts']: `
          import { Foo } from 'foo';
          export class Foo2 extends Foo {}
        `,
        ['foo3.ts']: `
          import { Foo } from 'foo';
          export class Foo3 extends Foo {}
        `,
      },
    }
  );

  expect(output.code).toMatchInlineSnapshot(`
    "import { Foo } from 'foo';

    export class Foo1 extends Foo {
    }
    export class Foo2 extends Foo {
    }
    export class Foo3 extends Foo {
    }
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";;aACa,I;;aCAA,I;;aCAA,I",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "foo1.ts",
        "foo2.ts",
        "foo3.ts",
      ],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [
      'packages/kbn-type-summarizer/__tmp__/dist_dts/foo1.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/foo2.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/foo3.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts'
    ]
    "
  `);
});
