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
import { HttpConfig, HttpService, Router } from '.';
import { loggingServiceMock } from '../logging/logging_service.mock';

const logger = loggingServiceMock.create();

afterEach(() => {
  jest.clearAllMocks();
});

test('creates and sets up http server', async () => {
  const config = {
    host: 'example.org',
    port: 1234,
    ssl: {},
  } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    setup: jest.fn(),
    start: jest.fn(),
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  expect(mockHttpServer.mock.instances.length).toBe(1);

  expect(httpServer.setup).not.toHaveBeenCalled();
  expect(httpServer.start).not.toHaveBeenCalled();

  await service.setup();
  expect(httpServer.setup).toHaveBeenCalledTimes(1);

  await service.start();
  expect(httpServer.start).toHaveBeenCalledTimes(1);
});

test('logs error if already set up', async () => {
  const config = { ssl: {} } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => true,
    setup: jest.fn(),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  await service.setup();

  expect(loggingServiceMock.collect(logger)).toMatchSnapshot();
});

test('stops http server', async () => {
  const config = { ssl: {} } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    setup: noop,
    start: noop,
    stop: jest.fn(),
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  await service.setup();

  expect(httpServer.stop).toHaveBeenCalledTimes(0);

  await service.stop();

  expect(httpServer.stop).toHaveBeenCalledTimes(1);
});

test('register route handler', async () => {
  const config = {} as HttpConfig;
  const config$ = new BehaviorSubject(config);

  const registerRouterMock = jest.fn();
  const httpServer = {
    isListening: () => false,
    setup: () => ({ registerRouter: registerRouterMock }),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  const router = new Router('/foo');
  const { registerRouter } = await service.setup();
  registerRouter(router);

  expect(registerRouterMock).toHaveBeenCalledTimes(1);
  expect(registerRouterMock).toHaveBeenLastCalledWith(router);
});

test('returns http server contract on setup', async () => {
  const httpServer = {
    server: {},
    options: { someOption: true },
  };

  mockHttpServer.mockImplementation(() => ({
    isListening: () => false,
    start: jest.fn().mockReturnValue(httpServer),
    stop: noop,
  }));

  const service = new HttpService(new BehaviorSubject({ ssl: {} } as HttpConfig), logger);

  expect(await service.start()).toBe(httpServer);
});
