import { EventEmitter } from 'events';
import { IncomingMessage, ServerResponse } from 'http';

class mockNetServer extends EventEmitter {
  address() {
    return { port: 1234, family: 'test-family', address: 'test-address' };
  }

  getConnections(callback: (error: Error, count: number) => void) {
    callback(undefined, 100500);
  }
}
jest.mock('net', () => ({
  Server: jest.fn(() => new mockNetServer())
}));

import { LegacyPlatformProxifier } from '..';
import { Server } from 'net';

let root: any;
let proxifier: LegacyPlatformProxifier;
beforeEach(() => {
  root = {
    start: jest.fn(),
    shutdown: jest.fn(),
    logger: {
      get: jest.fn(() => ({
        info: jest.fn(),
        debug: jest.fn()
      }))
    }
  } as any;

  proxifier = new LegacyPlatformProxifier(root);
});

test('correctly binds to the server.', () => {
  const server = new Server();
  jest.spyOn(server, 'addListener');
  proxifier.bind(server);

  expect(server.addListener).toHaveBeenCalledTimes(4);
  for (const eventName of ['listening', 'error', 'clientError', 'connection']) {
    expect(server.addListener).toHaveBeenCalledWith(
      eventName,
      expect.any(Function)
    );
  }
});

test('correctly binds to the server and redirects its events.', () => {
  const server = new Server();
  proxifier.bind(server);

  const eventsAndListeners = new Map(
    ['listening', 'error', 'clientError', 'connection'].map(eventName => {
      const listener = jest.fn();
      proxifier.addListener(eventName, listener);

      return [eventName, listener];
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
  const previousServer = new Server();
  proxifier.bind(previousServer);

  const currentServer = new Server();
  proxifier.bind(currentServer);

  const eventsAndListeners = new Map(
    ['listening', 'error', 'clientError', 'connection'].map(eventName => {
      const listener = jest.fn();
      proxifier.addListener(eventName, listener);

      return [eventName, listener];
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

  proxifier.bind(new Server());

  expect(proxifier.address()).toEqual({
    port: 1234,
    family: 'test-family',
    address: 'test-address'
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
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(undefined, 0);
  onGetConnectionsComplete.mockReset();

  proxifier.bind(new Server());
  proxifier.getConnections(onGetConnectionsComplete);

  expect(onGetConnectionsComplete).toHaveBeenCalledTimes(1);
  expect(onGetConnectionsComplete).toHaveBeenCalledWith(undefined, 100500);
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
