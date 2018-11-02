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

import { Server } from 'net';

import { LegacyPlatformProxy } from './legacy_platform_proxy';

let server: jest.Mocked<Server>;
let proxy: LegacyPlatformProxy;
beforeEach(() => {
  server = {
    addListener: jest.fn(),
    address: jest
      .fn()
      .mockReturnValue({ port: 1234, family: 'test-family', address: 'test-address' }),
    getConnections: jest.fn(),
  } as any;
  proxy = new LegacyPlatformProxy({ debug: jest.fn() } as any, server);
});

test('correctly redirects server events.', () => {
  for (const eventName of ['clientError', 'close', 'connection', 'error', 'listening', 'upgrade']) {
    expect(server.addListener).toHaveBeenCalledWith(eventName, expect.any(Function));

    const listener = jest.fn();
    proxy.addListener(eventName, listener);

    // Emit several events, to make sure that server is not being listened with `once`.
    const [, serverListener] = server.addListener.mock.calls.find(
      ([serverEventName]) => serverEventName === eventName
    )!;

    serverListener(1, 2, 3, 4);
    serverListener(5, 6, 7, 8);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(1, 2, 3, 4);

    proxy.removeListener(eventName, listener);
  }
});

test('returns `address` from the underlying server.', () => {
  expect(proxy.address()).toEqual({
    address: 'test-address',
    family: 'test-family',
    port: 1234,
  });
});

test('`listen` calls callback immediately.', async () => {
  const onListenComplete = jest.fn();

  await proxy.listen(1234, 'host-1', onListenComplete);

  expect(onListenComplete).toHaveBeenCalledTimes(1);
});

test('`close` calls callback immediately.', async () => {
  const onCloseComplete = jest.fn();

  await proxy.close(onCloseComplete);

  expect(onCloseComplete).toHaveBeenCalledTimes(1);
});

test('returns connection count from the underlying server.', () => {
  server.getConnections.mockImplementation(callback => callback(null, 0));
  const onGetConnectionsComplete = jest.fn();
  proxy.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(null, 0);
  onGetConnectionsComplete.mockReset();

  server.getConnections.mockImplementation(callback => callback(null, 100500));
  proxy.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(null, 100500);
});
