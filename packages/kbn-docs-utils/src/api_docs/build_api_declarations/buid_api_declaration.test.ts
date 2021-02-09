/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Project, Node } from 'ts-morph';
import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';

import { TypeKind, ApiScope } from '../types';
import { getKibanaPlatformPlugin } from '../tests/kibana_platform_plugin_mock';
import { getDeclarationNodesForPluginScope } from '../get_declaration_nodes_for_plugin';
import { buildApiDeclaration } from './build_api_declaration';
import { isNamedNode } from '../tsmorph_utils';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

let nodes: Node[];
let plugins: KibanaPlatformPlugin[];

function getNodeName(node: Node): string {
  return isNamedNode(node) ? node.getName() : '';
}

beforeAll(() => {
  const tsConfigFilePath = Path.resolve(__dirname, '../tests/__fixtures__/src/tsconfig.json');
  const project = new Project({
    tsConfigFilePath,
  });

  plugins = [getKibanaPlatformPlugin('pluginA', 'plugin_a')];

  nodes = getDeclarationNodesForPluginScope(project, plugins[0], ApiScope.CLIENT, log);
});

it('Test number primitive doc def', () => {
  const node = nodes.find((n) => getNodeName(n) === 'aNum');
  expect(node).toBeDefined();
  const def = buildApiDeclaration(node!, plugins, log, plugins[0].manifest.id, ApiScope.CLIENT);

  expect(def.type).toBe(TypeKind.NumberKind);
});

it('Function type is exported as type with signature', () => {
  const node = nodes.find((n) => getNodeName(n) === 'FnWithGeneric');
  expect(node).toBeDefined();
  const def = buildApiDeclaration(node!, plugins, log, plugins[0].manifest.id, ApiScope.CLIENT);
  expect(def).toBeDefined();
  expect(def?.type).toBe(TypeKind.TypeKind);
  expect(def?.signature?.length).toBeGreaterThan(0);
});

it('Test Interface Kind doc def', () => {
  const node = nodes.find((n) => getNodeName(n) === 'ExampleInterface');
  expect(node).toBeDefined();
  const def = buildApiDeclaration(node!, plugins, log, plugins[0].manifest.id, ApiScope.CLIENT);

  expect(def.type).toBe(TypeKind.InterfaceKind);
  expect(def.children).toBeDefined();
  expect(def.children!.length).toBe(3);
});

it('Test union export', () => {
  const node = nodes.find((n) => getNodeName(n) === 'aUnionProperty');
  expect(node).toBeDefined();
  const def = buildApiDeclaration(node!, plugins, log, plugins[0].manifest.id, ApiScope.CLIENT);
  expect(def.type).toBe(TypeKind.CompoundTypeKind);
});

it('Function inside interface has a label', () => {
  const node = nodes.find((n) => getNodeName(n) === 'ExampleInterface');
  expect(node).toBeDefined();
  const def = buildApiDeclaration(node!, plugins, log, plugins[0].manifest.id, ApiScope.CLIENT);

  const fn = def!.children?.find((c) => c.label === 'aFn');
  expect(fn).toBeDefined();
  expect(fn?.label).toBe('aFn');
  expect(fn?.type).toBe(TypeKind.FunctionKind);
});
