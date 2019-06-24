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

import { mockHttpServer } from './http_service.test.mocks';

import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { HttpService, Router } from '.';
import { HttpConfigType, config } from './http_config';
import { httpServerMock } from './http_server.mocks';
import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { getEnvOptions } from '../config/__mocks__/env';

const logger = loggingServiceMock.create();
const env = Env.createDefault(getEnvOptions());

const createConfigService = (value: Partial<HttpConfigType> = {}) => {
  const configService = new ConfigService(
    new BehaviorSubject<Config>(
      new ObjectToConfigAdapter({
        server: value,
      })
    ),
    env,
    logger
  );
  configService.setSchema(config.path, config.schema);
  return configService;
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

  const service = new HttpService({ configService, env, logger });

  expect(mockHttpServer.mock.instances.length).toBe(1);

  expect(httpServer.setup).not.toHaveBeenCalled();

  await service.setup();
  expect(httpServer.setup).toHaveBeenCalled();
  expect(httpServer.start).not.toHaveBeenCalled();

  await service.start();
  expect(httpServer.start).toHaveBeenCalled();
});

test('spins up notReady server until started if configured with `autoListen:true`', async () => {
  const configService = createConfigService();
  const httpServer = {
    isListening: () => false,
    setup: jest.fn(),
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
    configService,
    env: new Env('.', getEnvOptions()),
    logger,
  });

  await service.setup();

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

// this is an integration test!
test('creates and sets up second http server', async () => {
  const configService = createConfigService({
    host: 'localhost',
    port: 1234,
  });
  const { HttpServer } = jest.requireActual('./http_server');

  mockHttpServer.mockImplementation((...args) => new HttpServer(...args));

  const service = new HttpService({ configService, env, logger });
  const serverSetup = await service.setup();
  const cfg = { port: 2345 };
  await serverSetup.createNewServer(cfg);
  const server = await service.start();
  expect(server.isListening()).toBeTruthy();
  expect(server.isListening(cfg.port)).toBeTruthy();

  try {
    await serverSetup.createNewServer(cfg);
  } catch (err) {
    expect(err.message).toBe('port 2345 is already in use');
  }

  try {
    await serverSetup.createNewServer({ port: 1234 });
  } catch (err) {
    expect(err.message).toBe('port 1234 is already in use');
  }

  try {
    await serverSetup.createNewServer({ host: 'example.org' });
  } catch (err) {
    expect(err.message).toBe('port must be defined');
  }
  await service.stop();
  expect(server.isListening()).toBeFalsy();
  expect(server.isListening(cfg.port)).toBeFalsy();
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

  const service = new HttpService({ configService, env, logger });

  await service.setup();

  expect(loggingServiceMock.collect(logger).warn).toMatchSnapshot();
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

  const service = new HttpService({ configService, env, logger });

  await service.setup();
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

  const service = new HttpService({ configService, env, logger });

  await service.setup();

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

  const service = new HttpService({ configService, env, logger });

  const router = new Router('/foo');
  const { registerRouter } = await service.setup();
  registerRouter(router);

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

  const service = new HttpService({ configService, env, logger });
  const { createNewServer, ...setupHttpServer } = await service.setup();
  expect(createNewServer).toBeDefined();
  expect(setupHttpServer).toEqual(httpServer);
});

test('does not start http server if process is dev cluster master', async () => {
  const configService = createConfigService();
  const httpServer = {
    isListening: () => false,
    setup: noop,
    start: jest.fn(),
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({
    configService,
    env: new Env('.', getEnvOptions({ isDevClusterMaster: true })),
    logger,
  });

  await service.setup();
  await service.start();

  expect(httpServer.start).not.toHaveBeenCalled();
});

test('does not start http server if configured with `autoListen:false`', async () => {
  const configService = createConfigService({
    autoListen: false,
  });
  const httpServer = {
    isListening: () => false,
    setup: noop,
    start: jest.fn(),
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService({
    configService,
    env: new Env('.', getEnvOptions()),
    logger,
  });

  await service.setup();
  await service.start();

  expect(httpServer.start).not.toHaveBeenCalled();
});
