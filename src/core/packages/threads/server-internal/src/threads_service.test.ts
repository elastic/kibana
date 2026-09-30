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
import { ThreadsService } from './threads_service';
import type { ManagedWorkerOptions } from './managed_worker';

describe('ThreadsService', () => {
  const logger = loggerMock.create();
  const params = (): ManagedWorkerOptions<string> => ({
    filename: '/worker.js',
    options: {
      name: 'diagnostic',
      workerData: { heartbeat: new SharedArrayBuffer(8) },
      resourceLimits: { maxOldGenerationSizeMb: 64 },
    },
    logger,
    unref: true,
    restart: { maxAttempts: 2, delayMs: 100 },
    onStart: jest.fn((post) => post('hello')),
    onExit: jest.fn(),
    onExhausted: jest.fn(),
  });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    MockWorker.instances = [];
    MockWorker.failNextConstruction = 0;
  });
  afterEach(() => jest.useRealTimers());

  it.each(['/worker.js', new URL('file:///worker.js')])(
    'forwards %s and options unchanged, creating workers only on start',
    async (filename) => {
      const options = { ...params(), filename };
      const threads = new ThreadsService().start();
      const handle = threads.createWorker(options);
      expect(MockWorker.instances).toHaveLength(0);
      handle.start();
      handle.start();
      expect(MockWorker.instances).toHaveLength(1);
      const worker = MockWorker.instances[0];
      expect(worker.entry).toBe(filename);
      expect(worker.workerOptions).toBe(options.options);
      expect(worker.postMessage).toHaveBeenCalledWith('hello');
      expect(worker.unref).toHaveBeenCalledTimes(1);
      await handle.stop();
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    }
  );

  it('creates distinct managed workers, with consumer reference policy', async () => {
    const threads = new ThreadsService().start();
    const first = threads.createWorker(params());
    const second = threads.createWorker({ ...params(), unref: false });
    first.start();
    second.start();
    expect(MockWorker.instances).toHaveLength(2);
    expect(MockWorker.instances[1].unref).not.toHaveBeenCalled();
    await Promise.all([first.stop(), second.stop()]);
  });

  it('bounds construction failures and cancels pending restarts on stop', async () => {
    const options = params();
    const handle = new ThreadsService().start().createWorker(options);
    MockWorker.failNextConstruction = 10;
    handle.start();
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(200);
    expect(options.onExhausted).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await handle.stop();
    MockWorker.failNextConstruction = 1;
    handle.start();
    expect(jest.getTimerCount()).toBe(1);
    await handle.stop();
    jest.advanceTimersByTime(1000);
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('cleans up initialization failures and awaits termination on stop', async () => {
    const options = params();
    const handle = new ThreadsService().start().createWorker({
      ...options,
      onStart: () => {
        throw new Error('initialization failed');
      },
    });
    handle.start();
    const worker = MockWorker.instances[0];
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(() => worker.emit('error', new Error('late error'))).not.toThrow();
    const first = handle.stop();
    expect(handle.stop()).toBe(first);
    expect(() => handle.start()).toThrow('while it is stopping');
    await first;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reports termination failures to stop callers', async () => {
    const handle = new ThreadsService().start().createWorker(params());
    handle.start();
    MockWorker.instances[0].terminate.mockRejectedValueOnce(new Error('termination failed'));
    await expect(handle.stop()).rejects.toThrow('termination failed');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('termination failed'));
  });

  it('ignores stale exit events after replacement and resends initialization', async () => {
    const options = params();
    const handle = new ThreadsService().start().createWorker(options);
    handle.start();
    const first = MockWorker.instances[0];
    first.emit('exit', 1);
    jest.advanceTimersByTime(100);
    expect(options.onStart).toHaveBeenCalledTimes(2);
    first.emit('exit', 1);
    expect(jest.getTimerCount()).toBe(0);
    await handle.stop();
  });
});
