/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  isSimpleRequireCall,
  collectReferencedProperties,
  excludeImports,
  ensureModule,
  collectDirectReExportSources,
  hasImportThenExportPattern,
  isInTypeContext,
  shouldSkipIdentifier,
} from './helpers';

describe('helpers', () => {
  describe('isSimpleRequireCall', () => {
    it('returns true for simple require with string literal', () => {
      const ast = parse('require("./foo")');
      const node = (ast.program.body[0] as any).expression;
      expect(isSimpleRequireCall(node, t)).toBe(true);
    });

    it('returns false for require with variable', () => {
      const ast = parse('require(path)');
      const node = (ast.program.body[0] as any).expression;
      expect(isSimpleRequireCall(node, t)).toBe(false);
    });

    it('returns false for require with multiple arguments', () => {
      const ast = parse('require("./foo", {})');
      const node = (ast.program.body[0] as any).expression;
      expect(isSimpleRequireCall(node, t)).toBe(false);
    });

    it('returns false for non-require calls', () => {
      const ast = parse('foo("./bar")');
      const node = (ast.program.body[0] as any).expression;
      expect(isSimpleRequireCall(node, t)).toBe(false);
    });
  });

  describe('excludeImports', () => {
    it('removes specified names from properties map', () => {
      const properties = new Map([
        ['foo', { moduleRequirePath: './foo' } as any],
        ['bar', { moduleRequirePath: './bar' } as any],
        ['baz', { moduleRequirePath: './baz' } as any],
      ]);

      excludeImports(new Set(['foo', 'baz']), properties);

      expect(properties.has('foo')).toBe(false);
      expect(properties.has('bar')).toBe(true);
      expect(properties.has('baz')).toBe(false);
    });

    it('handles empty exclusion set', () => {
      const properties = new Map([['foo', { moduleRequirePath: './foo' } as any]]);

      excludeImports(new Set(), properties);

      expect(properties.has('foo')).toBe(true);
    });
  });

  describe('ensureModule', () => {
    it('creates module entry if it does not exist', () => {
      const modules = new Map();
      const scope = {
        generateUidIdentifier: (name: string) => t.identifier(`_${name}_1`),
      } as any;

      ensureModule('./foo', modules, scope, null);

      expect(modules.has('./foo')).toBe(true);
      const moduleInfo = modules.get('./foo');
      expect(moduleInfo).toMatchObject({
        requirePath: './foo',
        outerFunc: null,
      });
      expect(t.isIdentifier(moduleInfo.cacheId)).toBe(true);
    });

    it('does not overwrite existing module entry', () => {
      const modules = new Map();
      const scope = {
        generateUidIdentifier: (name: string) => t.identifier(`_${name}_1`),
      } as any;

      ensureModule('./foo', modules, scope, null);
      const original = modules.get('./foo');

      ensureModule('./foo', modules, scope, null);
      const after = modules.get('./foo');

      expect(after).toBe(original);
    });

    it('handles outerFunc parameter', () => {
      const modules = new Map();
      const scope = {
        generateUidIdentifier: (name: string) => t.identifier(`_${name}_1`),
      } as any;
      const outerFunc = t.identifier('_interop');

      ensureModule('./foo', modules, scope, outerFunc);

      expect(modules.get('./foo').outerFunc).toBe(outerFunc);
    });
  });

  describe('collectDirectReExportSources', () => {
    it('collects module paths from direct re-exports', () => {
      const ast = parse('export { x } from "./a"; export { y } from "./b";', {
        sourceType: 'module',
      });
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
      });

      const result = collectDirectReExportSources(programPath, t);

      expect(result).toEqual(new Set(['./a', './b']));
    });

    it('returns empty set when no re-exports exist', () => {
      const ast = parse('const x = 1;', { sourceType: 'module' });
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
      });

      const result = collectDirectReExportSources(programPath, t);

      expect(result).toEqual(new Set());
    });
  });

  describe('hasImportThenExportPattern', () => {
    it('returns true when import is later exported', () => {
      const ast = parse('import { x } from "./a"; export { x };', { sourceType: 'module' });
      let importPath: any;
      traverse(ast, {
        ImportDeclaration(path) {
          importPath = path;
        },
      });

      const result = hasImportThenExportPattern(importPath, t);

      expect(result).toBe(true);
    });

    it('returns false when import is not exported', () => {
      const ast = parse('import { x } from "./a"; const y = x;', { sourceType: 'module' });
      let importPath: any;
      traverse(ast, {
        ImportDeclaration(path) {
          importPath = path;
        },
      });

      const result = hasImportThenExportPattern(importPath, t);

      expect(result).toBe(false);
    });
  });

  describe('isInTypeContext', () => {
    it('returns true for TypeScript type annotations', () => {
      const ast = parse('const x: Foo = 1;', {
        sourceType: 'module',
        plugins: ['typescript'],
      });
      let identifierPath: any;
      traverse(ast, {
        Identifier(path) {
          if (path.node.name === 'Foo') {
            identifierPath = path;
          }
        },
      });

      const result = isInTypeContext(identifierPath, t);

      expect(result).toBe(true);
    });

    it('returns false for runtime identifiers', () => {
      const ast = parse('const x = Foo;', {
        sourceType: 'module',
        plugins: ['typescript'],
      });
      let identifierPath: any;
      traverse(ast, {
        Identifier(path) {
          if (path.node.name === 'Foo') {
            identifierPath = path;
          }
        },
      });

      const result = isInTypeContext(identifierPath, t);

      expect(result).toBe(false);
    });

    it('returns true for type references', () => {
      const ast = parse('type Alias = Foo;', {
        sourceType: 'module',
        plugins: ['typescript'],
      });
      let identifierPath: any;
      traverse(ast, {
        Identifier(path) {
          if (path.node.name === 'Foo') {
            identifierPath = path;
          }
        },
      });

      const result = isInTypeContext(identifierPath, t);

      expect(result).toBe(true);
    });
  });

  describe('shouldSkipIdentifier', () => {
    it('skips identifier not in properties map', () => {
      const ast = parse('const x = foo;');
      let identifierPath: any;
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
        Identifier(path) {
          if (path.node.name === 'foo') {
            identifierPath = path;
          }
        },
      });

      const properties = new Map();
      const result = shouldSkipIdentifier(identifierPath, properties, programPath, t);

      expect(result).toBe(true);
    });

    it('skips identifier in declaration position', () => {
      const ast = parse('const foo = 1;');
      let identifierPath: any;
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
        Identifier(path) {
          if (path.node.name === 'foo' && path.parent.type === 'VariableDeclarator') {
            identifierPath = path;
          }
        },
      });

      const properties = new Map([['foo', {} as any]]);
      const result = shouldSkipIdentifier(identifierPath, properties, programPath, t);

      expect(result).toBe(true);
    });

    it('skips identifier as object property key', () => {
      const ast = parse('const obj = { foo: 1 };');
      let identifierPath: any;
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
        Identifier(path) {
          if (path.node.name === 'foo' && path.parent.type === 'ObjectProperty') {
            identifierPath = path;
          }
        },
      });

      const properties = new Map([['foo', {} as any]]);
      const result = shouldSkipIdentifier(identifierPath, properties, programPath, t);

      expect(result).toBe(true);
    });

    it('does not skip identifier in reference position', () => {
      const ast = parse('const foo = 1; const x = foo;');
      let identifierPath: any;
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
        Identifier(path) {
          // Get the second 'foo' (the reference, not the declaration)
          if (
            path.node.name === 'foo' &&
            path.parent.type === 'VariableDeclarator' &&
            path.key === 'init'
          ) {
            identifierPath = path;
          }
        },
      });

      const properties = new Map([['foo', {} as any]]);
      const result = shouldSkipIdentifier(identifierPath, properties, programPath, t);

      expect(result).toBe(false);
    });
  });

  describe('collectReferencedProperties', () => {
    it('collects referenced property names from a node', () => {
      const ast = parse('const x = foo; const y = bar; const z = baz;');
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
      });

      const properties = new Map([
        ['foo', {} as any],
        ['bar', {} as any],
        ['qux', {} as any],
      ]);

      const result = collectReferencedProperties(programPath, properties);

      expect(result).toEqual(new Set(['foo', 'bar']));
      expect(result.has('baz')).toBe(false); // baz not in properties
      expect(result.has('qux')).toBe(false); // qux not referenced
    });

    it('returns empty set when no properties are referenced', () => {
      const ast = parse('const x = 1;');
      let programPath: any;
      traverse(ast, {
        Program(path) {
          programPath = path;
        },
      });

      const properties = new Map([['foo', {} as any]]);
      const result = collectReferencedProperties(programPath, properties);

      expect(result).toEqual(new Set());
    });
  });
});
