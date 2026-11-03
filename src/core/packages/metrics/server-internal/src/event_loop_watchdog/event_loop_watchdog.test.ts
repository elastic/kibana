/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ManagedWorker,
  ManagedWorkerOptions,
  WorkerLogger,
} from '@kbn/core-threads-server-internal';
import { createManagedWorker, createWorkerLogger } from '@kbn/core-threads-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from './event_loop_watchdog';
import type { WatchdogWorkerData } from './types';
import { HEARTBEAT_INTERVAL_MS, Slot, WATCHDOG_WORKER_NAME } from './constants';

jest.mock('@kbn/core-threads-server-internal', () => ({
  createManagedWorker: jest.fn(),
  createWorkerLogger: jest.fn(),
}));

const createWorker = jest.mocked(createManagedWorker);
const createBlockLogger = jest.mocked(createWorkerLogger);

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
  let blockLogger: jest.Mocked<WorkerLogger>;
  let created: EventLoopWatchdog[];

  /** The watchdog always passes the optional callbacks and the worker data, so they're required here. */
  type WatchdogWorkerOptions = Required<ManagedWorkerOptions<WatchdogWorkerData>>;
  const optionsOf = (opts: unknown) => opts as WatchdogWorkerOptions;
  const options = (call = 0) => optionsOf(createWorker.mock.calls[call][0]);
  const slots = (call = 0) => new BigInt64Array(options(call).workerData.shared);
  const create = (overrides: Partial<ConstructorParameters<typeof EventLoopWatchdog>[0]> = {}) => {
    const watchdog = new EventLoopWatchdog({
      logger,
      thresholdsMs: { starting: 300, running: 200 },
      statsIntervalMs: 600_000,
      logging,
      workerEntry: '/entry.js',
      ...overrides,
    });
    created.push(watchdog);
    return watchdog;
  };
  /** The worker shares the start of an ongoing block; here the test plays the worker. */
  const shareBlock = (startedAtUs: number) => {
    Atomics.store(slots(), Slot.blockStartedAtEpochMs, BigInt(Date.now()));
    Atomics.store(slots(), Slot.blockStartedAt, BigInt(startedAtUs));
  };
  const exitListeners = () => process.listeners('exit');

  beforeEach(() => {
    jest.useFakeTimers();
    // Fake timers also fake process.hrtime, starting at 0; a real monotonic clock never reads 0.
    jest.advanceTimersByTime(1000);
    logger = loggerMock.create();
    blockLogger = { ...loggerMock.create(), getDroppedLogLineCount: jest.fn(() => 0) };
    worker = {
      start: jest.fn(),
      stop: jest.fn(() => new Promise<void>((resolve) => (resolveStop = resolve))),
      status: jest.fn(),
    };
    created = [];
    createWorker.mockReset();
    createWorker.mockReturnValue(worker);
    createBlockLogger.mockReset();
    createBlockLogger.mockReturnValue(blockLogger);
  });
  afterEach(() => {
    // Every started watchdog registered a process `exit` listener; stop removes it.
    created.forEach((watchdog) => void watchdog.stop());
    jest.useRealTimers();
  });

  it('creates and starts the worker with the watchdog settings', () => {
    create().start();
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(options()).toMatchObject({
      name: WATCHDOG_WORKER_NAME,
      entry: '/entry.js',
      unref: true,
      logger,
      resourceLimits: { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 16 },
      onExit: expect.any(Function),
      restart: { maxAttempts: Infinity },
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
    create({ workerEntry: undefined }).start();
    expect(options().entry).toBe(require.resolve('./worker'));
  });

  it('stamps the heartbeat before the worker starts, then every interval', () => {
    let heartbeatAtCreate = 0n;
    createWorker.mockImplementation((opts) => {
      heartbeatAtCreate = new BigInt64Array(optionsOf(opts).workerData.shared)[Slot.heartbeat];
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

  it('stamps the heartbeat when it marks running, so the next block is measured from it', () => {
    const watchdog = create();
    watchdog.start();
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS / 2);
    watchdog.markRunning();
    expect(slots()[Slot.heartbeat]).toBe(slots()[Slot.runningSince]);
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
    create({ logging: { ...logging, format: undefined } }).start();
    expect(logger.warn).toHaveBeenCalledWith(
      'Event loop watchdog log lines are off: no console appender is configured for logger [metrics.event_loop_watchdog]'
    );
  });

  it('warns when its logger level hides the stats log line', () => {
    create({ logging: { ...logging, level: 'warn' } }).start();
    expect(logger.warn).toHaveBeenCalledWith(
      'Event loop watchdog stats log lines are off: logger [metrics.event_loop_watchdog] has level [warn], and they are written at [info]'
    );
  });

  it.each(['error', 'fatal', 'off'] as const)(
    'logs an error when level %s hides its block warnings too',
    (level) => {
      create({ logging: { ...logging, level } }).start();
      expect(logger.error).toHaveBeenCalledWith(
        `Event loop watchdog log lines are off: logger [metrics.event_loop_watchdog] has level [${level}], and block warnings are written at [warn]`
      );
      expect(logger.warn).not.toHaveBeenCalled();
    }
  );

  it('resolves stop when it never started', async () => {
    await expect(create().stop()).resolves.toBeUndefined();
  });

  it('stops the heartbeat when the worker runs out of restarts', () => {
    create().start();
    expect(jest.getTimerCount()).toBe(1);
    options().onExhausted();
    expect(jest.getTimerCount()).toBe(0);
  });

  describe('a block the worker cannot report', () => {
    const blockMeta = () => blockLogger.warn.mock.calls[0][1];

    it('is reported by the main thread when the worker exits during it', () => {
      create().start();
      const startedAtUs = Number(slots()[Slot.heartbeat]);
      const startedAt = new Date(Date.now()).toISOString();
      shareBlock(startedAtUs);
      jest.advanceTimersByTime(3000);
      options().onExit({ reason: 'error', exitCode: 1 });
      expect(blockLogger.warn).toHaveBeenCalledTimes(1);
      expect(blockLogger.warn).toHaveBeenCalledWith(
        'Event loop blocked for ~3000ms; the watchdog worker exited during the block',
        {
          tags: ['event-loop-watchdog'],
          kibana: {
            event_loop_watchdog: {
              blockedMs: 3000,
              startedAt,
              phase: 'starting',
              suppressedBlocks: 0,
              ongoing: false,
            },
          },
        }
      );
      expect(slots()[Slot.blockStartedAt]).toBe(0n);
      // Claimed: a second exit reports nothing.
      options().onExit({ reason: 'error', exitCode: 1 });
      expect(blockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('is not reported when no block is ongoing', () => {
      create().start();
      options().onExit({ reason: 'exit', exitCode: 0 });
      expect(blockLogger.warn).not.toHaveBeenCalled();
    });

    it('keeps the phase the block started in', () => {
      const watchdog = create();
      watchdog.start();
      // A block from a heartbeat stamped before running was marked stays a starting block, even
      // when the worker's exit is only handled after markRunning ran.
      shareBlock(Number(slots()[Slot.heartbeat]));
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      watchdog.markRunning();
      jest.advanceTimersByTime(1000);
      options().onExit({ reason: 'error', exitCode: 1 });
      expect(blockMeta()).toMatchObject({ kibana: { event_loop_watchdog: { phase: 'starting' } } });
    });

    it('reports a block that started after running was marked as running', () => {
      const watchdog = create();
      watchdog.start();
      watchdog.markRunning();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      shareBlock(Number(slots()[Slot.heartbeat]));
      jest.advanceTimersByTime(1000);
      options().onExit({ reason: 'error', exitCode: 1 });
      expect(blockMeta()).toMatchObject({ kibana: { event_loop_watchdog: { phase: 'running' } } });
    });

    it('is reported before the worker is terminated on stop', () => {
      const watchdog = create();
      watchdog.start();
      shareBlock(Number(slots()[Slot.heartbeat]));
      jest.advanceTimersByTime(500);
      void watchdog.stop();
      expect(blockLogger.warn).toHaveBeenCalledTimes(1);
      expect(blockLogger.warn.mock.calls[0][0]).toBe(
        'Event loop blocked for ~500ms; the watchdog stopped before its worker reported it'
      );
      expect(blockLogger.warn.mock.invocationCallOrder[0]).toBeLessThan(
        worker.stop.mock.invocationCallOrder[0]
      );
    });

    it('is reported when the process exits, through a listener stop removes', () => {
      const before = exitListeners();
      const watchdog = create();
      watchdog.start();
      const added = exitListeners().filter((listener) => !before.includes(listener));
      expect(added).toHaveLength(1);
      shareBlock(Number(slots()[Slot.heartbeat]));
      jest.advanceTimersByTime(700);
      added[0](0);
      expect(blockLogger.warn.mock.calls[0][0]).toBe(
        'Event loop blocked for ~700ms; the process exited before the watchdog worker reported it'
      );
      void watchdog.stop();
      expect(exitListeners()).toEqual(before);
    });

    it('writes through a synchronous logger with the worker logging settings', () => {
      create().start();
      expect(createBlockLogger).toHaveBeenCalledWith(logging, WATCHDOG_WORKER_NAME);
    });
  });
});
