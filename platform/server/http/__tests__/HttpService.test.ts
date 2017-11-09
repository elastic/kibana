const mockHttpServer = jest.fn();

jest.mock('../HttpServer', () => ({
  HttpServer: mockHttpServer
}));

import { noop } from 'lodash';
import { BehaviorSubject } from '@elastic/kbn-observable';

import { Env } from '../../../config/Env';
import { HttpService } from '../HttpService';
import { HttpConfig } from '../HttpConfig';
import { Router } from '../Router';
import { logger } from '../../../logging/__mocks__';

beforeEach(() => {
  logger._clear();
  mockHttpServer.mockClear();
});

test('creates an http server', () => {
  const config = {} as HttpConfig;

  const config$ = new BehaviorSubject(config);

  new HttpService(config$.asObservable(), logger, new Env('/kibana', {}));

  expect(mockHttpServer.mock.instances.length).toBe(1);
});

test('starts http server', async () => {
  const config = {
    port: 1234,
    host: 'example.org'
  } as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    start: jest.fn(),
    stop: noop
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(
    config$.asObservable(),
    logger,
    new Env('/kibana', {})
  );

  await service.start();

  expect(httpServer.start).toHaveBeenCalledTimes(1);
});

test('logs error is already started', async () => {
  const config = {} as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => true,
    start: noop,
    stop: noop
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(
    config$.asObservable(),
    logger,
    new Env('/kibana', {})
  );

  await service.start();

  expect(logger._collect()).toMatchSnapshot();
});

test('stops http server', async () => {
  const config = {} as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => false,
    start: noop,
    stop: jest.fn()
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(
    config$.asObservable(),
    logger,
    new Env('/kibana', {})
  );

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
    start: noop,
    stop: noop,
    registerRouter: jest.fn()
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(
    config$.asObservable(),
    logger,
    new Env('/kibana', {})
  );

  const router = new Router('/foo');
  service.registerRouter(router);

  expect(httpServer.registerRouter).toHaveBeenCalledTimes(1);
  expect(httpServer.registerRouter).toHaveBeenLastCalledWith(router);
  expect(logger._collect()).toMatchSnapshot();
});

test('throws if registering route handler after http server is started', () => {
  const config = {} as HttpConfig;

  const config$ = new BehaviorSubject(config);

  const httpServer = {
    isListening: () => true,
    start: noop,
    stop: noop,
    registerRouter: jest.fn()
  };
  mockHttpServer.mockImplementation(() => httpServer);

  const service = new HttpService(
    config$.asObservable(),
    logger,
    new Env('/kibana', {})
  );

  const router = new Router('/foo');
  service.registerRouter(router);

  expect(httpServer.registerRouter).toHaveBeenCalledTimes(0);
  expect(logger._collect()).toMatchSnapshot();
});
