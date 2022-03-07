/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('collects references from source files which contribute to result', async () => {
  const result = await run(
    `
      /// <reference lib="es2015" />
      export type PromiseOfString = Promise<'string'>
      export * from './files'
    `,
    {
      otherFiles: {
        'files/index.ts': `
          /// <reference lib="dom" />
          export type MySymbol = Symbol & { __tag: 'MySymbol' }
          export * from './foo'
        `,
        'files/foo.ts': `
          /// <reference types="react" />
          interface Props {}
          export type MyComponent = React.Component<Props>
        `,
      },
    }
  );

  expect(result.code).toMatchInlineSnapshot(`
    "/// <reference lib=\\"es2015\\" />
    /// <reference lib=\\"dom\\" />
    /// <reference types=\\"react\\" />
    export type PromiseOfString = Promise<'string'>
    export type MySymbol = Symbol & {
        __tag: 'MySymbol';
    }
    interface Props {
    }
    export type MyComponent = React.Component<Props>
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(result.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";;;YACY,e;YCAA,Q;;;UCAF,K;;YACE,W",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "index.ts",
        "files/index.ts",
        "files/foo.ts",
      ],
      "version": 3,
    }
  `);
  expect(result.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [
      'packages/kbn-type-summarizer/__tmp__/dist_dts/files/foo.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/files/index.d.ts',
      'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts'
    ]
    debug Ignoring 5 global declarations for \\"Promise\\"
    debug Ignoring 4 global declarations for \\"Symbol\\"
    debug Ignoring 2 global declarations for \\"Component\\"
    debug Ignoring 1 global declarations for \\"React\\"
    "
  `);
});
