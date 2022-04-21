/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockDiscover, mockPackage } from './plugins_service.test.mocks';

import { resolve, join } from 'path';
import { BehaviorSubject, from } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

import { ConfigPath, ConfigService, Env } from '../config';
import { rawConfigServiceMock, getEnvOptions } from '../config/mocks';
import { coreMock } from '../mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { environmentServiceMock } from '../environment/environment_service.mock';
import { PluginDiscoveryError } from './discovery';
import { PluginWrapper } from './plugin';
import { PluginsService } from './plugins_service';
import { PluginsSystem } from './plugins_system';
import { config } from './plugins_config';
import { take } from 'rxjs/operators';
import { DiscoveredPlugin, PluginConfigDescriptor, PluginType } from './types';

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

expect.addSnapshotSerializer(createAbsolutePathSerializer());

['path-1', 'path-2', 'path-3', 'path-4', 'path-5', 'path-6', 'path-7', 'path-8'].forEach((path) => {
  [PluginType.preboot, PluginType.standard].forEach((type) => {
    jest.doMock(join(`${path}-${type}`, 'server'), () => ({}), {
      virtual: true,
    });
  });
});

const OSS_PLUGIN_PATH = '/kibana/src/plugins/ossPlugin';
const XPACK_PLUGIN_PATH = '/kibana/x-pack/plugins/xPackPlugin';
const EXTERNAL_PLUGIN_PATH = '/kibana/plugins/externalPlugin';
[OSS_PLUGIN_PATH, XPACK_PLUGIN_PATH, EXTERNAL_PLUGIN_PATH].forEach((path) => {
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
      owner: {
        name: 'Core',
        githubTeam: 'kibana-core',
      },
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

    describe('X-Pack dependencies', () => {
      function mockDiscoveryResults(params: { sourcePluginPath: string; dependencyType: string }) {
        const { sourcePluginPath, dependencyType } = params;
        // Each plugin's source is derived from its path; the PluginWrapper test suite contains more detailed test cases around the paths (for both POSIX and Windows)
        mockDiscover.mockReturnValue({
          error$: from([]),
          plugin$: from([
            createPlugin('sourcePlugin', {
              path: sourcePluginPath,
              version: 'some-version',
              configPath: 'path',
              requiredPlugins: dependencyType === 'requiredPlugin' ? ['xPackPlugin'] : [],
              requiredBundles: dependencyType === 'requiredBundle' ? ['xPackPlugin'] : undefined,
              optionalPlugins: dependencyType === 'optionalPlugin' ? ['xPackPlugin'] : [],
            }),
            createPlugin('xPackPlugin', {
              path: XPACK_PLUGIN_PATH,
              version: 'some-version',
              configPath: 'path',
              requiredPlugins: [],
              optionalPlugins: [],
            }),
          ]),
        });
      }

      async function expectError() {
        await expect(pluginsService.discover({ environment: environmentPreboot })).rejects.toThrow(
          `X-Pack plugin or bundle with id "xPackPlugin" is required by OSS plugin "sourcePlugin", which is prohibited. Consider making this an optional dependency instead.`
        );
        expect(standardMockPluginSystem.addPlugin).not.toHaveBeenCalled();
      }

      async function expectSuccess() {
        await expect(pluginsService.discover({ environment: environmentPreboot })).resolves.toEqual(
          expect.anything()
        );
        expect(standardMockPluginSystem.addPlugin).toHaveBeenCalled();
      }

      it('throws if an OSS plugin requires an X-Pack plugin or bundle', async () => {
        for (const dependencyType of ['requiredPlugin', 'requiredBundle']) {
          mockDiscoveryResults({ sourcePluginPath: OSS_PLUGIN_PATH, dependencyType });
          await expectError();
        }
      });

      it('does not throw if an OSS plugin has an optional dependency on an X-Pack plugin', async () => {
        mockDiscoveryResults({
          sourcePluginPath: OSS_PLUGIN_PATH,
          dependencyType: 'optionalPlugin',
        });
        await expectSuccess();
      });

      it('does not throw if an X-Pack plugin depends on an X-Pack plugin or bundle', async () => {
        for (const dependencyType of ['requiredPlugin', 'requiredBundle', 'optionalPlugin']) {
          mockDiscoveryResults({ sourcePluginPath: XPACK_PLUGIN_PATH, dependencyType });
          await expectSuccess();
        }
      });

      it('does not throw if an external plugin depends on an X-Pack plugin or bundle', async () => {
        for (const dependencyType of ['requiredPlugin', 'requiredBundle', 'optionalPlugin']) {
          mockDiscoveryResults({ sourcePluginPath: EXTERNAL_PLUGIN_PATH, dependencyType });
          await expectSuccess();
        }
      });
    });

    it('properly detects plugins that should be disabled.', async () => {
      jest
        .spyOn(configService, 'isEnabledAtPath')
        .mockImplementation((path) => Promise.resolve(!path.includes('disabled')));

      prebootMockPluginSystem.setupPlugins.mockResolvedValue(new Map());
      standardMockPluginSystem.setupPlugins.mockResolvedValue(new Map());

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('explicitly-disabled-plugin-preboot', {
            type: PluginType.preboot,
            disabled: true,
            path: 'path-1-preboot',
            configPath: 'path-1-preboot',
          }),
          createPlugin('explicitly-disabled-plugin-standard', {
            disabled: true,
            path: 'path-1-standard',
            configPath: 'path-1-standard',
          }),
          createPlugin('plugin-with-missing-required-deps-preboot', {
            type: PluginType.preboot,
            path: 'path-2-preboot',
            configPath: 'path-2-preboot',
            requiredPlugins: ['missing-plugin-preboot'],
          }),
          createPlugin('plugin-with-missing-required-deps-standard', {
            path: 'path-2-standard',
            configPath: 'path-2-standard',
            requiredPlugins: ['missing-plugin-standard'],
          }),
          createPlugin('plugin-with-disabled-transitive-dep-preboot', {
            type: PluginType.preboot,
            path: 'path-3-preboot',
            configPath: 'path-3-preboot',
            requiredPlugins: ['another-explicitly-disabled-plugin-preboot'],
          }),
          createPlugin('plugin-with-disabled-transitive-dep-standard', {
            path: 'path-3-standard',
            configPath: 'path-3-standard',
            requiredPlugins: ['another-explicitly-disabled-plugin-standard'],
          }),
          createPlugin('another-explicitly-disabled-plugin-preboot', {
            type: PluginType.preboot,
            disabled: true,
            path: 'path-4-preboot',
            configPath: 'path-4-disabled-preboot',
          }),
          createPlugin('another-explicitly-disabled-plugin-standard', {
            disabled: true,
            path: 'path-4-standard',
            configPath: 'path-4-disabled-standard',
          }),
          createPlugin('plugin-with-disabled-optional-dep-preboot', {
            type: PluginType.preboot,
            path: 'path-5-preboot',
            configPath: 'path-5-preboot',
            optionalPlugins: ['explicitly-disabled-plugin-preboot'],
          }),
          createPlugin('plugin-with-disabled-optional-dep-standard', {
            path: 'path-5-standard',
            configPath: 'path-5-standard',
            optionalPlugins: ['explicitly-disabled-plugin-standard'],
          }),
          createPlugin('plugin-with-missing-optional-dep-preboot', {
            type: PluginType.preboot,
            path: 'path-6-preboot',
            configPath: 'path-6-preboot',
            optionalPlugins: ['missing-plugin-preboot'],
          }),
          createPlugin('plugin-with-missing-optional-dep-standard', {
            path: 'path-6-standard',
            configPath: 'path-6-standard',
            optionalPlugins: ['missing-plugin-standard'],
          }),
          createPlugin('plugin-with-disabled-nested-transitive-dep-preboot', {
            type: PluginType.preboot,
            path: 'path-7-preboot',
            configPath: 'path-7-preboot',
            requiredPlugins: ['plugin-with-disabled-transitive-dep-preboot'],
          }),
          createPlugin('plugin-with-disabled-nested-transitive-dep-standard', {
            path: 'path-7-standard',
            configPath: 'path-7-standard',
            requiredPlugins: ['plugin-with-disabled-transitive-dep-standard'],
          }),
          createPlugin('plugin-with-missing-nested-dep-preboot', {
            type: PluginType.preboot,
            path: 'path-8-preboot',
            configPath: 'path-8-preboot',
            requiredPlugins: ['plugin-with-missing-required-deps-preboot'],
          }),
          createPlugin('plugin-with-missing-nested-dep-standard', {
            path: 'path-8-standard',
            configPath: 'path-8-standard',
            requiredPlugins: ['plugin-with-missing-required-deps-standard'],
          }),
        ]),
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
            "Plugin \\"explicitly-disabled-plugin-standard\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-missing-required-deps-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [missing-plugin-preboot]",
          ],
          Array [
            "Plugin \\"plugin-with-missing-required-deps-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [missing-plugin-standard]",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-transitive-dep-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [another-explicitly-disabled-plugin-preboot]",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-transitive-dep-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [another-explicitly-disabled-plugin-standard]",
          ],
          Array [
            "Plugin \\"another-explicitly-disabled-plugin-preboot\\" is disabled.",
          ],
          Array [
            "Plugin \\"another-explicitly-disabled-plugin-standard\\" is disabled.",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-nested-transitive-dep-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [plugin-with-disabled-transitive-dep-preboot]",
          ],
          Array [
            "Plugin \\"plugin-with-disabled-nested-transitive-dep-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [plugin-with-disabled-transitive-dep-standard]",
          ],
          Array [
            "Plugin \\"plugin-with-missing-nested-dep-preboot\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [plugin-with-missing-required-deps-preboot]",
          ],
          Array [
            "Plugin \\"plugin-with-missing-nested-dep-standard\\" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [plugin-with-missing-required-deps-standard]",
          ],
        ]
      `);
    });

    it('does not throw in case of mutual plugin dependencies', async () => {
      const prebootPlugins = [
        createPlugin('first-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-1-preboot',
          requiredPlugins: ['second-plugin-preboot'],
        }),
        createPlugin('second-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-2-preboot',
          requiredPlugins: ['first-plugin-preboot'],
        }),
      ];
      const standardPlugins = [
        createPlugin('first-plugin-standard', {
          path: 'path-1-standard',
          requiredPlugins: ['second-plugin-standard'],
        }),
        createPlugin('second-plugin-standard', {
          path: 'path-2-standard',
          requiredPlugins: ['first-plugin-standard'],
        }),
      ];

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([...prebootPlugins, ...standardPlugins]),
      });

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect(mockDiscover).toHaveBeenCalledTimes(1);

      expect(preboot.pluginTree).toBeUndefined();
      for (const plugin of prebootPlugins) {
        expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
      }

      expect(standard.pluginTree).toBeUndefined();
      for (const plugin of standardPlugins) {
        expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
      }
    });

    it('does not throw in case of mutual plugin dependencies between preboot and standard plugins', async () => {
      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('first-plugin-preboot', {
            type: PluginType.preboot,
            path: 'path-1-preboot',
            requiredPlugins: ['second-plugin-standard'],
          }),
          createPlugin('first-plugin-standard', {
            path: 'path-1-standard',
            requiredPlugins: ['second-plugin-preboot'],
          }),
          createPlugin('second-plugin-preboot', {
            type: PluginType.preboot,
            path: 'path-2-preboot',
            requiredPlugins: ['first-plugin-standard'],
          }),
          createPlugin('second-plugin-standard', {
            path: 'path-2-standard',
            requiredPlugins: ['first-plugin-preboot'],
          }),
        ]),
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
      const prebootPlugins = [
        createPlugin('first-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-1-preboot',
          requiredPlugins: ['second-plugin-preboot'],
        }),
        createPlugin('second-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-2-preboot',
          requiredPlugins: ['third-plugin-preboot', 'last-plugin-preboot'],
        }),
        createPlugin('third-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-3-preboot',
          requiredPlugins: ['last-plugin-preboot', 'first-plugin-preboot'],
        }),
        createPlugin('last-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-4-preboot',
          requiredPlugins: ['first-plugin-preboot'],
        }),
        createPlugin('missing-deps-plugin-preboot', {
          type: PluginType.preboot,
          path: 'path-5-preboot',
          requiredPlugins: ['not-a-plugin-preboot'],
        }),
      ];

      const standardPlugins = [
        createPlugin('first-plugin-standard', {
          path: 'path-1-standard',
          requiredPlugins: ['second-plugin-standard'],
        }),
        createPlugin('second-plugin-standard', {
          path: 'path-2-standard',
          requiredPlugins: ['third-plugin-standard', 'last-plugin-standard'],
        }),
        createPlugin('third-plugin-standard', {
          path: 'path-3-standard',
          requiredPlugins: ['last-plugin-standard', 'first-plugin-standard'],
        }),
        createPlugin('last-plugin-standard', {
          path: 'path-4-standard',
          requiredPlugins: ['first-plugin-standard'],
        }),
        createPlugin('missing-deps-plugin-standard', {
          path: 'path-5-standard',
          requiredPlugins: ['not-a-plugin-standard'],
        }),
      ];

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([...prebootPlugins, ...standardPlugins]),
      });

      const { standard, preboot } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect(mockDiscover).toHaveBeenCalledTimes(1);

      expect(preboot.pluginTree).toBeUndefined();
      expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledTimes(4);
      for (const plugin of prebootPlugins) {
        if (plugin.name.startsWith('missing-deps')) {
          expect(prebootMockPluginSystem.addPlugin).not.toHaveBeenCalledWith(plugin);
        } else {
          expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        }
      }

      expect(standard.pluginTree).toBeUndefined();
      expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledTimes(4);
      for (const plugin of standardPlugins) {
        if (plugin.name.startsWith('missing-deps')) {
          expect(standardMockPluginSystem.addPlugin).not.toHaveBeenCalledWith(plugin);
        } else {
          expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
        }
      }
    });

    it('properly invokes plugin discovery and ignores non-critical errors.', async () => {
      const prebootPlugins = [
        createPlugin('some-id-preboot', {
          type: PluginType.preboot,
          path: 'path-1-preboot',
          configPath: 'path-preboot',
          requiredPlugins: ['some-other-id-preboot'],
          optionalPlugins: ['missing-optional-dep'],
        }),
        createPlugin('some-other-id-preboot', {
          type: PluginType.preboot,
          path: 'path-2-preboot',
          version: 'some-other-version',
          configPath: ['plugin-other-preboot', 'path'],
        }),
      ];

      const standardPlugins = [
        createPlugin('some-id-standard', {
          type: PluginType.standard,
          path: 'path-1-standard',
          configPath: 'path-standard',
          requiredPlugins: ['some-other-id-standard'],
          optionalPlugins: ['missing-optional-dep'],
        }),
        createPlugin('some-other-id-standard', {
          type: PluginType.standard,
          path: 'path-2-standard',
          version: 'some-other-version',
          configPath: ['plugin-other-standard', 'path'],
        }),
      ];

      mockDiscover.mockReturnValue({
        error$: from([
          PluginDiscoveryError.missingManifest('path-2', new Error('No manifest')),
          PluginDiscoveryError.invalidSearchPath('dir-1', new Error('No dir')),
          PluginDiscoveryError.invalidPluginPath('path4-1', new Error('No path')),
        ]),
        plugin$: from([...prebootPlugins, ...standardPlugins]),
      });

      await pluginsService.discover({ environment: environmentPreboot });
      expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      for (const plugin of prebootPlugins) {
        expect(prebootMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
      }

      expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
      for (const plugin of standardPlugins) {
        expect(standardMockPluginSystem.addPlugin).toHaveBeenCalledWith(plugin);
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
      jest.doMock(
        join('path-with-schema-preboot', 'server'),
        () => ({ config: { schema: configSchema } }),
        { virtual: true }
      );
      jest.doMock(
        join('path-with-schema-standard', 'server'),
        () => ({ config: { schema: configSchema } }),
        { virtual: true }
      );

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('some-id-preboot', {
            type: PluginType.preboot,
            path: 'path-with-schema-preboot',
            configPath: 'path-preboot',
          }),
          createPlugin('some-id-standard', {
            path: 'path-with-schema-standard',
            configPath: 'path-standard',
          }),
        ]),
      });
      await pluginsService.discover({ environment: environmentPreboot });
      expect(configService.setSchema).toBeCalledWith('path-preboot', configSchema);
      expect(configService.setSchema).toBeCalledWith('path-standard', configSchema);
    });

    it('registers plugin config deprecation provider in config service', async () => {
      const configSchema = schema.string();
      jest.spyOn(configService, 'setSchema').mockImplementation(() => Promise.resolve());
      jest.spyOn(configService, 'addDeprecationProvider');

      const prebootDeprecationProvider = () => [];
      jest.doMock(
        join('path-with-provider-preboot', 'server'),
        () => ({ config: { schema: configSchema, deprecations: prebootDeprecationProvider } }),
        { virtual: true }
      );

      const standardDeprecationProvider = () => [];
      jest.doMock(
        join('path-with-provider-standard', 'server'),
        () => ({ config: { schema: configSchema, deprecations: standardDeprecationProvider } }),
        { virtual: true }
      );

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          createPlugin('some-id-preboot', {
            type: PluginType.preboot,
            path: 'path-with-provider-preboot',
            configPath: 'config-path-preboot',
          }),
          createPlugin('some-id-standard', {
            path: 'path-with-provider-standard',
            configPath: 'config-path-standard',
          }),
        ]),
      });
      await pluginsService.discover({ environment: environmentPreboot });
      expect(configService.addDeprecationProvider).toBeCalledWith(
        'config-path-preboot',
        prebootDeprecationProvider
      );
      expect(configService.addDeprecationProvider).toBeCalledWith(
        'config-path-standard',
        standardDeprecationProvider
      );
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
      const pluginsWithExposeUsage = [
        createPlugin('plugin-with-expose-usage-preboot', {
          type: PluginType.preboot,
          path: 'plugin-with-expose-usage-preboot',
          configPath: 'pathA-preboot',
        }),
        createPlugin('plugin-with-expose-usage-standard', {
          path: 'plugin-with-expose-usage-standard',
          configPath: 'pathA-standard',
        }),
      ];
      for (const plugin of pluginsWithExposeUsage) {
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              exposeToUsage: { test: true, nested: { prop: true } },
              schema: schema.maybe(schema.any()),
            },
          }),
          { virtual: true }
        );
      }

      const pluginsWithArrayConfigPath = [
        createPlugin('plugin-with-array-configPath-preboot', {
          type: PluginType.preboot,
          path: 'plugin-with-array-configPath-preboot',
          version: 'some-other-version',
          configPath: ['plugin-preboot', 'pathB'],
        }),
        createPlugin('plugin-with-array-configPath-standard', {
          path: 'plugin-with-array-configPath-standard',
          version: 'some-other-version',
          configPath: ['plugin-standard', 'pathB'],
        }),
      ];
      for (const plugin of pluginsWithArrayConfigPath) {
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              exposeToUsage: { test: true },
              schema: schema.maybe(schema.any()),
            },
          }),
          { virtual: true }
        );
      }

      const pluginsWithoutExpose = [
        createPlugin('plugin-without-expose-preboot', {
          type: PluginType.preboot,
          path: 'plugin-without-expose-preboot',
          configPath: 'pathC-preboot',
        }),
        createPlugin('plugin-without-expose-standard', {
          path: 'plugin-without-expose-standard',
          configPath: 'pathC-standard',
        }),
      ];
      for (const plugin of pluginsWithoutExpose) {
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              schema: schema.maybe(schema.any()),
            },
          }),
          { virtual: true }
        );
      }

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([
          ...pluginsWithExposeUsage,
          ...pluginsWithArrayConfigPath,
          ...pluginsWithoutExpose,
        ]),
      });

      await pluginsService.discover({ environment: environmentPreboot });

      // eslint-disable-next-line dot-notation
      expect(pluginsService['pluginConfigUsageDescriptors']).toMatchInlineSnapshot(`
        Map {
          "pathA-preboot" => Object {
            "nested.prop": true,
            "test": true,
          },
          "pathA-standard" => Object {
            "nested.prop": true,
            "test": true,
          },
          "plugin-preboot.pathB" => Object {
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
      const prebootPlugin = createPlugin('plugin-with-expose-preboot', {
        type: PluginType.preboot,
        path: 'plugin-with-expose-preboot',
        configPath: 'path-preboot',
      });
      const standardPlugin = createPlugin('plugin-with-expose-standard', {
        path: 'plugin-with-expose-standard',
        configPath: 'path-standard',
      });
      for (const plugin of [prebootPlugin, standardPlugin]) {
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              exposeToBrowser: {
                sharedProp: true,
              },
              schema: schema.object({
                serverProp: schema.string({
                  defaultValue: `serverProp default value ${plugin.name}`,
                }),
                sharedProp: schema.string({
                  defaultValue: `sharedProp default value ${plugin.name}`,
                }),
              }),
            },
          }),
          { virtual: true }
        );
      }

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([prebootPlugin, standardPlugin]),
      });
      prebootMockPluginSystem.uiPlugins.mockReturnValue(
        new Map([pluginToDiscoveredEntry(prebootPlugin)])
      );
      standardMockPluginSystem.uiPlugins.mockReturnValue(
        new Map([pluginToDiscoveredEntry(standardPlugin)])
      );

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });

      const prebootUIConfig$ = preboot.uiPlugins.browserConfigs.get('plugin-with-expose-preboot')!;
      await expect(prebootUIConfig$.pipe(take(1)).toPromise()).resolves.toEqual({
        browserConfig: { sharedProp: 'sharedProp default value plugin-with-expose-preboot' },
        exposedConfigKeys: { sharedProp: 'string' },
      });

      const standardUIConfig$ = standard.uiPlugins.browserConfigs.get(
        'plugin-with-expose-standard'
      )!;
      await expect(standardUIConfig$.pipe(take(1)).toPromise()).resolves.toEqual({
        browserConfig: { sharedProp: 'sharedProp default value plugin-with-expose-standard' },
        exposedConfigKeys: { sharedProp: 'string' },
      });
    });

    it('does not generate config for plugins not exposing to client', async () => {
      const prebootPlugin = createPlugin('plugin-without-expose-preboot', {
        type: PluginType.preboot,
        path: 'plugin-without-expose-preboot',
        configPath: 'path-preboot',
      });
      const standardPlugin = createPlugin('plugin-without-expose-standard', {
        path: 'plugin-without-expose-standard',
        configPath: 'path-standard',
      });
      for (const plugin of [prebootPlugin, standardPlugin]) {
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
      }

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([prebootPlugin, standardPlugin]),
      });
      prebootMockPluginSystem.uiPlugins.mockReturnValue(
        new Map([pluginToDiscoveredEntry(prebootPlugin)])
      );
      standardMockPluginSystem.uiPlugins.mockReturnValue(
        new Map([pluginToDiscoveredEntry(standardPlugin)])
      );

      const { preboot, standard } = await pluginsService.discover({
        environment: environmentPreboot,
      });
      expect(preboot.uiPlugins.browserConfigs.size).toBe(0);
      expect(standard.uiPlugins.browserConfigs.size).toBe(0);
    });
  });

  test('"root" deprecations from one plugin should be applied before accessing other plugins config', async () => {
    const pluginA = createPlugin('plugin-1-deprecations', {
      type: PluginType.standard,
      path: 'plugin-1-deprecations',
      version: 'version-1',
    });

    const pluginB = createPlugin('plugin-2-deprecations', {
      type: PluginType.standard,
      path: 'plugin-2-deprecations',
      version: 'version-2',
    });

    jest.doMock(
      join(pluginA.path, 'server'),
      () => ({
        config: {
          schema: schema.object({
            enabled: schema.maybe(schema.boolean({ defaultValue: true })),
          }),
        },
      }),
      { virtual: true }
    );

    jest.doMock(
      join(pluginB.path, 'server'),
      (): { config: PluginConfigDescriptor } => ({
        config: {
          schema: schema.object({
            enabled: schema.maybe(schema.boolean({ defaultValue: true })),
            renamed: schema.string(), // Mandatory string to make sure that the field is actually renamed by deprecations
          }),
          deprecations: ({ renameFromRoot }) => [
            renameFromRoot('plugin-1-deprecations.toBeRenamed', 'plugin-2-deprecations.renamed', {
              level: 'critical',
            }),
          ],
        },
      }),
      { virtual: true }
    );

    mockDiscover.mockReturnValue({
      error$: from([]),
      plugin$: from([pluginA, pluginB]),
    });

    config$.next({
      'plugin-1-deprecations': {
        toBeRenamed: 'renamed',
      },
    });

    await expect(
      pluginsService.discover({
        environment: environmentPreboot,
      })
    ).resolves.not.toThrow(); // If the rename is not applied, it'll fail
  });

  describe('plugin initialization', () => {
    beforeEach(() => {
      const prebootPlugins = [
        createPlugin('plugin-1-preboot', {
          type: PluginType.preboot,
          path: 'path-1-preboot',
          version: 'version-1',
        }),
        createPlugin('plugin-2-preboot', {
          type: PluginType.preboot,
          path: 'path-2-preboot',
          version: 'version-2',
        }),
      ];
      const standardPlugins = [
        createPlugin('plugin-1-standard', {
          path: 'path-1-standard',
          version: 'version-1',
        }),
        createPlugin('plugin-2-standard', {
          path: 'path-2-standard',
          version: 'version-2',
        }),
      ];

      for (const plugin of [...prebootPlugins, ...standardPlugins]) {
        jest.doMock(
          join(plugin.path, 'server'),
          () => ({
            config: {
              schema: schema.object({
                enabled: schema.maybe(schema.boolean({ defaultValue: true })),
              }),
            },
          }),
          { virtual: true }
        );
      }

      mockDiscover.mockReturnValue({
        error$: from([]),
        plugin$: from([...prebootPlugins, ...standardPlugins]),
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
      expect(preboot.uiPlugins.internal).toMatchInlineSnapshot(`
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
        }
      `);
      expect(standard.uiPlugins.internal).toMatchInlineSnapshot(`
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
        }
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
      expect([...preboot.uiPlugins.internal.keys()].sort()).toMatchInlineSnapshot(`
        Array [
          "plugin-1-preboot",
          "plugin-2-preboot",
        ]
      `);
      expect([...standard.uiPlugins.internal.keys()].sort()).toMatchInlineSnapshot(`
        Array [
          "plugin-1-standard",
          "plugin-2-standard",
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
        plugin$: from([
          createPlugin('plugin-1-preboot', { type: PluginType.preboot, path: 'path-1-preboot' }),
          createPlugin('plugin-1-standard', { path: 'path-1-standard' }),
        ]),
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
