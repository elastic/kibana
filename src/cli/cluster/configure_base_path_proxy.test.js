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

jest.mock('../../core', () => ({
  createBasePathProxy: jest.fn(),
}));

jest.mock('../../server/logging', () => ({
  setupLogging: jest.fn(),
}));

import { Server } from 'hapi';
import { createBasePathProxy as createBasePathProxyMock } from '../../core';
import { setupLogging as setupLoggingMock } from '../../server/logging';
import { configureBasePathProxy } from './configure_base_path_proxy';

describe('configureBasePathProxy()', () => {
  it('returns `BasePathProxy` instance.', async () => {
    const basePathProxyMock = { configure: jest.fn() };
    createBasePathProxyMock.mockReturnValue(basePathProxyMock);

    const basePathProxy = await configureBasePathProxy({});

    expect(basePathProxy).toBe(basePathProxyMock);
  });

  it('correctly configures `BasePathProxy`.', async () => {
    const configMock = {};
    const basePathProxyMock = { configure: jest.fn() };
    createBasePathProxyMock.mockReturnValue(basePathProxyMock);

    await configureBasePathProxy(configMock);

    // Check that logging is configured with the right parameters.
    expect(setupLoggingMock).toHaveBeenCalledWith(
      expect.any(Server),
      configMock
    );

    const [[server]] = setupLoggingMock.mock.calls;
    expect(createBasePathProxyMock).toHaveBeenCalledWith({
      config: configMock,
      server,
    });

    expect(basePathProxyMock.configure).toHaveBeenCalledWith({
      shouldRedirectFromOldBasePath: expect.any(Function),
      blockUntil: expect.any(Function),
    });
  });

  describe('configured with the correct `shouldRedirectFromOldBasePath` and `blockUntil` functions.', async () => {
    let serverWorkerMock;
    let shouldRedirectFromOldBasePath;
    let blockUntil;
    beforeEach(async () => {
      serverWorkerMock = {
        listening: false,
        crashed: false,
        on: jest.fn(),
        removeListener: jest.fn(),
      };

      const basePathProxyMock = {
        configure: jest.fn(),
        serverWorker: serverWorkerMock,
      };

      createBasePathProxyMock.mockReturnValue(basePathProxyMock);

      await configureBasePathProxy({});

      [[{ blockUntil, shouldRedirectFromOldBasePath }]] = basePathProxyMock.configure.mock.calls;
    });

    it('`shouldRedirectFromOldBasePath()` returns `false` for unknown paths.', async () => {
      expect(shouldRedirectFromOldBasePath('')).toBe(false);
      expect(shouldRedirectFromOldBasePath('some-path/')).toBe(false);
      expect(shouldRedirectFromOldBasePath('some-other-path')).toBe(false);
    });

    it('`shouldRedirectFromOldBasePath()` returns `true` for `app` and other known paths.', async () => {
      expect(shouldRedirectFromOldBasePath('app/')).toBe(true);
      expect(shouldRedirectFromOldBasePath('login')).toBe(true);
      expect(shouldRedirectFromOldBasePath('logout')).toBe(true);
      expect(shouldRedirectFromOldBasePath('status')).toBe(true);
    });

    it('`blockUntil()` resolves immediately if worker has already crashed.', async () => {
      serverWorkerMock.crashed = true;

      await expect(blockUntil()).resolves.not.toBeDefined();
      expect(serverWorkerMock.on).not.toHaveBeenCalled();
      expect(serverWorkerMock.removeListener).not.toHaveBeenCalled();
    });

    it('`blockUntil()` resolves immediately if worker is already listening.', async () => {
      serverWorkerMock.listening = true;

      await expect(blockUntil()).resolves.not.toBeDefined();
      expect(serverWorkerMock.on).not.toHaveBeenCalled();
      expect(serverWorkerMock.removeListener).not.toHaveBeenCalled();
    });

    it('`blockUntil()` resolves when worker crashes.', async () => {
      const blockUntilPromise = blockUntil();

      expect(serverWorkerMock.on).toHaveBeenCalledTimes(2);
      expect(serverWorkerMock.on).toHaveBeenCalledWith(
        'crashed',
        expect.any(Function)
      );

      const [, [eventName, onCrashed]] = serverWorkerMock.on.mock.calls;
      // Check event name to make sure we call the right callback,
      // in Jest 23 we could use `toHaveBeenNthCalledWith` instead.
      expect(eventName).toBe('crashed');
      expect(serverWorkerMock.removeListener).not.toHaveBeenCalled();

      onCrashed();
      await expect(blockUntilPromise).resolves.not.toBeDefined();

      expect(serverWorkerMock.removeListener).toHaveBeenCalledTimes(2);
    });

    it('`blockUntil()` resolves when worker starts listening.', async () => {
      const blockUntilPromise = blockUntil();

      expect(serverWorkerMock.on).toHaveBeenCalledTimes(2);
      expect(serverWorkerMock.on).toHaveBeenCalledWith(
        'listening',
        expect.any(Function)
      );

      const [[eventName, onListening]] = serverWorkerMock.on.mock.calls;
      // Check event name to make sure we call the right callback,
      // in Jest 23 we could use `toHaveBeenNthCalledWith` instead.
      expect(eventName).toBe('listening');
      expect(serverWorkerMock.removeListener).not.toHaveBeenCalled();

      onListening();
      await expect(blockUntilPromise).resolves.not.toBeDefined();

      expect(serverWorkerMock.removeListener).toHaveBeenCalledTimes(2);
    });
  });
});
