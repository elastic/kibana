/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';
import { splitApisByFolder } from './write_plugin_split_by_folder';
import { getPluginApi } from '../get_plugin_api';
import { getKibanaPlatformPlugin } from '../tests/kibana_platform_plugin_mock';
import { PluginOrPackage } from '../types';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

it('splitApisByFolder test splitting plugin by service folder', () => {
  const project = new Project({ useInMemoryFileSystem: true });
  project.createSourceFile(
    'src/plugins/example/public/index.ts',
    `
import { bar } from './a_service/foo/bar';
import { Zed, zed } from './a_service/zed';
import { util } from './utils';

export { bar, Zed, zed, mainFoo, util };
`
  );
  project.createSourceFile(
    'src/plugins/example/public/a_service/zed.ts',
    `export const zed: string = 'hi';
export interface Zed = { zed: string }`
  );
  project.createSourceFile(
    'src/plugins/example/public/a_service/foo/bar.ts',
    `export const bar: string = 'bar';`
  );
  project.createSourceFile(
    'src/plugins/example/public/utils.ts',
    `export const util: string = 'Util';`
  );

  const plugin = getKibanaPlatformPlugin('example', '/src/plugins/example');
  const plugins: PluginOrPackage[] = [
    {
      ...plugin,
      manifest: {
        ...plugin.manifest,
        serviceFolders: ['a_service'],
      },
    },
  ];

  const doc = getPluginApi(project, plugins[0], plugins, log, false);
  const docs = splitApisByFolder(doc);

  // The api at the main level, and one on a service level.
  expect(docs.length).toBe(2);

  const mainDoc = docs.find((d) => d.id === 'example');

  expect(mainDoc).toBeDefined();

  const serviceDoc = docs.find((d) => d.id === 'example.aService');

  expect(serviceDoc).toBeDefined();

  expect(serviceDoc?.client.length).toBe(3);
});
