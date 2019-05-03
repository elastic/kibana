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

import { mockDiscover, mockPackage } from './plugins_service.test.mocks';

import { resolve } from 'path';
import { BehaviorSubject, from } from 'rxjs';

import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { PluginDiscoveryError } from './discovery';
import { PluginWrapper } from './plugin';
import { PluginsService } from './plugins_service';
import { PluginsSystem } from './plugins_system';

const MockPluginsSystem: jest.Mock<PluginsSystem> = PluginsSystem as any;

let pluginsService: PluginsService;
let configService: ConfigService;
let env: Env;
let mockPluginSystem: jest.Mocked<PluginsSystem>;
const setupDeps = {
  elasticsearch: elasticsearchServiceMock.createSetupContract(),
  http: httpServiceMock.createSetupContract(),
};
const logger = loggingServiceMock.create();
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

test('`setup` throws if plugin has an invalid manifest', async () => {
  mockDiscover.mockReturnValue({
    error$: from([PluginDiscoveryError.invalidManifest('path-1', new Error('Invalid JSON'))]),
    plugin$: from([]),
  });

  await expect(pluginsService.setup(setupDeps)).rejects.toMatchInlineSnapshot(`
[Error: Failed to initialize plugins:
	Invalid JSON (invalid-manifest, path-1)]
`);
  expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
Array [
  Array [
    [Error: Invalid JSON (invalid-manifest, path-1)],
  ],
]
`);
});

test('`setup` throws if plugin required Kibana version is incompatible with the current version', async () => {
  mockDiscover.mockReturnValue({
    error$: from([
      PluginDiscoveryError.incompatibleVersion('path-3', new Error('Incompatible version')),
    ]),
    plugin$: from([]),
  });

  await expect(pluginsService.setup(setupDeps)).rejects.toMatchInlineSnapshot(`
[Error: Failed to initialize plugins:
	Incompatible version (incompatible-version, path-3)]
`);
  expect(loggingServiceMock.collect(logger).error).toMatchInlineSnapshot(`
Array [
  Array [
    [Error: Incompatible version (incompatible-version, path-3)],
  ],
]
`);
});

test('`setup` throws if discovered plugins with conflicting names', async () => {
  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new PluginWrapper(
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
      new PluginWrapper(
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

  await expect(pluginsService.setup(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Plugin with id "conflicting-id" is already registered!]`
  );

  expect(mockPluginSystem.addPlugin).not.toHaveBeenCalled();
  expect(mockPluginSystem.setupPlugins).not.toHaveBeenCalled();
});

test('`setup` properly detects plugins that should be disabled.', async () => {
  jest
    .spyOn(configService, 'isEnabledAtPath')
    .mockImplementation(path => Promise.resolve(!path.includes('disabled')));

  mockPluginSystem.setupPlugins.mockResolvedValue(new Map());
  mockPluginSystem.uiPlugins.mockReturnValue({ public: new Map(), internal: new Map() });

  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new PluginWrapper(
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
      new PluginWrapper(
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
      new PluginWrapper(
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
      new PluginWrapper(
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

  const start = await pluginsService.setup(setupDeps);

  expect(start.contracts).toBeInstanceOf(Map);
  expect(start.uiPlugins.public).toBeInstanceOf(Map);
  expect(start.uiPlugins.internal).toBeInstanceOf(Map);
  expect(mockPluginSystem.addPlugin).not.toHaveBeenCalled();
  expect(mockPluginSystem.setupPlugins).toHaveBeenCalledTimes(1);
  expect(mockPluginSystem.setupPlugins).toHaveBeenCalledWith(setupDeps);

  expect(loggingServiceMock.collect(logger).info).toMatchInlineSnapshot(`
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

test('`setup` properly invokes `discover` and ignores non-critical errors.', async () => {
  const firstPlugin = new PluginWrapper(
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

  const secondPlugin = new PluginWrapper(
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

  const contracts = new Map();
  const discoveredPlugins = { public: new Map(), internal: new Map() };
  mockPluginSystem.setupPlugins.mockResolvedValue(contracts);
  mockPluginSystem.uiPlugins.mockReturnValue(discoveredPlugins);

  const setup = await pluginsService.setup(setupDeps);

  expect(setup.contracts).toBe(contracts);
  expect(setup.uiPlugins).toBe(discoveredPlugins);
  expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
  expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(firstPlugin);
  expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(secondPlugin);

  expect(mockDiscover).toHaveBeenCalledTimes(1);
  expect(mockDiscover).toHaveBeenCalledWith(
    {
      additionalPluginPaths: [],
      initialize: true,
      pluginSearchPaths: [
        resolve(process.cwd(), 'src', 'plugins'),
        resolve(process.cwd(), 'plugins'),
        resolve(process.cwd(), '..', 'kibana-extra'),
      ],
    },
    { env, logger, configService }
  );

  const logs = loggingServiceMock.collect(logger);
  expect(logs.info).toHaveLength(0);
  expect(logs.error).toHaveLength(0);
});

test('`stop` stops plugins system', async () => {
  await pluginsService.stop();
  expect(mockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
});
