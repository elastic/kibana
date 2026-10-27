/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorker, ManagedWorkerOptions } from '@kbn/core-threads-server-internal';
import { createManagedWorker } from '@kbn/core-threads-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from './event_loop_watchdog';
import type { WatchdogWorkerData } from './types';
import { HEARTBEAT_INTERVAL_MS, Slot, WATCHDOG_WORKER_NAME } from './types';

jest.mock('@kbn/core-threads-server-internal', () => ({ createManagedWorker: jest.fn() }));

const createWorker = jest.mocked(createManagedWorker);

const logging = {
  context: 'metrics.event_loop_watchdog',
  level: 'info',
  format: 'json',
  service: { node: { roles: ['ui'] }, version: '9.3.0', type: 'kibana' },
} as const;

describe('EventLoopWatchdog', () => {
  let worker: jest.Mocked<ManagedWorker>;
  let resolveStop: () => void;
  let logger: ReturnType<typeof loggerMock.create>;

  const options = () => createWorker.mock.calls[0][0] as ManagedWorkerOptions<WatchdogWorkerData>;
  const slots = (call = 0) =>
    new BigInt64Array(
      (
        createWorker.mock.calls[call][0] as ManagedWorkerOptions<WatchdogWorkerData>
      ).workerData!.shared
    );
  const create = () =>
    new EventLoopWatchdog({
      logger,
      thresholdsMs: { starting: 300, running: 200 },
      statsIntervalMs: 600_000,
      logging,
      workerEntry: '/entry.js',
    });

  beforeEach(() => {
    jest.useFakeTimers();
    // Fake timers also fake process.hrtime, starting at 0; a real monotonic clock never reads 0.
    jest.advanceTimersByTime(1000);
    logger = loggerMock.create();
    worker = {
      start: jest.fn(),
      stop: jest.fn(() => new Promise<void>((resolve) => (resolveStop = resolve))),
      status: jest.fn(),
    };
    createWorker.mockReset();
    createWorker.mockReturnValue(worker);
  });
  afterEach(() => jest.useRealTimers());

  it('creates and starts the worker with the watchdog settings', () => {
    create().start();
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(options()).toMatchObject({
      name: WATCHDOG_WORKER_NAME,
      entry: '/entry.js',
      unref: true,
      logger,
      resourceLimits: {
        maxOldGenerationSizeMb: expect.any(Number),
        maxYoungGenerationSizeMb: expect.any(Number),
      },
      workerData: {
        shared: expect.any(SharedArrayBuffer),
        thresholdsMs: { starting: 300, running: 200 },
        statsIntervalMs: 600_000,
        logging,
      },
    });
    expect(worker.start).toHaveBeenCalledTimes(1);
  });

  it('defaults the entry to the worker module', () => {
    new EventLoopWatchdog({
      logger,
      thresholdsMs: { starting: 200, running: 200 },
      statsIntervalMs: 600_000,
      logging,
    }).start();
    expect(options().entry).toBe(require.resolve('./worker'));
  });

  it('stamps the heartbeat before the worker starts, then every interval', () => {
    let heartbeatAtCreate = 0n;
    createWorker.mockImplementation((opts) => {
      heartbeatAtCreate = new BigInt64Array(
        (opts as ManagedWorkerOptions<WatchdogWorkerData>).workerData!.shared
      )[Slot.heartbeat];
      return worker;
    });
    create().start();
    expect(heartbeatAtCreate).toBeGreaterThan(0n);

    const first = slots()[Slot.heartbeat];
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(slots()[Slot.heartbeat]).toBeGreaterThan(first);
  });

  it('does not keep the process alive with the heartbeat timer', () => {
    jest.useRealTimers();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const watchdog = create();
    watchdog.start();
    const timer = setIntervalSpy.mock.results[0].value as NodeJS.Timeout;
    expect(timer.hasRef()).toBe(false);
    setIntervalSpy.mockRestore();
    watchdog.stop();
    resolveStop();
  });

  it('ignores a second start', () => {
    const watchdog = create();
    watchdog.start();
    watchdog.start();
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('marks running once, in the shared slot', () => {
    const watchdog = create();
    watchdog.start();
    expect(slots()[Slot.runningSince]).toBe(0n);
    watchdog.markRunning();
    const runningSince = slots()[Slot.runningSince];
    expect(runningSince).toBeGreaterThan(0n);
    jest.advanceTimersByTime(1000);
    watchdog.markRunning();
    expect(slots()[Slot.runningSince]).toBe(runningSince);
  });

  it('carries running over to a worker started later', async () => {
    const watchdog = create();
    watchdog.markRunning();
    watchdog.start();
    expect(slots()[Slot.runningSince]).toBeGreaterThan(0n);
  });

  it('stops the heartbeat and the worker', async () => {
    const watchdog = create();
    watchdog.start();
    const stopped = watchdog.stop();
    expect(jest.getTimerCount()).toBe(0);
    expect(worker.stop).toHaveBeenCalledTimes(1);
    resolveStop();
    await stopped;
    expect(logger.info).toHaveBeenLastCalledWith('Event loop watchdog stopped');
  });

  it('refuses to start while stopping, and starts again once stopped', async () => {
    const watchdog = create();
    watchdog.start();
    const stopped = watchdog.stop();
    expect(watchdog.stop()).toBe(stopped);
    expect(() => watchdog.start()).toThrow(
      'Cannot start the event loop watchdog while it is stopping'
    );
    resolveStop();
    await stopped;
    watchdog.start();
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('does not warn when its log lines are on', () => {
    create().start();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns when no console appender is configured for its logger', () => {
    new EventLoopWatchdog({
      logger,
      thresholdsMs: { starting: 200, running: 200 },
      statsIntervalMs: 600_000,
      logging: { ...logging, format: undefined },
      workerEntry: '/entry.js',
    }).start();
    expect(logger.warn).toHaveBeenCalledWith(
      'Event loop watchdog log lines are off: no console appender is configured for logger [metrics.event_loop_watchdog]'
    );
  });

  it('warns when its logger level hides the stats log line', () => {
    new EventLoopWatchdog({
      logger,
      thresholdsMs: { starting: 200, running: 200 },
      statsIntervalMs: 600_000,
      logging: { ...logging, level: 'warn' },
      workerEntry: '/entry.js',
    }).start();
    expect(logger.warn).toHaveBeenCalledWith(
      'Event loop watchdog stats log lines are off: logger [metrics.event_loop_watchdog] has level [warn], and they are written at [info]'
    );
  });

  it('resolves stop when it never started', async () => {
    await expect(create().stop()).resolves.toBeUndefined();
  });

  it('stops the heartbeat when the worker runs out of restarts', () => {
    create().start();
    expect(jest.getTimerCount()).toBe(1);
    options().onExhausted!();
    expect(jest.getTimerCount()).toBe(0);
  });
});
