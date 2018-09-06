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

import cluster from 'cluster';

import Worker from './worker';
import Log from '../log';

const workersToShutdown = [];

function assertListenerAdded(emitter, event) {
  expect(emitter.on).toHaveBeenCalledWith(event, expect.any(Function));
}

function assertListenerRemoved(emitter, event) {
  const [, onEventListener] = emitter.on.mock.calls.find(([eventName]) => {
    return eventName === event;
  });
  expect(emitter.removeListener).toHaveBeenCalledWith(event, onEventListener);
}

function setup(opts = {}) {
  const worker = new Worker({
    log: new Log(false, true),
    ...opts,
    baseArgv: []
  });

  workersToShutdown.push(worker);
  return worker;
}

describe('CLI cluster manager', () => {
  afterEach(async () => {
    while(workersToShutdown.length > 0) {
      const worker = workersToShutdown.pop();
      // If `fork` exists we should set `exitCode` to the non-zero value to
      // prevent worker from auto restart.
      if (worker.fork) {
        worker.fork.exitCode = 1;
      }

      await worker.shutdown();
    }

    cluster.fork.mockClear();
  });

  describe('#onChange', () => {
    describe('opts.watch = true', () => {
      test('restarts the fork', () => {
        const worker = setup({ watch: true });
        jest.spyOn(worker, 'start').mockImplementation(() => {});
        worker.onChange('/some/path');
        expect(worker.changes).toEqual(['/some/path']);
        expect(worker.start).toHaveBeenCalledTimes(1);
      });
    });

    describe('opts.watch = false', () => {
      test('does not restart the fork', () => {
        const worker = setup({ watch: false });
        jest.spyOn(worker, 'start').mockImplementation(() => {});
        worker.onChange('/some/path');
        expect(worker.changes).toEqual([]);
        expect(worker.start).not.toHaveBeenCalled();
      });
    });
  });

  describe('#shutdown', () => {
    describe('after starting()', () => {
      test('kills the worker and unbinds from message, online, and disconnect events', async () => {
        const worker = setup();
        await worker.start();
        expect(worker).toHaveProperty('online', true);
        const fork = worker.fork;
        expect(fork.process.kill).not.toHaveBeenCalled();
        assertListenerAdded(fork, 'message');
        assertListenerAdded(fork, 'online');
        assertListenerAdded(fork, 'disconnect');
        worker.shutdown();
        expect(fork.process.kill).toHaveBeenCalledTimes(1);
        assertListenerRemoved(fork, 'message');
        assertListenerRemoved(fork, 'online');
        assertListenerRemoved(fork, 'disconnect');
      });
    });

    describe('before being started', () => {
      test('does nothing', () => {
        const worker = setup();
        worker.shutdown();
      });
    });
  });

  describe('#parseIncomingMessage()', () => {
    describe('on a started worker', () => {
      test(`is bound to fork's message event`, async () => {
        const worker = setup();
        await worker.start();
        expect(worker.fork.on).toHaveBeenCalledWith('message', expect.any(Function));
      });
    });

    describe('do after', () => {
      test('ignores non-array messages', () => {
        const worker = setup();
        worker.parseIncomingMessage('some string thing');
        worker.parseIncomingMessage(0);
        worker.parseIncomingMessage(null);
        worker.parseIncomingMessage(undefined);
        worker.parseIncomingMessage({ like: 'an object' });
        worker.parseIncomingMessage(/weird/);
      });

      test('calls #onMessage with message parts', () => {
        const worker = setup();
        jest.spyOn(worker, 'onMessage').mockImplementation(() => {});
        worker.parseIncomingMessage([10, 100, 1000, 10000]);
        expect(worker.onMessage).toHaveBeenCalledWith(10, 100, 1000, 10000);
      });
    });
  });

  describe('#onMessage', () => {
    describe('when sent WORKER_BROADCAST message', () => {
      test('emits the data to be broadcasted', () => {
        const worker = setup();
        const data = {};
        jest.spyOn(worker, 'emit').mockImplementation(() => {});
        worker.onMessage('WORKER_BROADCAST', data);
        expect(worker.emit).toHaveBeenCalledWith('broadcast', data);
      });
    });

    describe('when sent WORKER_LISTENING message', () => {
      test('sets the listening flag and emits the listening event', () => {
        const worker = setup();
        jest.spyOn(worker, 'emit').mockImplementation(() => {});
        expect(worker).toHaveProperty('listening', false);
        worker.onMessage('WORKER_LISTENING');
        expect(worker).toHaveProperty('listening', true);
        expect(worker.emit).toHaveBeenCalledWith('listening');
      });
    });

    describe('when passed an unknown message', () => {
      test('does nothing', () => {
        const worker = setup();
        worker.onMessage('asdlfkajsdfahsdfiohuasdofihsdoif');
        worker.onMessage({});
        worker.onMessage(23049283094);
      });
    });
  });

  describe('#start', () => {
    describe('when not started', () => {
      test('creates a fork and waits for it to come online', async () => {
        const worker = setup();

        jest.spyOn(worker, 'on');

        await worker.start();

        expect(cluster.fork).toHaveBeenCalledTimes(1);
        expect(worker.on).toHaveBeenCalledWith('fork:online', expect.any(Function));
      });

      test('listens for cluster and process "exit" events', async () => {
        const worker = setup();

        jest.spyOn(process, 'on');
        jest.spyOn(cluster, 'on');

        await worker.start();

        expect(cluster.on).toHaveBeenCalledTimes(1);
        expect(cluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
        expect(process.on).toHaveBeenCalledTimes(1);
        expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function));
      });
    });

    describe('when already started', () => {
      test('calls shutdown and waits for the graceful shutdown to cause a restart', async () => {
        const worker = setup();
        await worker.start();

        jest.spyOn(worker, 'shutdown');
        jest.spyOn(worker, 'on');

        worker.start();

        expect(worker.shutdown).toHaveBeenCalledTimes(1);
        expect(worker.on).toHaveBeenCalledWith('online', expect.any(Function));
      });
    });
  });
});
