/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mockHttpServer } from './http_service.test.mocks';

import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { REPO_ROOT } from '@kbn/dev-utils';
import { getEnvOptions } from '../config/mocks';
import { HttpService } from '.';
import { HttpConfigType, config } from './http_config';
import { httpServerMock } from './http_server.mocks';
import { ConfigService, Env } from '../config';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { contextServiceMock } from '../context/context_service.mock';
import { config as cspConfig } from '../csp';
import { config as externalUrlConfig } from '../external_url';

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
const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
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
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  expect(mockHttpServer.mock.instances.length).toBe(1);

  expect(httpServer.setup).not.toHaveBeenCalled();

  await service.setup(setupDeps);
  expect(httpServer.setup).toHaveBeenCalled();
  expect(httpServer.start).not.toHaveBeenCalled();

  await service.start();
  expect(httpServer.start).toHaveBeenCalled();
});

test('spins up notReady server until started if configured with `autoListen:true`', async () => {
  const configService = createConfigService();
  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({}),
    start: jest.fn(),
    stop: jest.fn(),
  };
  const notReadyHapiServer = {
    start: jest.fn(),
    stop: jest.fn(),
    route: jest.fn(),
  };

  mockHttpServer
    .mockImplementationOnce(() => httpServer)
    .mockImplementationOnce(() => ({
      setup: () => ({ server: notReadyHapiServer }),
    }));

  const service = new HttpService({
    coreId,
    configService,
    env: Env.createDefault(REPO_ROOT, getEnvOptions()),
    logger,
  });

  await service.setup(setupDeps);

  const mockResponse: any = {
    code: jest.fn().mockImplementation(() => mockResponse),
    header: jest.fn().mockImplementation(() => mockResponse),
  };
  const mockResponseToolkit = {
    response: jest.fn().mockReturnValue(mockResponse),
  };

  const [[{ handler }]] = notReadyHapiServer.route.mock.calls;
  const response503 = await handler(httpServerMock.createRawRequest(), mockResponseToolkit);
  expect(response503).toBe(mockResponse);
  expect({
    body: mockResponseToolkit.response.mock.calls,
    code: mockResponse.code.mock.calls,
    header: mockResponse.header.mock.calls,
  }).toMatchSnapshot('503 response');

  await service.start();

  expect(httpServer.start).toBeCalledTimes(1);
  expect(notReadyHapiServer.stop).toBeCalledTimes(1);
});

test('logs error if already set up', async () => {
  const configService = createConfigService();

  const httpServer = {
    isListening: () => true,
    setup: jest.fn().mockReturnValue({ server: fakeHapiServer }),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

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
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  await service.setup(setupDeps);
  await service.start();

  expect(httpServer.stop).toHaveBeenCalledTimes(0);

  await service.stop();

  expect(httpServer.stop).toHaveBeenCalledTimes(1);
});

test('stops not ready server if it is running', async () => {
  const configService = createConfigService();
  const mockHapiServer = {
    start: jest.fn(),
    stop: jest.fn(),
    route: jest.fn(),
  };
  const httpServer = {
    isListening: () => false,
    setup: jest.fn().mockReturnValue({ server: mockHapiServer }),
    start: noop,
    stop: jest.fn(),
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({ coreId, configService, env, logger });

  await service.setup(setupDeps);

  await service.stop();

  expect(mockHapiServer.stop).toHaveBeenCalledTimes(1);
});

test('register route handler', async () => {
  const configService = createConfigService();

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

  const { createRouter } = await service.setup(setupDeps);
  const router = createRouter('/foo');

  expect(registerRouterMock).toHaveBeenCalledTimes(1);
  expect(registerRouterMock).toHaveBeenLastCalledWith(router);
});

test('returns http server contract on setup', async () => {
  const configService = createConfigService();
  const httpServer = { server: fakeHapiServer, options: { someOption: true } };

  mockHttpServer.mockImplementation(() => ({
    isListening: () => false,
    setup: jest.fn().mockReturnValue(httpServer),
    stop: noop,
  }));

  const service = new HttpService({ coreId, configService, env, logger });
  const setupContract = await service.setup(setupDeps);
  expect(setupContract).toMatchObject(httpServer);
  expect(setupContract).toMatchObject({
    createRouter: expect.any(Function),
  });
});

test('does not start http server if process is dev cluster master', async () => {
  const configService = createConfigService();
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
    env: Env.createDefault(REPO_ROOT, getEnvOptions({ isDevCliParent: true })),
    logger,
  });

  await service.setup(setupDeps);
  await service.start();

  expect(httpServer.start).not.toHaveBeenCalled();
});

test('does not start http server if configured with `autoListen:false`', async () => {
  const configService = createConfigService({
    autoListen: false,
  });
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

  await service.setup(setupDeps);
  await service.start();

  expect(httpServer.start).not.toHaveBeenCalled();
});
