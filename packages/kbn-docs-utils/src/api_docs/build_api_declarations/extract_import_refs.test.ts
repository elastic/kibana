/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { getPluginApiDocId } from '../utils';
import { extractImportReferences } from './extract_import_refs';
import { ApiScope, Reference } from '../types';
import { getKibanaPlatformPlugin } from '../tests/kibana_platform_plugin_mock';

const plugin = getKibanaPlatformPlugin('pluginA');
const plugins: KibanaPlatformPlugin[] = [plugin];

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
    docId: getPluginApiDocId('plugin_a', log),
    section: 'def-public.Bar',
    pluginId: 'pluginA',
    scope: ApiScope.CLIENT,
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
    docId: getPluginApiDocId('plugin_a', log),
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
  expect(results[2]).toBe('>');
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
