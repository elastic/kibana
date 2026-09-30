/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { MockWorker } from './event_loop_watchdog.test.mocks';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import { ActivityRegistry } from './activity_registry';
import { EventLoopWatchdog, MAX_RESTARTS, RESTART_BASE_DELAY_MS } from './event_loop_watchdog';
import type { WatchdogOptions } from './types';

const options: WatchdogOptions = {
  thresholdMs: 500,
  heartbeatIntervalMs: 100,
  pollIntervalMs: 50,
  liveNoticeIntervalMs: 1_000,
  maxLiveNoticesPerBlock: 3,
  maxCandidates: 5,
  profileAfterMs: 2_000,
  maxProfileDurationMs: 10_000,
  profileCooldownMs: 600_000,
  profileSamplingIntervalUs: 1_000,
  maxFrames: 5,
};

describe('EventLoopWatchdog', () => {
  let logger: MockedLogger;
  let registry: ActivityRegistry;
  let watchdog: EventLoopWatchdog;

  const lastWorker = () => MockWorker.instances[MockWorker.instances.length - 1];

  beforeEach(() => {
    jest.useFakeTimers();
    MockWorker.instances = [];
    MockWorker.failNextConstruction = 0;
    logger = loggerMock.create();
    registry = new ActivityRegistry();
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      logging: { context: 'metrics.event_loop_watchdog', level: 'debug', format: 'text' },
      options,
      registry,
      sanitizeRoot: '/root',
    });
  });

  afterEach(async () => {
    await watchdog.stop();
    jest.useRealTimers();
  });

  it('starts one unref-ed worker and sends a snapshot of in-flight activities', () => {
    registry.observe({ type: 'task manager', name: 'run a', id: '1' });
    watchdog.start();
    watchdog.start();

    expect(MockWorker.instances).toHaveLength(1);
    const worker = lastWorker();
    // Diagnostic output no longer needs a main-thread message listener.
    expect(worker.unref).toHaveBeenCalled();
    expect(worker.messageListenersAtUnref).toBe(0);
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'snapshot',
      activities: [[0, expect.objectContaining({ type: 'a', id: '1' })]],
    });

    registry.observe({ type: 'task manager', name: 'run b', id: '2' });
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      type: 'activity-start',
      key: 1,
      activity: expect.objectContaining({ type: 'b' }),
    });
  });

  it('terminates the worker on stop and can start again', async () => {
    watchdog.start();
    const first = lastWorker();
    await watchdog.stop();
    expect(first.terminate).toHaveBeenCalled();
    expect(watchdog.isRunning).toBe(false);

    watchdog.start();
    expect(MockWorker.instances).toHaveLength(2);
    // the terminated worker's exit must not trigger a restart
    jest.advanceTimersByTime(RESTART_BASE_DELAY_MS * 10);
    expect(MockWorker.instances).toHaveLength(2);
  });

  it('keeps handling worker errors emitted while terminating', async () => {
    watchdog.start();
    const worker = lastWorker();
    worker.terminate.mockImplementationOnce(async () => {
      // e.g. an uncaught worker error queued before termination completes
      worker.emit('error', new Error('late worker error'));
      return 1;
    });
    await expect(watchdog.stop()).resolves.toBeUndefined();
  });

  it('lets concurrent stop callers wait for the same termination', async () => {
    watchdog.start();
    const worker = lastWorker();
    let terminated = false;
    worker.terminate.mockImplementationOnce(async () => {
      await Promise.resolve();
      terminated = true;
      return 1;
    });
    const first = watchdog.stop();
    const second = watchdog.stop();
    expect(second).toBe(first);
    await second;
    expect(terminated).toBe(true);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('restarts crashed workers with exponential backoff, bounded by MAX_RESTARTS', () => {
    watchdog.start();
    for (let restart = 0; restart < MAX_RESTARTS; restart++) {
      lastWorker().emit('exit', 1);
      const delay = RESTART_BASE_DELAY_MS * 2 ** restart;
      jest.advanceTimersByTime(delay - 1);
      expect(MockWorker.instances).toHaveLength(restart + 1);
      jest.advanceTimersByTime(1);
      expect(MockWorker.instances).toHaveLength(restart + 2);
    }

    lastWorker().emit('exit', 1);
    jest.advanceTimersByTime(RESTART_BASE_DELAY_MS * 100);
    expect(MockWorker.instances).toHaveLength(MAX_RESTARTS + 1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/exhausted 3 restarts/));
    // no heartbeat or restart timers are left behind
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resets the restart budget when re-enabled', async () => {
    watchdog.start();
    for (let restart = 0; restart <= MAX_RESTARTS; restart++) {
      lastWorker().emit('exit', 1);
      jest.advanceTimersByTime(RESTART_BASE_DELAY_MS * 2 ** restart);
    }
    await watchdog.stop();
    watchdog.start();
    const count = MockWorker.instances.length;
    lastWorker().emit('exit', 1);
    jest.advanceTimersByTime(RESTART_BASE_DELAY_MS);
    expect(MockWorker.instances).toHaveLength(count + 1);
  });

  it('retries a failed initial worker start with backoff', () => {
    MockWorker.failNextConstruction = 1;
    expect(() => watchdog.start()).not.toThrow();
    expect(watchdog.isRunning).toBe(true);
    expect(MockWorker.instances).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/failed to start.*restart 1\/3/)
    );

    jest.advanceTimersByTime(RESTART_BASE_DELAY_MS);
    expect(MockWorker.instances).toHaveLength(1);
  });

  it('treats restart failures like crashes instead of throwing from the timer', () => {
    watchdog.start();
    MockWorker.failNextConstruction = 1;
    lastWorker().emit('exit', 1);
    expect(() => jest.advanceTimersByTime(RESTART_BASE_DELAY_MS)).not.toThrow();
    expect(MockWorker.instances).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/failed to start.*restart 2\/3/)
    );

    jest.advanceTimersByTime(RESTART_BASE_DELAY_MS * 2);
    expect(MockWorker.instances).toHaveLength(2);
  });
});
