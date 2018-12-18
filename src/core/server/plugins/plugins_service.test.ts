/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
jest.mock('../../../utils/package_json', () => ({ pkg: mockPackage }));

const mockDiscover = jest.fn();
jest.mock('./discovery/plugins_discovery', () => ({ discover: mockDiscover }));

jest.mock('./plugins_system');

import { resolve } from 'path';
import { BehaviorSubject, from } from 'rxjs';

import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { logger } from '../logging/__mocks__';
import { PluginDiscoveryError } from './discovery';
import { Plugin } from './plugin';
import { PluginsService } from './plugins_service';
import { PluginsSystem } from './plugins_system';

const MockPluginsSystem: jest.Mock<PluginsSystem> = PluginsSystem as any;

let pluginsService: PluginsService;
let configService: ConfigService;
let env: Env;
let mockPluginSystem: jest.Mocked<PluginsSystem>;
beforeEach(() => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: true,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  env = Env.createDefault(getEnvOptions());

  configService = new ConfigService(
    new BehaviorSubject<Config>(new ObjectToConfigAdapter({ plugins: { initialize: true } })),
    env,
    logger
  );
  pluginsService = new PluginsService({ env, logger, configService });

  [mockPluginSystem] = MockPluginsSystem.mock.instances as any;
});

afterEach(() => {
  jest.clearAllMocks();
});

test('`start` throws if plugin has an invalid manifest', async () => {
  mockDiscover.mockReturnValue({
    error$: from([PluginDiscoveryError.invalidManifest('path-1', new Error('Invalid JSON'))]),
    plugin$: from([]),
  });

  await expect(pluginsService.start()).rejects.toMatchInlineSnapshot(`
[Error: Failed to initialize plugins:
	Invalid JSON (invalid-manifest, path-1)]
`);
  expect(logger.mockCollect().error).toMatchInlineSnapshot(`
Array [
  Array [
    [Error: Invalid JSON (invalid-manifest, path-1)],
  ],
]
`);
});

test('`start` throws if plugin required Kibana version is incompatible with the current version', async () => {
  mockDiscover.mockReturnValue({
    error$: from([
      PluginDiscoveryError.incompatibleVersion('path-3', new Error('Incompatible version')),
    ]),
    plugin$: from([]),
  });

  await expect(pluginsService.start()).rejects.toMatchInlineSnapshot(`
[Error: Failed to initialize plugins:
	Incompatible version (incompatible-version, path-3)]
`);
  expect(logger.mockCollect().error).toMatchInlineSnapshot(`
Array [
  Array [
    [Error: Incompatible version (incompatible-version, path-3)],
  ],
]
`);
});

test('`start` throws if discovered plugins with conflicting names', async () => {
  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new Plugin(
        'path-4',
        {
          id: 'conflicting-id',
          version: 'some-version',
          configPath: 'path',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
          optionalPlugins: ['some-optional-plugin'],
          server: true,
          ui: true,
        },
        { logger } as any
      ),
      new Plugin(
        'path-5',
        {
          id: 'conflicting-id',
          version: 'some-other-version',
          configPath: ['plugin', 'path'],
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin'],
          optionalPlugins: [],
          server: true,
          ui: false,
        },
        { logger } as any
      ),
    ]),
  });

  await expect(pluginsService.start()).rejects.toMatchInlineSnapshot(
    `[Error: Plugin with id "conflicting-id" is already registered!]`
  );

  expect(mockPluginSystem.addPlugin).not.toHaveBeenCalled();
  expect(mockPluginSystem.startPlugins).not.toHaveBeenCalled();
});

test('`start` properly detects plugins that should be disabled.', async () => {
  jest
    .spyOn(configService, 'isEnabledAtPath')
    .mockImplementation(path => Promise.resolve(!path.includes('disabled')));

  mockPluginSystem.startPlugins.mockResolvedValue(new Map());

  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new Plugin(
        'path-1',
        {
          id: 'explicitly-disabled-plugin',
          version: 'some-version',
          configPath: 'path-1-disabled',
          kibanaVersion: '7.0.0',
          requiredPlugins: [],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        { logger } as any
      ),
      new Plugin(
        'path-2',
        {
          id: 'plugin-with-missing-required-deps',
          version: 'some-version',
          configPath: 'path-2',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['missing-plugin'],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        { logger } as any
      ),
      new Plugin(
        'path-3',
        {
          id: 'plugin-with-disabled-transitive-dep',
          version: 'some-version',
          configPath: 'path-3',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['another-explicitly-disabled-plugin'],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        { logger } as any
      ),
      new Plugin(
        'path-4',
        {
          id: 'another-explicitly-disabled-plugin',
          version: 'some-version',
          configPath: 'path-4-disabled',
          kibanaVersion: '7.0.0',
          requiredPlugins: [],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        { logger } as any
      ),
    ]),
  });

  expect(await pluginsService.start()).toBeInstanceOf(Map);
  expect(mockPluginSystem.addPlugin).not.toHaveBeenCalled();
  expect(mockPluginSystem.startPlugins).toHaveBeenCalledTimes(1);

  expect(logger.mockCollect().info).toMatchInlineSnapshot(`
Array [
  Array [
    "Plugin \\"explicitly-disabled-plugin\\" is disabled.",
  ],
  Array [
    "Plugin \\"plugin-with-missing-required-deps\\" has been disabled since some of its direct or transitive dependencies are missing or disabled.",
  ],
  Array [
    "Plugin \\"plugin-with-disabled-transitive-dep\\" has been disabled since some of its direct or transitive dependencies are missing or disabled.",
  ],
  Array [
    "Plugin \\"another-explicitly-disabled-plugin\\" is disabled.",
  ],
]
`);
});

test('`start` properly invokes `discover` and ignores non-critical errors.', async () => {
  const firstPlugin = new Plugin(
    'path-1',
    {
      id: 'some-id',
      version: 'some-version',
      configPath: 'path',
      kibanaVersion: '7.0.0',
      requiredPlugins: ['some-other-id'],
      optionalPlugins: ['missing-optional-dep'],
      server: true,
      ui: true,
    },
    { logger } as any
  );

  const secondPlugin = new Plugin(
    'path-2',
    {
      id: 'some-other-id',
      version: 'some-other-version',
      configPath: ['plugin', 'path'],
      kibanaVersion: '7.0.0',
      requiredPlugins: [],
      optionalPlugins: [],
      server: true,
      ui: false,
    },
    { logger } as any
  );

  mockDiscover.mockReturnValue({
    error$: from([
      PluginDiscoveryError.missingManifest('path-2', new Error('No manifest')),
      PluginDiscoveryError.invalidSearchPath('dir-1', new Error('No dir')),
      PluginDiscoveryError.invalidPluginPath('path4-1', new Error('No path')),
    ]),
    plugin$: from([firstPlugin, secondPlugin]),
  });

  const pluginContracts = new Map();
  mockPluginSystem.startPlugins.mockResolvedValue(pluginContracts);

  const startContract = await pluginsService.start();

  expect(startContract).toBe(pluginContracts);
  expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
  expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(firstPlugin);
  expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(secondPlugin);

  expect(mockDiscover).toHaveBeenCalledTimes(1);
  expect(mockDiscover).toHaveBeenCalledWith(
    {
      initialize: true,
      pluginSearchPaths: [
        resolve(process.cwd(), 'src', 'plugins'),
        resolve(process.cwd(), 'plugins'),
        resolve(process.cwd(), '..', 'kibana-extra'),
      ],
    },
    { env, logger, configService }
  );

  const logs = logger.mockCollect();
  expect(logs.info).toHaveLength(0);
  expect(logs.error).toHaveLength(0);
});

test('`stop` stops plugins system', async () => {
  await pluginsService.stop();
  expect(mockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
});
