/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';

import { PluginApi, PluginOrPackage } from '../types';
import { getKibanaPlatformPlugin } from '../tests/kibana_platform_plugin_mock';
import { getPluginApi } from '../get_plugin_api';
import { splitApisByFolder } from './write_plugin_split_by_folder';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

let doc: PluginApi;

beforeAll(() => {
  const tsConfigFilePath = Path.resolve(__dirname, '../tests/__fixtures__/src/tsconfig.json');
  const project = new Project({
    tsConfigFilePath,
  });

  expect(project.getSourceFiles().length).toBeGreaterThan(0);

  const pluginA = getKibanaPlatformPlugin('pluginA');
  pluginA.manifest.serviceFolders = ['foo'];
  const plugins: PluginOrPackage[] = [pluginA];

  doc = getPluginApi(project, plugins[0], plugins, log, false);
});

test('foo service has all exports', () => {
  expect(doc?.client.length).toBe(37);
  const split = splitApisByFolder(doc);
  expect(split.length).toBe(2);

  const fooDoc = split.find((d) => d.id === 'pluginA.foo');
  const mainDoc = split.find((d) => d.id === 'pluginA');

  expect(fooDoc?.common.length).toBe(1);
  expect(fooDoc?.client.length).toBe(2);
  expect(mainDoc?.client.length).toBe(35);
});
