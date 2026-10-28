/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkerLogger } from '@kbn/core-threads-server-internal';
import { runWatchdogWorker } from './worker';
import type { StatsLogMeta, WatchdogWorkerData } from './types';
import { REPORT_REFILL_MS, SLOT_COUNT, Slot } from './types';

const STATS_INTERVAL_MS = 60_000;

describe('runWatchdogWorker', () => {
  let nowUs: number;
  let shared: BigInt64Array;
  let dropped: number;
  let logger: jest.Mocked<WorkerLogger>;
  let stop: () => void;

  const setSlot = (slot: number, us: number) => Atomics.store(shared, slot, BigInt(us));
  const beat = () => setSlot(Slot.heartbeat, nowUs);
  /** Moves the clock forward in poll-sized steps without a heartbeat. */
  const stall = (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 25) {
      nowUs += 25_000;
      jest.advanceTimersByTime(25);
    }
  };
  /** Ends a block: a fresh heartbeat, then one poll. */
  const resume = () => {
    beat();
    stall(25);
  };
  const block = (ms: number) => {
    beat();
    stall(ms);
    resume();
  };

  const start = (overrides: Partial<WatchdogWorkerData> = {}, readClock = () => nowUs) => {
    stop = runWatchdogWorker(
      {
        shared: shared.buffer as SharedArrayBuffer,
        thresholdsMs: { starting: 200, running: 200 },
        statsIntervalMs: STATS_INTERVAL_MS,
        logging: {
          context: 'metrics.event_loop_watchdog',
          level: 'info',
          format: 'json',
          service: { node: { roles: ['ui'] }, version: '9.3.0', type: 'kibana' },
        },
        ...overrides,
      },
      { logger, nowUs: readClock, heapUsed: () => 1234 }
    );
  };
  const statsMeta = (call = 0) =>
    (logger.info.mock.calls[call][1] as StatsLogMeta).kibana.event_loop_watchdog.stats;

  beforeEach(() => {
    jest.useFakeTimers();
    nowUs = 1_000_000_000;
    dropped = 0;
    shared = new BigInt64Array(new SharedArrayBuffer(SLOT_COUNT * 8));
    beat();
    logger = { ...loggerMock.create(), getDroppedLogLineCount: jest.fn(() => dropped) };
  });
  afterEach(() => {
    stop();
    jest.useRealTimers();
  });

  it("doesn't report a block when the worker pauses while it reads the clock", () => {
    let pauseOnNextClockRead = false;
    start({}, () => {
      if (pauseOnNextClockRead) {
        // The worker is paused for 250ms while the main thread keeps stamping its heartbeat.
        pauseOnNextClockRead = false;
        nowUs += 250_000;
        beat();
      }
      return nowUs;
    });
    pauseOnNextClockRead = true;
    jest.advanceTimersByTime(25);
    resume();
    resume();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a warning when a block ends', () => {
    start();
    const blockStartedAt = new Date(Date.now()).toISOString();
    block(300);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('Event loop blocked for ~300ms', {
      tags: ['event-loop-watchdog'],
      kibana: {
        event_loop_watchdog: {
          blockedMs: 300,
          startedAt: blockStartedAt,
          phase: 'starting',
          suppressedBlocks: 0,
        },
      },
    });
  });

  it('does not log heartbeat gaps below the threshold', () => {
    start();
    block(150);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('judges each phase against its own threshold', () => {
    start({ thresholdsMs: { starting: 500, running: 200 } });
    block(300);
    expect(logger.warn).not.toHaveBeenCalled();

    setSlot(Slot.runningSince, nowUs);
    block(300);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][1]).toMatchObject({
      kibana: { event_loop_watchdog: { phase: 'running' } },
    });
  });

  it('keeps the starting phase for a block that is open when running is marked', () => {
    start({ thresholdsMs: { starting: 200, running: 1000 } });
    beat();
    stall(300);
    setSlot(Slot.runningSince, nowUs);
    resume();
    expect(logger.warn.mock.calls[0][1]).toMatchObject({
      kibana: { event_loop_watchdog: { phase: 'starting', blockedMs: 300 } },
    });
  });

  it('reports whole milliseconds, so the warning and the bucket agree', () => {
    start();
    nowUs += 900; // heartbeat at x.9ms
    beat();
    stall(1000);
    nowUs -= 400; // block ends at y.5ms: 999.6ms in microseconds
    resume();
    expect(logger.warn.mock.calls[0][0]).toBe('Event loop blocked for ~1000ms');
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(statsMeta().running.buckets.lt2s + statsMeta().starting.buckets.lt2s).toBe(1);
  });

  it('rate limits warnings and counts suppressed blocks in the stats log line', () => {
    start();
    for (let i = 0; i < 6; i++) {
      block(300);
    }
    expect(logger.warn).toHaveBeenCalledTimes(5);
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(statsMeta().starting).toMatchObject({ blocks: 6, suppressed: 1 });
  });

  it('says how many blocks were not reported before a warning', () => {
    start();
    for (let i = 0; i < 7; i++) {
      block(300);
    }
    nowUs += REPORT_REFILL_MS * 1000;
    block(300);
    expect(logger.warn).toHaveBeenCalledTimes(6);
    expect(logger.warn.mock.calls[5][0]).toBe(
      'Event loop blocked for ~300ms; 2 blocks before it not reported'
    );
    expect(logger.warn.mock.calls[5][1]).toMatchObject({
      kibana: { event_loop_watchdog: { suppressedBlocks: 2 } },
    });
  });

  it('writes a stats log line every interval', () => {
    start({ thresholdsMs: { starting: 300, running: 200 } });
    block(400);
    nowUs += STATS_INTERVAL_MS * 1000;
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0][0]).toMatch(
      /^Event loop watchdog stats for the last \d+s: 1 block while starting, 0 blocks while running$/
    );
    expect(statsMeta()).toEqual({
      periodMs: expect.any(Number),
      starting: {
        thresholdMs: 300,
        blocks: 1,
        suppressed: 0,
        maxBlockedMs: 400,
        buckets: { lt1s: 1, lt2s: 0, lt5s: 0, gte5s: 0 },
      },
      running: {
        thresholdMs: 200,
        blocks: 0,
        suppressed: 0,
        maxBlockedMs: 0,
        buckets: { lt1s: 0, lt2s: 0, lt5s: 0, gte5s: 0 },
      },
      heapUsed: 1234,
      droppedLogLines: 0,
    });
  });

  it('resets the counts after a stats log line is written', () => {
    start();
    block(300);
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(statsMeta(1).starting.blocks).toBe(0);
  });

  it('carries the counts over when the stats log line is dropped', () => {
    start();
    block(300);
    logger.info.mockImplementationOnce(() => {
      dropped++;
    });
    nowUs += STATS_INTERVAL_MS * 1000;
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    nowUs += STATS_INTERVAL_MS * 1000;
    jest.advanceTimersByTime(STATS_INTERVAL_MS);

    const carried = statsMeta(1);
    expect(carried.starting.blocks).toBe(1);
    expect(carried.droppedLogLines).toBe(1);
    expect(carried.periodMs).toBeGreaterThanOrEqual(2 * STATS_INTERVAL_MS);

    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(statsMeta(2)).toMatchObject({ droppedLogLines: 0, starting: { blocks: 0 } });
  });

  it('counts dropped warning log lines in the next stats log line', () => {
    start();
    logger.warn.mockImplementation(() => {
      dropped++;
    });
    block(300);
    block(300);
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(statsMeta().droppedLogLines).toBe(2);
  });
});
