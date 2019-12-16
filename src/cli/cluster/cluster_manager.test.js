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

import { mockCluster } from './__mocks__/cluster';
jest.mock('cluster', () => mockCluster());
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    on: jest.fn(),
    prompt: jest.fn(),
    setPrompt: jest.fn(),
  })),
}));

import cluster from 'cluster';
import { sample } from 'lodash';

import ClusterManager from './cluster_manager';
import Worker from './worker';

describe('CLI cluster manager', () => {
  beforeEach(() => {
    cluster.fork.mockImplementation(() => {
      return {
        process: {
          kill: jest.fn(),
        },
        isDead: jest.fn().mockReturnValue(false),
        off: jest.fn(),
        on: jest.fn(),
        send: jest.fn(),
      };
    });
  });

  afterEach(() => {
    cluster.fork.mockReset();
  });

  test('has two workers', () => {
    const manager = ClusterManager.create({});

    expect(manager.workers).toHaveLength(2);
    for (const worker of manager.workers) expect(worker).toBeInstanceOf(Worker);

    expect(manager.optimizer).toBeInstanceOf(Worker);
    expect(manager.server).toBeInstanceOf(Worker);
  });

  test('delivers broadcast messages to other workers', () => {
    const manager = ClusterManager.create({});

    for (const worker of manager.workers) {
      Worker.prototype.start.call(worker); // bypass the debounced start method
      worker.onOnline();
    }

    const football = {};
    const messenger = sample(manager.workers);

    messenger.emit('broadcast', football);
    for (const worker of manager.workers) {
      if (worker === messenger) {
        expect(worker.fork.send).not.toHaveBeenCalled();
      } else {
        expect(worker.fork.send).toHaveBeenCalledTimes(1);
        expect(worker.fork.send).toHaveBeenCalledWith(football);
      }
    }
  });

  describe('interaction with BasePathProxy', () => {
    test('correctly configures `BasePathProxy`.', async () => {
      const basePathProxyMock = { start: jest.fn() };

      ClusterManager.create({}, {}, basePathProxyMock);

      expect(basePathProxyMock.start).toHaveBeenCalledWith({
        shouldRedirectFromOldBasePath: expect.any(Function),
        blockUntil: expect.any(Function),
      });
    });

    describe('proxy is configured with the correct `shouldRedirectFromOldBasePath` and `blockUntil` functions.', () => {
      let clusterManager;
      let shouldRedirectFromOldBasePath;
      let blockUntil;
      beforeEach(async () => {
        const basePathProxyMock = { start: jest.fn() };

        clusterManager = ClusterManager.create({}, {}, basePathProxyMock);

        jest.spyOn(clusterManager.server, 'on');
        jest.spyOn(clusterManager.server, 'off');

        [[{ blockUntil, shouldRedirectFromOldBasePath }]] = basePathProxyMock.start.mock.calls;
      });

      test('`shouldRedirectFromOldBasePath()` returns `false` for unknown paths.', () => {
        expect(shouldRedirectFromOldBasePath('')).toBe(false);
        expect(shouldRedirectFromOldBasePath('some-path/')).toBe(false);
        expect(shouldRedirectFromOldBasePath('some-other-path')).toBe(false);
      });

      test('`shouldRedirectFromOldBasePath()` returns `true` for `app` and other known paths.', () => {
        expect(shouldRedirectFromOldBasePath('app/')).toBe(true);
        expect(shouldRedirectFromOldBasePath('login')).toBe(true);
        expect(shouldRedirectFromOldBasePath('logout')).toBe(true);
        expect(shouldRedirectFromOldBasePath('status')).toBe(true);
      });

      test('`blockUntil()` resolves immediately if worker has already crashed.', async () => {
        clusterManager.server.crashed = true;

        await expect(blockUntil()).resolves.not.toBeDefined();
        expect(clusterManager.server.on).not.toHaveBeenCalled();
        expect(clusterManager.server.off).not.toHaveBeenCalled();
      });

      test('`blockUntil()` resolves immediately if worker is already listening.', async () => {
        clusterManager.server.listening = true;

        await expect(blockUntil()).resolves.not.toBeDefined();
        expect(clusterManager.server.on).not.toHaveBeenCalled();
        expect(clusterManager.server.off).not.toHaveBeenCalled();
      });

      test('`blockUntil()` resolves when worker crashes.', async () => {
        const blockUntilPromise = blockUntil();

        expect(clusterManager.server.on).toHaveBeenCalledTimes(2);
        expect(clusterManager.server.on).toHaveBeenCalledWith('crashed', expect.any(Function));

        const [, [eventName, onCrashed]] = clusterManager.server.on.mock.calls;
        // Check event name to make sure we call the right callback,
        // in Jest 23 we could use `toHaveBeenNthCalledWith` instead.
        expect(eventName).toBe('crashed');
        expect(clusterManager.server.off).not.toHaveBeenCalled();

        onCrashed();
        await expect(blockUntilPromise).resolves.not.toBeDefined();

        expect(clusterManager.server.off).toHaveBeenCalledTimes(2);
      });

      test('`blockUntil()` resolves when worker starts listening.', async () => {
        const blockUntilPromise = blockUntil();

        expect(clusterManager.server.on).toHaveBeenCalledTimes(2);
        expect(clusterManager.server.on).toHaveBeenCalledWith('listening', expect.any(Function));

        const [[eventName, onListening]] = clusterManager.server.on.mock.calls;
        // Check event name to make sure we call the right callback,
        // in Jest 23 we could use `toHaveBeenNthCalledWith` instead.
        expect(eventName).toBe('listening');
        expect(clusterManager.server.off).not.toHaveBeenCalled();

        onListening();
        await expect(blockUntilPromise).resolves.not.toBeDefined();

        expect(clusterManager.server.off).toHaveBeenCalledTimes(2);
      });
    });
  });
});
