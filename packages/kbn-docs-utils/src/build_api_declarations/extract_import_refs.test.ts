/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { getPluginApiDocId } from '../utils';
import { extractImportReferences } from './extract_import_refs';
import type { PluginOrPackage, Reference } from '../types';
import { ApiScope } from '../types';
import {
  getKibanaPlatformPackage,
  getKibanaPlatformPlugin,
} from '../integration_tests/kibana_platform_plugin_mock';

const plugin = getKibanaPlatformPlugin('pluginA');
const packageA = getKibanaPlatformPackage('@kbn/package-a');
const plugins: PluginOrPackage[] = [plugin, packageA];

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

it('when there are no imports', () => {
  const results = extractImportReferences(`(param: string) => Bar`, plugins, log);
  expect(results.length).toBe(1);
  expect(results[0]).toBe('(param: string) => Bar');
});

it('test extractImportReference', () => {
  const results = extractImportReferences(
    `(param: string) => import("${plugin.directory}/public/bar").Bar`,
    plugins,
    log
  );
  expect(results.length).toBe(2);
  expect(results[0]).toBe('(param: string) => ');
  expect(results[1]).toEqual({
    text: 'Bar',
    docId: getPluginApiDocId('plugin_a'),
    section: 'def-public.Bar',
    pluginId: 'pluginA',
    scope: ApiScope.CLIENT,
  });
});

it('test extractImportReference with a package', () => {
  const results = extractImportReferences(
    `(param: string) => import("Users/foo/node_modules/${packageA.id}/target_types").Bar`,
    plugins,
    log
  );
  expect(results.length).toBe(2);
  expect(results[0]).toBe('(param: string) => ');
  expect(results[1]).toEqual({
    text: 'Bar',
    docId: getPluginApiDocId(packageA.id),
    section: 'def-common.Bar',
    pluginId: packageA.id,
    scope: ApiScope.COMMON,
  });
});

it('test extractImportReference with public folder nested under server folder', () => {
  const results = extractImportReferences(
    `import("${plugin.directory}/server/routes/public/bar").Bar`,
    plugins,
    log
  );
  expect(results.length).toBe(1);
  expect(results[0]).toEqual({
    text: 'Bar',
    docId: getPluginApiDocId('plugin_a'),
    section: 'def-server.Bar',
    pluginId: 'pluginA',
    scope: ApiScope.SERVER,
  });
});

it('test extractImportReference with two imports', () => {
  const results = extractImportReferences(
    `<I extends import("${plugin.directory}/public/foo/index").FooFoo, O extends import("${plugin.directory}/public/bar").Bar>`,
    plugins,
    log
  );
  expect(results.length).toBe(5);
  expect(results[0]).toBe('<I extends ');
  expect((results[1] as Reference).text).toBe('FooFoo');
  expect(results[2]).toBe(', O extends ');
  expect((results[3] as Reference).text).toBe('Bar');
  expect(results[4]).toBe('>');
});

it('test extractImportReference with unknown imports', () => {
  const results = extractImportReferences(
    `<I extends import("/plugin_c/public/foo/index").FooFoo>`,
    plugins,
    log
  );
  expect(results.length).toBe(3);
  expect(results[0]).toBe('<I extends ');
  expect(results[1]).toBe('FooFoo');
});

it('test full file imports with no matching plugin', () => {
  const refs = extractImportReferences(
    `typeof import("${REPO_ROOT}/src/platform/plugins/shared/data/common/es_query/kuery/node_types/function")`,
    plugins,
    log
  );
  expect(refs).toMatchInlineSnapshot(`
    Array [
      "typeof ",
      "src/platform/plugins/shared/data/common/es_query/kuery/node_types/function",
    ]
  `);
  expect(refs.length).toBe(2);
});

it('test full file imports with a matching plugin', () => {
  const refs = extractImportReferences(
    `typeof import("${plugin.directory}/public/foo/index") something`,
    plugins,
    log
  );
  expect(refs).toMatchInlineSnapshot(`
    Array [
      "typeof ",
      Object {
        "docId": "kibPluginAPluginApi",
        "pluginId": "pluginA",
        "scope": "public",
        "section": undefined,
        "text": "packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/foo/index",
      },
      " something",
    ]
  `);
  expect(refs.length).toBe(3);
});

it('test single link', () => {
  const results = extractImportReferences(
    `import("${plugin.directory}/public/foo/index").FooFoo`,
    plugins,
    log
  );
  expect(results.length).toBe(1);
  expect((results[0] as Reference).text).toBe('FooFoo');
});

it('defaults to COMMON scope for paths outside standard plugin scopes', () => {
  const testPlugin = getKibanaPlatformPlugin('pluginA');
  // Path is in plugin directory but not under public/, server/, or common/.
  const path = `${testPlugin.directory}/other/path.ts`;

  const results = extractImportReferences(`import("${path}").SomeType`, [testPlugin], log);

  expect(results.length).toBe(1);
  const ref = results[0] as Reference;
  expect(ref.text).toBe('SomeType');
  // Paths outside standard scopes should default to COMMON.
  expect(ref.scope).toBe(ApiScope.COMMON);
});
