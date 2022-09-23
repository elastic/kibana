/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestProject } from '../integration_helpers';

describe('toSnippets()', () => {
  const project = new TestProject({
    'index.ts': `
      // tsc drops single-line comments
      interface Bar {
        name: string
      }

      /**
       * Class Foo
       */
      export class Foo {
        /**
         * Creates a bar
         */
        bar(name: string): Bar {
          return { name }
        }
      }
    `,
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it('produces source, export, and id snippets', async () => {
    const { indexer, snipper, sourceFiles } = await project.initAstIndexer();

    const index = indexer.indexExports(sourceFiles['index.ts']);
    const foo = index.locals.find((l) => !!l.exported);
    const bar = index.locals.find((l) => !l.exported);

    expect(snipper.toSnippets(foo!.rootSymbol.declarations[0])).toMatchInlineSnapshot(`
      Array [
        Object {
          "type": "source",
          "value": "/**
       * Class Foo
       */
      ",
        },
        Object {
          "noExportRequiresDeclare": false,
          "type": "export",
        },
        Object {
          "type": "source",
          "value": "declare class ",
        },
        Object {
          "identifier": ts.Identifier (Foo) @ dist_dts/index.d.ts:7:22,
          "rootSymbol": Symbol(ts.ClassDeclaration (Foo) @ dist_dts/index.d.ts:7:1),
          "structural": true,
          "text": "Foo",
          "type": "indentifier",
        },
        Object {
          "type": "source",
          "value": " {
          /**
           * Creates a bar
           */
          ",
        },
        Object {
          "identifier": ts.Identifier (bar) @ dist_dts/index.d.ts:11:5,
          "rootSymbol": Symbol(ts.MethodDeclaration (bar) @ dist_dts/index.d.ts:11:5),
          "structural": true,
          "text": "bar",
          "type": "indentifier",
        },
        Object {
          "type": "source",
          "value": "(name: string): ",
        },
        Object {
          "identifier": ts.Identifier (Bar) @ dist_dts/index.d.ts:11:24,
          "rootSymbol": Symbol(ts.InterfaceDeclaration (Bar) @ dist_dts/index.d.ts:1:1),
          "structural": false,
          "text": "Bar",
          "type": "indentifier",
        },
        Object {
          "type": "source",
          "value": ";
      }",
        },
      ]
    `);
    expect(snipper.toSnippets(bar!.rootSymbol.declarations[0])).toMatchInlineSnapshot(`
      Array [
        Object {
          "noExportRequiresDeclare": false,
          "type": "export",
        },
        Object {
          "type": "source",
          "value": "interface ",
        },
        Object {
          "identifier": ts.Identifier (Bar) @ dist_dts/index.d.ts:1:11,
          "rootSymbol": Symbol(ts.InterfaceDeclaration (Bar) @ dist_dts/index.d.ts:1:1),
          "structural": true,
          "text": "Bar",
          "type": "indentifier",
        },
        Object {
          "type": "source",
          "value": " {
          ",
        },
        Object {
          "identifier": ts.Identifier (name) @ dist_dts/index.d.ts:2:5,
          "rootSymbol": Symbol(ts.PropertySignature (name) @ dist_dts/index.d.ts:2:5),
          "structural": true,
          "text": "name",
          "type": "indentifier",
        },
        Object {
          "type": "source",
          "value": ": string;
      }",
        },
      ]
    `);
  });
});
