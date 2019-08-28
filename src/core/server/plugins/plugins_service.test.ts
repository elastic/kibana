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

import { resolve, join } from 'path';
import { BehaviorSubject, from } from 'rxjs';
import { schema } from '@kbn/config-schema';

import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { PluginDiscoveryError } from './discovery';
import { PluginWrapper } from './plugin';
import { PluginsService } from './plugins_service';
import { PluginsSystem } from './plugins_system';
import { config } from './plugins_config';
import { contextServiceMock } from '../context/context_service.mock';

const MockPluginsSystem: jest.Mock<PluginsSystem> = PluginsSystem as any;

let pluginsService: PluginsService;
let configService: ConfigService;
let coreId: symbol;
let env: Env;
let mockPluginSystem: jest.Mocked<PluginsSystem>;
const setupDeps = {
  context: contextServiceMock.createSetupContract(),
  elasticsearch: elasticsearchServiceMock.createSetupContract(),
  http: httpServiceMock.createSetupContract(),
};
const logger = loggingServiceMock.create();

['path-1', 'path-2', 'path-3', 'path-4', 'path-5'].forEach(path => {
  jest.doMock(join(path, 'server'), () => ({}), {
    virtual: true,
  });
});

beforeEach(async () => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: true,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  coreId = Symbol('core');
  env = Env.createDefault(getEnvOptions());

  configService = new ConfigService(
    new BehaviorSubject<Config>(new ObjectToConfigAdapter({ plugins: { initialize: true } })),
    env,
    logger
  );
  await configService.setSchema(config.path, config.schema);
  pluginsService = new PluginsService({ coreId, env, logger, configService });

  [mockPluginSystem] = MockPluginsSystem.mock.instances as any;
});

afterEach(() => {
  jest.clearAllMocks();
});

test('`discover` throws if plugin has an invalid manifest', async () => {
  mockDiscover.mockReturnValue({
    error$: from([PluginDiscoveryError.invalidManifest('path-1', new Error('Invalid JSON'))]),
    plugin$: from([]),
  });

  await expect(pluginsService.discover()).rejects.toMatchInlineSnapshot(`
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

test('`discover` throws if plugin required Kibana version is incompatible with the current version', async () => {
  mockDiscover.mockReturnValue({
    error$: from([
      PluginDiscoveryError.incompatibleVersion('path-3', new Error('Incompatible version')),
    ]),
    plugin$: from([]),
  });

  await expect(pluginsService.discover()).rejects.toMatchInlineSnapshot(`
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

test('`discover` throws if discovered plugins with conflicting names', async () => {
  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new PluginWrapper({
        path: 'path-4',
        manifest: {
          id: 'conflicting-id',
          version: 'some-version',
          configPath: 'path',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
          optionalPlugins: ['some-optional-plugin'],
          server: true,
          ui: true,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
      new PluginWrapper({
        path: 'path-5',
        manifest: {
          id: 'conflicting-id',
          version: 'some-other-version',
          configPath: ['plugin', 'path'],
          kibanaVersion: '7.0.0',
          requiredPlugins: ['some-required-plugin'],
          optionalPlugins: [],
          server: true,
          ui: false,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
    ]),
  });

  await expect(pluginsService.discover()).rejects.toMatchInlineSnapshot(
    `[Error: Plugin with id "conflicting-id" is already registered!]`
  );

  expect(mockPluginSystem.addPlugin).not.toHaveBeenCalled();
  expect(mockPluginSystem.setupPlugins).not.toHaveBeenCalled();
});

test('`discover` properly detects plugins that should be disabled.', async () => {
  jest
    .spyOn(configService, 'isEnabledAtPath')
    .mockImplementation(path => Promise.resolve(!path.includes('disabled')));

  mockPluginSystem.setupPlugins.mockResolvedValue(new Map());
  mockPluginSystem.uiPlugins.mockReturnValue({ public: new Map(), internal: new Map() });

  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new PluginWrapper({
        path: 'path-1',
        manifest: {
          id: 'explicitly-disabled-plugin',
          version: 'some-version',
          configPath: 'path-1-disabled',
          kibanaVersion: '7.0.0',
          requiredPlugins: [],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
      new PluginWrapper({
        path: 'path-2',
        manifest: {
          id: 'plugin-with-missing-required-deps',
          version: 'some-version',
          configPath: 'path-2',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['missing-plugin'],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
      new PluginWrapper({
        path: 'path-3',
        manifest: {
          id: 'plugin-with-disabled-transitive-dep',
          version: 'some-version',
          configPath: 'path-3',
          kibanaVersion: '7.0.0',
          requiredPlugins: ['another-explicitly-disabled-plugin'],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
      new PluginWrapper({
        path: 'path-4',
        manifest: {
          id: 'another-explicitly-disabled-plugin',
          version: 'some-version',
          configPath: 'path-4-disabled',
          kibanaVersion: '7.0.0',
          requiredPlugins: [],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
    ]),
  });

  await pluginsService.discover();
  const setup = await pluginsService.setup(setupDeps);

  expect(setup.contracts).toBeInstanceOf(Map);
  expect(setup.uiPlugins.public).toBeInstanceOf(Map);
  expect(setup.uiPlugins.internal).toBeInstanceOf(Map);
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

test('`discover` properly invokes plugin discovery and ignores non-critical errors.', async () => {
  const firstPlugin = new PluginWrapper({
    path: 'path-1',
    manifest: {
      id: 'some-id',
      version: 'some-version',
      configPath: 'path',
      kibanaVersion: '7.0.0',
      requiredPlugins: ['some-other-id'],
      optionalPlugins: ['missing-optional-dep'],
      server: true,
      ui: true,
    },
    opaqueId: Symbol(),
    initializerContext: { logger } as any,
  });

  const secondPlugin = new PluginWrapper({
    path: 'path-2',
    manifest: {
      id: 'some-other-id',
      version: 'some-other-version',
      configPath: ['plugin', 'path'],
      kibanaVersion: '7.0.0',
      requiredPlugins: [],
      optionalPlugins: [],
      server: true,
      ui: false,
    },
    opaqueId: Symbol(),
    initializerContext: { logger } as any,
  });

  mockDiscover.mockReturnValue({
    error$: from([
      PluginDiscoveryError.missingManifest('path-2', new Error('No manifest')),
      PluginDiscoveryError.invalidSearchPath('dir-1', new Error('No dir')),
      PluginDiscoveryError.invalidPluginPath('path4-1', new Error('No path')),
    ]),
    plugin$: from([firstPlugin, secondPlugin]),
  });

  await pluginsService.discover();
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
        resolve(process.cwd(), 'x-pack', 'plugins'),
        resolve(process.cwd(), 'plugins'),
        resolve(process.cwd(), '..', 'kibana-extra'),
      ],
    },
    { coreId, env, logger, configService }
  );

  const logs = loggingServiceMock.collect(logger);
  expect(logs.info).toHaveLength(0);
  expect(logs.error).toHaveLength(0);
});

test('`stop` stops plugins system', async () => {
  await pluginsService.stop();
  expect(mockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
});

test('`discover` registers plugin config schema in config service', async () => {
  const configSchema = schema.string();
  jest.spyOn(configService, 'setSchema').mockImplementation(() => Promise.resolve());
  jest.doMock(
    join('path-with-schema', 'server'),
    () => ({
      config: {
        schema: configSchema,
      },
    }),
    {
      virtual: true,
    }
  );
  mockDiscover.mockReturnValue({
    error$: from([]),
    plugin$: from([
      new PluginWrapper({
        path: 'path-with-schema',
        manifest: {
          id: 'some-id',
          version: 'some-version',
          configPath: 'path',
          kibanaVersion: '7.0.0',
          requiredPlugins: [],
          optionalPlugins: [],
          server: true,
          ui: true,
        },
        opaqueId: Symbol(),
        initializerContext: { logger } as any,
      }),
    ]),
  });
  await pluginsService.discover();
  expect(configService.setSchema).toBeCalledWith('path', configSchema);
});
