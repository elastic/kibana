/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MockWorker } from './managed_worker.test.mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createManagedWorker } from './managed_worker';
import type { ManagedWorkerOptions } from './types';

// setImmediate stays real: the ready-timeout decision is deferred to the check phase.
const flushImmediate = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('createManagedWorker', () => {
  const logger = loggerMock.create();
  const options = (
    overrides: Partial<ManagedWorkerOptions<{ heartbeat: SharedArrayBuffer }>> = {}
  ): ManagedWorkerOptions<{ heartbeat: SharedArrayBuffer }> => ({
    name: 'diagnostic',
    entry: '/worker.js',
    workerData: { heartbeat: new SharedArrayBuffer(8) },
    resourceLimits: { maxOldGenerationSizeMb: 64 },
    logger,
    restart: { maxAttempts: 2, initialDelayMs: 100, stableUptimeMs: 1_000 },
    readyTimeoutMs: 500,
    healthIntervalMs: 50,
    onExit: jest.fn(),
    onExhausted: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.clearAllMocks();
    MockWorker.instances = [];
    MockWorker.failNextConstruction = 0;
  });
  afterEach(() => jest.useRealTimers());

  it('spawns one worker through the bootstrap on start, with the consumer options', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    expect(MockWorker.instances).toHaveLength(0);
    expect(handle.status()).toEqual({ state: 'stopped', restarts: 0 });

    handle.start();
    handle.start();
    expect(MockWorker.instances).toHaveLength(1);
    const [worker] = MockWorker.instances;
    expect(worker.entry).toMatch(/worker_bootstrap\.js$/);
    expect(worker.workerOptions).toEqual({
      name: 'diagnostic',
      resourceLimits: { maxOldGenerationSizeMb: 64 },
      workerData: { __entry: '/worker.js', __healthIntervalMs: 50, data: opts.workerData },
    });
    expect(worker.unref).toHaveBeenCalledTimes(1);
    expect(handle.status()).toMatchObject({ state: 'starting', threadId: worker.threadId });

    worker.ready();
    expect(handle.status()).toMatchObject({ state: 'running', startedAt: new Date() });

    await handle.stop();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('keeps the worker referenced when unref is false', async () => {
    const handle = createManagedWorker(options({ unref: false }));
    handle.start();
    expect(MockWorker.instances[0].unref).not.toHaveBeenCalled();
    await handle.stop();
  });

  it('reports heap usage from health messages and ignores other messages', async () => {
    const handle = createManagedWorker(options());
    handle.start();
    const [worker] = MockWorker.instances;
    worker.ready();
    worker.emit('message', { __kbnManagedWorker: 'health', heapUsed: 1234 });
    worker.emit('message', 'unrelated');
    worker.emit('message', { heapUsed: 99 });
    expect(handle.status().heapUsed).toBe(1234);
    await handle.stop();
  });

  it('reports the effective heap limit from the ready message', async () => {
    const handle = createManagedWorker(options());
    handle.start();
    const [worker] = MockWorker.instances;
    worker.emit('message', { __kbnManagedWorker: 'ready', heapSizeLimit: 4288 * 1024 * 1024 });
    expect(handle.status().heapSizeLimit).toBe(4288 * 1024 * 1024);
    expect(logger.info).toHaveBeenLastCalledWith(
      `Worker diagnostic ready (thread ${worker.threadId}, heap limit 4288 MB)`
    );
    await handle.stop();
  });

  it('restarts after an unexpected exit and ignores stale exit events', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    handle.start();
    const [first] = MockWorker.instances;
    first.ready();
    first.emit('exit', 1);
    expect(opts.onExit).toHaveBeenCalledWith({ exitCode: 1, reason: 'exit' });
    expect(handle.status()).toMatchObject({ state: 'restarting', restarts: 1, lastExitCode: 1 });

    jest.advanceTimersByTime(100);
    expect(MockWorker.instances).toHaveLength(2);
    first.emit('exit', 1);
    first.ready();
    expect(handle.status()).toMatchObject({ state: 'starting', restarts: 1 });
    expect(jest.getTimerCount()).toBe(1);
    await handle.stop();
  });

  it('records an OOM error and restarts once when the exit follows', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    handle.start();
    const [worker] = MockWorker.instances;
    const oom = Object.assign(new Error('out of memory'), { code: 'ERR_WORKER_OUT_OF_MEMORY' });
    worker.emit('error', oom);
    worker.emit('exit', 1);
    expect(opts.onExit).toHaveBeenCalledTimes(1);
    expect(opts.onExit).toHaveBeenCalledWith({ exitCode: 1, reason: 'oom' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Worker diagnostic exited unexpectedly (oom, code 1): out of memory; restart 1/2 in 100ms'
    );
    expect(jest.getTimerCount()).toBe(1);
    await handle.stop();
  });

  it('logs the worker error message on the failure line and its stack at debug', async () => {
    const handle = createManagedWorker(options());
    handle.start();
    const [worker] = MockWorker.instances;
    const error = new Error('entry failed to load');
    worker.emit('error', error);
    worker.emit('exit', 1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Worker diagnostic exited unexpectedly (error, code 1): entry failed to load; restart 1/2 in 100ms'
    );
    expect(logger.debug).toHaveBeenCalledWith(`Worker diagnostic error: ${error.stack}`);
    await handle.stop();
  });

  it('fails a start that never reports ready, then restarts exactly once', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    handle.start();
    const [worker] = MockWorker.instances;
    jest.advanceTimersByTime(500);
    await flushImmediate();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(opts.onExit).toHaveBeenCalledTimes(1);
    expect(opts.onExit).toHaveBeenCalledWith({ reason: 'ready_timeout' });
    expect(handle.status()).toMatchObject({ state: 'restarting', restarts: 1 });

    jest.advanceTimersByTime(100);
    expect(MockWorker.instances).toHaveLength(2);
    await handle.stop();
  });

  describe('when a ready-timeout worker terminates slower than the backoff', () => {
    const deferTermination = (worker: MockWorker) => {
      const termination = { resolve: () => {} };
      worker.terminate.mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            termination.resolve = () => resolve(1);
          })
      );
      return termination;
    };
    const timeOut = async () => {
      jest.advanceTimersByTime(500);
      await flushImmediate();
      jest.advanceTimersByTime(100);
    };

    it('spawns the replacement only after the old worker has terminated', async () => {
      const handle = createManagedWorker(options());
      handle.start();
      const settle = deferTermination(MockWorker.instances[0]);
      await timeOut();
      expect(MockWorker.instances).toHaveLength(1);
      expect(handle.status().state).toBe('restarting');
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'Worker diagnostic waiting for the previous worker to terminate'
      );

      settle.resolve();
      await flushImmediate();
      expect(MockWorker.instances).toHaveLength(2);
      await handle.stop();
    });

    it('spawns nothing while termination stays pending', async () => {
      const handle = createManagedWorker(options());
      handle.start();
      deferTermination(MockWorker.instances[0]);
      await timeOut();
      jest.advanceTimersByTime(60_000);
      await flushImmediate();
      expect(MockWorker.instances).toHaveLength(1);
      expect(handle.status().state).toBe('restarting');
    });

    it('drops the waiting replacement when stopped', async () => {
      const handle = createManagedWorker(options());
      handle.start();
      const settle = deferTermination(MockWorker.instances[0]);
      await timeOut();

      const stopping = handle.stop();
      settle.resolve();
      await stopping;
      await flushImmediate();
      expect(MockWorker.instances).toHaveLength(1);
      expect(handle.status().state).toBe('stopped');
    });

    it('makes start after exhaustion wait for the discarded worker', async () => {
      const handle = createManagedWorker(options({ restart: { maxAttempts: 0 } }));
      handle.start();
      const settle = deferTermination(MockWorker.instances[0]);
      jest.advanceTimersByTime(500);
      await flushImmediate();
      expect(handle.status().state).toBe('exhausted');

      handle.start();
      expect(MockWorker.instances).toHaveLength(1);
      expect(handle.status().state).toBe('starting');

      settle.resolve();
      await flushImmediate();
      expect(MockWorker.instances).toHaveLength(2);
      await handle.stop();
    });

    it('drops the waiting replacement when stopped, even if started again right away', async () => {
      const handle = createManagedWorker(options());
      handle.start();
      const settle = deferTermination(MockWorker.instances[0]);
      await timeOut();

      // Start again at the earliest point stop() allows, before the waiting restart resumes.
      const restarted = handle.stop().then(() => handle.start());
      settle.resolve();
      await restarted;
      await flushImmediate();
      expect(MockWorker.instances).toHaveLength(2);
      expect(handle.status().state).toBe('starting');
      await handle.stop();
    });
  });

  it('accepts a ready message queued behind an expired ready timer', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    handle.start();
    const [worker] = MockWorker.instances;
    jest.advanceTimersByTime(500);
    worker.ready();
    await flushImmediate();
    expect(handle.status().state).toBe('running');
    expect(worker.terminate).not.toHaveBeenCalled();
    expect(opts.onExit).not.toHaveBeenCalled();
    await handle.stop();
  });

  it('resets the restart counter only after stable uptime since ready', async () => {
    const handle = createManagedWorker(
      options({
        readyTimeoutMs: 5_000,
        restart: { maxAttempts: 3, initialDelayMs: 100, stableUptimeMs: 1_000 },
      })
    );
    handle.start();
    MockWorker.instances[0].emit('exit', 1);
    expect(handle.status().restarts).toBe(1);

    // Up long since spawn, but not since ready: no reset.
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(1_000);
    MockWorker.instances[1].ready();
    MockWorker.instances[1].emit('exit', 0);
    expect(handle.status().restarts).toBe(2);

    // Up for the stable period since ready: reset, then count this failure.
    jest.advanceTimersByTime(200);
    MockWorker.instances[2].ready();
    jest.advanceTimersByTime(1_000);
    MockWorker.instances[2].emit('exit', 1);
    expect(handle.status().restarts).toBe(1);
    await handle.stop();
  });

  it('becomes exhausted after the restart budget and can be started again', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    MockWorker.failNextConstruction = 10;
    handle.start();
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(200);
    expect(opts.onExhausted).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(handle.status()).toMatchObject({ state: 'exhausted', restarts: 2 });
    expect(jest.getTimerCount()).toBe(0);

    MockWorker.failNextConstruction = 0;
    handle.start();
    expect(MockWorker.instances).toHaveLength(1);
    expect(handle.status()).toMatchObject({ state: 'starting', restarts: 0 });
    await handle.stop();
  });

  it('cancels a pending restart on stop', async () => {
    const handle = createManagedWorker(options());
    MockWorker.failNextConstruction = 1;
    handle.start();
    expect(jest.getTimerCount()).toBe(1);
    await handle.stop();
    jest.advanceTimersByTime(1_000);
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('clears the ready timer when stopped while starting', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    handle.start();
    await handle.stop();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(1_000);
    await flushImmediate();
    expect(MockWorker.instances).toHaveLength(1);
    expect(opts.onExit).not.toHaveBeenCalled();
  });

  it('reports stopped as soon as stop is called, without calling onExit', async () => {
    const opts = options();
    const handle = createManagedWorker(opts);
    handle.start();
    const [worker] = MockWorker.instances;
    worker.ready();
    const stopping = handle.stop();
    expect(handle.status().state).toBe('stopped');
    expect(handle.stop()).toBe(stopping);
    expect(() => handle.start()).toThrow('while it is stopping');
    expect(() => worker.emit('error', new Error('late error'))).not.toThrow();
    await stopping;
    expect(opts.onExit).not.toHaveBeenCalled();
  });

  it('stays stopped when stop is called from onExit', async () => {
    let stopping: Promise<void> | undefined;
    const handle = createManagedWorker(
      options({
        onExit: jest.fn(() => {
          stopping = handle.stop();
        }),
      })
    );
    handle.start();
    MockWorker.instances[0].emit('exit', 1);
    await stopping;
    expect(handle.status().state).toBe('stopped');
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(1_000);
    expect(MockWorker.instances).toHaveLength(1);
  });

  it('skips onExhausted when stop is called from onExit on the last failure', async () => {
    let stopping: Promise<void> | undefined;
    const opts = options({
      restart: { maxAttempts: 0 },
      onExit: jest.fn(() => {
        stopping = handle.stop();
      }),
    });
    const handle = createManagedWorker(opts);
    handle.start();
    MockWorker.instances[0].emit('exit', 1);
    await stopping;
    expect(opts.onExit).toHaveBeenCalledTimes(1);
    expect(opts.onExhausted).not.toHaveBeenCalled();
    expect(handle.status().state).toBe('stopped');
  });

  it('logs a throwing consumer callback instead of throwing on the main thread', async () => {
    const handle = createManagedWorker(
      options({
        onExit: () => {
          throw new Error('consumer failed');
        },
      })
    );
    handle.start();
    expect(() => MockWorker.instances[0].emit('exit', 1)).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith('Worker diagnostic onExit failed: consumer failed');
    expect(handle.status().state).toBe('restarting');
    await handle.stop();
  });
});
