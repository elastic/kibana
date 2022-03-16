/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Project, Node } from 'ts-morph';
import { ToolingLog } from '@kbn/dev-utils';

import { TypeKind, ApiScope, PluginOrPackage } from '../types';
import { getKibanaPlatformPlugin } from '../tests/kibana_platform_plugin_mock';
import { getDeclarationNodesForPluginScope } from '../get_declaration_nodes_for_plugin';
import { buildApiDeclarationTopNode } from './build_api_declaration';
import { isNamedNode } from '../tsmorph_utils';

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
  const tsConfigFilePath = Path.resolve(__dirname, '../tests/__fixtures__/src/tsconfig.json');
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
    currentPluginId: plugins[0].manifest.id,
    scope: ApiScope.CLIENT,
    captureReferences: false,
  });

  expect(def.type).toBe(TypeKind.NumberKind);
});

it('Function type is exported as type with signature', () => {
  const node = nodes.find((n) => getNodeName(n) === 'FnWithGeneric');
  expect(node).toBeDefined();
  const def = buildApiDeclarationTopNode(node!, {
    plugins,
    log,
    currentPluginId: plugins[0].manifest.id,
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
    currentPluginId: plugins[0].manifest.id,
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
    currentPluginId: plugins[0].manifest.id,
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
    currentPluginId: plugins[0].manifest.id,
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
    currentPluginId: plugins[0].manifest.id,
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
