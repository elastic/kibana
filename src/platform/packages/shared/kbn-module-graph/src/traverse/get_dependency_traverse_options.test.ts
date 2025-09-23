/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@babel/parser';
import { traverse } from '@babel/core';
import { getDependencyTraverseOptions } from './get_dependency_traverse_options';

describe('getDependencyTraverseOptions', () => {
  let mockVisitors: {
    RequireDeclaration: jest.Mock;
    DynamicImportDeclaration: jest.Mock;
    RequireExpression: jest.Mock;
    DynamicImportExpression: jest.Mock;
    CommonJSExport: jest.Mock;
    ImportDeclaration: jest.Mock;
    ExportNamedDeclaration: jest.Mock;
    ExportDefaultDeclaration: jest.Mock;
    ExportAllDeclaration: jest.Mock;
    Jest: jest.Mock;
  };

  beforeEach(() => {
    mockVisitors = {
      RequireDeclaration: jest.fn(),
      DynamicImportDeclaration: jest.fn(),
      RequireExpression: jest.fn(),
      DynamicImportExpression: jest.fn(),
      CommonJSExport: jest.fn(),
      ImportDeclaration: jest.fn(),
      ExportNamedDeclaration: jest.fn(),
      ExportDefaultDeclaration: jest.fn(),
      ExportAllDeclaration: jest.fn(),
      Jest: jest.fn(),
    };
  });

  function parseAndTraverse(code: string) {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const options = getDependencyTraverseOptions(mockVisitors);
    traverse(ast, options);
  }

  describe('CallExpression visitor', () => {
    it('should call RequireExpression for require() calls', () => {
      parseAndTraverse("const mod = require('./module');");

      expect(mockVisitors.RequireExpression).toHaveBeenCalledTimes(1);
      expect(mockVisitors.RequireExpression).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'CallExpression',
            callee: expect.objectContaining({ name: 'require' }),
          }),
        }),
        undefined
      );
    });

    it('should call DynamicImportExpression for import() calls', () => {
      parseAndTraverse("const mod = import('./module');");

      expect(mockVisitors.DynamicImportExpression).toHaveBeenCalledTimes(1);
      expect(mockVisitors.DynamicImportExpression).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'CallExpression',
            callee: expect.objectContaining({ type: 'Import' }),
          }),
        }),
        undefined
      );
    });

    it('should call Jest for jest method calls', () => {
      parseAndTraverse('jest.mock("./module");');

      expect(mockVisitors.Jest).toHaveBeenCalledTimes(1);
      expect(mockVisitors.Jest).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'CallExpression',
            callee: expect.objectContaining({
              type: 'MemberExpression',
              object: expect.objectContaining({ name: 'jest' }),
              property: expect.objectContaining({ name: 'mock' }),
            }),
          }),
        }),
        undefined
      );
    });

    it('should not call RequireExpression for non-string require arguments', () => {
      parseAndTraverse('const mod = require(variable);');

      expect(mockVisitors.RequireExpression).not.toHaveBeenCalled();
    });

    it('should handle all jest methods', () => {
      const jestMethods = [
        'mock',
        'doMock',
        'unmock',
        'deepUnmock',
        'requireMock',
        'setMock',
        'genMockFromModule',
        'dontMock',
      ];

      jestMethods.forEach((method) => {
        mockVisitors.Jest.mockClear();
        parseAndTraverse(`jest.${method}("./module");`);
        expect(mockVisitors.Jest).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('VariableDeclaration visitor', () => {
    it('should call RequireDeclaration for destructured require', () => {
      parseAndTraverse("const { foo, bar } = require('./module');");

      expect(mockVisitors.RequireDeclaration).toHaveBeenCalledTimes(1);
      expect(mockVisitors.RequireDeclaration).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'VariableDeclaration',
            declarations: expect.arrayContaining([
              expect.objectContaining({
                id: expect.objectContaining({ type: 'ObjectPattern' }),
                init: expect.objectContaining({
                  type: 'CallExpression',
                  callee: expect.objectContaining({ name: 'require' }),
                }),
              }),
            ]),
          }),
        }),
        undefined
      );
    });

    it('should call DynamicImportExpression for destructured, unawaited import()', () => {
      parseAndTraverse("const { foo, bar } = import('./module');");
      expect(mockVisitors.DynamicImportExpression).toHaveBeenCalled();
    });

    it('should call DynamicImportDeclaration for destructured awaited import()', () => {
      parseAndTraverse("const { foo, bar } = await import('./module');");

      expect(mockVisitors.DynamicImportDeclaration).toHaveBeenCalledTimes(1);
      expect(mockVisitors.DynamicImportDeclaration).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'VariableDeclaration',
            declarations: expect.arrayContaining([
              expect.objectContaining({
                id: expect.objectContaining({ type: 'ObjectPattern' }),
                init: expect.objectContaining({
                  type: 'AwaitExpression',
                  argument: expect.objectContaining({
                    type: 'CallExpression',
                    callee: expect.objectContaining({ type: 'Import' }),
                  }),
                }),
              }),
            ]),
          }),
        }),
        undefined
      );
    });

    it('should not call declaration visitors for non-destructured assignments', () => {
      parseAndTraverse("const mod = require('./module');");

      expect(mockVisitors.RequireDeclaration).not.toHaveBeenCalled();
      expect(mockVisitors.DynamicImportDeclaration).not.toHaveBeenCalled();
    });

    it('should not call declaration visitors for member access patterns', () => {
      parseAndTraverse("const val = require('./module').prop;");

      expect(mockVisitors.RequireDeclaration).not.toHaveBeenCalled();
      expect(mockVisitors.DynamicImportDeclaration).not.toHaveBeenCalled();
    });

    it('should not call declaration visitors for non-string arguments', () => {
      parseAndTraverse('const { foo } = require(variable);');

      expect(mockVisitors.RequireDeclaration).not.toHaveBeenCalled();
    });

    it('should not call RequireExpression when RequireDeclaration is called', () => {
      parseAndTraverse("const { foo, bar } = require('./module');");

      expect(mockVisitors.RequireDeclaration).toHaveBeenCalledTimes(1);
      expect(mockVisitors.RequireExpression).not.toHaveBeenCalled();
    });

    it('should not call DynamicImportExpression when DynamicImportDeclaration is called', () => {
      parseAndTraverse("const { foo, bar } = await import('./module');");

      expect(mockVisitors.DynamicImportDeclaration).toHaveBeenCalledTimes(1);
      expect(mockVisitors.DynamicImportExpression).not.toHaveBeenCalled();
    });

    it('should call RequireExpression when RequireDeclaration is not applicable', () => {
      parseAndTraverse("const mod = require('./module');");

      expect(mockVisitors.RequireExpression).toHaveBeenCalledTimes(1);
      expect(mockVisitors.RequireDeclaration).not.toHaveBeenCalled();
    });

    it('should call DynamicImportExpression when DynamicImportDeclaration is not applicable', () => {
      parseAndTraverse("const mod = import('./module');");

      expect(mockVisitors.DynamicImportExpression).toHaveBeenCalledTimes(1);
      expect(mockVisitors.DynamicImportDeclaration).not.toHaveBeenCalled();
    });

    it('should call expression visitors when destructuring contains rest property with require', () => {
      parseAndTraverse("const { foo, ...rest } = require('./module');");

      expect(mockVisitors.RequireDeclaration).not.toHaveBeenCalled();
      expect(mockVisitors.RequireExpression).toHaveBeenCalledTimes(1);

      expect(mockVisitors.DynamicImportDeclaration).not.toHaveBeenCalled();
    });

    it('should call expression visitors when destructuring contains rest property with import', () => {
      parseAndTraverse("const { foo, ...rest } = await import('./module');");

      expect(mockVisitors.DynamicImportDeclaration).not.toHaveBeenCalled();
      expect(mockVisitors.DynamicImportExpression).toHaveBeenCalledTimes(1);

      expect(mockVisitors.RequireDeclaration).not.toHaveBeenCalled();
      expect(mockVisitors.RequireExpression).not.toHaveBeenCalled();
    });
  });

  describe('AssignmentExpression visitor', () => {
    it('should call CommonJSExport for exports.foo = bar', () => {
      parseAndTraverse('exports.foo = bar;');

      expect(mockVisitors.CommonJSExport).toHaveBeenCalledTimes(1);
      expect(mockVisitors.CommonJSExport).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'AssignmentExpression',
            left: expect.objectContaining({
              type: 'MemberExpression',
              object: expect.objectContaining({ name: 'exports' }),
            }),
          }),
        }),
        undefined
      );
    });

    it('should call CommonJSExport for module.exports = something', () => {
      parseAndTraverse('module.exports = something;');

      expect(mockVisitors.CommonJSExport).toHaveBeenCalledTimes(1);
      expect(mockVisitors.CommonJSExport).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'AssignmentExpression',
            left: expect.objectContaining({
              type: 'MemberExpression',
              object: expect.objectContaining({ name: 'module' }),
              property: expect.objectContaining({ name: 'exports' }),
            }),
          }),
        }),
        undefined
      );
    });

    it('should call CommonJSExport for module.exports.foo = bar', () => {
      parseAndTraverse('module.exports.foo = bar;');

      expect(mockVisitors.CommonJSExport).toHaveBeenCalledTimes(1);
      expect(mockVisitors.CommonJSExport).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({
            type: 'AssignmentExpression',
            left: expect.objectContaining({
              type: 'MemberExpression',
              object: expect.objectContaining({
                type: 'MemberExpression',
                object: expect.objectContaining({ name: 'module' }),
                property: expect.objectContaining({ name: 'exports' }),
              }),
              property: expect.objectContaining({ name: 'foo' }),
            }),
          }),
        }),
        undefined
      );
    });

    it('should not call CommonJSExport for non-exports assignments', () => {
      parseAndTraverse('someVar.prop = value;');

      expect(mockVisitors.CommonJSExport).not.toHaveBeenCalled();
    });
  });

  describe('Direct visitor delegation', () => {
    it('should delegate ImportDeclaration to provided visitor', () => {
      parseAndTraverse("import { foo } from './module'; foo();");

      expect(mockVisitors.ImportDeclaration).toHaveBeenCalledTimes(1);
    });

    it('should delegate ExportNamedDeclaration to provided visitor', () => {
      parseAndTraverse('const foo = 1; export { foo };');

      expect(mockVisitors.ExportNamedDeclaration).toHaveBeenCalledTimes(1);
    });

    it('should delegate ExportDefaultDeclaration to provided visitor', () => {
      parseAndTraverse('export default foo;');

      expect(mockVisitors.ExportDefaultDeclaration).toHaveBeenCalledTimes(1);
    });

    it('should delegate ExportAllDeclaration to provided visitor', () => {
      parseAndTraverse("export * from './module';");

      expect(mockVisitors.ExportAllDeclaration).toHaveBeenCalledTimes(1);
    });
  });

  describe('ImportDeclaration type-only detection', () => {
    it('skips import type declarations', () => {
      parseAndTraverse("import type { Foo } from './mod';");
      expect(mockVisitors.ImportDeclaration).not.toHaveBeenCalled();
    });

    it('skips specifiers that are all type-only', () => {
      parseAndTraverse("import { type Foo, type Bar } from './mod';");
      expect(mockVisitors.ImportDeclaration).not.toHaveBeenCalled();
    });

    it('skips imports when bindings are only used in type positions (type annotation)', () => {
      parseAndTraverse("import { Foo } from './mod'; const x: Foo = 1 as any;");
      expect(mockVisitors.ImportDeclaration).not.toHaveBeenCalled();
    });

    it('skips imports when bindings are only used in type positions (implements)', () => {
      parseAndTraverse("import { IFoo } from './mod'; class C implements IFoo {} ");
      expect(mockVisitors.ImportDeclaration).not.toHaveBeenCalled();
    });

    it('considers namespace import used as value when accessed at runtime', () => {
      parseAndTraverse("import * as ns from './mod'; console.log(ns);");
      expect(mockVisitors.ImportDeclaration).toHaveBeenCalledTimes(1);
    });

    it('considers default import used as value when referenced in value space', () => {
      parseAndTraverse("import def from './mod'; def();");
      expect(mockVisitors.ImportDeclaration).toHaveBeenCalledTimes(1);
    });

    it('considers named import used as value when referenced in value space', () => {
      parseAndTraverse("import { run } from './mod'; run();");
      expect(mockVisitors.ImportDeclaration).toHaveBeenCalledTimes(1);
    });

    it('considers side-effect only import as value-affecting', () => {
      parseAndTraverse("import './side-effect';");
      expect(mockVisitors.ImportDeclaration).toHaveBeenCalledTimes(1);
    });

    it('does not count TSNonNullExpression (!) as type-only usage', () => {
      parseAndTraverse("import def from './mod'; def!; ");
      expect(mockVisitors.ImportDeclaration).toHaveBeenCalledTimes(1);
    });
  });
});
