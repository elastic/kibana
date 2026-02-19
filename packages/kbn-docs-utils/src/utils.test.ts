/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import Path from 'path';
import { Project } from 'ts-morph';
import { REPO_ROOT } from '@kbn/repo-info';
import { findPlugins } from './find_plugins';
import { getPluginApi } from './get_plugin_api';
import { getKibanaPlatformPlugin } from './integration_tests/kibana_platform_plugin_mock';
import type { PluginApi, PluginOrPackage, ScopeApi, ApiDeclaration } from './types';
import { TypeKind, Lifecycle, ApiScope } from './types';
import {
  getPluginForPath,
  getServiceForPath,
  removeBrokenLinks,
  getFileName,
  getPluginApiDocId,
  groupPluginApi,
  addApiDeclarationToScope,
  countScopeApi,
  createEmptyScope,
  getSlug,
  getApiSectionId,
  isInternal,
} from './utils';
import { createMockApiDeclaration } from './__test_helpers__/mocks';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

it('getFileName', () => {
  expect(getFileName('@kbn/datemath')).toBe('kbn_datemath');
});

it('test getPluginForPath', () => {
  const plugins = findPlugins();
  const path = Path.resolve(
    REPO_ROOT,
    'src/platform/plugins/shared/embeddable/public/service/file.ts'
  );
  expect(getPluginForPath(path, plugins)).toBeDefined();
});

it('test getServiceForPath', () => {
  expect(getServiceForPath('src/plugins/embed/public/service/file.ts', 'src/plugins/embed')).toBe(
    'service'
  );
  expect(
    getServiceForPath('src/plugins/embed/public/service/subfolder/file.ts', 'src/plugins/embed')
  ).toBe('service');
  expect(
    getServiceForPath('src/plugins/embed/public/file.ts', 'src/plugins/embed')
  ).toBeUndefined();
  expect(
    getServiceForPath('/src/plugins/embed/server/another_service/index', '/src/plugins/embed')
  ).toBe('another_service');
  expect(getServiceForPath('src/plugins/embed/server/no_ending', 'src/plugins/embed')).toBe(
    undefined
  );
  expect(
    getServiceForPath('src/plugins/embed/server/routes/public/foo/index.ts', 'src/plugins/embed')
  ).toBe('routes');
  expect(getServiceForPath('src/plugins/embed/server/f.ts', 'src/plugins/embed')).toBeUndefined();

  expect(
    getServiceForPath(
      '/var/lib/jenkins/workspace/elastic+kibana+pipeline-pull-request/kibana/packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/foo/index',
      '/var/lib/jenkins/workspace/elastic+kibana+pipeline-pull-request/kibana/packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a'
    )
  ).toBe('foo');
});

it('test removeBrokenLinks', () => {
  const tsConfigFilePath = Path.resolve(
    __dirname,
    'integration_tests/__fixtures__/src/tsconfig.json'
  );
  const project = new Project({
    tsConfigFilePath,
  });

  expect(project.getSourceFiles().length).toBeGreaterThan(0);

  const pluginA = getKibanaPlatformPlugin('pluginA');
  pluginA.manifest.serviceFolders = ['foo'];
  const plugins: PluginOrPackage[] = [pluginA];

  const pluginApiMap: { [key: string]: PluginApi } = {};
  plugins.map((plugin) => {
    pluginApiMap[plugin.id] = getPluginApi(project, plugin, plugins, log, false);
  });

  const missingApiItems: { [key: string]: { [key: string]: string[] } } = {};

  plugins.forEach((plugin) => {
    const id = plugin.id;
    const pluginApi = pluginApiMap[id];
    removeBrokenLinks(pluginApi, missingApiItems, pluginApiMap, log);
  });
  expect(missingApiItems.pluginA['pluginA-public-ImNotExportedFromIndex'].length).toBeGreaterThan(
    0
  );
});

describe('getServiceForPath edge cases', () => {
  it('handles common folder paths', () => {
    expect(getServiceForPath('src/plugins/embed/common/service/file.ts', 'src/plugins/embed')).toBe(
      'service'
    );
    expect(
      getServiceForPath('src/plugins/embed/common/another_service/index.ts', 'src/plugins/embed')
    ).toBe('another_service');
  });

  it('handles paths with special characters in directory name', () => {
    const pluginDir = 'src/platform/plugins/shared/data';
    const path = `${pluginDir}/public/search_services/file.ts`;
    expect(getServiceForPath(path, pluginDir)).toBe('search_services');
  });

  it('returns undefined for paths without service folders', () => {
    expect(
      getServiceForPath('src/plugins/embed/public/file.ts', 'src/plugins/embed')
    ).toBeUndefined();
    expect(
      getServiceForPath('src/plugins/embed/server/file.ts', 'src/plugins/embed')
    ).toBeUndefined();
    expect(
      getServiceForPath('src/plugins/embed/common/file.ts', 'src/plugins/embed')
    ).toBeUndefined();
  });
});

describe('getPluginApiDocId', () => {
  it('generates doc ID for plugin without service folders', () => {
    const id = getPluginApiDocId('pluginA.public.SomeAPI', undefined);
    // `snakeToCamel` only converts underscores/dashes followed by lowercase letters,
    // so `_S` in `_SomeAPI` remains as-is.
    expect(id).toBe('kibPluginAPublic_SomeAPIPluginApi');
  });

  it('generates doc ID for plugin with service folder', () => {
    const id = getPluginApiDocId('pluginA.public.SomeAPI', {
      serviceFolders: ['foo'],
      apiPath: 'src/plugins/pluginA/public/foo/index.ts',
      directory: 'src/plugins/pluginA',
    });
    // Service folder `foo` is capitalized and appended.
    expect(id).toBe('kibPluginAPublic_SomeAPIFooPluginApi');
  });

  it('handles @kbn package IDs', () => {
    const id = getPluginApiDocId('@kbn/some-package.public.API', undefined);
    // The `@` is stripped, dots/slashes become underscores, and `snakeToCamel` applies.
    expect(id).toBe('kibKbnSomePackagePublic_APIPluginApi');
  });

  it('handles complex package paths', () => {
    const id = getPluginApiDocId('@kbn/repo-packages.public.API', undefined);
    expect(id).toBe('kibKbnRepoPackagesPublic_APIPluginApi');
  });
});

describe('groupPluginApi', () => {
  it('groups declarations by type kind', () => {
    const declarations: ApiDeclaration[] = [
      createMockApiDeclaration({ id: 'func1', label: 'funcB', type: TypeKind.FunctionKind }),
      createMockApiDeclaration({ id: 'func2', label: 'funcA', type: TypeKind.FunctionKind }),
      createMockApiDeclaration({ id: 'class1', label: 'MyClass', type: TypeKind.ClassKind }),
      createMockApiDeclaration({
        id: 'interface1',
        label: 'MyInterface',
        type: TypeKind.InterfaceKind,
      }),
      createMockApiDeclaration({ id: 'enum1', label: 'MyEnum', type: TypeKind.EnumKind }),
      createMockApiDeclaration({ id: 'obj1', label: 'myObject', type: TypeKind.ObjectKind }),
      createMockApiDeclaration({ id: 'misc1', label: 'miscItem', type: TypeKind.StringKind }),
    ];

    const scope = groupPluginApi(declarations);

    expect(scope.functions).toHaveLength(2);
    expect(scope.classes).toHaveLength(1);
    expect(scope.interfaces).toHaveLength(1);
    expect(scope.enums).toHaveLength(1);
    expect(scope.objects).toHaveLength(1);
    expect(scope.misc).toHaveLength(1);
  });

  it('sorts each group alphabetically by label', () => {
    const declarations: ApiDeclaration[] = [
      createMockApiDeclaration({ id: 'func1', label: 'zebra', type: TypeKind.FunctionKind }),
      createMockApiDeclaration({ id: 'func2', label: 'alpha', type: TypeKind.FunctionKind }),
      createMockApiDeclaration({ id: 'func3', label: 'middle', type: TypeKind.FunctionKind }),
    ];

    const scope = groupPluginApi(declarations);

    expect(scope.functions[0].label).toBe('alpha');
    expect(scope.functions[1].label).toBe('middle');
    expect(scope.functions[2].label).toBe('zebra');
  });

  it('handles empty declarations array', () => {
    const scope = groupPluginApi([]);

    expect(scope.functions).toHaveLength(0);
    expect(scope.classes).toHaveLength(0);
    expect(scope.interfaces).toHaveLength(0);
    expect(scope.enums).toHaveLength(0);
    expect(scope.objects).toHaveLength(0);
    expect(scope.misc).toHaveLength(0);
  });

  it('handles setup lifecycle declarations', () => {
    const declarations: ApiDeclaration[] = [
      createMockApiDeclaration({
        id: 'setup',
        label: 'Setup',
        type: TypeKind.InterfaceKind,
        lifecycle: Lifecycle.SETUP,
      }),
    ];

    const scope = groupPluginApi(declarations);

    expect(scope.setup).toBeDefined();
    expect(scope.setup?.label).toBe('Setup');
  });

  it('handles start lifecycle declarations', () => {
    const declarations: ApiDeclaration[] = [
      createMockApiDeclaration({
        id: 'start',
        label: 'Start',
        type: TypeKind.InterfaceKind,
        lifecycle: Lifecycle.START,
      }),
    ];

    const scope = groupPluginApi(declarations);

    expect(scope.start).toBeDefined();
    expect(scope.start?.label).toBe('Start');
  });
});

describe('addApiDeclarationToScope', () => {
  it('adds setup lifecycle declaration to scope.setup', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ lifecycle: Lifecycle.SETUP });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.setup).toBe(declaration);
  });

  it('adds start lifecycle declaration to scope.start', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ lifecycle: Lifecycle.START });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.start).toBe(declaration);
  });

  it('adds ClassKind to classes array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.ClassKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.classes).toContain(declaration);
  });

  it('adds InterfaceKind to interfaces array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.InterfaceKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.interfaces).toContain(declaration);
  });

  it('adds EnumKind to enums array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.EnumKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.enums).toContain(declaration);
  });

  it('adds FunctionKind to functions array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.FunctionKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.functions).toContain(declaration);
  });

  it('adds ObjectKind to objects array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.ObjectKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.objects).toContain(declaration);
  });

  it('adds uncategorized types to misc array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.StringKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.misc).toContain(declaration);
  });

  it('adds ArrayKind to misc array', () => {
    const scope = createEmptyScope();
    const declaration = createMockApiDeclaration({ type: TypeKind.ArrayKind });

    addApiDeclarationToScope(declaration, scope);

    expect(scope.misc).toContain(declaration);
  });
});

describe('countScopeApi', () => {
  it('returns 0 for empty scope', () => {
    const scope = createEmptyScope();

    expect(countScopeApi(scope)).toBe(0);
  });

  it('counts setup and start as 1 each', () => {
    const scope: ScopeApi = {
      ...createEmptyScope(),
      setup: createMockApiDeclaration(),
      start: createMockApiDeclaration(),
    };

    expect(countScopeApi(scope)).toBe(2);
  });

  it('counts all array items', () => {
    const scope: ScopeApi = {
      ...createEmptyScope(),
      classes: [createMockApiDeclaration(), createMockApiDeclaration()],
      interfaces: [createMockApiDeclaration()],
      functions: [
        createMockApiDeclaration(),
        createMockApiDeclaration(),
        createMockApiDeclaration(),
      ],
      objects: [createMockApiDeclaration()],
      enums: [createMockApiDeclaration()],
      misc: [createMockApiDeclaration(), createMockApiDeclaration()],
    };

    expect(countScopeApi(scope)).toBe(10);
  });

  it('counts combined setup, start, and arrays', () => {
    const scope: ScopeApi = {
      setup: createMockApiDeclaration(),
      start: createMockApiDeclaration(),
      classes: [createMockApiDeclaration()],
      interfaces: [createMockApiDeclaration()],
      functions: [createMockApiDeclaration()],
      objects: [createMockApiDeclaration()],
      enums: [createMockApiDeclaration()],
      misc: [createMockApiDeclaration()],
    };

    expect(countScopeApi(scope)).toBe(8);
  });
});

describe('createEmptyScope', () => {
  it('returns scope with empty arrays', () => {
    const scope = createEmptyScope();

    expect(scope.classes).toEqual([]);
    expect(scope.functions).toEqual([]);
    expect(scope.interfaces).toEqual([]);
    expect(scope.enums).toEqual([]);
    expect(scope.misc).toEqual([]);
    expect(scope.objects).toEqual([]);
  });

  it('returns scope without setup and start', () => {
    const scope = createEmptyScope();

    expect(scope.setup).toBeUndefined();
    expect(scope.start).toBeUndefined();
  });
});

describe('getSlug', () => {
  it('removes @ symbol from package names', () => {
    expect(getSlug('@kbn/some-package')).toBe('kbn-some-package');
  });

  it('replaces dots with dashes', () => {
    expect(getSlug('plugin.a.b')).toBe('plugin-a-b');
  });

  it('replaces forward slashes with dashes', () => {
    expect(getSlug('plugin/a/b')).toBe('plugin-a-b');
  });

  it('replaces backslashes with dashes', () => {
    expect(getSlug('plugin\\a\\b')).toBe('plugin-a-b');
  });

  it('handles complex package paths', () => {
    expect(getSlug('@kbn/repo-packages.subpackage/path')).toBe('kbn-repo-packages-subpackage-path');
  });
});

describe('getApiSectionId', () => {
  it('creates section ID with scope and cleaned name', () => {
    const result = getApiSectionId({ id: 'myFunction', scope: ApiScope.CLIENT });

    expect(result).toBe('def-public.myFunction');
  });

  it('removes special characters from ID', () => {
    const result = getApiSectionId({ id: '{ param1, param2 }', scope: ApiScope.SERVER });

    expect(result).toBe('def-server.param1param2');
  });

  it('handles common scope', () => {
    const result = getApiSectionId({ id: 'sharedUtil', scope: ApiScope.COMMON });

    expect(result).toBe('def-common.sharedUtil');
  });

  it('preserves dots, underscores, and dollar signs', () => {
    const result = getApiSectionId({ id: 'my_func.$helper.inner', scope: ApiScope.CLIENT });

    expect(result).toBe('def-public.my_func.$helper.inner');
  });
});

describe('isInternal', () => {
  it('returns true when declaration has internal tag', () => {
    const declaration = createMockApiDeclaration({ tags: ['internal', 'deprecated'] });

    expect(isInternal(declaration)).toBe('internal');
  });

  it('returns undefined when declaration has no internal tag', () => {
    const declaration = createMockApiDeclaration({ tags: ['beta', 'deprecated'] });

    expect(isInternal(declaration)).toBeUndefined();
  });

  it('returns undefined when declaration has no tags', () => {
    const declaration = createMockApiDeclaration({ tags: undefined });

    expect(isInternal(declaration)).toBeUndefined();
  });

  it('returns undefined when tags array is empty', () => {
    const declaration = createMockApiDeclaration({ tags: [] });

    expect(isInternal(declaration)).toBeUndefined();
  });
});
