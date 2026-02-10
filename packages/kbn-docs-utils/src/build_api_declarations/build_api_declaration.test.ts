/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Node } from 'ts-morph';
import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';

import type { PluginOrPackage } from '../types';
import { TypeKind, ApiScope } from '../types';
import { getKibanaPlatformPlugin } from '../integration_tests/kibana_platform_plugin_mock';
import { getDeclarationNodesForPluginScope } from '../get_declaration_nodes_for_plugin';
import { buildApiDeclarationTopNode } from './build_api_declaration';
import { isNamedNode } from '../tsmorph_utils';
import { getTypeKind } from './get_type_kind';
import { getSignature } from './get_signature';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import { buildVariableDec } from './build_variable_dec';
import { buildCallSignatureDec } from './build_call_signature_dec';
import { getReferences } from './get_references';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

let nodes: Node[];
let plugins: PluginOrPackage[];

function getNodeName(node: Node): string {
  return isNamedNode(node) ? node.getName() : '';
}

beforeAll(() => {
  const tsConfigFilePath = Path.resolve(
    __dirname,
    '../integration_tests/__fixtures__/src/tsconfig.json'
  );
  const project = new Project({
    tsConfigFilePath,
  });

  plugins = [getKibanaPlatformPlugin('pluginA')];

  nodes = getDeclarationNodesForPluginScope(project, plugins[0], ApiScope.CLIENT, log);
});

it('Test number primitive doc def', () => {
  const node = nodes.find((n) => getNodeName(n) === 'aNum');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });

  expect(def.type).toBe(TypeKind.NumberKind);
});

it('Test a constructor type declaration inside an interface', () => {
  const node = nodes.find((n) => getNodeName(n) === 'ClassConstructorWithStaticProperties');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });

  expect(def.type).toBe(TypeKind.InterfaceKind);
  expect(def.children).toHaveLength(2);
  expect(def.children![1].type).toBe(TypeKind.FunctionKind);
  expect(def.children![1].label).toBe('new');
  expect(def.children![1].id).toBe('def-public.ClassConstructorWithStaticProperties.new');
});

it('Function type is exported as type with signature', () => {
  const node = nodes.find((n) => getNodeName(n) === 'FnWithGeneric');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });
  expect(def).toBeDefined();
  expect(def?.type).toBe(TypeKind.TypeKind);
  expect(def?.signature?.length).toBeGreaterThan(0);
});

it('Test Interface Kind doc def', () => {
  const node = nodes.find((n) => getNodeName(n) === 'ExampleInterface');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });

  expect(def.type).toBe(TypeKind.InterfaceKind);
  expect(def.children).toBeDefined();
  expect(def.children!.length).toBe(6);
});

it('Test union export', () => {
  const node = nodes.find((n) => getNodeName(n) === 'aUnionProperty');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });
  expect(def.type).toBe(TypeKind.CompoundTypeKind);
});

it('Function inside interface has a label', () => {
  const node = nodes.find((n) => getNodeName(n) === 'ExampleInterface');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });

  const fn = def!.children?.find((c) => c.label === 'aFn');
  expect(fn).toBeDefined();
  expect(fn?.label).toBe('aFn');
  expect(fn?.type).toBe(TypeKind.FunctionKind);
});

// FAILING: https://github.com/elastic/kibana/issues/120125
it.skip('Test ReactElement signature', () => {
  const node = nodes.find((n) => getNodeName(n) === 'AReactElementFn');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });
  expect(def.signature).toBeDefined();
  expect(def.signature!.length).toBe(3);
  // There is a terrible hack to achieve this, but without it, ReactElement<Props> expands to include the second default generic type
  // (ReactElement<Props, string | (any) crazy code here with lots of anys that comes from react types >) and
  // it looks awful.
  expect(def.signature![2]).toBe('>');
  expect(def.signature!).toMatchInlineSnapshot(`
    Array [
      "() => React.ReactElement<",
      Object {
        "docId": "kibPluginAPluginApi",
        "pluginId": "pluginA",
        "scope": "public",
        "section": "def-public.MyProps",
        "text": "MyProps",
      },
      ">",
    ]
  `);
});

describe('Parameter extraction', () => {
  it('extracts simple parameters with JSDoc comments', () => {
    const node = nodes.find((n) => getNodeName(n) === 'notAnArrowFn');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    expect(def.type).toBe(TypeKind.FunctionKind);
    expect(def.children).toBeDefined();
    expect(def.children!.length).toBe(5);

    // Check that parameters have descriptions from JSDoc
    const paramA = def.children!.find((c) => c.label === 'a');
    expect(paramA).toBeDefined();
    expect(paramA!.description).toBeDefined();
    expect(paramA!.description!.length).toBeGreaterThan(0);
    expect(paramA!.description![0]).toContain('letter A');

    const paramB = def.children!.find((c) => c.label === 'b');
    expect(paramB).toBeDefined();
    expect(paramB!.description).toBeDefined();
    expect(paramB!.description!.length).toBeGreaterThan(0);
  });

  it('extracts destructured parameters as children', () => {
    const node = nodes.find((n) => getNodeName(n) === 'crazyFunction');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    expect(def.type).toBe(TypeKind.FunctionKind);
    expect(def.children).toBeDefined();
    expect(def.children!.length).toBe(3);

    // First parameter: obj: { hi: string }
    const paramObj = def.children!.find((c) => c.label === 'obj');
    expect(paramObj).toBeDefined();
    expect(paramObj!.children).toBeDefined();
    expect(paramObj!.children!.length).toBe(1);

    const hiProp = paramObj!.children!.find((c) => c.label === 'hi');
    expect(hiProp).toBeDefined();
    expect(hiProp!.type).toBe(TypeKind.StringKind);

    // Second parameter: { fn1, fn2 }: { fn1: Function, fn2: Function }
    const paramFn = def.children!.find((c) => c.label === '{ fn1, fn2 }');
    expect(paramFn).toBeDefined();
    expect(paramFn!.children).toBeDefined();
    expect(paramFn!.children!.length).toBe(2);

    const fn1 = paramFn!.children!.find((c) => c.label === 'fn1');
    expect(fn1).toBeDefined();
    expect(fn1!.type).toBe(TypeKind.FunctionKind);

    const fn2 = paramFn!.children!.find((c) => c.label === 'fn2');
    expect(fn2).toBeDefined();
    expect(fn2!.type).toBe(TypeKind.FunctionKind);

    // Third parameter: { str }: { str: string }
    const paramStr = def.children!.find((c) => c.label === '{ str }');
    expect(paramStr).toBeDefined();
    expect(paramStr!.children).toBeDefined();
    expect(paramStr!.children!.length).toBe(1);
  });

  it('extracts nested destructured parameters', () => {
    const node = nodes.find((n) => getNodeName(n) === 'crazyFunction');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    // Check nested structure: { fn1, fn2 }.fn1.foo.param
    const paramFn = def.children!.find((c) => c.label === '{ fn1, fn2 }');
    expect(paramFn).toBeDefined();

    const fn1 = paramFn!.children!.find((c) => c.label === 'fn1');
    expect(fn1).toBeDefined();
    expect(fn1!.type).toBe(TypeKind.FunctionKind);
    expect(fn1!.children).toBeDefined();

    // fn1 has a parameter: foo: { param: string }
    const fooParam = fn1!.children!.find((c) => c.label === 'foo');
    expect(fooParam).toBeDefined();
    expect(fooParam!.type).toBe(TypeKind.ObjectKind);
    expect(fooParam!.children).toBeDefined();

    const paramProp = fooParam!.children!.find((c) => c.label === 'param');
    expect(paramProp).toBeDefined();
    expect(paramProp!.type).toBe(TypeKind.StringKind);
  });

  it('extracts parameter comments from JSDoc', () => {
    const node = nodes.find((n) => getNodeName(n) === 'notAnArrowFn');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    // Check that parameters have descriptions extracted from @param tags
    const paramA = def.children!.find((c) => c.label === 'a');
    expect(paramA!.description).toBeDefined();
    expect(paramA!.description!.length).toBeGreaterThan(0);

    const paramB = def.children!.find((c) => c.label === 'b');
    expect(paramB!.description).toBeDefined();
    expect(paramB!.description!.length).toBeGreaterThan(0);
    expect(paramB!.description![0]).toContain('Feed me');
  });

  it('handles parameters without JSDoc comments', () => {
    const node = nodes.find((n) => getNodeName(n) === 'fnWithNonExportedRef');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    expect(def.type).toBe(TypeKind.FunctionKind);
    expect(def.children).toBeDefined();
    expect(def.children!.length).toBe(1);

    const paramA = def.children!.find((c) => c.label === 'a');
    expect(paramA).toBeDefined();
    // Parameter without @param tag should have empty description
    expect(paramA!.description).toBeDefined();
    expect(paramA!.description!.length).toBe(0);
  });

  it('extracts inline object parameters as children', () => {
    // Test with getSearchService2 from plugin.ts which has inline object parameter
    // Setup is an interface, so we need to find it and access its children
    const setupNode = nodes.find((n) => {
      if (isNamedNode(n) && n.getName() === 'Setup') {
        return true;
      }
      return false;
    });
    expect(setupNode).toBeDefined();

    const setupDef = buildApiDeclarationTopNode(setupNode!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    // getSearchService2 is a property of the Setup interface
    const getSearchService2 = setupDef.children!.find((c) => c.label === 'getSearchService2');
    expect(getSearchService2).toBeDefined();
    expect(getSearchService2!.type).toBe(TypeKind.FunctionKind);
    expect(getSearchService2!.children).toBeDefined();

    // Inline object parameter should be extracted
    const searchSpecParam = getSearchService2!.children!.find((c) => c.label === 'searchSpec');
    expect(searchSpecParam).toBeDefined();
    expect(searchSpecParam!.children).toBeDefined();
    expect(searchSpecParam!.children!.length).toBe(2); // username and password

    const usernameProp = searchSpecParam!.children!.find((c) => c.label === 'username');
    expect(usernameProp).toBeDefined();
    expect(usernameProp!.type).toBe(TypeKind.StringKind);

    const passwordProp = searchSpecParam!.children!.find((c) => c.label === 'password');
    expect(passwordProp).toBeDefined();
    expect(passwordProp!.type).toBe(TypeKind.StringKind);
  });

  it('handles deeply nested inline object parameters', () => {
    // Test with fnWithInlineParams from plugin.ts
    const setupNode = nodes.find((n) => {
      if (isNamedNode(n) && n.getName() === 'Setup') {
        return true;
      }
      return false;
    });
    expect(setupNode).toBeDefined();

    const setupDef = buildApiDeclarationTopNode(setupNode!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    // fnWithInlineParams is a property of the Setup interface
    const fnWithInlineParams = setupDef.children!.find((c) => c.label === 'fnWithInlineParams');
    expect(fnWithInlineParams).toBeDefined();
    expect(fnWithInlineParams!.type).toBe(TypeKind.FunctionKind);
    expect(fnWithInlineParams!.children).toBeDefined();

    // obj: { fn: (foo: { param: string }) => number }
    const objParam = fnWithInlineParams!.children!.find((c) => c.label === 'obj');
    expect(objParam).toBeDefined();
    expect(objParam!.children).toBeDefined();

    const fnProp = objParam!.children!.find((c) => c.label === 'fn');
    expect(fnProp).toBeDefined();
    expect(fnProp!.type).toBe(TypeKind.FunctionKind);
    expect(fnProp!.children).toBeDefined();

    // fn has parameter: foo: { param: string }
    const fooParam = fnProp!.children!.find((c) => c.label === 'foo');
    expect(fooParam).toBeDefined();
    expect(fooParam!.type).toBe(TypeKind.ObjectKind);
    expect(fooParam!.children).toBeDefined();

    const paramProp = fooParam!.children!.find((c) => c.label === 'param');
    expect(paramProp).toBeDefined();
    expect(paramProp!.type).toBe(TypeKind.StringKind);
  });

  it('extracts parent parameter comment for destructured parameters', () => {
    const node = nodes.find((n) => getNodeName(n) === 'crazyFunction');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    // First parameter has @param obj comment
    const paramObj = def.children!.find((c) => c.label === 'obj');
    expect(paramObj).toBeDefined();
    // Current behavior: parent parameter comments are NOT extracted for TypeLiteral parameters
    // This is a known limitation - when a parameter has a TypeLiteral type (destructured params),
    // buildApiDeclaration is called directly without extracting the JSDoc comment for the parameter name.
    // This will be fixed in Phase 4.1
    expect(paramObj!.description).toBeDefined();
    // Currently, the description is empty for destructured parameters
    // After Phase 4.1, this should contain the @param obj comment
    expect(paramObj!.description!.length).toBe(0);
  });

  it('does not extract property-level JSDoc comments (current limitation)', () => {
    // This test documents current behavior: property-level @param tags like @param obj.hi
    // are not currently extracted. This will be fixed in Phase 4.1.
    const node = nodes.find((n) => getNodeName(n) === 'crazyFunction');
    expect(node).toBeDefined();
    const def = buildApiDeclarationTopNode(node!, {
      plugins,
      log,
      currentPluginId: plugins[0].id,
      scope: ApiScope.CLIENT,
      captureReferences: false,
    });

    const paramObj = def.children!.find((c) => c.label === 'obj');
    expect(paramObj).toBeDefined();

    const hiProp = paramObj!.children!.find((c) => c.label === 'hi');
    expect(hiProp).toBeDefined();
    // Current behavior: property-level comments are not extracted
    // Even if @param obj.hi existed, it wouldn't be found
    // This is a known limitation that will be addressed in Phase 4.1
    expect(hiProp!.description).toBeDefined();
    expect(hiProp!.description!.length).toBe(0);
  });
});

describe('buildBasicApiDeclaration edge cases', () => {
  it('throws error for index signature with unexpected name', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      interface TestInterface {
        [key: string]: number;
      }
      `
    );

    const indexSig = sourceFile.getInterface('TestInterface')!.getIndexSignatures()[0];

    const mockOpts = {
      name: 'NamedIndexSig', // This should trigger the error
      id: 'test-id',
      currentPluginId: 'test-plugin',
      plugins: [],
      log,
      captureReferences: false,
      scope: ApiScope.CLIENT,
    };

    expect(() => {
      buildBasicApiDeclaration(indexSig, mockOpts);
    }).toThrow('Assumption is incorrect! Index signature with name: NamedIndexSig.');
  });
});

describe('buildVariableDec edge cases', () => {
  it('logs warning when variable has multiple call signatures', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      type MultiSig = {
        (): string;
        (x: number): number;
      };
      const test: MultiSig = (() => '') as any;
      `
    );

    const varDecl = sourceFile.getVariableDeclaration('test');
    expect(varDecl).toBeDefined();

    const warnSpy = jest.spyOn(log, 'warning').mockImplementation();

    buildVariableDec(varDecl!, {
      name: 'test',
      id: 'test-id',
      currentPluginId: 'test-plugin',
      plugins: [],
      log,
      captureReferences: false,
      scope: ApiScope.CLIENT,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not handling more than one call signature')
    );

    warnSpy.mockRestore();
  });
});

describe('buildCallSignatureDec edge cases', () => {
  it('logs warning for parameters with multiple declarations', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      type MultiDecl = {
        (x: string): void;
      };
      const test: MultiDecl = () => {};
      `
    );

    const varDecl = sourceFile.getVariableDeclaration('test');
    expect(varDecl).toBeDefined();

    const callSigs = varDecl!.getType().getCallSignatures();

    if (callSigs.length > 0) {
      // Create a mock signature with multiple declarations
      const mockSig = {
        getParameters: jest.fn(() => [
          {
            getName: () => 'param',
            getDeclarations: () => [varDecl, varDecl], // Multiple declarations
          },
        ]),
      };

      const warnSpy = jest.spyOn(log, 'warning').mockImplementation();

      // Cast to `any` is necessary here because we're creating a minimal mock
      // of the ts-morph Signature interface to test the multiple declarations path.
      buildCallSignatureDec(varDecl!, mockSig as any, {
        name: 'test',
        id: 'test-id',
        currentPluginId: 'test-plugin',
        plugins: [],
        log,
        captureReferences: false,
        scope: ApiScope.CLIENT,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Losing information on parameter')
      );

      warnSpy.mockRestore();
    }
  });
});

describe('getTypeKind edge cases', () => {
  it('handles boolean literal types', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const trueLiteral: true = true;
      const falseLiteral: false = false;
      `
    );

    const trueVar = sourceFile.getVariableDeclaration('trueLiteral');
    const falseVar = sourceFile.getVariableDeclaration('falseLiteral');

    expect(trueVar).toBeDefined();
    expect(falseVar).toBeDefined();

    // These should be detected as BooleanKind
    expect(getTypeKind(trueVar!)).toBe(TypeKind.BooleanKind);
    expect(getTypeKind(falseVar!)).toBe(TypeKind.BooleanKind);
  });

  it('handles enum types', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      enum TestEnum {
        A = 'a',
        B = 'b',
      }
      const enumVal: TestEnum = TestEnum.A;
      `
    );

    const enumVar = sourceFile.getVariableDeclaration('enumVal');
    expect(enumVar).toBeDefined();

    // TestEnum (not TestEnum.A) should be detected as EnumKind
    expect(getTypeKind(enumVar!)).toBe(TypeKind.EnumKind);
  });
});

describe('getSignature edge cases', () => {
  it('returns defined signature for ReactElement types', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      import React from 'react';
      const element: React.ReactElement<any> = <div />;
      `
    );

    const varDecl = sourceFile.getVariableDeclaration('element');
    expect(varDecl).toBeDefined();

    const signature = getSignature(varDecl!, [], log);

    // The signature should have the ReactElement hack applied if present
    expect(signature).toBeDefined();
  });
});

describe('getReferences edge cases', () => {
  it('returns empty array for node without external references', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export const testVar = 'test';
      `
    );

    const varDecl = sourceFile.getVariableDeclaration('testVar');
    expect(varDecl).toBeDefined();

    const testPlugin = getKibanaPlatformPlugin('pluginA');
    const testPlugins = [testPlugin];

    // When the node has no type references to other plugins, `getReferences` should return an empty array.
    const refs = getReferences({
      node: varDecl!,
      plugins: testPlugins,
      currentPluginId: 'pluginA',
      log,
    });

    // A simple string variable has no external references.
    expect(refs).toEqual([]);
  });
});
