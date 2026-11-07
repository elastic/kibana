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
import type { ProfileLogMeta, StatsLogMeta, WatchdogWorkerData } from './types';
import type { CpuProfile, InspectorSession } from './profile_capture';
import { ONGOING_REPORT_AFTER_MS, REPORT_REFILL_MS, SLOT_COUNT, Slot } from './constants';

const STATS_INTERVAL_MS = 60_000;

describe('runWatchdogWorker', () => {
  let nowUs: number;
  let shared: BigInt64Array;
  let dropped: number;
  let logger: jest.Mocked<WorkerLogger>;
  let stop: () => void;
  let sessions: Array<jest.Mocked<InspectorSession>>;
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
        profiling: {
          startAfterMs: { starting: 30_000, running: 30_000 },
          maxDurationMs: { starting: 10_000, running: 10_000 },
          cooldownMs: { starting: 60_000, running: 60_000 },
        },
        ...overrides,
      },
      { logger, nowUs: readClock, heapUsed: () => 1234, createSession }
    );
  };
  const node = (id: number, functionName: string) => ({ id, callFrame: { functionName } });
  const sampledProfile: CpuProfile = {
    nodes: [node(1, '(root)'), node(2, 'spin'), node(3, '(idle)')],
    startTime: 0,
    endTime: 3_000_000,
    samples: [2, 2, 3],
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
      connectToMainThread: jest.fn(),
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
  const lastStats = () => {
    const lines = logger.info.mock.calls.filter(([message]) =>
      String(message).startsWith('Event loop watchdog stats')
    );
    return (lines[lines.length - 1][1] as StatsLogMeta).kibana.event_loop_watchdog.stats;
  };
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
  const statsMeta = (call = 0) =>
    (logger.info.mock.calls[call][1] as StatsLogMeta).kibana.event_loop_watchdog.stats;

  beforeEach(() => {
    jest.useFakeTimers();
    nowUs = 1_000_000_000;
    dropped = 0;
    sessions = [];
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

    it('judges each phase against its own start threshold', async () => {
      start({ profiling: { ...profilingData, startAfterMs: { starting: 3_000, running: 1_000 } } });
      setSlot(Slot.profiling, 1);
      block(1_500);
      await settle();
      expect(sessions).toHaveLength(0);

      setSlot(Slot.runningSince, nowUs);
      block(1_500);
      await settle();
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
        /^Event loop block profiled: block ~\d+ms \(profiled after ~1000ms, profiler start took ~\d+ms\), 3 samples; stopped: block_ended$/
      );
      expect(profileMeta()).toEqual({
        phase: 'starting',
        blockedMs: expect.any(Number),
        profiledAfterMs: 1_000,
        profilerStartMs: expect.any(Number),
        sampledMs: 2_000,
        coverage: 1,
        profilingActiveMs: 1_025,
        samples: 3,
        nodes: 3,
        heapUsed: 1234,
        stopReason: 'block_ended',
        // The block ended one poll before the stop resolved.
        stopHeartbeatGapMs: 25,
      });
    });

    it('stops a capture at the maximum duration while the block goes on', async () => {
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
        coverage: 0.33,
      });
      expect(profileMeta()).not.toHaveProperty('stopHeartbeatGapMs');
      expect(profileLines()[0][0]).toMatch(/block ~6000ms so far/);
    });

    it('caps the coverage at 1 when the profile outlasts the block', async () => {
      startProfiling();
      block(1_500);
      await settle();
      expect(profileMeta()).toMatchObject({ blockedMs: 1_500, sampledMs: 2_000, coverage: 1 });
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
      block(1_500);
      await settle();
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
      ['without samples', { nodes: [node(1, '(root)')], startTime: 0, endTime: 1_000 }, 0],
      [
        'with only idle samples',
        {
          nodes: [node(1, '(root)'), node(2, '(idle)')],
          startTime: 0,
          endTime: 20_000,
          samples: [2, 2],
          timeDeltas: [10_000, 10_000],
        },
        2,
      ],
    ])('counts a capture %s as empty, not profiled', async (_, emptyProfile, samples) => {
      profile = emptyProfile;
      startProfiling();
      block(1_500);
      await settle();
      expect(profileMeta()).toMatchObject({ samples });
      idle(STATS_INTERVAL_MS);
      expect(lastStats().profiling).toMatchObject({ profiled: 0, emptyTooLate: 1 });
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
      expect(profileMeta().profilingActiveMs).toBe(2_025);
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
