/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';
import { createRecursiveSerializer } from '@kbn/jest-serializers';
import { describeNode, describeSymbol } from '@kbn/type-summarizer-core';
import { TestProject, TMP_DIR } from '../integration_helpers';

const isObj = (v: any): v is Record<string, unknown> => typeof v === 'object' && v !== null;

expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => isObj(v) && typeof v.kind === 'number' && ts.SyntaxKind[v.kind] !== undefined,
    (v: ts.Node, printRaw) => printRaw(describeNode(v, TMP_DIR))
  )
);
expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => isObj(v) && Array.isArray(v.declarations),
    (v: ts.Symbol, printRaw) => printRaw(describeSymbol(v, TMP_DIR))
  )
);

describe('indexExports()', () => {
  describe('simple', () => {
    const project = new TestProject({
      'index.ts': `
        import { Foo } from './foo';
        export { Foo }
        export { Bar } from './bar';
        import { Bar } from './bar';
        import { libFn } from 'lib';
        export { libFn } from 'lib';
        import * as A from './a'
        export { A }
        export type B = Foo | Bar | typeof libFn;
      `,
      'foo.ts': `
        export class Foo {}
      `,
      'bar.ts': `
        import { Foo } from './foo'
        export class Bar extends Foo {}
      `,
      'a.ts': `
        export const a = 'a';
      `,
      'node_modules/lib/index.ts': `
        export function libFn() {
        }
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('produces valid index', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [],
          "imports": Array [
            Object {
              "details": Object {
                "node": ts.ExportSpecifier (libFn) @ dist_dts/index.d.ts:6:10,
                "req": "lib",
                "sourceName": "libFn",
                "type": "named",
                "typesOnly": false,
              },
              "exports": Array [
                Object {
                  "name": "libFn",
                  "type": "named",
                  "typeOnly": false,
                },
              ],
              "localUsageCount": 1,
              "rootSymbol": Symbol(ts.FunctionDeclaration (libFn) @ dist_dts/node_modules/lib/index.d.ts:1:1),
              "type": "imported decs",
            },
          ],
          "locals": Array [
            Object {
              "decs": Array [
                ts.ClassDeclaration (Foo) @ dist_dts/foo.d.ts:1:1,
              ],
              "exported": Object {
                "name": "Foo",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.ClassDeclaration (Foo) @ dist_dts/foo.d.ts:1:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.ClassDeclaration (Bar) @ dist_dts/bar.d.ts:2:1,
              ],
              "exported": Object {
                "name": "Bar",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.ClassDeclaration (Bar) @ dist_dts/bar.d.ts:2:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.VariableDeclaration (a) @ dist_dts/a.d.ts:1:22,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.VariableDeclaration (a) @ dist_dts/a.d.ts:1:22),
              "type": "copied decs",
            },
            Object {
              "exported": Object {
                "name": "A",
                "type": "named",
                "typeOnly": false,
              },
              "members": Map {
                "a" => Symbol(ts.VariableDeclaration (a) @ dist_dts/a.d.ts:1:22),
              },
              "rootSymbol": Symbol(ts.SourceFile @ dist_dts/a.d.ts:1:1),
              "sourceFile": ts.SourceFile @ dist_dts/a.d.ts:1:1,
              "type": "namespace dec",
            },
            Object {
              "decs": Array [
                ts.TypeAliasDeclaration (B) @ dist_dts/index.d.ts:9:1,
              ],
              "exported": Object {
                "name": "B",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.TypeAliasDeclaration (B) @ dist_dts/index.d.ts:9:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('export references', () => {
    const project = new TestProject({
      'index.ts': `
        import type {Class} from './foo'
        export function name(i: Class) {
          return 'string'
        }
      `,
      'foo.ts': `
        export class Class {}
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('includes referenced declarations in locals', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [],
          "imports": Array [],
          "locals": Array [
            Object {
              "decs": Array [
                ts.ClassDeclaration (Class) @ dist_dts/foo.d.ts:1:1,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.ClassDeclaration (Class) @ dist_dts/foo.d.ts:1:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.FunctionDeclaration (name) @ dist_dts/index.d.ts:2:1,
              ],
              "exported": Object {
                "name": "name",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.FunctionDeclaration (name) @ dist_dts/index.d.ts:2:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('ambient types', () => {
    const project = new TestProject({
      'index.ts': `
        import './globals'
        import './fakemodule'
        import { FakeImport } from 'foo'
        export async function x(a: SomeGlobal, b: FakeImport): Promise<string> {
          return 'foo'
        }
      `,
      'globals.d.ts': `
        interface SomeGlobal {
          foo: true
        }
      `,
      'fakemodule.d.ts': `
        declare module "foo" {
          export interface FakeImport {
            bar: true
          }
        }
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('includes declarations for local ambient types, "ambientRefs" for globals', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [
            Object {
              "name": "Promise",
              "rootSymbol": Symbol(ts.InterfaceDeclaration (Promise) @ ../../../node_modules/typescript/lib/lib.es5.d.ts:1501:1),
              "type": "ambient ref",
            },
          ],
          "imports": Array [],
          "locals": Array [
            Object {
              "decs": Array [
                ts.InterfaceDeclaration (SomeGlobal) @ dist_dts/globals.d.ts:1:1,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.InterfaceDeclaration (SomeGlobal) @ dist_dts/globals.d.ts:1:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.InterfaceDeclaration (FakeImport) @ dist_dts/fakemodule.d.ts:2:3,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.InterfaceDeclaration (FakeImport) @ dist_dts/fakemodule.d.ts:2:3),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.FunctionDeclaration (x) @ dist_dts/index.d.ts:4:1,
              ],
              "exported": Object {
                "name": "x",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.FunctionDeclaration (x) @ dist_dts/index.d.ts:4:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('type only exports', () => {
    const project = new TestProject({
      'index.ts': `
        export * from './foo'
      `,
      'foo.ts': `
        class Class {}
        export type { Class }
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('exports by value one value is exported twice and either is by value', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [],
          "imports": Array [],
          "locals": Array [
            Object {
              "decs": Array [
                ts.ClassDeclaration (Class) @ dist_dts/foo.d.ts:1:1,
              ],
              "exported": Object {
                "name": "Class",
                "type": "named",
                "typeOnly": true,
              },
              "rootSymbol": Symbol(ts.ClassDeclaration (Class) @ dist_dts/foo.d.ts:1:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('export by type combining', () => {
    const project = new TestProject({
      'index.ts': `
        export * from './foo'
        export * from './bar'
      `,
      'foo.ts': `
        export { Class } from './class'
      `,
      'bar.ts': `
        export type { Class } from './class'
      `,
      'class.ts': `
        export class Class {}
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('exports by value one value is exported twice and either is by value', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [],
          "imports": Array [],
          "locals": Array [
            Object {
              "decs": Array [
                ts.ClassDeclaration (Class) @ dist_dts/class.d.ts:1:1,
              ],
              "exported": Object {
                "name": "Class",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.ClassDeclaration (Class) @ dist_dts/class.d.ts:1:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('ignores importTypes from node_modules but resolves local import types', () => {
    const project = new TestProject({
      'index.ts': `
        export function name(n: import('./foo').A): import('bar').Bar {
          return 'B'
        }
      `,
      'foo.ts': `
        export class A {}
      `,
      'node_modules/bar/index.ts': `
        export type Bar = string | symbol;
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('exports by value one value is exported twice and either is by value', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [],
          "imports": Array [],
          "locals": Array [
            Object {
              "decs": Array [
                ts.ClassDeclaration (A) @ dist_dts/foo.d.ts:1:1,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.ClassDeclaration (A) @ dist_dts/foo.d.ts:1:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.FunctionDeclaration (name) @ dist_dts/index.d.ts:1:1,
              ],
              "exported": Object {
                "name": "name",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.FunctionDeclaration (name) @ dist_dts/index.d.ts:1:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('finds references in importType.typeArguments', () => {
    const project = new TestProject({
      'index.ts': `
        export function name(n: import('./foo').A<import('bar').Bar<import('./foo').B>>) {
          return 'B'
        }
      `,
      'foo.ts': `
        export class A<X> {
          n(x: X) {
            return x
          }
        }
        export class B {}
      `,
      'node_modules/bar/index.ts': `
        export type Bar<X> = Readonly<X>
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('exports by value one value is exported twice and either is by value', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();
      const index = indexer.indexExports(sourceFiles['index.ts']);
      expect(index).toMatchInlineSnapshot(`
        Object {
          "ambientRefs": Array [],
          "imports": Array [],
          "locals": Array [
            Object {
              "decs": Array [
                ts.ClassDeclaration (A) @ dist_dts/foo.d.ts:1:1,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.ClassDeclaration (A) @ dist_dts/foo.d.ts:1:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.ClassDeclaration (B) @ dist_dts/foo.d.ts:4:1,
              ],
              "exported": undefined,
              "rootSymbol": Symbol(ts.ClassDeclaration (B) @ dist_dts/foo.d.ts:4:1),
              "type": "copied decs",
            },
            Object {
              "decs": Array [
                ts.FunctionDeclaration (name) @ dist_dts/index.d.ts:1:1,
              ],
              "exported": Object {
                "name": "name",
                "type": "named",
                "typeOnly": false,
              },
              "rootSymbol": Symbol(ts.FunctionDeclaration (name) @ dist_dts/index.d.ts:1:1),
              "type": "copied decs",
            },
          ],
        }
      `);
    });
  });

  describe('missing node modules', () => {
    const project = new TestProject({
      'index.ts': `
        export * from './foo'
      `,
      'foo.ts': `
        import { BaseClass } from 'missing_node_module'
        export class Class extends BaseClass {
          foo: true
        }
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('throws a helpful error when node_modules are missing', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer({
        ignoreDiags: (msg) => msg.includes(`Cannot find module 'missing_node_module'`),
      });

      expect(() =>
        indexer.indexExports(sourceFiles['index.ts'])
      ).toThrowErrorMatchingInlineSnapshot(
        `"unable to find declarations for symbol imported from \\"missing_node_module\\". If this is an external module, make sure is it listed in the type dependencies for this package. If it's internal then make sure that TypeScript understands the types of the imported value. Imported: ts.ImportSpecifier (BaseClass) @ packages/kbn-type-summarizer/__tmp__/dist_dts/foo.d.ts:1:10"`
      );
    });
  });

  describe('undeclared symbols', () => {
    const project = new TestProject({
      'index.ts': `
        // @ts-expect-error
        export { a } from './foo'
      `,
      'foo.js': `
        export function a() {}
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('throws a helpful error when exported symbols are not found', async () => {
      const { indexer, sourceFiles } = await project.initAstIndexer();

      expect(() =>
        indexer.indexExports(sourceFiles['index.ts'])
      ).toThrowErrorMatchingInlineSnapshot(
        `"unable to find declarations for symbol imported from \\"./foo\\". If this is an external module, make sure is it listed in the type dependencies for this package. If it's internal then make sure that TypeScript understands the types of the imported value. Imported: ts.ExportSpecifier (a) @ packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts:1:10"`
      );
    });
  });
});
