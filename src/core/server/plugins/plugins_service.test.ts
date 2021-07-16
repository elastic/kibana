/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockDiscover, mockPackage } from './plugins_service.test.mocks';

import { join, resolve } from 'path';
import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { createAbsolutePathSerializer, REPO_ROOT } from '@kbn/dev-utils';

import { ConfigPath, ConfigService, Env } from '../config';
import { getEnvOptions, rawConfigServiceMock } from '../config/mocks';
import { coreMock } from '../mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { environmentServiceMock } from '../environment/environment_service.mock';
import { PluginDiscoveryError } from './discovery';
import { PluginWrapper } from './plugin';
import { PluginsService } from './plugins_service';
import { PluginsSystem } from './plugins_system';
import { config } from './plugins_config';
import { take } from 'rxjs/operators';
import { DiscoveredPlugin, PluginType } from './types';

const MockPluginsSystem: jest.Mock<PluginsSystem<PluginType>> = PluginsSystem as any;

let pluginsService: PluginsService;
let config$: BehaviorSubject<Record<string, any>>;
let configService: ConfigService;
let coreId: symbol;
let env: Env;
let prebootMockPluginSystem: jest.Mocked<PluginsSystem<PluginType.preboot>>;
let standardMockPluginSystem: jest.Mocked<PluginsSystem<PluginType.standard>>;
let environmentPreboot: ReturnType<typeof environmentServiceMock.createPrebootContract>;

const prebootDeps = coreMock.createInternalPreboot();
const setupDeps = coreMock.createInternalSetup();
const startDeps = coreMock.createInternalStart();
const logger = loggingSystemMock.create();
const pluginTypes = [PluginType.preboot, PluginType.standard];

expect.addSnapshotSerializer(createAbsolutePathSerializer());

['path-1', 'path-2', 'path-3', 'path-4', 'path-5', 'path-6', 'path-7', 'path-8'].forEach((path) => {
  pluginTypes.forEach((type) => {
    jest.doMock(join(`${path}-${type}`, 'server'), () => ({}), {
      virtual: true,
    });
  });
});

const createPlugin = (
  id: string,
  {
    path = id,
    disabled = false,
    version = 'some-version',
    type = PluginType.standard,
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
    type?: PluginType;
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
      configPath: disabled ? configPath.concat('-disabled') : configPath,
      kibanaVersion,
      type,
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

async function testSetup() {
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
  env = Env.createDefault(REPO_ROOT, getEnvOptions());

  config$ = new BehaviorSubject<Record<string, any>>({ plugins: { initialize: true } });
  const rawConfigService = rawConfigServiceMock.create({ rawConfig$: config$ });
  configService = new ConfigService(rawConfigService, env, logger);
  await configService.setSchema(config.path, config.schema);
  pluginsService = new PluginsService({ coreId, env, logger, configService });

  [prebootMockPluginSystem, standardMockPluginSystem] = MockPluginsSystem.mock.instances as any;
  prebootMockPluginSystem.uiPlugins.mockReturnValue(new Map());
  prebootMockPluginSystem.getPlugins.mockReturnValue([]);
  standardMockPluginSystem.uiPlugins.mockReturnValue(new Map());
  standardMockPluginSystem.getPlugins.mockReturnValue([]);

  environmentPreboot = environmentServiceMock.createPrebootContract();
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('PluginsService', () => {
  beforeEach(async () => {
    await testSetup();
  });

  describe('#discover()', () => {
    it('throws if plugin has an invalid manifest', async () => {
      mockDiscover.mockReturnValue({
        error$: from([PluginDiscoveryError.invalidManifest('path-1', new Error('Invalid JSON'))]),
        plugin$: from([]),
      });

      await expect(pluginsService.discover({ environment: environmentPreboot })).rejects
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

      await expect(pluginsService.discover({ environment: environmentPreboot })).rejects
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
            path: 'path-4-standard',
            version: 'some-version',
            configPath: 'path',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
          }),
          createPlugin('conflicting-id', {
            path: 'path-4-standard',
            version: 'some-version',
            configPath: 'path',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
          }),
        ]),
      });

      await expect(
        pluginsService.discover({ environment: environmentPreboot })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Plugin with id "conflicting-id" is already registered!]`
      );

      expect(prebootMockPluginSystem.addPlugin).not.toHaveBeenCalled();
      expect(prebootMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.addPlugin).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
    });

    it('throws if discovered standard and preboot plugins with conflicting names', async () => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('conflicting-id', {
            type: PluginType.preboot,
            path: 'path-4-preboot',
            version: 'some-version',
            configPath: 'path',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
          }),
          createPlugin('conflicting-id', {
            path: 'path-4-standard',
            version: 'some-version',
            configPath: 'path',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
          }),
        ]),
      });

      await expect(
        pluginsService.discover({ environment: environmentPreboot })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Plugin with id "conflicting-id" is already registered!]`
      );

      expect(prebootMockPluginSystem.addPlugin).not.toHaveBeenCalled();
      expect(prebootMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.addPlugin).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
    });

    it('properly detects plugins that should be disabled.', async () => {
      jest
        .spyOn(configService, 'isEnabledAtPath')
        .mockImplementation((path) => Promise.resolve(!path.includes('disabled')));

      prebootMockPluginSystem.setupPlugins.mockResolvedValue(new Map());
      standardMockPluginSystem.setupPlugins.mockResolvedValue(new Map());

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(
          pluginTypes.flatMap((type) => [
            createPlugin(`explicitly-disabled-plugin-${type}`, {
              type,
              disabled: true,
              path: `path-1-${type}`,
              configPath: `path-1-${type}`,
            }),
            createPlugin(`plugin-with-missing-required-deps-${type}`, {
              type,
              path: `path-2-${type}`,
              configPath: `path-2-${type}`,
              requiredPlugins: ['missing-plugin'],
            }),
            createPlugin(`plugin-with-disabled-transitive-dep-${type}`, {
              type,
              path: `path-3-${type}`,
              configPath: `path-3-${type}`,
              requiredPlugins: [`another-explicitly-disabled-plugin-${type}`],
            }),
            createPlugin(`another-explicitly-disabled-plugin-${type}`, {
              type,
              disabled: true,
              path: `path-4-${type}`,
              configPath: `path-4-disabled-${type}`,
            }),
            createPlugin(`plugin-with-disabled-optional-dep-${type}`, {
              type,
              path: `path-5-${type}`,
              configPath: `path-5-${type}`,
              optionalPlugins: [`explicitly-disabled-plugin-${type}`],
            }),
            createPlugin(`plugin-with-missing-optional-dep-${type}`, {
              type,
              path: `path-6-${type}`,
              configPath: `path-6-${type}`,
              optionalPlugins: ['missing-plugin'],
            }),
            createPlugin(`plugin-with-disabled-nested-transitive-dep-${type}`, {
              type,
              path: `path-7-${type}`,
              configPath: `path-7-${type}`,
              requiredPlugins: [`plugin-with-disabled-transitive-dep-${type}`],
            }),
            createPlugin(`plugin-with-missing-nested-dep-${type}`, {
              type,
              path: `path-8-${type}`,
              configPath: `path-8-${type}`,
              requiredPlugins: [`plugin-with-missing-required-deps-${type}`],
            }),
          ])
        ),
      });

      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);
      const setup = await pluginsService.setup(setupDeps);

      expect(setup.contracts).toBeInstanceOf(Map);

      expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      expect(prebootMockPluginSystem.setupPlugins).toHaveBeenCalledTimes(1);
      expect(standardMockPluginSystem.setupPlugins).toHaveBeenCalledTimes(1);
      expect(prebootMockPluginSystem.setupPlugins).toHaveBeenCalledWith(prebootDeps);
      expect(standardMockPluginSystem.setupPlugins).toHaveBeenCalledWith(setupDeps);

      expect(loggingSystemMock.collect(logger).info).toMatchInlineSnapshot(`
        Array [
          Array [
            "Plugin \\"explicitly-disabled-plugin-preboot\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-missing-required-deps-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [missing-plugin]",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-transitive-dep-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [another-explicitly-disabled-plugin-preboot]",
          ],
          Array [
            "Plugin \\"another-explicitly-disabled-plugin-preboot\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-nested-transitive-dep-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [plugin-with-disabled-transitive-dep-preboot]",
          ],
          Array [
            "Plugin \\"plugin-with-missing-nested-dep-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [plugin-with-missing-required-deps-preboot]",
          ],
          Array [
            "Plugin \\"explicitly-disabled-plugin-standard\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-missing-required-deps-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [missing-plugin]",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-transitive-dep-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [another-explicitly-disabled-plugin-standard]",
          ],
          Array [
            "Plugin \\"another-explicitly-disabled-plugin-standard\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-nested-transitive-dep-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [plugin-with-disabled-transitive-dep-standard]",
          ],
          Array [
            "Plugin \\"plugin-with-missing-nested-dep-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible type: [plugin-with-missing-required-deps-standard]",
          ],
        ]
      `);
    });

    it('does not throw in case of mutual plugin dependencies', async () => {
      const plugins = pluginTypes.flatMap((type) => [
        createPlugin(`first-plugin-${type}`, {
          type,
          path: `path-1-${type}`,
          requiredPlugins: [`second-plugin-${type}`],
        }),
        createPlugin(`second-plugin-${type}`, {
          type,
          path: `path-2-${type}`,
          requiredPlugins: [`first-plugin-${type}`],
        }),
      ]);

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(plugins),
      });

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect(preboot.pluginTree).toBeUndefined();
      expect(standard.pluginTree).toBeUndefined();

      expect(mockDiscover).toHaveBeenCalledTimes(1);
      for (const plugin of plugins) {
        if (plugin.manifest.type === PluginType.preboot) {
          expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        } else {
          expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        }
      }
    });

    it('does not throw in case of mutual plugin dependencies between preboot and standard plugins', async () => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(
          pluginTypes.flatMap((type) => {
            const oppositeType =
              type === PluginType.preboot ? PluginType.standard : PluginType.preboot;
            return [
              createPlugin(`first-plugin-${type}`, {
                type,
                path: `path-1-${type}`,
                requiredPlugins: [`second-plugin-${oppositeType}`],
              }),
              createPlugin(`second-plugin-${oppositeType}`, {
                type: oppositeType,
                path: `path-2-${oppositeType}`,
                requiredPlugins: [`first-plugin-${type}`],
              }),
            ];
          })
        ),
      });

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect(preboot.pluginTree).toBeUndefined();
      expect(standard.pluginTree).toBeUndefined();

      expect(mockDiscover).toHaveBeenCalledTimes(1);
      expect(prebootMockPluginSystem.addPlugin).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.addPlugin).not.toHaveBeenCalled();
    });

    it('does not throw in case of cyclic plugin dependencies', async () => {
      const plugins = pluginTypes.flatMap((type) => [
        createPlugin(`first-plugin-${type}`, {
          type,
          path: `path-1-${type}`,
          requiredPlugins: [`second-plugin-${type}`],
        }),
        createPlugin(`second-plugin-${type}`, {
          type,
          path: `path-2-${type}`,
          requiredPlugins: [`third-plugin-${type}`, `last-plugin-${type}`],
        }),
        createPlugin(`third-plugin-${type}`, {
          type,
          path: `path-3-${type}`,
          requiredPlugins: [`last-plugin-${type}`, `first-plugin-${type}`],
        }),
        createPlugin(`last-plugin-${type}`, {
          type,
          path: `path-4-${type}`,
          requiredPlugins: [`first-plugin-${type}`],
        }),
        createPlugin(`missing-deps-plugin-${type}`, {
          type,
          path: `path-5-${type}`,
          requiredPlugins: [`not-a-plugin-${type}`],
        }),
      ]);

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(plugins),
      });

      const { standard, preboot } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect(preboot.pluginTree).toBeUndefined();
      expect(standard.pluginTree).toBeUndefined();

      expect(mockDiscover).toHaveBeenCalledTimes(1);
      expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledTimes(4);
      expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledTimes(4);
      for (const plugin of plugins) {
        const mockPluginSystem =
          plugin.manifest.type === PluginType.preboot
            ? prebootMockPluginSystem
            : standardMockPluginSystem;
        if (plugin.name.startsWith('missing-deps')) {
          expect(mockPluginSystem.addPlugin).not.toHaveBeenCalledWith(plugin);
        } else {
          expect(mockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        }
      }
    });

    it('properly invokes plugin discovery and ignores non-critical errors.', async () => {
      const plugins = pluginTypes.flatMap((type) => [
        createPlugin(`some-id-${type}`, {
          type,
          path: `path-1-${type}`,
          configPath: `path-${type}`,
          requiredPlugins: [`some-other-id-${type}`],
          optionalPlugins: ['missing-optional-dep'],
        }),
        createPlugin(`some-other-id-${type}`, {
          type,
          path: `path-2-${type}`,
          version: 'some-other-version',
          configPath: [`plugin-other-${type}`, 'path'],
        }),
      ]);

      mockDiscover.mockReturnValue({
        error$: from([
          PluginDiscoveryError.missingManifest('path-2', new Error('No manifest')),
          PluginDiscoveryError.invalidSearchPath('dir-1', new Error('No dir')),
          PluginDiscoveryError.invalidPluginPath('path4-1', new Error('No path')),
        ]),
        plugin$: from(plugins),
      });

      await pluginsService.discover({ environment: environmentPreboot });
      expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      for (const plugin of plugins) {
        if (plugin.manifest.type === PluginType.preboot) {
          expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        } else {
          expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        }
      }
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
      pluginTypes.forEach((type) =>
        jest.doMock(
          join(`path-with-schema-${type}`, 'server'),
          () => ({ config: { schema: configSchema } }),
          { virtual: true }
        )
      );
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(
          pluginTypes.flatMap((type) => [
            createPlugin(`some-id-${type}`, {
              type,
              path: `path-with-schema-${type}`,
              configPath: `path-${type}`,
            }),
          ])
        ),
      });
      await pluginsService.discover({ environment: environmentPreboot });
      expect(configService.setSchema).toBeCalledWith('path-preboot', configSchema);
      expect(configService.setSchema).toBeCalledWith('path-standard', configSchema);
    });

    it('registers plugin config deprecation provider in config service', async () => {
      const configSchema = schema.string();
      jest.spyOn(configService, 'setSchema').mockImplementation(() => Promise.resolve());
      jest.spyOn(configService, 'addDeprecationProvider');

      const deprecationProviders = pluginTypes.map((type) => {
        const deprecationProvider = () => [];
        jest.doMock(
          join(`path-with-provider-${type}`, 'server'),
          () => ({ config: { schema: configSchema, deprecations: deprecationProvider } }),
          { virtual: true }
        );
        return { type, deprecationProvider };
      });

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(
          pluginTypes.flatMap((type) => [
            createPlugin(`some-id-${type}`, {
              type,
              path: `path-with-provider-${type}`,
              configPath: `config-path-${type}`,
            }),
          ])
        ),
      });
      await pluginsService.discover({ environment: environmentPreboot });
      for (const { type, deprecationProvider } of deprecationProviders) {
        expect(configService.addDeprecationProvider).toBeCalledWith(
          `config-path-${type}`,
          deprecationProvider
        );
      }
    });

    it('returns the paths of the plugins', async () => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([]),
      });

      prebootMockPluginSystem.getPlugins.mockImplementation(() => [
        createPlugin('A-preboot', {
          type: PluginType.preboot,
          path: '/plugin-A-path-preboot',
          configPath: 'pathA-preboot',
        }),
        createPlugin('B-preboot', {
          type: PluginType.preboot,
          path: '/plugin-B-path-preboot',
          configPath: 'pathB-preboot',
        }),
      ]);

      standardMockPluginSystem.getPlugins.mockImplementation(() => [
        createPlugin('A-standard', {
          path: '/plugin-A-path-standard',
          configPath: 'pathA-standard',
        }),
        createPlugin('B-standard', {
          path: '/plugin-B-path-standard',
          configPath: 'pathB-standard',
        }),
      ]);

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });

      expect(preboot.pluginPaths).toEqual(['/plugin-A-path-preboot', '/plugin-B-path-preboot']);
      expect(standard.pluginPaths).toEqual(['/plugin-A-path-standard', '/plugin-B-path-standard']);
    });

    it('populates pluginConfigUsageDescriptors with plugins exposeToUsage property', async () => {
      const plugins = pluginTypes.flatMap((type) => {
        const pluginA = createPlugin(`plugin-with-expose-usage-${type}`, {
          type,
          path: `plugin-with-expose-usage-${type}`,
          configPath: `pathA-${type}`,
        });
        jest.doMock(
          join(pluginA.path, 'server'),
          () => ({
            config: {
              exposeToUsage: { test: true, nested: { prop: true } },
              schema: schema.maybe(schema.any()),
            },
          }),
          { virtual: true }
        );

        const pluginB = createPlugin(`plugin-with-array-configPath-${type}`, {
          type,
          path: `plugin-with-array-configPath-${type}`,
          version: 'some-other-version',
          configPath: [`plugin-${type}`, 'pathB'],
        });
        jest.doMock(
          join(pluginB.path, 'server'),
          () => ({
            config: {
              exposeToUsage: { test: true },
              schema: schema.maybe(schema.any()),
            },
          }),
          { virtual: true }
        );

        const pluginC = createPlugin(`plugin-without-expose-${type}`, {
          type,
          path: `plugin-without-expose-${type}`,
          configPath: `pathC-${type}`,
        });
        jest.doMock(
          join(pluginC.path, 'server'),
          () => ({
            config: {
              schema: schema.maybe(schema.any()),
            },
          }),
          { virtual: true }
        );

        return [pluginA, pluginB, pluginC];
      });

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(plugins),
      });

      await pluginsService.discover({ environment: environmentPreboot });

      // eslint-disable-next-line dot-notation
      expect(pluginsService['pluginConfigUsageDescriptors']).toMatchInlineSnapshot(`
        Map {
          "pathA-preboot" => Object {
            "nested.prop": true,
            "test": true,
          },
          "plugin-preboot.pathB" => Object {
            "test": true,
          },
          "pathA-standard" => Object {
            "nested.prop": true,
            "test": true,
          },
          "plugin-standard.pathB" => Object {
            "test": true,
          },
        }
      `);
    });
  });

  describe('#generateUiPluginsConfigs()', () => {
    const pluginToDiscoveredEntry = (plugin: PluginWrapper): [string, DiscoveredPlugin] => [
      plugin.name,
      {
        id: plugin.name,
        type: plugin.manifest.type,
        configPath: plugin.manifest.configPath,
        requiredPlugins: [],
        requiredBundles: [],
        optionalPlugins: [],
      },
    ];

    it('properly generates client configs for plugins according to `exposeToBrowser`', async () => {
      const plugins = pluginTypes.map((type) => {
        const plugin = createPlugin(`plugin-with-expose-${type}`, {
          type,
          path: `plugin-with-expose-${type}`,
          configPath: `path-${type}`,
        });
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              exposeToBrowser: {
                sharedProp: true,
              },
              schema: schema.object({
                serverProp: schema.string({ defaultValue: `serverProp default value ${type}` }),
                sharedProp: schema.string({ defaultValue: `sharedProp default value ${type}` }),
              }),
            },
          }),
          { virtual: true }
        );
        return plugin;
      });

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(plugins),
      });
      prebootMockPluginSystem.uiPlugins.mockReturnValue(
        new Map(
          plugins
            .filter((plugin) => plugin.manifest.type === PluginType.preboot)
            .map((plugin) => pluginToDiscoveredEntry(plugin))
        )
      );
      standardMockPluginSystem.uiPlugins.mockReturnValue(
        new Map(
          plugins
            .filter((plugin) => plugin.manifest.type === PluginType.standard)
            .map((plugin) => pluginToDiscoveredEntry(plugin))
        )
      );

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });

      const prebootUIConfig$ = preboot.uiPlugins.browserConfigs.get('plugin-with-expose-preboot');
      expect(prebootUIConfig$).toBeDefined();

      const standardUIConfig$ = standard.uiPlugins.browserConfigs.get(
        'plugin-with-expose-standard'
      );
      expect(standardUIConfig$).toBeDefined();

      const uiConfig = await combineLatest([prebootUIConfig$!, standardUIConfig$!])
        .pipe(take(1))
        .toPromise();
      expect(uiConfig).toMatchInlineSnapshot(`
        Array [
          Object {
            "sharedProp": "sharedProp default value preboot",
          },
          Object {
            "sharedProp": "sharedProp default value standard",
          },
        ]
      `);
    });

    it('does not generate config for plugins not exposing to client', async () => {
      const plugins = pluginTypes.map((type) => {
        const plugin = createPlugin(`plugin-without-expose-${type}`, {
          type,
          path: `plugin-without-expose-${type}`,
          configPath: `path-${type}`,
        });
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              schema: schema.object({
                serverProp: schema.string({ defaultValue: 'serverProp default value' }),
              }),
            },
          }),
          { virtual: true }
        );
        return plugin;
      });
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(plugins),
      });
      prebootMockPluginSystem.uiPlugins.mockReturnValue(
        new Map(
          plugins
            .filter((plugin) => plugin.manifest.type === PluginType.preboot)
            .map((plugin) => pluginToDiscoveredEntry(plugin))
        )
      );
      standardMockPluginSystem.uiPlugins.mockReturnValue(
        new Map(
          plugins
            .filter((plugin) => plugin.manifest.type === PluginType.standard)
            .map((plugin) => pluginToDiscoveredEntry(plugin))
        )
      );

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect([
        ...preboot.uiPlugins.browserConfigs.entries(),
        ...standard.uiPlugins.browserConfigs.entries(),
      ]).toHaveLength(0);
    });
  });

  describe('plugin initialization', () => {
    beforeEach(() => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(
          pluginTypes.flatMap((type) => [
            createPlugin(`plugin-1-${type}`, {
              type,
              path: `path-1-${type}`,
              version: 'version-1',
              configPath: `plugin1_${type}`,
            }),
            createPlugin(`plugin-2-${type}`, {
              type,
              path: `path-2-${type}`,
              version: 'version-2',
              configPath: `plugin2_${type}`,
            }),
          ])
        ),
      });

      prebootMockPluginSystem.uiPlugins.mockReturnValue(new Map());
      standardMockPluginSystem.uiPlugins.mockReturnValue(new Map());
    });

    it('`uiPlugins.internal` contains internal properties for plugins', async () => {
      config$.next({
        plugins: { initialize: true },
        plugin1_preboot: { enabled: false },
        plugin1_standard: { enabled: false },
      });
      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect([preboot.uiPlugins.internal, standard.uiPlugins.internal]).toMatchInlineSnapshot(`
        Array [
          Map {
            "plugin-1-preboot" => Object {
              "publicAssetsDir": <absolute path>/path-1-preboot/public/assets,
              "publicTargetDir": <absolute path>/path-1-preboot/target/public,
              "requiredBundles": Array [],
              "version": "version-1",
            },
            "plugin-2-preboot" => Object {
              "publicAssetsDir": <absolute path>/path-2-preboot/public/assets,
              "publicTargetDir": <absolute path>/path-2-preboot/target/public,
              "requiredBundles": Array [],
              "version": "version-2",
            },
          },
          Map {
            "plugin-1-standard" => Object {
              "publicAssetsDir": <absolute path>/path-1-standard/public/assets,
              "publicTargetDir": <absolute path>/path-1-standard/target/public,
              "requiredBundles": Array [],
              "version": "version-1",
            },
            "plugin-2-standard" => Object {
              "publicAssetsDir": <absolute path>/path-2-standard/public/assets,
              "publicTargetDir": <absolute path>/path-2-standard/target/public,
              "requiredBundles": Array [],
              "version": "version-2",
            },
          },
        ]
      `);
    });

    it('`uiPlugins.internal` includes disabled plugins', async () => {
      config$.next({
        plugins: { initialize: true },
        plugin1_preboot: { enabled: false },
        plugin1_standard: { enabled: false },
      });
      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect([
        [...preboot.uiPlugins.internal.keys()].sort(),
        [...standard.uiPlugins.internal.keys()].sort(),
      ]).toMatchInlineSnapshot(`
        Array [
          Array [
            "plugin-1-preboot",
            "plugin-2-preboot",
          ],
          Array [
            "plugin-1-standard",
            "plugin-2-standard",
          ],
        ]
      `);
    });

    it('#preboot does initialize `preboot` plugins if plugins.initialize is true', async () => {
      config$.next({ plugins: { initialize: true } });
      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);

      expect(prebootMockPluginSystem.setupPlugins).toHaveBeenCalledTimes(1);
      expect(prebootMockPluginSystem.setupPlugins).toHaveBeenCalledWith(prebootDeps);
      expect(standardMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
    });

    it('#preboot does not initialize `preboot` plugins if plugins.initialize is false', async () => {
      config$.next({ plugins: { initialize: false } });
      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);

      expect(prebootMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
    });

    it('#setup does initialize `standard` plugins if plugins.initialize is true', async () => {
      config$.next({ plugins: { initialize: true } });
      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);

      const { initialized } = await pluginsService.setup(setupDeps);
      expect(standardMockPluginSystem.setupPlugins).toHaveBeenCalledTimes(1);
      expect(standardMockPluginSystem.setupPlugins).toHaveBeenCalledWith(setupDeps);
      expect(initialized).toBe(true);
    });

    it('#setup does not initialize `standard` plugins if plugins.initialize is false', async () => {
      config$.next({ plugins: { initialize: false } });
      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);
      const { initialized } = await pluginsService.setup(setupDeps);
      expect(standardMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
      expect(prebootMockPluginSystem.setupPlugins).not.toHaveBeenCalled();
      expect(initialized).toBe(false);
    });
  });

  describe('#getExposedPluginConfigsToUsage', () => {
    it('returns pluginConfigUsageDescriptors', () => {
      // eslint-disable-next-line dot-notation
      pluginsService['pluginConfigUsageDescriptors'].set('test', { enabled: true });
      expect(pluginsService.getExposedPluginConfigsToUsage()).toMatchInlineSnapshot(`
        Map {
          "test" => Object {
            "enabled": true,
          },
        }
      `);
    });
  });

  describe('#start()', () => {
    beforeEach(() => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from(
          pluginTypes.map((type) =>
            createPlugin(`plugin-1-${type}`, { type, path: `path-1-${type}` })
          )
        ),
      });
    });

    it('does not try to stop `preboot` plugins and start `standard` ones if plugins.initialize is `false`', async () => {
      config$.next({ plugins: { initialize: false } });

      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);
      await pluginsService.setup(setupDeps);

      const { contracts } = await pluginsService.start(startDeps);
      expect(contracts).toBeInstanceOf(Map);
      expect(contracts.size).toBe(0);

      expect(prebootMockPluginSystem.stopPlugins).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.startPlugins).not.toHaveBeenCalled();
    });

    it('stops `preboot` plugins and starts `standard` ones', async () => {
      await pluginsService.discover({ environment: environmentPreboot });
      await pluginsService.preboot(prebootDeps);
      await pluginsService.setup(setupDeps);

      expect(prebootMockPluginSystem.stopPlugins).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.startPlugins).not.toHaveBeenCalled();

      await pluginsService.start(startDeps);

      expect(prebootMockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
      expect(standardMockPluginSystem.stopPlugins).not.toHaveBeenCalled();

      expect(standardMockPluginSystem.startPlugins).toHaveBeenCalledTimes(1);
      expect(standardMockPluginSystem.startPlugins).toHaveBeenCalledWith(startDeps);
      expect(prebootMockPluginSystem.startPlugins).not.toHaveBeenCalled();
    });
  });

  describe('#stop()', () => {
    it('`stop` stops plugins system', async () => {
      await pluginsService.stop();
      expect(standardMockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
      expect(prebootMockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
    });

    it('`stop` does not try to stop preboot plugins system if it was stopped during `start`.', async () => {
      await pluginsService.preboot(prebootDeps);
      await pluginsService.setup(setupDeps);

      expect(prebootMockPluginSystem.stopPlugins).not.toHaveBeenCalled();
      expect(standardMockPluginSystem.stopPlugins).not.toHaveBeenCalled();

      await pluginsService.start(startDeps);

      expect(prebootMockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
      expect(standardMockPluginSystem.stopPlugins).not.toHaveBeenCalled();

      await pluginsService.stop();

      expect(prebootMockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
      expect(standardMockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
    });
  });
});
