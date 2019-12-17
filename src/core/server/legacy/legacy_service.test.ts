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

jest.mock('../../../legacy/server/kbn_server');
jest.mock('../../../cli/cluster/cluster_manager');
jest.mock('./config/legacy_deprecation_adapters', () => ({
  convertLegacyDeprecationProvider: (provider: any) => Promise.resolve(provider),
}));
import { findLegacyPluginSpecsMock } from './legacy_service.test.mocks';

import { BehaviorSubject, throwError } from 'rxjs';
import { LegacyService, LegacyServiceSetupDeps, LegacyServiceStartDeps } from '.';
// @ts-ignore: implicit any for JS file
import { ClusterManager as MockClusterManager } from '../../../cli/cluster/cluster_manager';
import KbnServer from '../../../legacy/server/kbn_server';
import { Config, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { BasePathProxyServer } from '../http';
import { DiscoveredPlugin } from '../plugins';

import { configServiceMock } from '../config/config_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { httpServerMock } from '../http/http_server.mocks';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';
import { capabilitiesServiceMock } from '../capabilities/capabilities_service.mock';
import { findLegacyPluginSpecs } from './plugins/find_legacy_plugin_specs';
import { setupMock as renderingServiceMock } from '../rendering/__mocks__/rendering_service';
import { uuidServiceMock } from '../uuid/uuid_service.mock';

const MockKbnServer: jest.Mock<KbnServer> = KbnServer as any;

let coreId: symbol;
let env: Env;
let config$: BehaviorSubject<Config>;

let setupDeps: LegacyServiceSetupDeps;

let startDeps: LegacyServiceStartDeps;

const logger = loggingServiceMock.create();
let configService: ReturnType<typeof configServiceMock.create>;
let uuidSetup: ReturnType<typeof uuidServiceMock.createSetupContract>;

beforeEach(() => {
  coreId = Symbol();
  env = Env.createDefault(getEnvOptions());
  configService = configServiceMock.create();
  uuidSetup = uuidServiceMock.createSetupContract();

  findLegacyPluginSpecsMock.mockClear();
  MockKbnServer.prototype.ready = jest.fn().mockReturnValue(Promise.resolve());
  MockKbnServer.prototype.listen = jest.fn();

  setupDeps = {
    core: {
      capabilities: capabilitiesServiceMock.createSetupContract(),
      context: contextServiceMock.createSetupContract(),
      elasticsearch: { legacy: {} } as any,
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      http: {
        ...httpServiceMock.createSetupContract(),
        auth: {
          getAuthHeaders: () => undefined,
        } as any,
      },
      savedObjects: savedObjectsServiceMock.createSetupContract(),
      plugins: {
        contracts: new Map([['plugin-id', 'plugin-value']]),
        uiPlugins: {
          public: new Map([['plugin-id', {} as DiscoveredPlugin]]),
          internal: new Map([['plugin-id', { entryPointPath: 'path/to/plugin/public' }]]),
          browserConfigs: new Map(),
        },
      },
      rendering: renderingServiceMock,
      uuid: uuidSetup,
    },
    plugins: { 'plugin-id': 'plugin-value' },
  };

  startDeps = {
    core: {
      capabilities: capabilitiesServiceMock.createStartContract(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
      plugins: { contracts: new Map() },
    },
    plugins: {},
  };

  config$ = new BehaviorSubject<Config>(
    new ObjectToConfigAdapter({
      elasticsearch: { hosts: ['http://127.0.0.1'] },
      server: { autoListen: true },
    })
  );

  configService.getConfig$.mockReturnValue(config$);
  configService.getUsedPaths.mockResolvedValue(['foo.bar']);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('once LegacyService is set up with connection info', () => {
  test('creates legacy kbnServer and calls `listen`.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { path: { autoListen: true }, server: { autoListen: true } }, // Because of the mock, path also gets the value
      expect.objectContaining({ get: expect.any(Function) }),
      expect.any(Object),
      { disabledPluginSpecs: [], pluginSpecs: [], uiExports: {} }
    );
    expect(MockKbnServer.mock.calls[0][1].get()).toEqual({
      path: { autoListen: true },
      server: { autoListen: true },
    });

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalledTimes(1);
    expect(mockKbnServer.close).not.toHaveBeenCalled();
  });

  test('creates legacy kbnServer but does not call `listen` if `autoListen: false`.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: false }));

    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { path: { autoListen: false }, server: { autoListen: true } },
      expect.objectContaining({ get: expect.any(Function) }),
      expect.any(Object),
      { disabledPluginSpecs: [], pluginSpecs: [], uiExports: {} }
    );
    expect(MockKbnServer.mock.calls[0][1].get()).toEqual({
      path: { autoListen: false },
      server: { autoListen: true },
    });

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.ready).toHaveBeenCalledTimes(1);
    expect(mockKbnServer.listen).not.toHaveBeenCalled();
    expect(mockKbnServer.close).not.toHaveBeenCalled();
  });

  test('creates legacy kbnServer and closes it if `listen` fails.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
    MockKbnServer.prototype.listen.mockRejectedValue(new Error('something failed'));
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"something failed"`
    );

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalled();
    expect(mockKbnServer.close).toHaveBeenCalled();
  });

  test('throws if fails to retrieve initial config.', async () => {
    configService.getConfig$.mockReturnValue(throwError(new Error('something failed')));
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await expect(legacyService.discoverPlugins()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"something failed"`
    );
    await expect(legacyService.setup(setupDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service has not discovered legacy plugins yet. Ensure LegacyService.discoverPlugins() is called before LegacyService.setup()"`
    );
    await expect(legacyService.getInjectedUiAppVars('')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service has not been set up yet. Ensure LegacyService.setup() is called before LegacyService.getInjectedUiAppVars()"`
    );
    await expect(legacyService.getVars('', null as any)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service has not been set up yet. Ensure LegacyService.setup() is called before LegacyService.getVars()"`
    );
    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service is not setup yet."`
    );

    expect(MockKbnServer).not.toHaveBeenCalled();
    expect(MockClusterManager).not.toHaveBeenCalled();
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances as Array<jest.Mocked<KbnServer>>;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(mockKbnServer.applyLoggingConfiguration.mock.calls).toMatchSnapshot(
      `applyLoggingConfiguration params`
    );
  });

  test('logs error if re-configuring fails.', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances as Array<jest.Mocked<KbnServer>>;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingServiceMock.collect(logger).error).toEqual([]);

    const configError = new Error('something went wrong');
    mockKbnServer.applyLoggingConfiguration.mockImplementation(() => {
      throw configError;
    });

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(loggingServiceMock.collect(logger).error).toEqual([[configError]]);
  });

  test('logs error if config service fails.', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingServiceMock.collect(logger).error).toEqual([]);

    const configError = new Error('something went wrong');
    config$.error(configError);

    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingServiceMock.collect(logger).error).toEqual([[configError]]);
  });
});

describe('once LegacyService is set up without connection info', () => {
  let legacyService: LegacyService;
  beforeEach(async () => {
    legacyService = new LegacyService({ coreId, env, logger, configService: configService as any });
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);
  });

  test('creates legacy kbnServer with `autoListen: false`.', () => {
    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { path: {}, server: { autoListen: true } },
      expect.objectContaining({ get: expect.any(Function) }),
      expect.any(Object),
      { disabledPluginSpecs: [], pluginSpecs: [], uiExports: {} }
    );
    expect(MockKbnServer.mock.calls[0][1].get()).toEqual({
      path: {},
      server: { autoListen: true },
    });
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    const [mockKbnServer] = MockKbnServer.mock.instances as Array<jest.Mocked<KbnServer>>;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(mockKbnServer.applyLoggingConfiguration.mock.calls).toMatchSnapshot(
      `applyLoggingConfiguration params`
    );
  });
});

describe('once LegacyService is set up in `devClusterMaster` mode', () => {
  beforeEach(() => {
    configService.atPath.mockImplementation(path => {
      return new BehaviorSubject(
        path === 'dev' ? { basePathProxyTargetPort: 100500 } : { basePath: '/abc' }
      );
    });
  });

  test('creates ClusterManager without base path proxy.', async () => {
    const devClusterLegacyService = new LegacyService({
      coreId,
      env: Env.createDefault(
        getEnvOptions({
          cliArgs: { silent: true, basePath: false },
          isDevClusterMaster: true,
        })
      ),
      logger,
      configService: configService as any,
    });

    await devClusterLegacyService.discoverPlugins();
    await devClusterLegacyService.setup(setupDeps);
    await devClusterLegacyService.start(startDeps);

    expect(MockClusterManager).toHaveBeenCalledTimes(1);
    expect(MockClusterManager).toHaveBeenCalledWith(
      expect.objectContaining({ silent: true, basePath: false }),
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function),
      }),
      undefined
    );
  });

  test('creates ClusterManager with base path proxy.', async () => {
    const devClusterLegacyService = new LegacyService({
      coreId,
      env: Env.createDefault(
        getEnvOptions({
          cliArgs: { quiet: true, basePath: true },
          isDevClusterMaster: true,
        })
      ),
      logger,
      configService: configService as any,
    });

    await devClusterLegacyService.discoverPlugins();
    await devClusterLegacyService.setup(setupDeps);
    await devClusterLegacyService.start(startDeps);

    expect(MockClusterManager).toHaveBeenCalledTimes(1);
    expect(MockClusterManager).toHaveBeenCalledWith(
      expect.objectContaining({ quiet: true, basePath: true }),
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function),
      }),
      expect.any(BasePathProxyServer)
    );
  });
});

describe('start', () => {
  test('Cannot start without setup phase', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Legacy service is not setup yet."`
    );
  });
});

describe('#discoverPlugins()', () => {
  it('calls findLegacyPluginSpecs with correct parameters', async () => {
    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.discoverPlugins();
    expect(findLegacyPluginSpecs).toHaveBeenCalledTimes(1);
    expect(findLegacyPluginSpecs).toHaveBeenCalledWith(expect.any(Object), logger);
  });

  it(`register legacy plugin's deprecation providers`, async () => {
    findLegacyPluginSpecsMock.mockImplementation(
      settings =>
        Promise.resolve({
          pluginSpecs: [
            {
              getDeprecationsProvider: () => undefined,
            },
            {
              getDeprecationsProvider: () => 'providerA',
            },
            {
              getDeprecationsProvider: () => 'providerB',
            },
          ],
          pluginExtendedConfig: settings,
          disabledPluginSpecs: [],
          uiExports: {},
        }) as any
    );

    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.discoverPlugins();
    expect(configService.addDeprecationProvider).toHaveBeenCalledTimes(2);
    expect(configService.addDeprecationProvider).toHaveBeenCalledWith('', 'providerA');
    expect(configService.addDeprecationProvider).toHaveBeenCalledWith('', 'providerB');
  });
});

test('Sets the server.uuid property on the legacy configuration', async () => {
  configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
  const legacyService = new LegacyService({
    coreId,
    env,
    logger,
    configService: configService as any,
  });

  uuidSetup.getInstanceUuid.mockImplementation(() => 'UUID_FROM_SERVICE');

  const configSetMock = jest.fn();

  findLegacyPluginSpecsMock.mockImplementation((settings: Record<string, any>) => ({
    pluginSpecs: [],
    pluginExtendedConfig: {
      has: jest.fn(),
      get: jest.fn(() => settings),
      set: configSetMock,
    },
    disabledPluginSpecs: [],
    uiExports: [],
  }));

  await legacyService.discoverPlugins();
  await legacyService.setup(setupDeps);

  expect(configSetMock).toHaveBeenCalledTimes(1);
  expect(configSetMock).toHaveBeenCalledWith('server.uuid', 'UUID_FROM_SERVICE');
});

describe('#getInjectedUiAppVars()', () => {
  let legacyService: LegacyService;

  beforeEach(async () => {
    legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);
  });

  it('gets with no injectors', async () => {
    await expect(legacyService.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(
      `Object {}`
    );
  });

  it('gets with no matching injectors', async () => {
    const injector = jest.fn().mockResolvedValue({ not: 'core' });
    legacyService.injectUiAppVars('not-core', injector);

    await expect(legacyService.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(
      `Object {}`
    );
    expect(injector).not.toHaveBeenCalled();
  });

  it('gets with single matching injector', async () => {
    const injector = jest.fn().mockResolvedValue({ is: 'core' });
    legacyService.injectUiAppVars('core', injector);

    await expect(legacyService.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(`
      Object {
        "is": "core",
      }
    `);
    expect(injector).toHaveBeenCalled();
    expect(injector).toHaveBeenCalledWith(setupDeps.core.http.server);
  });

  it('gets with multiple matching injectors', async () => {
    const injectors = [
      jest.fn().mockResolvedValue({ is: 'core' }),
      jest.fn().mockReturnValue({ sync: 'injector' }),
      jest.fn().mockResolvedValue({ is: 'merged-core' }),
    ];

    injectors.forEach(injector => legacyService.injectUiAppVars('core', injector));

    await expect(legacyService.getInjectedUiAppVars('core')).resolves.toMatchInlineSnapshot(`
      Object {
        "is": "merged-core",
        "sync": "injector",
      }
    `);
    expect(injectors[0]).toHaveBeenCalled();
    expect(injectors[1]).toHaveBeenCalled();
    expect(injectors[2]).toHaveBeenCalled();
  });
});

function varsProvider(vars: Record<string, any>, configValue?: any) {
  return {
    fn: jest.fn().mockReturnValue(vars),
    pluginSpec: {
      readConfigValue: jest.fn().mockReturnValue(configValue),
    },
  };
}

describe('#getVars()', () => {
  let legacyService: LegacyService;

  beforeEach(async () => {
    legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });
  });

  it('gets: no default injectors, no injected vars replacers, no ui app injectors, no inject arg', async () => {
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);

    const vars = await legacyService.getVars('core', httpServerMock.createRawRequest());

    expect(vars).toMatchInlineSnapshot(`Object {}`);
  });

  it('gets: with default injectors, no injected vars replacers, no ui app injectors, no inject arg', async () => {
    const varsProviders = [
      varsProvider({ alpha: 'alpha' }),
      varsProvider({ gamma: 'gamma' }),
      varsProvider({ alpha: 'beta' }),
    ];

    findLegacyPluginSpecsMock.mockImplementation(
      settings =>
        Promise.resolve({
          pluginSpecs: [],
          pluginExtendedConfig: settings,
          disabledPluginSpecs: [],
          uiExports: { defaultInjectedVarProviders: varsProviders },
        }) as any
    );
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);

    const vars = await legacyService.getVars('core', httpServerMock.createRawRequest());

    expect(vars).toMatchInlineSnapshot(`
      Object {
        "alpha": "beta",
        "gamma": "gamma",
      }
    `);
  });

  it('gets: no default injectors, with injected vars replacers, with ui app injectors, no inject arg', async () => {
    const varsReplacers = [
      jest.fn(async vars => ({ ...vars, added: 'key' })),
      jest.fn(vars => vars),
      jest.fn(vars => ({ replaced: 'all' })),
      jest.fn(async vars => ({ ...vars, added: 'last-key' })),
    ];

    findLegacyPluginSpecsMock.mockImplementation(
      settings =>
        Promise.resolve({
          pluginSpecs: [],
          pluginExtendedConfig: settings,
          disabledPluginSpecs: [],
          uiExports: { injectedVarsReplacers: varsReplacers },
        }) as any
    );
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);

    const request = httpServerMock.createRawRequest();
    const vars = await legacyService.getVars('core', request);

    expect(vars).toMatchInlineSnapshot(`
      Object {
        "added": "last-key",
        "replaced": "all",
      }
    `);
  });

  it('gets: no default injectors, no injected vars replacers, with ui app injectors, no inject arg', async () => {
    legacyService.injectUiAppVars('core', async () => ({ is: 'core' }));
    legacyService.injectUiAppVars('core', () => ({ sync: 'injector' }));
    legacyService.injectUiAppVars('core', async () => ({ is: 'merged-core' }));
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);

    const vars = await legacyService.getVars('core', httpServerMock.createRawRequest());

    expect(vars).toMatchInlineSnapshot(`
      Object {
        "is": "merged-core",
        "sync": "injector",
      }
    `);
  });

  it('gets: no default injectors, no injected vars replacers, no ui app injectors, with inject arg', async () => {
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);

    const vars = await legacyService.getVars('core', httpServerMock.createRawRequest(), {
      injected: 'arg',
    });

    expect(vars).toMatchInlineSnapshot(`
      Object {
        "injected": "arg",
      }
    `);
  });

  it('gets: with default injectors, with injected vars replacers, with ui app injectors, with inject arg', async () => {
    const varsProviders = [
      varsProvider({ alpha: 'alpha' }),
      varsProvider({ gamma: 'gamma' }),
      varsProvider({ alpha: 'beta' }),
    ];
    const varsReplacers = [jest.fn(async vars => ({ ...vars, gamma: 'delta' }))];

    findLegacyPluginSpecsMock.mockImplementation(
      settings =>
        Promise.resolve({
          pluginSpecs: [],
          pluginExtendedConfig: settings,
          disabledPluginSpecs: [],
          uiExports: {
            defaultInjectedVarProviders: varsProviders,
            injectedVarsReplacers: varsReplacers,
          },
        }) as any
    );
    legacyService.injectUiAppVars('core', async () => ({ is: 'core' }));
    legacyService.injectUiAppVars('core', () => ({ sync: 'injector' }));
    legacyService.injectUiAppVars('core', async () => ({ is: 'merged-core' }));
    await legacyService.discoverPlugins();
    await legacyService.setup(setupDeps);

    const vars = await legacyService.getVars('core', httpServerMock.createRawRequest(), {
      injected: 'arg',
      sync: 'arg',
    });

    expect(vars).toMatchInlineSnapshot(`
      Object {
        "alpha": "beta",
        "gamma": "delta",
        "injected": "arg",
        "is": "merged-core",
        "sync": "arg",
      }
    `);
  });
});
