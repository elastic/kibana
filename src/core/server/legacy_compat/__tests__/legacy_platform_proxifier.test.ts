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

import { EventEmitter } from 'events';
import { IncomingMessage, ServerResponse } from 'http';

class MockNetServer extends EventEmitter {
  public address() {
    return { port: 1234, family: 'test-family', address: 'test-address' };
  }

  public getConnections(callback: (error: Error | null, count: number) => void) {
    callback(null, 100500);
  }
}

function mockNetServer() {
  return new MockNetServer();
}

jest.mock('net', () => ({
  createServer: jest.fn(() => mockNetServer()),
}));

import { createServer } from 'net';
import { LegacyPlatformProxifier } from '..';

let root: any;
let proxifier: LegacyPlatformProxifier;
beforeEach(() => {
  root = {
    logger: {
      get: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
      })),
    },
    shutdown: jest.fn(),
    start: jest.fn(),
  } as any;

  proxifier = new LegacyPlatformProxifier(root);
});

test('correctly binds to the server.', () => {
  const server = createServer();
  jest.spyOn(server, 'addListener');
  proxifier.bind(server);

  expect(server.addListener).toHaveBeenCalledTimes(4);
  for (const eventName of ['listening', 'error', 'clientError', 'connection']) {
    expect(server.addListener).toHaveBeenCalledWith(eventName, expect.any(Function));
  }
});

test('correctly binds to the server and redirects its events.', () => {
  const server = createServer();
  proxifier.bind(server);

  const eventsAndListeners = new Map(
    ['listening', 'error', 'clientError', 'connection'].map(eventName => {
      const listener = jest.fn();
      proxifier.addListener(eventName, listener);

      return [eventName, listener] as [string, () => void];
    })
  );

  for (const [eventName, listener] of eventsAndListeners) {
    expect(listener).not.toHaveBeenCalled();

    // Emit several events, to make sure that server is not being listened with `once`.
    server.emit(eventName, 1, 2, 3, 4);
    server.emit(eventName, 5, 6, 7, 8);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(listener).toHaveBeenCalledWith(5, 6, 7, 8);
  }
});

test('correctly unbinds from the previous server.', () => {
  const previousServer = createServer();
  proxifier.bind(previousServer);

  const currentServer = createServer();
  proxifier.bind(currentServer);

  const eventsAndListeners = new Map(
    ['listening', 'error', 'clientError', 'connection'].map(eventName => {
      const listener = jest.fn();
      proxifier.addListener(eventName, listener);

      return [eventName, listener] as [string, () => void];
    })
  );

  // Any events from the previous server should not be forwarded.
  for (const [eventName, listener] of eventsAndListeners) {
    // `error` event is a special case in node, if `error` is emitted, but
    // there is no listener for it error will be thrown.
    if (eventName === 'error') {
      expect(() =>
        previousServer.emit(eventName, new Error('Some error'))
      ).toThrowErrorMatchingSnapshot();
    } else {
      previousServer.emit(eventName, 1, 2, 3, 4);
    }

    expect(listener).not.toHaveBeenCalled();
  }

  // Only events from the last server should be forwarded.
  for (const [eventName, listener] of eventsAndListeners) {
    expect(listener).not.toHaveBeenCalled();

    currentServer.emit(eventName, 1, 2, 3, 4);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 2, 3, 4);
  }
});

test('returns `address` from the underlying server.', () => {
  expect(proxifier.address()).toBeUndefined();

  proxifier.bind(createServer());

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
  const onGetConnectionsComplete = jest.fn();

  proxifier.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(null, 0);
  onGetConnectionsComplete.mockReset();

  proxifier.bind(createServer());
  proxifier.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(null, 100500);
});

test('correctly proxies request and response objects.', () => {
  const onRequest = jest.fn();
  proxifier.addListener('request', onRequest);

  const request = {} as IncomingMessage;
  const response = {} as ServerResponse;
  proxifier.proxy(request, response);

  expect(onRequest).toHaveBeenCalledTimes(1);
  expect(onRequest).toHaveBeenCalledWith(request, response);

  // Check that exactly same objects were passed as event arguments.
  expect(onRequest.mock.calls[0][0]).toBe(request);
  expect(onRequest.mock.calls[0][1]).toBe(response);
});
