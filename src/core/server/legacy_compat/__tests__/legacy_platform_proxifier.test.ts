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

import { Server as HapiServer } from 'hapi-latest';
import { Server } from 'net';
import { LegacyPlatformProxifier } from '..';
import { Env } from '../../config';
import { getEnvOptions } from '../../config/__tests__/__mocks__/env';
import { logger } from '../../logging/__mocks__';

let server: jest.Mocked<Server>;
let mockHapiServer: jest.Mocked<HapiServer>;
let root: any;
let proxifier: LegacyPlatformProxifier;
beforeEach(() => {
  server = {
    addListener: jest.fn(),
    address: jest
      .fn()
      .mockReturnValue({ port: 1234, family: 'test-family', address: 'test-address' }),
    getConnections: jest.fn(),
  } as any;

  mockHapiServer = { listener: server, route: jest.fn() } as any;

  root = {
    logger,
    shutdown: jest.fn(),
    start: jest.fn(),
  } as any;

  const env = new Env('/kibana', getEnvOptions());
  proxifier = new LegacyPlatformProxifier(root, env);
  env.legacy.emit('connection', {
    server: mockHapiServer,
    options: { someOption: 'foo', someAnotherOption: 'bar' },
  });
});

test('correctly binds to the server.', () => {
  expect(mockHapiServer.route.mock.calls).toMatchSnapshot('proxy route options');
  expect(server.addListener).toHaveBeenCalledTimes(6);
  for (const eventName of ['clientError', 'close', 'connection', 'error', 'listening', 'upgrade']) {
    expect(server.addListener).toHaveBeenCalledWith(eventName, expect.any(Function));
  }
});

test('correctly redirects server events.', () => {
  for (const eventName of ['clientError', 'close', 'connection', 'error', 'listening', 'upgrade']) {
    expect(server.addListener).toHaveBeenCalledWith(eventName, expect.any(Function));

    const listener = jest.fn();
    proxifier.addListener(eventName, listener);

    // Emit several events, to make sure that server is not being listened with `once`.
    const [, serverListener] = server.addListener.mock.calls.find(
      ([serverEventName]) => serverEventName === eventName
    )!;

    serverListener(1, 2, 3, 4);
    serverListener(5, 6, 7, 8);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(listener).toHaveBeenCalledWith(5, 6, 7, 8);

    proxifier.removeListener(eventName, listener);
  }
});

test('returns `address` from the underlying server.', () => {
  expect(proxifier.address()).toEqual({
    address: 'test-address',
    family: 'test-family',
    port: 1234,
  });
});

test('`listen` starts the `root`.', async () => {
  const onListenComplete = jest.fn();

  await proxifier.listen(1234, 'host-1', onListenComplete);

  expect(root.start).toHaveBeenCalledTimes(1);
  expect(onListenComplete).toHaveBeenCalledTimes(1);
});

test('`close` shuts down the `root`.', async () => {
  const onCloseComplete = jest.fn();

  await proxifier.close(onCloseComplete);

  expect(root.shutdown).toHaveBeenCalledTimes(1);
  expect(onCloseComplete).toHaveBeenCalledTimes(1);
});

test('returns connection count from the underlying server.', () => {
  server.getConnections.mockImplementation(callback => callback(null, 0));
  const onGetConnectionsComplete = jest.fn();
  proxifier.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(null, 0);
  onGetConnectionsComplete.mockReset();

  server.getConnections.mockImplementation(callback => callback(null, 100500));
  proxifier.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(null, 100500);
});

test('proxy route abandons request processing and forwards it to the legacy Kibana', async () => {
  const mockResponseToolkit = { response: jest.fn(), abandon: Symbol('abandon') };
  const mockRequest = { raw: { req: { a: 1 }, res: { b: 2 } } };

  const onRequest = jest.fn();
  proxifier.addListener('request', onRequest);

  const [[{ handler }]] = mockHapiServer.route.mock.calls;
  const response = await handler(mockRequest, mockResponseToolkit);

  expect(response).toBe(mockResponseToolkit.abandon);
  expect(mockResponseToolkit.response).not.toHaveBeenCalled();

  // Make sure request hasn't been passed to the legacy platform.
  expect(onRequest).toHaveBeenCalledTimes(1);
  expect(onRequest).toHaveBeenCalledWith(mockRequest.raw.req, mockRequest.raw.res);
});
