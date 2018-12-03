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

const mockHttpServer = jest.fn();

jest.mock('./http_server', () => ({
  HttpServer: mockHttpServer,
}));

import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { HttpConfig, HttpService, Router } from '.';
import { logger } from '../logging/__mocks__';

beforeEach(() => {
  logger.mockClear();
  mockHttpServer.mockClear();
});

test('creates and starts http server', async () => {
  const config = {
    host: 'example.org',
    port: 1234,
    ssl: {},
  } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    start: jest.fn(),
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  expect(mockHttpServer.mock.instances.length).toBe(1);
  expect(httpServer.start).not.toHaveBeenCalled();

  await service.start();

  expect(httpServer.start).toHaveBeenCalledTimes(1);
});

test('logs error if already started', async () => {
  const config = { ssl: {} } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => true,
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  await service.start();

  expect(logger.mockCollect()).toMatchSnapshot();
});

test('stops http server', async () => {
  const config = { ssl: {} } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    start: noop,
    stop: jest.fn(),
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  await service.start();

  expect(httpServer.stop).toHaveBeenCalledTimes(0);

  await service.stop();

  expect(httpServer.stop).toHaveBeenCalledTimes(1);
});

test('register route handler', () => {
  const config = {} as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    registerRouter: jest.fn(),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  const router = new Router('/foo');
  service.registerRouter(router);

  expect(httpServer.registerRouter).toHaveBeenCalledTimes(1);
  expect(httpServer.registerRouter).toHaveBeenLastCalledWith(router);
  expect(logger.mockCollect()).toMatchSnapshot();
});

test('throws if registering route handler after http server is started', () => {
  const config = {} as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => true,
    registerRouter: jest.fn(),
    start: noop,
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(config$.asObservable(), logger);

  const router = new Router('/foo');
  service.registerRouter(router);

  expect(httpServer.registerRouter).toHaveBeenCalledTimes(0);
  expect(logger.mockCollect()).toMatchSnapshot();
});

test('returns http server contract on start', async () => {
  const httpServerContract = {
    server: {},
    options: { someOption: true },
  };

  mockHttpServer.mockImplementation(() => ({
    isListening: () => false,
    start: jest.fn().mockReturnValue(httpServerContract),
    stop: noop,
  }));

  const service = new HttpService(new BehaviorSubject({ ssl: {} } as HttpConfig), logger);

  expect(await service.start()).toBe(httpServerContract);
});
