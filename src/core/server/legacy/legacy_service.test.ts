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

import { BehaviorSubject, Subject, throwError } from 'rxjs';

jest.mock('./legacy_platform_proxy');
jest.mock('../../../legacy/server/kbn_server');
jest.mock('../../../cli/cluster/cluster_manager');

import { first } from 'rxjs/operators';
import { LegacyService } from '.';
// @ts-ignore: implicit any for JS file
import MockClusterManager from '../../../cli/cluster/cluster_manager';
import KbnServer from '../../../legacy/server/kbn_server';
import { Config, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { configServiceMock } from '../config/config_service.mock';
import { ElasticsearchServiceSetup } from '../elasticsearch';
import { HttpServiceStart, BasePathProxyServer } from '../http';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { DiscoveredPlugin, DiscoveredPluginInternal } from '../plugins';
import { PluginsServiceSetup, PluginsServiceStart } from '../plugins/plugins_service';
import { LegacyPlatformProxy } from './legacy_platform_proxy';

const MockKbnServer: jest.Mock<KbnServer> = KbnServer as any;
const MockLegacyPlatformProxy: jest.Mock<LegacyPlatformProxy> = LegacyPlatformProxy as any;

let env: Env;
let config$: BehaviorSubject<Config>;
let setupDeps: {
  core: {
    elasticsearch: ElasticsearchServiceSetup;
    http: any;
    plugins: PluginsServiceSetup;
  };
  plugins: Record<string, unknown>;
};

let startDeps: {
  core: {
    http: HttpServiceStart;
    plugins: PluginsServiceStart;
  };
  plugins: Record<string, unknown>;
};

const logger = loggingServiceMock.create();
let configService: ReturnType<typeof configServiceMock.create>;

beforeEach(() => {
  env = Env.createDefault(getEnvOptions());
  configService = configServiceMock.create();

  MockKbnServer.prototype.ready = jest.fn().mockReturnValue(Promise.resolve());

  setupDeps = {
    core: {
      elasticsearch: { legacy: {} } as any,
      http: {
        options: { someOption: 'foo', someAnotherOption: 'bar' },
        server: { listener: { addListener: jest.fn() }, route: jest.fn() },
      },
      plugins: {
        contracts: new Map([['plugin-id', 'plugin-value']]),
        uiPlugins: {
          public: new Map([['plugin-id', {} as DiscoveredPlugin]]),
          internal: new Map([['plugin-id', {} as DiscoveredPluginInternal]]),
        },
      },
    },
    plugins: { 'plugin-id': 'plugin-value' },
  };

  startDeps = {
    core: {
      http: {
        isListening: () => true,
      },
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
  test('register proxy route.', async () => {
    const legacyService = new LegacyService({ env, logger, configService: configService as any });
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    expect(setupDeps.core.http.server.route.mock.calls).toMatchSnapshot('proxy route options');
  });

  test('proxy route responds with `503` if `kbnServer` is not ready yet.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
    const legacyService = new LegacyService({ env, logger, configService: configService as any });

    const kbnServerListen$ = new Subject();
    MockKbnServer.prototype.listen = jest.fn(() => {
      kbnServerListen$.next();
      return kbnServerListen$.toPromise();
    });

    // Wait until listen is called and proxy route is registered, but don't allow
    // listen to complete and make kbnServer available.
    await legacyService.setup(setupDeps);
    const legacySetupPromise = legacyService.start(startDeps);
    await kbnServerListen$.pipe(first()).toPromise();

    const mockResponse: any = {
      code: jest.fn().mockImplementation(() => mockResponse),
      header: jest.fn().mockImplementation(() => mockResponse),
    };
    const mockResponseToolkit = {
      response: jest.fn().mockReturnValue(mockResponse),
      abandon: Symbol('abandon'),
    };
    const mockRequest = { raw: { req: { a: 1 }, res: { b: 2 } } };

    const [[{ handler }]] = setupDeps.core.http.server.route.mock.calls;
    const response503 = await handler(mockRequest, mockResponseToolkit);

    expect(response503).toBe(mockResponse);
    expect({
      body: mockResponseToolkit.response.mock.calls,
      code: mockResponse.code.mock.calls,
      header: mockResponse.header.mock.calls,
    }).toMatchSnapshot('503 response');

    // Make sure request hasn't been passed to the legacy platform.
    const [mockedLegacyPlatformProxy] = MockLegacyPlatformProxy.mock.instances;
    expect(mockedLegacyPlatformProxy.emit).not.toHaveBeenCalled();

    // Now wait until kibana is ready and try to request once again.
    kbnServerListen$.complete();
    await legacySetupPromise;
    mockResponseToolkit.response.mockClear();

    const responseProxy = await handler(mockRequest, mockResponseToolkit);
    expect(responseProxy).toBe(mockResponseToolkit.abandon);
    expect(mockResponseToolkit.response).not.toHaveBeenCalled();

    // Make sure request has been passed to the legacy platform.
    expect(mockedLegacyPlatformProxy.emit).toHaveBeenCalledTimes(1);
    expect(mockedLegacyPlatformProxy.emit).toHaveBeenCalledWith(
      'request',
      mockRequest.raw.req,
      mockRequest.raw.res
    );
  });

  test('creates legacy kbnServer and calls `listen`.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
    const legacyService = new LegacyService({ env, logger, configService: configService as any });

    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        setupDeps,
        startDeps,
        serverOptions: {
          listener: expect.any(LegacyPlatformProxy),
          someAnotherOption: 'bar',
          someOption: 'foo',
        },
        handledConfigPaths: ['foo.bar'],
        logger,
      }
    );

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalledTimes(1);
    expect(mockKbnServer.close).not.toHaveBeenCalled();
  });

  test('creates legacy kbnServer but does not call `listen` if `autoListen: false`.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: false }));

    const legacyService = new LegacyService({ env, logger, configService: configService as any });
    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        setupDeps,
        startDeps,
        serverOptions: {
          listener: expect.any(LegacyPlatformProxy),
          someAnotherOption: 'bar',
          someOption: 'foo',
        },
        handledConfigPaths: ['foo.bar'],
        logger,
      }
    );

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.ready).toHaveBeenCalledTimes(1);
    expect(mockKbnServer.listen).not.toHaveBeenCalled();
    expect(mockKbnServer.close).not.toHaveBeenCalled();
  });

  test('creates legacy kbnServer and closes it if `listen` fails.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));
    MockKbnServer.prototype.listen.mockRejectedValue(new Error('something failed'));
    const legacyService = new LegacyService({ env, logger, configService: configService as any });

    await legacyService.setup(setupDeps);
    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingSnapshot();

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalled();
    expect(mockKbnServer.close).toHaveBeenCalled();
  });

  test('throws if fails to retrieve initial config.', async () => {
    configService.getConfig$.mockReturnValue(throwError(new Error('something failed')));
    const legacyService = new LegacyService({ env, logger, configService: configService as any });

    await legacyService.setup(setupDeps);
    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingSnapshot();

    expect(MockKbnServer).not.toHaveBeenCalled();
    expect(MockClusterManager).not.toHaveBeenCalled();
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    const legacyService = new LegacyService({ env, logger, configService: configService as any });
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
    const legacyService = new LegacyService({ env, logger, configService: configService as any });
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
    const legacyService = new LegacyService({ env, logger, configService: configService as any });
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

  test('proxy route abandons request processing and forwards it to the legacy Kibana', async () => {
    const legacyService = new LegacyService({ env, logger, configService: configService as any });
    const mockResponseToolkit = { response: jest.fn(), abandon: Symbol('abandon') };
    const mockRequest = { raw: { req: { a: 1 }, res: { b: 2 } } };

    await legacyService.setup(setupDeps);
    await legacyService.start(startDeps);

    const [[{ handler }]] = setupDeps.core.http.server.route.mock.calls;
    const response = await handler(mockRequest, mockResponseToolkit);

    expect(response).toBe(mockResponseToolkit.abandon);
    expect(mockResponseToolkit.response).not.toHaveBeenCalled();

    // Make sure request has been passed to the legacy platform.
    const [mockedLegacyPlatformProxy] = MockLegacyPlatformProxy.mock.instances;
    expect(mockedLegacyPlatformProxy.emit).toHaveBeenCalledTimes(1);
    expect(mockedLegacyPlatformProxy.emit).toHaveBeenCalledWith(
      'request',
      mockRequest.raw.req,
      mockRequest.raw.res
    );
  });
});

describe('once LegacyService is set up without connection info', () => {
  const disabledHttpStartDeps = {
    core: {
      http: {
        isListening: () => false,
      },
      plugins: { contracts: new Map() },
    },
    plugins: {},
  };
  let legacyService: LegacyService;
  beforeEach(async () => {
    legacyService = new LegacyService({ env, logger, configService: configService as any });

    await legacyService.setup(setupDeps);
    await legacyService.start(disabledHttpStartDeps);
  });

  test('creates legacy kbnServer with `autoListen: false`.', () => {
    expect(setupDeps.core.http.server.route).not.toHaveBeenCalled();
    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        setupDeps,
        startDeps: disabledHttpStartDeps,
        serverOptions: { autoListen: false },
        handledConfigPaths: ['foo.bar'],
        logger,
      }
    );
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
      env: Env.createDefault(
        getEnvOptions({
          cliArgs: { silent: true, basePath: false },
          isDevClusterMaster: true,
        })
      ),
      logger,
      configService: configService as any,
    });

    await devClusterLegacyService.setup(setupDeps);
    await devClusterLegacyService.start({
      core: {
        http: {
          isListening: () => false,
        },
        plugins: { contracts: new Map() },
      },
      plugins: {},
    });

    expect(MockClusterManager.create.mock.calls).toMatchSnapshot(
      'cluster manager without base path proxy'
    );
  });

  test('creates ClusterManager with base path proxy.', async () => {
    const devClusterLegacyService = new LegacyService({
      env: Env.createDefault(
        getEnvOptions({
          cliArgs: { quiet: true, basePath: true },
          isDevClusterMaster: true,
        })
      ),
      logger,
      configService: configService as any,
    });

    await devClusterLegacyService.setup(setupDeps);
    await devClusterLegacyService.start({
      core: {
        http: {
          isListening: () => false,
        },
        plugins: { contracts: new Map() },
      },
      plugins: {},
    });

    expect(MockClusterManager.create).toBeCalledTimes(1);

    const [[cliArgs, config, basePathProxy]] = MockClusterManager.create.mock.calls;
    expect(cliArgs).toMatchSnapshot('cli args. cluster manager with base path proxy');
    expect(config).toMatchSnapshot('config. cluster manager with base path proxy');
    expect(basePathProxy).toBeInstanceOf(BasePathProxyServer);
  });
});

test('Cannot start without setup phase', async () => {
  const legacyService = new LegacyService({ env, logger, configService: configService as any });
  await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Legacy service is not setup yet."`
  );
});
