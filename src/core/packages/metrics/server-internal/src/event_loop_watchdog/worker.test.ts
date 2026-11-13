/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type * as WorkerThreads from 'node:worker_threads';
import { loggerMock } from '@kbn/logging-mocks';
import { createWorkerLogger, type WorkerLogger } from '@kbn/core-threads-server-internal';
import { runWatchdogWorker, type WatchdogWorkerDeps } from './worker';
import type { ProfileLogMeta, StatsLogMeta, WatchdogWorkerData } from './types';
import type { CpuProfile, InspectorSession } from './profile_capture';
import {
  ONGOING_REPORT_AFTER_MS,
  REPORT_REFILL_MS,
  SLOT_COUNT,
  Slot,
  WATCHDOG_WORKER_NAME,
} from './constants';
import { MAX_LOCATION_BYTES, MAX_NAME_BYTES } from './sanitize';

const jsonByteLength = (value: string): number =>
  Buffer.byteLength(JSON.stringify(value).slice(1, -1), 'utf8');

jest.mock('node:worker_threads', () => ({ isMainThread: true, threadId: 99 }));
const workerThreads = jest.requireMock<typeof WorkerThreads>('node:worker_threads');

const ROOT = '/kibana';
const STATS_INTERVAL_MS = 60_000;

describe('runWatchdogWorker', () => {
  let nowUs: number;
  let shared: BigInt64Array;
  let dropped: number;
  let logger: jest.Mocked<WorkerLogger>;
  let stop: () => void;
  let sessions: Array<jest.Mocked<InspectorSession>>;
  let failConnect: boolean;
  let failStart: boolean;
  let failStop: boolean;
  let profile: CpuProfile;
  /** When set, `Profiler.start` and `Profiler.stop` reply only once these resolve. */
  let startReply: Promise<void> | undefined;
  let stopReply: Promise<void> | undefined;

  const setSlot = (slot: number, us: number) => Atomics.store(shared, slot, BigInt(us));
  const beat = () => setSlot(Slot.heartbeat, nowUs);
  /** Moves the clock forward in poll-sized steps without a heartbeat. */
  const stall = (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 25) {
      nowUs += 25_000;
      jest.advanceTimersByTime(25);
    }
  };
  /** Moves the clock forward with the heartbeat kept fresh. */
  const idle = (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += 25) {
      nowUs += 25_000;
      beat();
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

  const start = (
    overrides: Partial<WatchdogWorkerData> = {},
    readClock = () => nowUs,
    depOverrides: Partial<WatchdogWorkerDeps> = {}
  ) => {
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
        profiling: {
          startAfterMs: { starting: 30_000, running: 30_000 },
          maxDurationMs: { starting: 10_000, running: 10_000 },
          cooldownMs: { starting: 60_000, running: 60_000 },
        },
        ...overrides,
      },
      {
        logger,
        nowUs: readClock,
        heapUsed: () => 1234,
        createSession,
        root: ROOT,
        ...depOverrides,
      }
    );
  };
  const node = (
    id: number,
    functionName: string,
    { url, lineNumber, children }: { url?: string; lineNumber?: number; children?: number[] } = {}
  ) => ({
    id,
    callFrame: {
      functionName,
      ...(url ? { url } : {}),
      ...(lineNumber !== undefined ? { lineNumber } : {}),
    },
    ...(children ? { children } : {}),
  });
  const sampledProfile: CpuProfile = {
    nodes: [
      node(1, '(root)', { children: [2, 3] }),
      node(2, 'handleRequest', {
        url: `file://${ROOT}/src/core/server/http/router.ts`,
        lineNumber: 41,
        children: [4],
      }),
      node(3, '(idle)'),
      node(4, 'runStep', {
        url: `file://${ROOT}/x-pack/plugins/workflows/server/step.ts`,
        lineNumber: 19,
        children: [5],
      }),
      node(5, 'spin', {
        url: `file://${ROOT}/src/core/server/spin.ts`,
        lineNumber: 9,
      }),
    ],
    startTime: 0,
    endTime: 3_000_000,
    samples: [5, 5, 3],
    timeDeltas: [1_000_000, 1_000_000, 1_000_000],
  };
  const createSession = () => {
    let close = () => {};
    // Like the real session, ending it rejects the commands still waiting for a reply.
    const closed = new Promise<never>((_, reject) => {
      close = () => reject(new Error('Session closed'));
    });
    closed.catch(() => {});
    const session: jest.Mocked<InspectorSession> = {
      connectToMainThread: jest.fn(() => {
        if (failConnect) {
          throw new Error('inspector not available');
        }
      }),
      disconnect: jest.fn(() => close()),
      post: jest.fn(async (method: string) => {
        if (method === 'Profiler.start') {
          await Promise.race([startReply, closed]);
          if (failStart) {
            throw new Error('inspector unavailable');
          }
        }
        if (method !== 'Profiler.stop') {
          return {};
        }
        await Promise.race([stopReply, closed]);
        if (failStop) {
          throw new Error('Profiler is not started');
        }
        return { profile };
      }) as jest.Mocked<InspectorSession>['post'],
    };
    sessions.push(session);
    return session;
  };
  const posted = (session = 0) => sessions[session].post.mock.calls.map(([method]) => method);
  /** Lets the fake session's replies settle. */
  const settle = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };
  const profileLines = () =>
    logger.info.mock.calls.filter(([message]) =>
      String(message).startsWith('Event loop block profiled')
    );
  const allStats = () =>
    logger.info.mock.calls
      .filter(([message]) => String(message).startsWith('Event loop watchdog stats'))
      .map(([, meta]) => (meta as StatsLogMeta).kibana.event_loop_watchdog.stats);
  const lastStats = () => allStats()[allStats().length - 1];
  /** Profiling counts summed over every stats period so far. */
  const totalProfilingStats = () =>
    allStats().reduce<Record<string, number>>((totals, { profiling }) => {
      for (const [key, value] of Object.entries(profiling)) {
        totals[key] = (totals[key] ?? 0) + value;
      }
      return totals;
    }, {});
  const profileMeta = (line = 0) =>
    (profileLines()[line][1] as ProfileLogMeta).kibana.event_loop_watchdog.profile;
  const profilingData = {
    startAfterMs: { starting: 1_000, running: 1_000 },
    maxDurationMs: { starting: 5_000, running: 5_000 },
    cooldownMs: { starting: 60_000, running: 60_000 },
  };
  const startProfiling = () => {
    start({ profiling: profilingData });
    setSlot(Slot.profiling, 1);
  };
  /** A block whose capture is requested `startsAfterMs` in, with `Profiler.start` resolving then. */
  const profiledBlock = async (ms: number, startsAfterMs = profilingData.startAfterMs.starting) => {
    beat();
    stall(startsAfterMs);
    await settle();
    stall(ms - startsAfterMs);
    resume();
    await settle();
  };
  const statsMeta = (call = 0) =>
    (logger.info.mock.calls[call][1] as StatsLogMeta).kibana.event_loop_watchdog.stats;

  beforeEach(() => {
    jest.useFakeTimers();
    nowUs = 1_000_000_000;
    dropped = 0;
    sessions = [];
    failConnect = false;
    failStart = false;
    failStop = false;
    profile = sampledProfile;
    startReply = undefined;
    stopReply = undefined;
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
          ongoing: false,
        },
      },
    });
  });

  it('logs a warning while a block is still ongoing, and counts the block once it ends', () => {
    start();
    const blockStartedAt = new Date(Date.now()).toISOString();
    beat();
    stall(ONGOING_REPORT_AFTER_MS - 25);
    expect(logger.warn).not.toHaveBeenCalled();
    stall(25);
    expect(logger.warn).toHaveBeenCalledWith(
      `Event loop blocked for ~${ONGOING_REPORT_AFTER_MS}ms so far`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            blockedMs: ONGOING_REPORT_AFTER_MS,
            startedAt: blockStartedAt,
            phase: 'starting',
            suppressedBlocks: 0,
            ongoing: true,
          },
        },
      }
    );
    stall(500);
    resume();
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenLastCalledWith(
      `Event loop blocked for ~${ONGOING_REPORT_AFTER_MS + 500}ms`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: expect.objectContaining({
            startedAt: blockStartedAt,
            ongoing: false,
          }),
        },
      }
    );
    jest.advanceTimersByTime(STATS_INTERVAL_MS);
    expect(statsMeta().starting.blocks).toBe(1);
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
      profiling: {
        pastStartAfter: 0,
        profiled: 0,
        emptyTooLate: 0,
        captureFailed: 0,
        skippedCooldown: 0,
        profilingActiveMs: 0,
        maxStopHeartbeatGapMs: 0,
      },
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

  describe('profiling', () => {
    it("doesn't profile while profiling is off, but counts the blocks past the start threshold", () => {
      start({ profiling: profilingData });
      block(3_000);
      block(500);
      expect(sessions).toHaveLength(0);
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ pastStartAfter: 1, profiled: 0 });
    });

    it("doesn't profile a block shorter than the start threshold", () => {
      startProfiling();
      block(900);
      expect(sessions).toHaveLength(0);
    });

    it('starts profiling at the block threshold when it is longer than startAfter', async () => {
      start({ thresholdsMs: { starting: 3_000, running: 3_000 }, profiling: profilingData });
      setSlot(Slot.profiling, 1);
      block(2_000);
      await settle();
      expect(sessions).toHaveLength(0);

      await profiledBlock(4_000, 3_000);
      expect(profileMeta()).toMatchObject({ profiledAfterMs: 3_000 });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ pastStartAfter: 1, profiled: 1 });
    });

    it('judges each phase against its own start threshold', async () => {
      start({ profiling: { ...profilingData, startAfterMs: { starting: 3_000, running: 1_000 } } });
      setSlot(Slot.profiling, 1);
      block(1_500);
      await settle();
      expect(sessions).toHaveLength(0);

      setSlot(Slot.runningSince, nowUs);
      await profiledBlock(1_500);
      expect(sessions).toHaveLength(1);
      expect(profileMeta()).toMatchObject({ phase: 'running' });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ pastStartAfter: 1, profiled: 1 });
    });

    it('finishes a capture already running when profiling is turned off during the block', async () => {
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      setSlot(Slot.profiling, 0);
      stall(500);
      resume();
      await settle();
      expect(profileLines()).toHaveLength(1);
      expect(profileMeta()).toMatchObject({ stopReason: 'block_ended' });
    });

    it('profiles a block once it passes the start threshold, and logs it when the block ends', async () => {
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      expect(posted()).toEqual([
        'Profiler.enable',
        'Profiler.setSamplingInterval',
        'Profiler.start',
      ]);
      stall(1_000);
      resume();
      await settle();
      expect(posted()).toContain('Profiler.stop');
      expect(sessions[0].disconnect).toHaveBeenCalled();
      expect(profileLines()).toHaveLength(1);
      expect(profileLines()[0][0]).toMatch(
        /^Event loop block profiled: block ~2000ms \(profiled after ~1000ms, profiler start took ~\d+ms\), 2 samples; stopped: block_ended; top Kibana frame: 100% spin \(src\/core\/server\/spin\.ts:10\) <- runStep \(x-pack\/plugins\/workflows\/server\/step\.ts:20\) <- handleRequest \(src\/core\/server\/http\/router\.ts:42\)$/
      );
      expect(profileMeta()).toEqual({
        phase: 'starting',
        blockedMs: 2_000,
        profiledAfterMs: 1_000,
        profilerStartMs: expect.any(Number),
        sampledMs: 1_000,
        coverage: 0.5,
        captureDurationMs: 1_025,
        samples: 2,
        frames: [{ name: 'spin', location: 'src/core/server/spin.ts:10', percent: 100 }],
        kibanaFrames: [
          {
            name: 'spin',
            location: 'src/core/server/spin.ts:10',
            percent: 100,
            callers: [
              { name: 'runStep', location: 'x-pack/plugins/workflows/server/step.ts:20' },
              { name: 'handleRequest', location: 'src/core/server/http/router.ts:42' },
            ],
          },
        ],
        topKibanaFrame: {
          location: 'src/core/server/spin.ts:10',
          percent: 100,
        },
        nodes: 5,
        heapUsed: 1234,
        stopReason: 'block_ended',
        // The block ended one poll before the stop resolved.
        stopHeartbeatGapMs: 25,
      });
    });

    it('omits the top Kibana frame message suffix when the profile has no Kibana call frames', async () => {
      profile = {
        nodes: [
          node(1, '(root)', { children: [2] }),
          node(2, 'zodParse', { url: `file://${ROOT}/node_modules/zod/index.js`, lineNumber: 4 }),
        ],
        startTime: 0,
        endTime: 1_000_000,
        samples: [2],
        timeDeltas: [500_000],
      };
      startProfiling();
      await profiledBlock(1_500);
      expect(profileLines()[0][0]).toMatch(
        /^Event loop block profiled: block ~1500ms \(profiled after ~1000ms, profiler start took ~\d+ms\), 1 samples; stopped: block_ended$/
      );
      expect(profileMeta().topKibanaFrame).toBeUndefined();
    });

    it('stops a capture at the maximum duration while the block goes on, counting every sample up to the stop', async () => {
      // Third sample is at 3_000_000 µs (endTime), busy in spin.
      profile = {
        ...sampledProfile,
        samples: [5, 3, 5],
      };
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      stall(5_000);
      await settle();
      expect(posted()).toContain('Profiler.stop');
      expect(profileMeta()).toMatchObject({
        stopReason: 'max_duration',
        blockedMs: 6_000,
        sampledMs: 2_000,
        coverage: 0.33,
        samples: 2,
      });
      expect(profileMeta()).not.toHaveProperty('stopHeartbeatGapMs');
      expect(profileLines()[0][0]).toMatch(/block ~6000ms so far/);
    });

    it('measures sampledMs for block_ended to the block end on the profile clock, not the stop, and caps coverage at 1', async () => {
      // The first sample (500_000 µs) is the start resolving 500ms into the block, so the block
      // ends at 1_500_000 µs and sampledMs is 1_000ms, not 1_025ms to the stop (endTime).
      profile = {
        nodes: [node(1, '(root)', { children: [2] }), node(2, 'spin')],
        startTime: 0,
        endTime: 1_525_000,
        samples: [2, 2],
        timeDeltas: [500_000, 1_025_000],
      };
      start({ profiling: { ...profilingData, startAfterMs: { starting: 500, running: 500 } } });
      setSlot(Slot.profiling, 1);
      await profiledBlock(1_500, 500);
      expect(profileMeta()).toMatchObject({
        blockedMs: 1_500,
        sampledMs: 1_000,
        coverage: 0.67,
        samples: 1,
      });

      // A max_duration capture measures to endTime; when that exceeds blockedMs, coverage is capped at 1.
      profile = { ...sampledProfile, endTime: 7_000_000 };
      idle(profilingData.cooldownMs.starting);
      beat();
      stall(500);
      await settle();
      stall(profilingData.maxDurationMs.starting);
      await settle();
      expect(profileMeta(1)).toMatchObject({
        stopReason: 'max_duration',
        blockedMs: 5_500,
        sampledMs: 6_000,
        coverage: 1,
      });
    });

    it('profiles a block once, however long it lasts', async () => {
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      stall(profilingData.cooldownMs.running + 10_000);
      await settle();
      resume();
      await settle();
      expect(sessions).toHaveLength(1);
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({
        pastStartAfter: 1,
        profiled: 1,
        captureFailed: 0,
        skippedCooldown: 0,
      });
    });

    it('waits out the cooldown, counting the blocks it skips once each', async () => {
      startProfiling();
      await profiledBlock(1_500);
      block(1_500);
      block(1_500);
      await settle();
      expect(sessions).toHaveLength(1);
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({
        pastStartAfter: 3,
        profiled: 1,
        captureFailed: 0,
        skippedCooldown: 2,
      });
      block(1_500);
      await settle();
      expect(sessions).toHaveLength(2);
    });

    it('starts the cooldown when a capture ends, not when it was requested', async () => {
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      // Stopped at the maximum duration, 6s into the block.
      stall(5_000);
      await settle();
      resume();
      // 60s after the request, but only 55s after the capture ended.
      idle(54_000);
      block(1_500);
      await settle();
      expect(sessions).toHaveLength(1);
      idle(5_000);
      block(1_500);
      await settle();
      expect(sessions).toHaveLength(2);
    });

    it('counts a block that outlasts the cooldown as profiled, not as skipped', async () => {
      startProfiling();
      await profiledBlock(1_500);
      await profiledBlock(
        profilingData.cooldownMs.running + 2_000,
        profilingData.cooldownMs.running
      );
      expect(sessions).toHaveLength(2);
      idle(STATS_INTERVAL_MS);
      expect(totalProfilingStats()).toMatchObject({
        pastStartAfter: 2,
        profiled: 2,
        skippedCooldown: 0,
      });
    });

    it('logs and counts a capture that fails to start, and ends its session', async () => {
      failStart = true;
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to start profiling an event loop block: inspector unavailable',
        { tags: ['event-loop-watchdog'] }
      );
      expect(sessions[0].disconnect).toHaveBeenCalled();
      resume();
      await settle();
      expect(profileLines()).toHaveLength(0);
      jest.advanceTimersByTime(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, captureFailed: 1 });
    });

    it('waits out the cooldown after failing to connect to the main thread', async () => {
      failConnect = true;
      startProfiling();
      block(1_500);
      block(1_500);
      await settle();
      expect(
        logger.warn.mock.calls.filter(([message]) => String(message).startsWith('Failed'))
      ).toEqual([
        [
          'Failed to start profiling an event loop block: inspector not available',
          { tags: ['event-loop-watchdog'] },
        ],
      ]);
      idle(STATS_INTERVAL_MS);
      expect(totalProfilingStats()).toMatchObject({ captureFailed: 1, skippedCooldown: 1 });
    });

    it('counts a failed start once when the block ends before the start fails', async () => {
      failStart = true;
      startProfiling();
      beat();
      stall(1_000);
      resume();
      await settle();
      expect(posted()).not.toContain('Profiler.stop');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to start profiling an event loop block: inspector unavailable',
        { tags: ['event-loop-watchdog'] }
      );
      expect(logger.error).not.toHaveBeenCalled();
      jest.advanceTimersByTime(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, captureFailed: 1 });
    });

    it('logs and counts a capture whose profile fails to stop, and ends its session', async () => {
      failStop = true;
      startProfiling();
      block(1_500);
      await settle();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to process an event loop block profile: Profiler is not started',
        { tags: ['event-loop-watchdog'] }
      );
      expect(sessions[0].disconnect).toHaveBeenCalled();
      expect(profileLines()).toHaveLength(0);
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, captureFailed: 1 });
    });

    it('logs and counts a capture when summarising the profile throws, and keeps the worker running', async () => {
      profile = {
        get nodes(): CpuProfile['nodes'] {
          throw new Error('corrupt profile');
        },
        startTime: 0,
        endTime: 100_000,
      };
      startProfiling();
      block(1_500);
      await settle();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to process an event loop block profile: corrupt profile',
        { tags: ['event-loop-watchdog'] }
      );
      expect(sessions[0].disconnect).toHaveBeenCalled();
      expect(profileLines()).toHaveLength(0);

      // Worker keeps running and profiles a subsequent block after cooldown.
      profile = sampledProfile;
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, captureFailed: 1 });
      block(1_500);
      await settle();
      expect(profileLines()).toHaveLength(1);
    });

    it.each([
      ['while the profiler is starting', () => (startReply = new Promise(() => {}))],
      ['while the profile is stopping', () => (stopReply = new Promise(() => {}))],
    ])("doesn't report a failure when the worker stops %s", async (_, hold) => {
      hold();
      startProfiling();
      block(1_500);
      await settle();
      stop();
      await settle();
      expect(sessions[0].disconnect).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringMatching(/^Failed/),
        expect.anything()
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each([
      ['without samples', { nodes: [node(1, '(root)')], startTime: 0, endTime: 1_000 }],
      [
        'with only idle samples',
        {
          nodes: [node(1, '(root)', { children: [2] }), node(2, '(idle)')],
          startTime: 0,
          endTime: 50_000,
          samples: [2, 2],
          timeDeltas: [10_000, 10_000],
        },
      ],
      [
        'whose busy samples all land after the block ended',
        {
          // The first sample (10_000 µs, idle) is the start resolving 1_000ms into the block, so
          // the block ends at 510_000 µs; the busy sample at 530_000 µs is after it.
          nodes: [node(1, '(root)', { children: [2, 3] }), node(2, '(idle)'), node(3, 'lateWork')],
          startTime: 0,
          endTime: 550_000,
          samples: [2, 3],
          timeDeltas: [10_000, 520_000],
        },
      ],
    ])('counts a capture %s as empty, not profiled', async (_, emptyProfile) => {
      profile = emptyProfile;
      startProfiling();
      await profiledBlock(1_500);
      expect(profileMeta()).toMatchObject({ samples: 0, frames: [], kibanaFrames: [] });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, emptyTooLate: 1 });
    });

    it('counts a block_ended capture with a busy sample at the block end as profiled', async () => {
      // The first sample (10_000 µs, idle) is the start resolving 1_000ms into the block, so the
      // block ends at 510_000 µs: the busy sample there counts, the one at 525_000 µs doesn't.
      profile = {
        nodes: [node(1, '(root)', { children: [2, 3] }), node(2, '(idle)'), node(3, 'inBlockWork')],
        startTime: 0,
        endTime: 525_000,
        samples: [2, 3, 3],
        timeDeltas: [10_000, 500_000, 15_000],
      };
      startProfiling();
      await profiledBlock(1_500);
      expect(profileMeta()).toMatchObject({
        samples: 1,
        frames: [{ name: 'inBlockWork', percent: 100 }],
      });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 1, emptyTooLate: 0 });
    });

    it('leaves out the samples after the block when Profiler.stop resolves late, so a capture with only those is empty', async () => {
      const profiledBlockWithLateStop = async () => {
        let reply = () => {};
        stopReply = new Promise((resolve) => {
          reply = resolve;
        });
        beat();
        stall(1_000);
        await settle();
        stall(500);
        resume();
        // Native work after the block delays the stop by 300ms.
        stall(300);
        reply();
        await settle();
      };
      // The first sample (10_000 µs) is the start resolving 1_000ms into the block, so the block
      // ends at 510_000 µs. The stop is requested at 535_000 µs and resolves at endTime.
      const nodes = [
        node(1, '(root)', { children: [2, 3, 4] }),
        node(2, '(idle)'),
        node(3, 'inBlockWork'),
        node(4, 'postBlockWork'),
      ];
      profile = {
        nodes,
        startTime: 0,
        endTime: 835_000,
        samples: [3, 3, 4, 4],
        timeDeltas: [10_000, 500_000, 100_000, 200_000],
      };
      startProfiling();
      await profiledBlockWithLateStop();
      expect(profileMeta()).toMatchObject({
        stopReason: 'block_ended',
        sampledMs: 500,
        samples: 2,
        frames: [{ name: 'inBlockWork', percent: 100 }],
      });

      profile = {
        nodes,
        startTime: 0,
        endTime: 835_000,
        samples: [2, 4, 4],
        timeDeltas: [10_000, 600_000, 200_000],
      };
      idle(profilingData.cooldownMs.starting);
      await profiledBlockWithLateStop();
      expect(profileMeta(1)).toMatchObject({ samples: 0, frames: [], kibanaFrames: [] });
      idle(STATS_INTERVAL_MS);
      expect(totalProfilingStats()).toMatchObject({ profiled: 1, emptyTooLate: 1 });
    });

    it('counts a capture as emptyTooLate with sampledMs: 0 when the block ends while the profiler is still starting', async () => {
      let releaseStart = () => {};
      startReply = new Promise((resolve) => {
        releaseStart = resolve;
      });
      // Profiler.start resolves 325ms after the block ended, and its first sample (10_000 µs) is
      // busy, after the block. inBlockUntilUs is 10_000 - 325_000 = -315_000 µs, before that
      // sample (reaching the sampledMs clamp at 0).
      profile = {
        nodes: [node(1, '(root)', { children: [2] }), node(2, 'lateWork')],
        startTime: 0,
        endTime: 300_000,
        samples: [2],
        timeDeltas: [10_000],
      };
      startProfiling();
      beat();
      stall(1_000);
      resume();
      // Block has ended and stopCapture was called, but Profiler.start hasn't resolved yet.
      expect(posted()).not.toContain('Profiler.stop');
      stall(300);
      releaseStart();
      await settle();
      expect(posted()).toContain('Profiler.stop');
      expect(profileMeta()).toMatchObject({
        samples: 0,
        sampledMs: 0,
        coverage: 0,
        frames: [],
        kibanaFrames: [],
      });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, emptyTooLate: 1 });
    });

    it('reads heapUsed after the summary is built, and captureDurationMs before it', async () => {
      let callFrameReads = 0;
      let heapReadAfterNodes = false;
      profile = {
        nodes: [
          node(1, '(root)', { children: [2] }),
          {
            id: 2,
            get callFrame() {
              callFrameReads++;
              // Advance the clock during summarising to verify captureDurationMs was read before.
              nowUs += 500_000;
              return { functionName: 'spin', url: `file://${ROOT}/src/spin.ts`, lineNumber: 0 };
            },
          },
        ],
        startTime: 0,
        endTime: 100_000,
        samples: [2],
        timeDeltas: [10_000],
      };
      start({ profiling: profilingData }, () => nowUs, {
        heapUsed: () => {
          heapReadAfterNodes = callFrameReads > 0;
          return 4321;
        },
      });
      setSlot(Slot.profiling, 1);
      await profiledBlock(1_500);
      expect(heapReadAfterNodes).toBe(true);
      expect(profileMeta().heapUsed).toBe(4321);
      // 1_500ms block - 1_000ms startAfter + 25ms resume poll = 525ms (without the 500ms added inside summarizeProfile).
      expect(profileMeta().captureDurationMs).toBe(525);
    });

    it('keeps a worst-case capture log line within 4,094 bytes through createWorkerLogger', async () => {
      // Multi-byte characters ('€' = 3 UTF-8 bytes), quotes ('"' = 2 JSON-escaped bytes) and
      // ASCII suffixes pushed past the 48 B name / 120 B location caps so every sanitised name is
      // exactly 48 JSON-encoded bytes and every location is 120 JSON-encoded bytes.
      const noisyName = `${'"'.repeat(10)}${'€'.repeat(8)}a_tail_pad`;
      const makeUrl = (prefix: string, tag: string) =>
        `file://${ROOT}/${prefix}/${'a_segment/'.repeat(15)}€_${tag}_${'"'.repeat(5)}a.ts`;

      // Caller chains: root(1) -> callerB -> callerA -> kibanaLeaf (-> nonKibanaLeaf for 2 of them)
      // Sample counts picked so percentages render with 3 digits + decimal (e.g. 45.5%, 36.4%).
      profile = {
        nodes: [
          node(1, '(root)', { children: [2, 6, 10] }),
          node(2, `c1_${noisyName}`, { url: makeUrl('src', 'c1'), lineNumber: 99, children: [3] }),
          node(3, `c2_${noisyName}`, {
            url: makeUrl('x-pack', 'c2'),
            lineNumber: 99,
            children: [4],
          }),
          node(4, `k1_${noisyName}`, {
            url: makeUrl('node_modules/@kbn/pkg', 'k1'),
            lineNumber: 99,
            children: [5],
          }),
          node(5, `f1_${noisyName}`, {
            url: makeUrl('node_modules/ext', 'f1'),
            lineNumber: 99,
          }),
          node(6, `c3_${noisyName}`, { url: makeUrl('src', 'c3'), lineNumber: 99, children: [7] }),
          node(7, `c4_${noisyName}`, {
            url: makeUrl('x-pack', 'c4'),
            lineNumber: 99,
            children: [8],
          }),
          node(8, `k2_${noisyName}`, { url: makeUrl('src', 'k2'), lineNumber: 99, children: [9] }),
          node(9, `f2_${noisyName}`, {
            url: makeUrl('node_modules/ext', 'f2'),
            lineNumber: 99,
          }),
          node(10, `c5_${noisyName}`, {
            url: makeUrl('src', 'c5'),
            lineNumber: 99,
            children: [11],
          }),
          node(11, `c6_${noisyName}`, {
            url: makeUrl('x-pack', 'c6'),
            lineNumber: 99,
            children: [12],
          }),
          node(12, `k3_${noisyName}`, { url: makeUrl('src', 'k3'), lineNumber: 99 }),
        ],
        startTime: 0,
        endTime: 10_000_000,
        // 11 busy samples: node 5 x5 (45.5%), node 9 x4 (36.4%), node 12 x2 (18.2%).
        samples: [5, 5, 5, 5, 5, 9, 9, 9, 9, 12, 12],
        timeDeltas: Array.from({ length: 11 }, () => 100_000),
      };
      let reply = () => {};
      stopReply = new Promise((resolve) => {
        reply = resolve;
      });

      jest.replaceProperty(workerThreads, 'isMainThread', false);
      jest.spyOn(process, 'uptime').mockReturnValue(999_999.999_999_999);

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watchdog-line-size-'));
      const logFile = path.join(tmpDir, 'worker.log');
      const fd = fs.openSync(logFile, 'w');
      try {
        const realLogger = createWorkerLogger(
          {
            context: 'metrics.event_loop_watchdog',
            level: 'info',
            format: 'json',
            service: {
              node: { roles: ['background_tasks', 'ui'] },
              version: '9.3.0-SNAPSHOT',
              type: 'kibana',
            },
          },
          WATCHDOG_WORKER_NAME,
          fd
        );
        start(
          {
            profiling: {
              startAfterMs: { starting: 60_000, running: 60_000 },
              maxDurationMs: { starting: 100_000, running: 100_000 },
              cooldownMs: { starting: 60_000, running: 60_000 },
            },
          },
          () => nowUs,
          {
            logger: realLogger,
            heapUsed: () => 9_999_999_999,
          }
        );
        setSlot(Slot.profiling, 1);
        beat();
        // Profiler starts at 60_000ms; stall 100ms before the start reply so profilerStartMs = 100.
        startReply = new Promise((resolve) => setTimeout(resolve, 100));
        stall(60_000);
        stall(100);
        await settle();
        // Block reaches 100_000ms (6 digits), then ends; stop resolves 100ms later (stopHeartbeatGapMs = 125).
        stall(39_900);
        resume();
        stall(100);
        reply();
        await settle();

        expect(realLogger.getDroppedLogLineCount()).toBe(0);
        const lines = fs
          .readFileSync(logFile, 'utf8')
          .trim()
          .split('\n')
          .filter((l) => l.includes('"Event loop block profiled:'));
        expect(lines).toHaveLength(1);
        const lineBytes = Buffer.byteLength(lines[0], 'utf8');
        expect(lineBytes).toBeLessThanOrEqual(4_094);

        const parsed = JSON.parse(lines[0]);
        expect(parsed.message).not.toMatch(/\[truncated\]$/);
        expect(parsed.message).toContain('; top Kibana frame: 45.5% ');
        expect(parsed.kibana.worker).toEqual({ name: WATCHDOG_WORKER_NAME, thread_id: 99 });
        const loggedProfile = parsed.kibana.event_loop_watchdog.profile;
        expect(loggedProfile.frames).toHaveLength(2);
        for (const frame of loggedProfile.frames) {
          expect(jsonByteLength(frame.name)).toBe(MAX_NAME_BYTES);
          expect(jsonByteLength(frame.location)).toBe(MAX_LOCATION_BYTES);
        }
        expect(loggedProfile.kibanaFrames).toHaveLength(3);
        for (const frame of loggedProfile.kibanaFrames) {
          expect(jsonByteLength(frame.name)).toBe(MAX_NAME_BYTES);
          expect(jsonByteLength(frame.location)).toBe(MAX_LOCATION_BYTES);
          expect(frame.callers).toHaveLength(2);
          for (const caller of frame.callers) {
            expect(jsonByteLength(caller.name)).toBe(MAX_NAME_BYTES);
            expect(jsonByteLength(caller.location)).toBe(MAX_LOCATION_BYTES);
          }
        }
        expect(loggedProfile.topKibanaFrame).toEqual({
          location: loggedProfile.kibanaFrames[0].location,
          percent: 45.5,
        });
      } finally {
        fs.closeSync(fd);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        jest.restoreAllMocks();
      }
    });

    it('reports the active profiling time per stats period, splitting a capture across two', async () => {
      startProfiling();
      // The first stats line is 60s after start: the capture is requested 1s before it.
      idle(STATS_INTERVAL_MS - 2_000);
      beat();
      stall(1_000);
      await settle();
      stall(2_000);
      expect(lastStats().profiling.profilingActiveMs).toBe(1_000);
      resume();
      await settle();
      expect(profileMeta().captureDurationMs).toBe(2_025);
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling.profilingActiveMs).toBe(1_025);
    });

    it('reports the largest heartbeat gap between the block end and the stop resolving', async () => {
      let reply = () => {};
      stopReply = new Promise((resolve) => {
        reply = resolve;
      });
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      resume();
      // The main thread is busy with the stop: no heartbeat until it replies.
      stall(300);
      reply();
      await settle();
      expect(profileMeta()).toMatchObject({ stopReason: 'block_ended', stopHeartbeatGapMs: 325 });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling.maxStopHeartbeatGapMs).toBe(325);
    });

    it('ends a running capture when the worker stops', async () => {
      startProfiling();
      beat();
      stall(1_000);
      await settle();
      stop();
      expect(sessions[0].disconnect).toHaveBeenCalled();
    });
  });
});
