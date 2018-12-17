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
jest.mock('../../../server/kbn_server');
jest.mock('../../../cli/cluster/cluster_manager');

import { first } from 'rxjs/operators';
import { LegacyService } from '.';
// @ts-ignore: implicit any for JS file
import MockClusterManager from '../../../cli/cluster/cluster_manager';
// @ts-ignore: implicit any for JS file
import MockKbnServer from '../../../server/kbn_server';
import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { logger } from '../logging/__mocks__';
import { PluginsServiceStartContract } from '../plugins/plugins_service';
import { LegacyPlatformProxy } from './legacy_platform_proxy';

const MockLegacyPlatformProxy: jest.Mock<LegacyPlatformProxy> = LegacyPlatformProxy as any;

let legacyService: LegacyService;
let configService: jest.Mocked<ConfigService>;
let env: Env;
let config$: BehaviorSubject<Config>;
let startDeps: { http: any; plugins: PluginsServiceStartContract };
beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  MockKbnServer.prototype.ready = jest.fn().mockReturnValue(Promise.resolve());

  startDeps = {
    http: {
      server: { listener: { addListener: jest.fn() }, route: jest.fn() },
      options: { someOption: 'foo', someAnotherOption: 'bar' },
    },
    plugins: new Map([['plugin-id', 'plugin-value']]),
  };

  config$ = new BehaviorSubject<Config>(
    new ObjectToConfigAdapter({
      server: { autoListen: true },
    })
  );

  configService = {
    getConfig$: jest.fn().mockReturnValue(config$),
    atPath: jest.fn().mockReturnValue(new BehaviorSubject({})),
    getUsedPaths: jest.fn().mockReturnValue(['foo.bar']),
  } as any;
  legacyService = new LegacyService({ env, logger, configService });
});

afterEach(() => {
  MockLegacyPlatformProxy.mockClear();
  MockKbnServer.mockClear();
  MockClusterManager.create.mockClear();
  logger.mockClear();
});

describe('once LegacyService is started with connection info', () => {
  test('register proxy route.', async () => {
    await legacyService.start(startDeps);

    expect(startDeps.http.server.route.mock.calls).toMatchSnapshot('proxy route options');
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
    const legacyStartPromise = legacyService.start(startDeps);
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

    const [[{ handler }]] = startDeps.http.server.route.mock.calls;
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
    await legacyStartPromise;
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

    await legacyService.start(startDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        serverOptions: {
          listener: expect.any(LegacyPlatformProxy),
          someAnotherOption: 'bar',
          someOption: 'foo',
        },
        handledConfigPaths: ['foo.bar'],
        plugins: startDeps.plugins,
      }
    );

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalledTimes(1);
    expect(mockKbnServer.close).not.toHaveBeenCalled();
  });

  test('creates legacy kbnServer but does not call `listen` if `autoListen: false`.', async () => {
    configService.atPath.mockReturnValue(new BehaviorSubject({ autoListen: false }));

    await legacyService.start(startDeps);

    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        serverOptions: {
          listener: expect.any(LegacyPlatformProxy),
          someAnotherOption: 'bar',
          someOption: 'foo',
        },
        handledConfigPaths: ['foo.bar'],
        plugins: startDeps.plugins,
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

    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingSnapshot();

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.listen).toHaveBeenCalled();
    expect(mockKbnServer.close).toHaveBeenCalled();
  });

  test('throws if fails to retrieve initial config.', async () => {
    configService.getConfig$.mockReturnValue(throwError(new Error('something failed')));

    await expect(legacyService.start(startDeps)).rejects.toThrowErrorMatchingSnapshot();

    expect(MockKbnServer).not.toHaveBeenCalled();
    expect(MockClusterManager).not.toHaveBeenCalled();
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(mockKbnServer.applyLoggingConfiguration.mock.calls).toMatchSnapshot(
      `applyLoggingConfiguration params`
    );
  });

  test('logs error if re-configuring fails.', async () => {
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(logger.mockCollect().error).toEqual([]);

    const configError = new Error('something went wrong');
    mockKbnServer.applyLoggingConfiguration.mockImplementation(() => {
      throw configError;
    });

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(logger.mockCollect().error).toEqual([[configError]]);
  });

  test('logs error if config service fails.', async () => {
    await legacyService.start(startDeps);

    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(logger.mockCollect().error).toEqual([]);

    const configError = new Error('something went wrong');
    config$.error(configError);

    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();
    expect(logger.mockCollect().error).toEqual([[configError]]);
  });

  test('proxy route abandons request processing and forwards it to the legacy Kibana', async () => {
    const mockResponseToolkit = { response: jest.fn(), abandon: Symbol('abandon') };
    const mockRequest = { raw: { req: { a: 1 }, res: { b: 2 } } };

    await legacyService.start(startDeps);

    const [[{ handler }]] = startDeps.http.server.route.mock.calls;
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

describe('once LegacyService is started without connection info', () => {
  beforeEach(async () => await legacyService.start({ plugins: startDeps.plugins }));

  test('creates legacy kbnServer with `autoListen: false`.', () => {
    expect(startDeps.http.server.route).not.toHaveBeenCalled();
    expect(MockKbnServer).toHaveBeenCalledTimes(1);
    expect(MockKbnServer).toHaveBeenCalledWith(
      { server: { autoListen: true } },
      {
        serverOptions: { autoListen: false },
        handledConfigPaths: ['foo.bar'],
        plugins: startDeps.plugins,
      }
    );
  });

  test('reconfigures logging configuration if new config is received.', async () => {
    const [mockKbnServer] = MockKbnServer.mock.instances;
    expect(mockKbnServer.applyLoggingConfiguration).not.toHaveBeenCalled();

    config$.next(new ObjectToConfigAdapter({ logging: { verbose: true } }));

    expect(mockKbnServer.applyLoggingConfiguration.mock.calls).toMatchSnapshot(
      `applyLoggingConfiguration params`
    );
  });
});

describe('once LegacyService is started in `devClusterMaster` mode', () => {
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
      configService,
    });

    await devClusterLegacyService.start({ plugins: new Map() });

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
      configService,
    });

    await devClusterLegacyService.start({ plugins: new Map() });

    expect(MockClusterManager.create.mock.calls).toMatchSnapshot(
      'cluster manager with base path proxy'
    );
  });
});
