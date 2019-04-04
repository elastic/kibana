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
import { loggingServiceMock } from '../logging/logging_service.mock';
import { DiscoveredPlugin, DiscoveredPluginInternal } from '../plugins';
import { PluginsServiceSetup } from '../plugins/plugins_service';
import { LegacyPlatformProxy } from './legacy_platform_proxy';

const MockKbnServer: jest.Mock<KbnServer> = KbnServer as any;
const MockLegacyPlatformProxy: jest.Mock<LegacyPlatformProxy> = LegacyPlatformProxy as any;

let legacyService: LegacyService;
let env: Env;
let config$: BehaviorSubject<Config>;
let setupDeps: {
  elasticsearch: ElasticsearchServiceSetup;
  http: any;
  plugins: PluginsServiceSetup;
};
const logger = loggingServiceMock.create();
let configService: ReturnType<typeof configServiceMock.create>;

beforeEach(() => {
  env = Env.createDefault(getEnvOptions());
  configService = configServiceMock.create();

  MockKbnServer.prototype.ready = jest.fn().mockReturnValue(Promise.resolve());

  setupDeps = {
    elasticsearch: { legacy: {} } as any,
    http: {
      server: { listener: { addListener: jest.fn() }, route: jest.fn() },
      options: { someOption: 'foo', someAnotherOption: 'bar' },
    },
    plugins: {
      contracts: new Map([['plugin-id', 'plugin-value']]),
      uiPlugins: {
        public: new Map([['plugin-id', {} as DiscoveredPlugin]]),
        internal: new Map([['plugin-id', {} as DiscoveredPluginInternal]]),
      },
    },
  };

  config$ = new BehaviorSubject<Config>(
    new ObjectToConfigAdapter({
      elasticsearch: { hosts: ['http://127.0.0.1'] },
      server: { autoListen: true },
    })
  );

  configService.getConfig$.mockReturnValue(config$);
  configService.getUsedPaths.mockResolvedValue(['foo.bar']);

  legacyService = new LegacyService({ env, logger, configService: configService as any });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('once LegacyService is set up with connection info', () => {
  test('register proxy route.', async () => {
    await legacyService.setup(setupDeps);

    expect(setupDeps.http.server.route.mock.calls).toMatchSnapshot('proxy route options');
  });

  test('proxy route responds with `503` if `kbnServer` is not ready yet.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: true }));

    const kbnServerListen$ = new Subject();
    MockKbnServer.prototype.listen = jest.fn(() => {
      kbnServerListen$.next();
      return kbnServerListen$.toPromise();
    });

    // Wait until listen is called and proxy route is registered, but don't allow
    // listen to complete and make kbnServer available.
    const legacySetupPromise = legacyService.setup(setupDeps);
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

    const [[{ handler }]] = setupDeps.http.server.route.mock.calls;
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

    await legacyService.setup(setupDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        elasticsearch: setupDeps.elasticsearch,
        serverOptions: {
          listener: expect.any(LegacyPlatformProxy),
          someAnotherOption: 'bar',
          someOption: 'foo',
        },
        handledConfigPaths: ['foo.bar'],
        plugins: setupDeps.plugins,
      }
    );

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalledTimes(1);
    expect(mockKbnServer.close).not.toHaveBeenCalled();
  });

  test('creates legacy kbnServer but does not call `listen` if `autoListen: false`.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: false }));

    await legacyService.setup(setupDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        elasticsearch: setupDeps.elasticsearch,
        serverOptions: {
          listener: expect.any(LegacyPlatformProxy),
          someAnotherOption: 'bar',
          someOption: 'foo',
        },
        handledConfigPaths: ['foo.bar'],
        plugins: setupDeps.plugins,
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

    await expect(legacyService.setup(setupDeps)).rejects.toThrowErrorMatchingSnapshot();

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalled();
    expect(mockKbnServer.close).toHaveBeenCalled();
  });

  test('throws if fails to retrieve initial config.', async () => {
    configService.getConfig$.mockReturnValue(throwError(new Error('something failed')));

    await expect(legacyService.setup(setupDeps)).rejects.toThrowErrorMatchingSnapshot();

    expect(MockKbnServer).not.toHaveBeenCalled();
    expect(MockClusterManager).not.toHaveBeenCalled();
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    await legacyService.setup(setupDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances as Array<jest.Mocked<KbnServer>>;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(mockKbnServer.applyLoggingConfiguration.mock.calls).toMatchSnapshot(
      `applyLoggingConfiguration params`
    );
  });

  test('logs error if re-configuring fails.', async () => {
    await legacyService.setup(setupDeps);

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
    await legacyService.setup(setupDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingServiceMock.collect(logger).error).toEqual([]);

    const configError = new Error('something went wrong');
    config$.error(configError);

    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(loggingServiceMock.collect(logger).error).toEqual([[configError]]);
  });

  test('proxy route abandons request processing and forwards it to the legacy Kibana', async () => {
    const mockResponseToolkit = { response: jest.fn(), abandon: Symbol('abandon') };
    const mockRequest = { raw: { req: { a: 1 }, res: { b: 2 } } };

    await legacyService.setup(setupDeps);

    const [[{ handler }]] = setupDeps.http.server.route.mock.calls;
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
  beforeEach(async () => {
    await legacyService.setup({
      elasticsearch: setupDeps.elasticsearch,
      plugins: setupDeps.plugins,
    });
  });

  test('creates legacy kbnServer with `autoListen: false`.', () => {
    expect(setupDeps.http.server.route).not.toHaveBeenCalled();
    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        elasticsearch: setupDeps.elasticsearch,
        serverOptions: { autoListen: false },
        handledConfigPaths: ['foo.bar'],
        plugins: setupDeps.plugins,
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

    await devClusterLegacyService.setup({
      elasticsearch: setupDeps.elasticsearch,
      plugins: { contracts: new Map(), uiPlugins: { public: new Map(), internal: new Map() } },
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

    await devClusterLegacyService.setup({
      elasticsearch: setupDeps.elasticsearch,
      plugins: { contracts: new Map(), uiPlugins: { public: new Map(), internal: new Map() } },
    });

    expect(MockClusterManager.create.mock.calls).toMatchSnapshot(
      'cluster manager with base path proxy'
    );
  });
});
