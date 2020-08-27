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
import { createAbsolutePathSerializer } from '@kbn/dev-utils';

import { ConfigPath, ConfigService, Env } from '../config';
import { rawConfigServiceMock } from '../config/raw_config_service.mock';
import { getEnvOptions } from '../config/__mocks__/env';
import { coreMock } from '../mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { environmentServiceMock } from '../environment/environment_service.mock';
import { PluginDiscoveryError } from './discovery';
import { PluginWrapper } from './plugin';
import { PluginsService } from './plugins_service';
import { PluginsSystem } from './plugins_system';
import { config } from './plugins_config';
import { take } from 'rxjs/operators';
import { DiscoveredPlugin } from './types';

const MockPluginsSystem: jest.Mock<PluginsSystem> = PluginsSystem as any;

let pluginsService: PluginsService;
let config$: BehaviorSubject<Record<string, any>>;
let configService: ConfigService;
let coreId: symbol;
let env: Env;
let mockPluginSystem: jest.Mocked<PluginsSystem>;
let environmentSetup: ReturnType<typeof environmentServiceMock.createSetupContract>;

const setupDeps = coreMock.createInternalSetup();
const logger = loggingSystemMock.create();

expect.addSnapshotSerializer(createAbsolutePathSerializer());

['path-1', 'path-2', 'path-3', 'path-4', 'path-5', 'path-6', 'path-7', 'path-8'].forEach((path) => {
  jest.doMock(join(path, 'server'), () => ({}), {
    virtual: true,
  });
});

const createPlugin = (
  id: string,
  {
    path = id,
    disabled = false,
    version = 'some-version',
    requiredPlugins = [],
    requiredBundles = [],
    optionalPlugins = [],
    kibanaVersion = '7.0.0',
    configPath = [path],
    server = true,
    ui = true,
  }: {
    path?: string;
    disabled?: boolean;
    version?: string;
    requiredPlugins?: string[];
    requiredBundles?: string[];
    optionalPlugins?: string[];
    kibanaVersion?: string;
    configPath?: ConfigPath;
    server?: boolean;
    ui?: boolean;
  }
): PluginWrapper => {
  return new PluginWrapper({
    path,
    manifest: {
      id,
      version,
      configPath: `${configPath}${disabled ? '-disabled' : ''}`,
      kibanaVersion,
      requiredPlugins,
      requiredBundles,
      optionalPlugins,
      server,
      ui,
    },
    opaqueId: Symbol(id),
    initializerContext: { logger } as any,
  });
};

describe('PluginsService', () => {
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

    config$ = new BehaviorSubject<Record<string, any>>({ plugins: { initialize: true } });
    const rawConfigService = rawConfigServiceMock.create({ rawConfig$: config$ });
    configService = new ConfigService(rawConfigService, env, logger);
    await configService.setSchema(config.path, config.schema);
    pluginsService = new PluginsService({ coreId, env, logger, configService });

    [mockPluginSystem] = MockPluginsSystem.mock.instances as any;
    mockPluginSystem.uiPlugins.mockReturnValue(new Map());

    environmentSetup = environmentServiceMock.createSetupContract();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#discover()', () => {
    it('throws if plugin has an invalid manifest', async () => {
      mockDiscover.mockReturnValue({
        error$: from([PluginDiscoveryError.invalidManifest('path-1', new Error('Invalid JSON'))]),
        plugin$: from([]),
      });

      await expect(pluginsService.discover({ environment: environmentSetup })).rejects
        .toMatchInlineSnapshot(`
              [Error: Failed to initialize plugins:
              	Invalid JSON (invalid-manifest, path-1)]
            `);
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: Invalid JSON (invalid-manifest, path-1)],
          ],
        ]
      `);
    });

    it('throws if plugin required Kibana version is incompatible with the current version', async () => {
      mockDiscover.mockReturnValue({
        error$: from([
          PluginDiscoveryError.incompatibleVersion('path-3', new Error('Incompatible version')),
        ]),
        plugin$: from([]),
      });

      await expect(pluginsService.discover({ environment: environmentSetup })).rejects
        .toMatchInlineSnapshot(`
              [Error: Failed to initialize plugins:
              	Incompatible version (incompatible-version, path-3)]
            `);
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: Incompatible version (incompatible-version, path-3)],
          ],
        ]
      `);
    });

    it('throws if discovered plugins with conflicting names', async () => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('conflicting-id', {
            path: 'path-4',
            version: 'some-version',
            configPath: 'path',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
          }),
          createPlugin('conflicting-id', {
            path: 'path-4',
            version: 'some-version',
            configPath: 'path',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
          }),
        ]),
      });

      await expect(
        pluginsService.discover({ environment: environmentSetup })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Plugin with id "conflicting-id" is already registered!]`
      );

      expect(mockPluginSystem.addPlugin).not.toHaveBeenCalled();
      expect(mockPluginSystem.setupPlugins).not.toHaveBeenCalled();
    });

    it('properly detects plugins that should be disabled.', async () => {
      jest
        .spyOn(configService, 'isEnabledAtPath')
        .mockImplementation((path) => Promise.resolve(!path.includes('disabled')));

      mockPluginSystem.setupPlugins.mockResolvedValue(new Map());

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('explicitly-disabled-plugin', {
            disabled: true,
            path: 'path-1',
            configPath: 'path-1',
          }),
          createPlugin('plugin-with-missing-required-deps', {
            path: 'path-2',
            configPath: 'path-2',
            requiredPlugins: ['missing-plugin'],
          }),
          createPlugin('plugin-with-disabled-transitive-dep', {
            path: 'path-3',
            configPath: 'path-3',
            requiredPlugins: ['another-explicitly-disabled-plugin'],
          }),
          createPlugin('another-explicitly-disabled-plugin', {
            disabled: true,
            path: 'path-4',
            configPath: 'path-4-disabled',
          }),
          createPlugin('plugin-with-disabled-optional-dep', {
            path: 'path-5',
            configPath: 'path-5',
            optionalPlugins: ['explicitly-disabled-plugin'],
          }),
          createPlugin('plugin-with-missing-optional-dep', {
            path: 'path-6',
            configPath: 'path-6',
            optionalPlugins: ['missing-plugin'],
          }),
          createPlugin('plugin-with-disabled-nested-transitive-dep', {
            path: 'path-7',
            configPath: 'path-7',
            requiredPlugins: ['plugin-with-disabled-transitive-dep'],
          }),
          createPlugin('plugin-with-missing-nested-dep', {
            path: 'path-8',
            configPath: 'path-8',
            requiredPlugins: ['plugin-with-missing-required-deps'],
          }),
        ]),
      });

      await pluginsService.discover({ environment: environmentSetup });
      const setup = await pluginsService.setup(setupDeps);

      expect(setup.contracts).toBeInstanceOf(Map);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      expect(mockPluginSystem.setupPlugins).toHaveBeenCalledTimes(1);
      expect(mockPluginSystem.setupPlugins).toHaveBeenCalledWith(setupDeps);

      expect(loggingSystemMock.collect(logger).info).toMatchInlineSnapshot(`
        Array [
          Array [
            "Plugin \\"explicitly-disabled-plugin\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-missing-required-deps\\" has been disabled since the following direct or transitive dependencies are missing or disabled: [missing-plugin]",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-transitive-dep\\" has been disabled since the following direct or transitive dependencies are missing or disabled: [another-explicitly-disabled-plugin]",
          ],
          Array [
            "Plugin \\"another-explicitly-disabled-plugin\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-nested-transitive-dep\\" has been disabled since the following direct or transitive dependencies are missing or disabled: [plugin-with-disabled-transitive-dep]",
          ],
          Array [
            "Plugin \\"plugin-with-missing-nested-dep\\" has been disabled since the following direct or transitive dependencies are missing or disabled: [plugin-with-missing-required-deps]",
          ],
        ]
      `);
    });

    it('does not throw in case of mutual plugin dependencies', async () => {
      const firstPlugin = createPlugin('first-plugin', {
        path: 'path-1',
        requiredPlugins: ['second-plugin'],
      });
      const secondPlugin = createPlugin('second-plugin', {
        path: 'path-2',
        requiredPlugins: ['first-plugin'],
      });

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([firstPlugin, secondPlugin]),
      });

      const { pluginTree } = await pluginsService.discover({ environment: environmentSetup });
      expect(pluginTree).toBeUndefined();

      expect(mockDiscover).toHaveBeenCalledTimes(1);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(firstPlugin);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(secondPlugin);
    });

    it('does not throw in case of cyclic plugin dependencies', async () => {
      const firstPlugin = createPlugin('first-plugin', {
        path: 'path-1',
        requiredPlugins: ['second-plugin'],
      });
      const secondPlugin = createPlugin('second-plugin', {
        path: 'path-2',
        requiredPlugins: ['third-plugin', 'last-plugin'],
      });
      const thirdPlugin = createPlugin('third-plugin', {
        path: 'path-3',
        requiredPlugins: ['last-plugin', 'first-plugin'],
      });
      const lastPlugin = createPlugin('last-plugin', {
        path: 'path-4',
        requiredPlugins: ['first-plugin'],
      });
      const missingDepsPlugin = createPlugin('missing-deps-plugin', {
        path: 'path-5',
        requiredPlugins: ['not-a-plugin'],
      });

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([firstPlugin, secondPlugin, thirdPlugin, lastPlugin, missingDepsPlugin]),
      });

      const { pluginTree } = await pluginsService.discover({ environment: environmentSetup });
      expect(pluginTree).toBeUndefined();

      expect(mockDiscover).toHaveBeenCalledTimes(1);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(4);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(firstPlugin);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(secondPlugin);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(thirdPlugin);
      expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(lastPlugin);
    });

    it('properly invokes plugin discovery and ignores non-critical errors.', async () => {
      const firstPlugin = createPlugin('some-id', {
        path: 'path-1',
        configPath: 'path',
        requiredPlugins: ['some-other-id'],
        optionalPlugins: ['missing-optional-dep'],
      });
      const secondPlugin = createPlugin('some-other-id', {
        path: 'path-2',
        version: 'some-other-version',
        configPath: ['plugin', 'path'],
      });

      mockDiscover.mockReturnValue({
        error$: from([
          PluginDiscoveryError.missingManifest('path-2', new Error('No manifest')),
          PluginDiscoveryError.invalidSearchPath('dir-1', new Error('No dir')),
          PluginDiscoveryError.invalidPluginPath('path4-1', new Error('No path')),
        ]),
        plugin$: from([firstPlugin, secondPlugin]),
      });

      await pluginsService.discover({ environment: environmentSetup });
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
        { coreId, env, logger, configService },
        { uuid: 'uuid' }
      );

      const logs = loggingSystemMock.collect(logger);
      expect(logs.info).toHaveLength(0);
      expect(logs.error).toHaveLength(0);
    });

    it('registers plugin config schema in config service', async () => {
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
          createPlugin('some-id', {
            path: 'path-with-schema',
            configPath: 'path',
          }),
        ]),
      });
      await pluginsService.discover({ environment: environmentSetup });
      expect(configService.setSchema).toBeCalledWith('path', configSchema);
    });

    it('registers plugin config deprecation provider in config service', async () => {
      const configSchema = schema.string();
      jest.spyOn(configService, 'setSchema').mockImplementation(() => Promise.resolve());
      jest.spyOn(configService, 'addDeprecationProvider');

      const deprecationProvider = () => [];
      jest.doMock(
        join('path-with-provider', 'server'),
        () => ({
          config: {
            schema: configSchema,
            deprecations: deprecationProvider,
          },
        }),
        {
          virtual: true,
        }
      );
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('some-id', {
            path: 'path-with-provider',
            configPath: 'config-path',
          }),
        ]),
      });
      await pluginsService.discover({ environment: environmentSetup });
      expect(configService.addDeprecationProvider).toBeCalledWith(
        'config-path',
        deprecationProvider
      );
    });
  });

  describe('#generateUiPluginsConfigs()', () => {
    const pluginToDiscoveredEntry = (plugin: PluginWrapper): [string, DiscoveredPlugin] => [
      plugin.name,
      {
        id: plugin.name,
        configPath: plugin.manifest.configPath,
        requiredPlugins: [],
        requiredBundles: [],
        optionalPlugins: [],
      },
    ];

    it('properly generates client configs for plugins according to `exposeToBrowser`', async () => {
      jest.doMock(
        join('plugin-with-expose', 'server'),
        () => ({
          config: {
            exposeToBrowser: {
              sharedProp: true,
            },
            schema: schema.object({
              serverProp: schema.string({ defaultValue: 'serverProp default value' }),
              sharedProp: schema.string({ defaultValue: 'sharedProp default value' }),
            }),
          },
        }),
        {
          virtual: true,
        }
      );
      const plugin = createPlugin('plugin-with-expose', {
        path: 'plugin-with-expose',
        configPath: 'path',
      });
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([plugin]),
      });
      mockPluginSystem.uiPlugins.mockReturnValue(new Map([pluginToDiscoveredEntry(plugin)]));

      const { uiPlugins } = await pluginsService.discover({ environment: environmentSetup });
      const uiConfig$ = uiPlugins.browserConfigs.get('plugin-with-expose');
      expect(uiConfig$).toBeDefined();

      const uiConfig = await uiConfig$!.pipe(take(1)).toPromise();
      expect(uiConfig).toMatchInlineSnapshot(`
        Object {
          "sharedProp": "sharedProp default value",
        }
      `);
    });

    it('does not generate config for plugins not exposing to client', async () => {
      jest.doMock(
        join('plugin-without-expose', 'server'),
        () => ({
          config: {
            schema: schema.object({
              serverProp: schema.string({ defaultValue: 'serverProp default value' }),
            }),
          },
        }),
        {
          virtual: true,
        }
      );
      const plugin = createPlugin('plugin-without-expose', {
        path: 'plugin-without-expose',
        configPath: 'path',
      });
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([plugin]),
      });
      mockPluginSystem.uiPlugins.mockReturnValue(new Map([pluginToDiscoveredEntry(plugin)]));

      const { uiPlugins } = await pluginsService.discover({ environment: environmentSetup });
      expect([...uiPlugins.browserConfigs.entries()]).toHaveLength(0);
    });
  });

  describe('#setup()', () => {
    beforeEach(() => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('plugin-1', {
            path: 'path-1',
            version: 'some-version',
            configPath: 'plugin1',
          }),
          createPlugin('plugin-2', {
            path: 'path-2',
            version: 'some-version',
            configPath: 'plugin2',
          }),
        ]),
      });

      mockPluginSystem.uiPlugins.mockReturnValue(new Map());
    });

    describe('uiPlugins.internal', () => {
      it('includes disabled plugins', async () => {
        config$.next({ plugins: { initialize: true }, plugin1: { enabled: false } });
        const { uiPlugins } = await pluginsService.discover({ environment: environmentSetup });
        expect(uiPlugins.internal).toMatchInlineSnapshot(`
          Map {
            "plugin-1" => Object {
              "publicAssetsDir": <absolute path>/path-1/public/assets,
              "publicTargetDir": <absolute path>/path-1/target/public,
              "requiredBundles": Array [],
            },
            "plugin-2" => Object {
              "publicAssetsDir": <absolute path>/path-2/public/assets,
              "publicTargetDir": <absolute path>/path-2/target/public,
              "requiredBundles": Array [],
            },
          }
        `);
      });
    });

    describe('plugin initialization', () => {
      it('does initialize if plugins.initialize is true', async () => {
        config$.next({ plugins: { initialize: true } });
        await pluginsService.discover({ environment: environmentSetup });
        const { initialized } = await pluginsService.setup(setupDeps);
        expect(mockPluginSystem.setupPlugins).toHaveBeenCalled();
        expect(initialized).toBe(true);
      });

      it('does not initialize if plugins.initialize is false', async () => {
        config$.next({ plugins: { initialize: false } });
        await pluginsService.discover({ environment: environmentSetup });
        const { initialized } = await pluginsService.setup(setupDeps);
        expect(mockPluginSystem.setupPlugins).not.toHaveBeenCalled();
        expect(initialized).toBe(false);
      });
    });
  });

  describe('#stop()', () => {
    it('`stop` stops plugins system', async () => {
      await pluginsService.stop();
      expect(mockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
    });
  });
});
