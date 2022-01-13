/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockHttpServer } from './http_service.test.mocks';

import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '../config/mocks';
import { HttpService } from '.';
import { HttpConfigType, config } from './http_config';
import { httpServerMock } from './http_server.mocks';
import { ConfigService, Env } from '../config';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { executionContextServiceMock } from '../execution_context/execution_context_service.mock';
import { config as cspConfig } from '../csp';
import { config as externalUrlConfig, ExternalUrlConfig } from '../external_url';
import { Router } from './router';

const logger = loggingSystemMock.create();
const env = Env.createDefault(REPO_ROOT, getEnvOptions());
const coreId = Symbol();

const createConfigService = (value: Partial<HttpConfigType> = {}) => {
  const configService = new ConfigService(
    {
      getConfig$: () =>
        new BehaviorSubject({
          server: value,
        }),
    },
    env,
    logger
  );
  configService.setSchema(config.path, config.schema);
  configService.setSchema(cspConfig.path, cspConfig.schema);
  configService.setSchema(externalUrlConfig.path, externalUrlConfig.schema);
  return configService;
};
const contextPreboot = contextServiceMock.createPrebootContract();
const contextSetup = contextServiceMock.createSetupContract();

const prebootDeps = {
  context: contextPreboot,
};
const setupDeps = {
  context: contextSetup,
  executionContext: executionContextServiceMock.createInternalSetupContract(),
};
const fakeHapiServer = {
  start: noop,
  stop: noop,
  route: noop,
};

afterEach(() => {
  jest.clearAllMocks();
});

test('creates and sets up http server', async () => {
  const configService = createConfigService({
    host: 'example.org',
    port: 1234,
  });

  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer }),
    start: jest.fn(),
    stop: jest.fn(),
  };
  const prebootHttpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer, registerStaticDir: jest.fn() }),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mockHttpServer.mockImplementationOnce(() => prebootHttpServer);
  mockHttpServer.mockImplementationOnce(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  expect(mockHttpServer.mock.instances.length).toBe(2);

  expect(httpServer.setup).not.toHaveBeenCalled();
  expect(prebootHttpServer.setup).not.toHaveBeenCalled();

  await service.preboot(prebootDeps);
  expect(httpServer.setup).not.toHaveBeenCalled();
  expect(httpServer.start).not.toHaveBeenCalled();

  expect(prebootHttpServer.setup).toHaveBeenCalled();
  expect(prebootHttpServer.start).toHaveBeenCalled();

  await service.setup(setupDeps);
  expect(httpServer.setup).toHaveBeenCalled();
  expect(httpServer.start).not.toHaveBeenCalled();
  expect(prebootHttpServer.stop).not.toHaveBeenCalled();

  await service.start();
  expect(httpServer.start).toHaveBeenCalled();
  expect(prebootHttpServer.stop).toHaveBeenCalled();
});

test('spins up `preboot` server until started if configured with `autoListen:true`', async () => {
  const configService = createConfigService();
  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({}),
    start: jest.fn(),
    stop: jest.fn(),
  };
  const prebootHapiServer = {
    start: jest.fn(),
    stop: jest.fn(),
    route: jest.fn(),
  };

  mockHttpServer
    .mockImplementationOnce(() => ({
      setup: () => ({ server: prebootHapiServer, registerStaticDir: jest.fn() }),
      start: jest.fn(),
      stop: jest.fn().mockImplementation(() => prebootHapiServer.stop()),
    }))
    .mockImplementationOnce(() => httpServer);

  const service = new HttpService({
    coreId,
    configService,
    env: Env.createDefault(REPO_ROOT, getEnvOptions()),
    logger,
  });

  await service.preboot(prebootDeps);

  const mockResponse: any = {
    code: jest.fn().mockImplementation(() => mockResponse),
    header: jest.fn().mockImplementation(() => mockResponse),
  };
  const mockResponseToolkit = {
    response: jest.fn().mockReturnValue(mockResponse),
  };

  const [[{ handler }]] = prebootHapiServer.route.mock.calls;
  const response503 = await handler(httpServerMock.createRawRequest(), mockResponseToolkit);
  expect(response503).toBe(mockResponse);
  expect({
    body: mockResponseToolkit.response.mock.calls,
    code: mockResponse.code.mock.calls,
    header: mockResponse.header.mock.calls,
  }).toMatchSnapshot('503 response');

  await service.setup(setupDeps);
  await service.start();

  expect(httpServer.start).toBeCalledTimes(1);
  expect(prebootHapiServer.stop).toBeCalledTimes(1);
});

test('logs error if already set up', async () => {
  const configService = createConfigService();

  mockHttpServer.mockImplementationOnce(() => ({
    setup: () => ({
      server: { start: jest.fn(), stop: jest.fn(), route: jest.fn() },
      registerStaticDir: jest.fn(),
    }),
    start: noop,
    stop: noop,
  }));

  const httpServer = {
    isListening: () => true,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer }),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  await service.preboot(prebootDeps);
  await service.setup(setupDeps);

  expect(loggingSystemMock.collect(logger).warn).toMatchSnapshot();
});

test('stops http server', async () => {
  const configService = createConfigService();

  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer }),
    start: noop,
    stop: jest.fn(),
  };
  const prebootHttpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer, registerStaticDir: jest.fn() }),
    start: noop,
    stop: jest.fn(),
  };
  mockHttpServer.mockImplementationOnce(() => prebootHttpServer);
  mockHttpServer.mockImplementationOnce(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  await service.preboot(prebootDeps);
  await service.setup(setupDeps);
  await service.start();

  expect(httpServer.stop).toHaveBeenCalledTimes(0);
  expect(prebootHttpServer.stop).toHaveBeenCalledTimes(1);

  await service.stop();

  expect(httpServer.stop).toHaveBeenCalledTimes(1);
});

test('stops `preboot` server if it is running', async () => {
  const configService = createConfigService();
  const mockHapiServer = {
    start: jest.fn(),
    stop: jest.fn(),
    route: jest.fn(),
  };
  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: mockHapiServer, registerStaticDir: jest.fn() }),
    start: noop,
    stop: jest.fn().mockImplementation(() => mockHapiServer.stop()),
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  await service.preboot(prebootDeps);

  await service.stop();

  expect(mockHapiServer.stop).toHaveBeenCalledTimes(2);
});

test('does not try to stop `preboot` server if it has been already stopped', async () => {
  const prebootHttpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer, registerStaticDir: jest.fn() }),
    start: noop,
    stop: jest.fn(),
  };
  const standardHttpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer }),
    start: noop,
    stop: jest.fn(),
  };

  mockHttpServer
    .mockImplementationOnce(() => prebootHttpServer)
    .mockImplementationOnce(() => standardHttpServer);

  const service = new HttpService({ coreId, configService: createConfigService(), env, logger });
  await service.preboot(prebootDeps);
  await service.setup(setupDeps);

  expect(prebootHttpServer.stop).not.toHaveBeenCalled();
  expect(standardHttpServer.stop).not.toHaveBeenCalled();

  await service.start();

  expect(prebootHttpServer.stop).toHaveBeenCalledTimes(1);
  expect(standardHttpServer.stop).not.toHaveBeenCalled();

  await service.stop();

  expect(prebootHttpServer.stop).toHaveBeenCalledTimes(1);
  expect(standardHttpServer.stop).toHaveBeenCalledTimes(1);
});

test('register route handler', async () => {
  const configService = createConfigService();

  mockHttpServer.mockImplementationOnce(() => ({
    setup: () => ({
      server: { start: jest.fn(), stop: jest.fn(), route: jest.fn() },
      registerStaticDir: jest.fn(),
    }),
    start: noop,
    stop: noop,
  }));

  const registerRouterMock = jest.fn();
  const httpServer = {
    isListening: () => false,
    setup: jest
      .fn()
      .mockReturnValue({ server: fakeHapiServer, registerRouter: registerRouterMock }),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  await service.preboot(prebootDeps);
  const { createRouter } = await service.setup(setupDeps);
  const router = createRouter('/foo');

  expect(registerRouterMock).toHaveBeenCalledTimes(1);
  expect(registerRouterMock).toHaveBeenLastCalledWith(router);
});

test('register preboot route handler on preboot', async () => {
  const registerRouterMock = jest.fn();
  mockHttpServer.mockImplementationOnce(() => ({
    setup: () => ({
      server: { start: jest.fn(), stop: jest.fn(), route: jest.fn() },
      registerStaticDir: jest.fn(),
      registerRouterAfterListening: registerRouterMock,
    }),
    start: noop,
    stop: noop,
  }));

  const service = new HttpService({ coreId, configService: createConfigService(), env, logger });

  const registerRoutesMock = jest.fn();
  const { registerRoutes } = await service.preboot(prebootDeps);
  registerRoutes('some-path', registerRoutesMock);

  expect(registerRoutesMock).toHaveBeenCalledTimes(1);
  expect(registerRoutesMock).toHaveBeenCalledWith(expect.any(Router));

  const [[router]] = registerRoutesMock.mock.calls;
  expect(registerRouterMock).toHaveBeenCalledTimes(1);
  expect(registerRouterMock).toHaveBeenCalledWith(router);
});

test('register preboot route handler on setup', async () => {
  const registerRouterMock = jest.fn();
  mockHttpServer
    .mockImplementationOnce(() => ({
      setup: () => ({
        server: { start: jest.fn(), stop: jest.fn(), route: jest.fn() },
        registerStaticDir: jest.fn(),
        registerRouterAfterListening: registerRouterMock,
      }),
      start: noop,
      stop: noop,
    }))
    .mockImplementationOnce(() => ({ setup: () => ({ server: {} }), start: noop, stop: noop }));

  const service = new HttpService({ coreId, configService: createConfigService(), env, logger });
  await service.preboot(prebootDeps);

  const registerRoutesMock = jest.fn();
  const { registerPrebootRoutes } = await service.setup(setupDeps);
  registerPrebootRoutes('some-path', registerRoutesMock);

  expect(registerRoutesMock).toHaveBeenCalledTimes(1);
  expect(registerRoutesMock).toHaveBeenCalledWith(expect.any(Router));

  const [[router]] = registerRoutesMock.mock.calls;
  expect(registerRouterMock).toHaveBeenCalledTimes(1);
  expect(registerRouterMock).toHaveBeenCalledWith(router);
});

test('returns `preboot` http server contract on preboot', async () => {
  const configService = createConfigService();
  const httpServer = {
    server: fakeHapiServer,
    registerStaticDir: jest.fn(),
    auth: Symbol('auth'),
    basePath: Symbol('basePath'),
    csp: Symbol('csp'),
    getServerInfo: jest.fn(),
  };

  mockHttpServer.mockImplementation(() => ({
    isListening: () => false,
    setup: jest.fn().mockReturnValue(httpServer),
    start: noop,
    stop: noop,
  }));

  const service = new HttpService({ coreId, configService, env, logger });
  await expect(service.preboot(prebootDeps)).resolves.toMatchObject({
    auth: httpServer.auth,
    basePath: httpServer.basePath,
    csp: httpServer.csp,
    externalUrl: expect.any(ExternalUrlConfig),
    registerRouteHandlerContext: expect.any(Function),
    registerRoutes: expect.any(Function),
    registerStaticDir: expect.any(Function),
    getServerInfo: expect.any(Function),
  });
});

test('returns http server contract on setup', async () => {
  const configService = createConfigService();
  const httpServer = { server: fakeHapiServer, options: { someOption: true } };

  mockHttpServer.mockImplementationOnce(() => ({
    setup: () => ({
      server: { start: jest.fn(), stop: jest.fn(), route: jest.fn() },
      registerStaticDir: jest.fn(),
    }),
    start: noop,
    stop: noop,
  }));

  mockHttpServer.mockImplementation(() => ({
    isListening: () => false,
    setup: jest.fn().mockReturnValue(httpServer),
    start: noop,
    stop: noop,
  }));

  const service = new HttpService({ coreId, configService, env, logger });
  await service.preboot(prebootDeps);
  const setupContract = await service.setup(setupDeps);
  expect(setupContract).toMatchObject(httpServer);
  expect(setupContract).toMatchObject({
    createRouter: expect.any(Function),
    registerPrebootRoutes: expect.any(Function),
  });
});

test('does not start http server if configured with `autoListen:false`', async () => {
  const configService = createConfigService({
    autoListen: false,
  });
  mockHttpServer.mockImplementationOnce(() => ({
    setup: () => ({
      server: { start: jest.fn(), stop: jest.fn(), route: jest.fn() },
      registerStaticDir: jest.fn(),
    }),
    start: noop,
    stop: noop,
  }));
  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({}),
    start: jest.fn(),
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({
    coreId,
    configService,
    env: Env.createDefault(REPO_ROOT, getEnvOptions()),
    logger,
  });

  await service.preboot(prebootDeps);
  await service.setup(setupDeps);
  await service.start();

  expect(httpServer.start).not.toHaveBeenCalled();
});
