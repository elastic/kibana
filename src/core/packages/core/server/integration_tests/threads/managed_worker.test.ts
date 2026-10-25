/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createManagedWorker } from '@kbn/core-threads-server-internal';
import type { ManagedWorker } from '@kbn/core-threads-server-internal';

const RESOURCE_LIMITS = { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 };

const waitFor = async (predicate: () => boolean, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Condition not met within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

describe('ManagedWorker with a real worker thread', () => {
  let worker: ManagedWorker | undefined;

  afterEach(async () => {
    await worker?.stop();
  });

  it('loads a TypeScript entry through the bootstrap, reports ready and stops', async () => {
    const logger = loggerMock.create();
    const onExit = jest.fn();
    const managed = createManagedWorker({
      name: 'integration-test',
      entry: require.resolve('./fixtures/ready_entry'),
      resourceLimits: RESOURCE_LIMITS,
      logger,
      readyTimeoutMs: 20_000,
      healthIntervalMs: 100,
      onExit,
    });
    worker = managed;

    managed.start();
    await waitFor(() => managed.status().state === 'running', 25_000);
    await waitFor(() => managed.status().heapUsed !== undefined, 5_000);
    expect(managed.status()).toMatchObject({
      state: 'running',
      restarts: 0,
      threadId: expect.any(Number),
      startedAt: expect.any(Date),
      heapUsed: expect.any(Number),
    });
    // CI sets --max-old-space-size, which overrides the cap, so only presence is asserted.
    expect(managed.status().heapSizeLimit).toBeGreaterThan(0);

    await managed.stop();
    expect(managed.status().state).toBe('stopped');
    expect(onExit).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  }, 60_000);

  it('restarts an entry that fails to load, then exhausts a small restart budget', async () => {
    const logger = loggerMock.create();
    const spawns = new SharedArrayBuffer(4);
    const onExit = jest.fn();
    const onExhausted = jest.fn();
    const managed = createManagedWorker({
      name: 'integration-test',
      entry: require.resolve('./fixtures/throwing_entry'),
      workerData: { spawns },
      resourceLimits: RESOURCE_LIMITS,
      logger,
      readyTimeoutMs: 20_000,
      restart: { maxAttempts: 1, initialDelayMs: 50 },
      onExit,
      onExhausted,
    });
    worker = managed;

    managed.start();
    await waitFor(() => managed.status().state === 'exhausted', 40_000);

    expect(Atomics.load(new Int32Array(spawns), 0)).toBe(2);
    expect(onExit).toHaveBeenCalledTimes(2);
    expect(onExit).toHaveBeenNthCalledWith(1, { reason: 'error', exitCode: 1 });
    expect(onExit).toHaveBeenNthCalledWith(2, { reason: 'error', exitCode: 1 });
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(managed.status()).toMatchObject({ state: 'exhausted', restarts: 1, lastExitCode: 1 });
    expect(managed.status().startedAt).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('(error, code 1): entry failed to load')
    );
    expect(logger.error).toHaveBeenCalledTimes(1);
  }, 60_000);

  it('replaces a worker that exits after ready with a new running thread', async () => {
    const logger = loggerMock.create();
    const spawns = new SharedArrayBuffer(4);
    const onExit = jest.fn();
    const onExhausted = jest.fn();
    const managed = createManagedWorker({
      name: 'integration-test',
      entry: require.resolve('./fixtures/exit_after_ready_entry'),
      workerData: { spawns },
      resourceLimits: RESOURCE_LIMITS,
      logger,
      readyTimeoutMs: 20_000,
      restart: { initialDelayMs: 50 },
      onExit,
      onExhausted,
    });
    worker = managed;

    managed.start();
    // Set synchronously on spawn, so the first worker's short life can't be missed.
    const { threadId: firstThreadId } = managed.status();
    expect(firstThreadId).toEqual(expect.any(Number));

    await waitFor(() => onExit.mock.calls.length === 1, 25_000);
    expect(onExit).toHaveBeenCalledWith({ reason: 'exit', exitCode: 3 });
    await waitFor(() => managed.status().state === 'running', 25_000);

    const { threadId, ...status } = managed.status();
    expect(threadId).toEqual(expect.any(Number));
    expect(threadId).not.toBe(firstThreadId);
    expect(status).toMatchObject({ restarts: 1, lastExitCode: 3, startedAt: expect.any(Date) });
    expect(Atomics.load(new Int32Array(spawns), 0)).toBe(2);
    const readyLines = logger.info.mock.calls.filter(([message]) =>
      String(message).includes(' ready (')
    );
    expect(readyLines).toHaveLength(2);

    await managed.stop();
    expect(managed.status().state).toBe('stopped');
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExhausted).not.toHaveBeenCalled();
  }, 60_000);

  it('keeps a worker whose ready arrives while the main thread is blocked past the timeout', async () => {
    const logger = loggerMock.create();
    const loaded = new SharedArrayBuffer(4);
    const onExit = jest.fn();
    const readyTimeoutMs = 1_000;
    const managed = createManagedWorker({
      name: 'integration-test',
      entry: require.resolve('./fixtures/signal_loaded_entry'),
      workerData: { loaded },
      resourceLimits: RESOURCE_LIMITS,
      logger,
      readyTimeoutMs,
      onExit,
    });
    worker = managed;

    // Block the main thread from start until ready is queued and the ready timer has expired,
    // as a long event loop block would. Atomics.wait keeps timers and messages from running.
    const startedAt = Date.now();
    managed.start();
    const { threadId } = managed.status();
    const signal = Atomics.wait(new Int32Array(loaded), 0, 0, 30_000);
    const remainingMs = startedAt + readyTimeoutMs + 500 - Date.now();
    if (remainingMs > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, remainingMs);
    expect(signal).not.toBe('timed-out');
    expect(Date.now() - startedAt).toBeGreaterThan(readyTimeoutMs);

    await waitFor(() => managed.status().state === 'running', 5_000);
    // The deferred ready-timeout check runs in the same loop turn; give it room to misfire.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(managed.status()).toMatchObject({ state: 'running', restarts: 0, threadId });
    expect(onExit).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  }, 60_000);
});
