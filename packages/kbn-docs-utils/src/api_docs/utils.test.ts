/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import Path from 'path';
import { Project } from 'ts-morph';
import { findPlugins } from './find_plugins';
import { getPluginApi } from './get_plugin_api';
import { getKibanaPlatformPlugin } from './tests/kibana_platform_plugin_mock';
import { PluginApi, PluginOrPackage } from './types';
import { getPluginForPath, getServiceForPath, removeBrokenLinks, getFileName } from './utils';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

it('getFileName', () => {
  expect(getFileName('@kbn/datemath')).toBe('kbn_datemath');
});

it('test getPluginForPath', () => {
  const plugins = findPlugins();
  const path = Path.resolve(__dirname, '../../../../src/plugins/embeddable/public/service/file.ts');
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
      '/var/lib/jenkins/workspace/elastic+kibana+pipeline-pull-request/kibana/packages/kbn-docs-utils/src/api_docs/tests/__fixtures__/src/plugin_a/public/foo/index',
      '/var/lib/jenkins/workspace/elastic+kibana+pipeline-pull-request/kibana/packages/kbn-docs-utils/src/api_docs/tests/__fixtures__/src/plugin_a'
    )
  ).toBe('foo');
});

it('test removeBrokenLinks', () => {
  const tsConfigFilePath = Path.resolve(__dirname, 'tests/__fixtures__/src/tsconfig.json');
  const project = new Project({
    tsConfigFilePath,
  });

  expect(project.getSourceFiles().length).toBeGreaterThan(0);

  const pluginA = getKibanaPlatformPlugin('pluginA');
  pluginA.manifest.serviceFolders = ['foo'];
  const plugins: PluginOrPackage[] = [pluginA];

  const pluginApiMap: { [key: string]: PluginApi } = {};
  plugins.map((plugin) => {
    pluginApiMap[plugin.manifest.id] = getPluginApi(project, plugin, plugins, log, false);
  });

  const missingApiItems: { [key: string]: { [key: string]: string[] } } = {};

  plugins.forEach((plugin) => {
    const id = plugin.manifest.id;
    const pluginApi = pluginApiMap[id];
    removeBrokenLinks(pluginApi, missingApiItems, pluginApiMap, log);
  });
  expect(missingApiItems.pluginA['pluginA-public-ImNotExportedFromIndex'].length).toBeGreaterThan(
    0
  );
});
