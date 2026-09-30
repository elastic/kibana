/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { execSync } from 'node:child_process';
import { pbkdf2Sync } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/event_loop_watchdog';
import { ActivityRegistry } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/activity_registry';
import type {
  BlockReport,
  WatchdogOptions,
  WatchdogWorkerData,
} from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/types';

const baseOptions: WatchdogOptions = {
  thresholdMs: 200,
  heartbeatIntervalMs: 20,
  pollIntervalMs: 10,
  liveNoticeIntervalMs: 300,
  maxLiveNoticesPerBlock: 3,
  maxCandidates: 2,
  profileAfterMs: 600,
  maxProfileDurationMs: 10_000,
  profileCooldownMs: 0,
  profileSamplingIntervalUs: 1_000,
  maxFrames: 5,
};

function deliberatelyBlockTheEventLoop(ms: number) {
  const until = Date.now() + ms;
  let counter = 0;
  while (Date.now() < until) counter++;
  return counter;
}

const waitFor = async <T>(fn: () => T | undefined, timeoutMs = 10_000): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = fn();
    if (value !== undefined) return value;
    await sleep(20);
  }
  throw new Error('timed out waiting for condition');
};

describe('EventLoopWatchdog (real worker)', () => {
  let logger: MockedLogger;
  let registry: ActivityRegistry;
  let watchdog: EventLoopWatchdog | undefined;
  let outputPath: string;
  let outputFd: number;
  let heartbeat: BigInt64Array | undefined;

  const records = (): Array<{
    message: string;
    kibana?: { event_loop_watchdog?: BlockReport; worker?: { name: string; thread_id: number } };
  }> =>
    Fs.readFileSync(outputPath, 'utf8')
      .split('\n')
      .slice(0, -1)
      .map((line) => JSON.parse(line));

  const reports = (): BlockReport[] =>
    records().flatMap(({ kibana }) =>
      kibana?.event_loop_watchdog?.blockedMs !== undefined ? [kibana.event_loop_watchdog] : []
    );

  const nextReport = (count: number) =>
    waitFor(() => (reports().length >= count ? reports()[count - 1] : undefined));

  const liveNoticeLines = () =>
    Fs.readFileSync(outputPath, 'utf8')
      .split('\n')
      .filter((line) => line.includes('Event loop still blocked'));

  const debugCount = (text: string) =>
    records().filter(({ message }) => message.includes(text)).length;

  const startWatchdog = async (options: Partial<WatchdogOptions> = {}) => {
    const threads = new ThreadsService().start();
    const createWorker = threads.createWorker;
    threads.createWorker = (params) => {
      heartbeat = new BigInt64Array((params.options.workerData as WatchdogWorkerData).heartbeat);
      return createWorker(params);
    };
    watchdog = new EventLoopWatchdog({
      threads,
      logger,
      logging: { context: 'metrics.event_loop_watchdog', level: 'debug', format: 'json' },
      options: { ...baseOptions, ...options },
      registry,
      sanitizeRoot: REPO_ROOT,
      outputFd,
    });
    const before = debugCount('profiler ready');
    watchdog.start();
    // blocks are only profiled once the worker's inspector session is set up
    await waitFor(() => (debugCount('profiler ready') > before ? true : undefined));
  };

  beforeEach(() => {
    logger = loggerMock.create();
    registry = new ActivityRegistry();
    outputPath = Path.join(Os.tmpdir(), `event_loop_watchdog_${process.pid}_${Date.now()}.log`);
    outputFd = Fs.openSync(outputPath, 'w+');
  });

  afterEach(async () => {
    await watchdog?.stop();
    watchdog = undefined;
    Fs.closeSync(outputFd);
    Fs.rmSync(outputPath, { force: true });
  });

  it('writes live notices during a JS block and reports candidates afterwards', async () => {
    // started before the watchdog was enabled: must still be a candidate
    const endEarly = registry.observe({ type: 'task manager', name: 'run test:early', id: 'a' });
    await startWatchdog();
    const endLate = registry.observe({ type: 'task manager', name: 'run test:late', id: 'b' });
    registry.observe({ type: 'task manager', name: 'run test:third', id: 'c' });
    registry.observe({ type: 'application', name: 'not tracked' });
    await sleep(100);

    deliberatelyBlockTheEventLoop(1_500);
    const blockEndedAt = Date.now();
    // the blocking task finishes right after the block, before the report is posted
    endEarly?.();
    endLate?.();

    const notices = liveNoticeLines();
    expect(notices.length).toBeGreaterThanOrEqual(1);
    expect(notices.length).toBeLessThanOrEqual(baseOptions.maxLiveNoticesPerBlock);
    for (const line of notices) {
      const parsed = JSON.parse(line);
      // written while the main thread was still blocked
      expect(Date.parse(parsed['@timestamp'])).toBeLessThan(blockEndedAt);
      expect(parsed.log).toEqual({ level: 'WARN', logger: 'metrics.event_loop_watchdog' });
      expect(parsed.kibana.worker).toEqual({
        name: 'kibana-event-loop-watchdog',
        thread_id: expect.any(Number),
      });
      expect(parsed.kibana.worker.thread_id).toBeGreaterThan(0);
    }

    const report = await nextReport(1);
    expect(report.blockedMs).toBeGreaterThanOrEqual(1_300);
    expect(report.cpuRatio).toBeGreaterThan(0.5);
    expect(report.candidates).toEqual([
      expect.objectContaining({ kind: 'task', type: 'test:early', id: 'a' }),
      expect.objectContaining({ kind: 'task', type: 'test:late', id: 'b' }),
    ]);
    expect(report.omittedCandidates).toBe(1);
    expect(report.liveNotices).toBe(notices.length);
  });

  it('writes a completed report without servicing the main event loop', async () => {
    await startWatchdog({ profileAfterMs: 10_000 });
    deliberatelyBlockTheEventLoop(500);
    if (!heartbeat) throw new Error('missing test heartbeat');
    // Simulate recovery without yielding: no main-thread message handler can log this report.
    Atomics.store(heartbeat, 0, process.hrtime.bigint() / 1000n);
    const deadline = Date.now() + 2_000;
    while (reports().length === 0 && Date.now() < deadline) {
      /* synchronous observation */
    }
    expect(reports()).toHaveLength(1);
    expect(
      records().find(({ kibana }) => kibana?.event_loop_watchdog?.blockedMs)?.kibana?.worker
        ?.thread_id
    ).toBeGreaterThan(0);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('writes worker errors while the main thread is blocked', async () => {
    let triggerError = () => {};
    const handle = new ThreadsService().start().createWorker<string>({
      filename: `
        require('@kbn/setup-node-env');
        const { workerData, parentPort } = require('node:worker_threads');
        const { createWorkerLogger } = require('@kbn/core-threads-server-internal');
        const logger = createWorkerLogger(workerData.logging, 'test-worker', workerData.outputFd);
        logger.debug('test worker ready');
        parentPort.once('message', () => logger.error(new Error('worker-only failure')));
        setInterval(() => {}, 1000);
      `,
      options: {
        name: 'test-worker',
        eval: true,
        workerData: {
          outputFd,
          logging: { context: 'metrics.event_loop_watchdog', level: 'debug', format: 'json' },
        },
      },
      logger,
      unref: true,
      restart: { maxAttempts: 0, delayMs: 0 },
      onStart: (post) => {
        triggerError = () => post('emit');
      },
      onExit: () => {},
      onExhausted: () => {},
    });
    try {
      handle.start();
      await waitFor(
        () => records().some(({ message }) => message === 'test worker ready') || undefined
      );
      const startedAt = Date.now();
      triggerError();
      deliberatelyBlockTheEventLoop(500);
      const endedAt = Date.now();
      const errorLine = Fs.readFileSync(outputPath, 'utf8')
        .split('\n')
        .find((line) => line.includes('worker-only failure'));
      expect(errorLine).toBeDefined();
      const error = JSON.parse(errorLine ?? '{}');
      expect(Date.parse(error['@timestamp'])).toBeGreaterThanOrEqual(startedAt);
      expect(Date.parse(error['@timestamp'])).toBeLessThan(endedAt);
      expect(error.log.level).toBe('ERROR');
      expect(error.error.message).toBe('worker-only failure');
      expect(error.kibana.worker.thread_id).toBeGreaterThan(0);
      expect(logger.error).not.toHaveBeenCalled();
    } finally {
      await handle.stop();
    }
  });

  it('reports syscall blocks with a low CPU ratio', async () => {
    await startWatchdog();
    execSync('sleep 1.2');

    expect(liveNoticeLines().length).toBeGreaterThanOrEqual(1);
    const report = await nextReport(1);
    expect(report.cpuRatio).toBeLessThan(0.3);
  });

  it('reports native CPU-bound blocks with a high CPU ratio', async () => {
    await startWatchdog();
    const started = Date.now();
    pbkdf2Sync('password', 'salt', 6_000_000, 64, 'sha512');
    const blockedMs = Date.now() - started;

    const report = await nextReport(1);
    expect(blockedMs).toBeGreaterThan(baseOptions.thresholdMs * 2);
    expect(report.cpuRatio).toBeGreaterThan(0.5);
  });

  describe('profiling', () => {
    it('profiles blocks that last at least profileAfter and reports the stack', async () => {
      await startWatchdog();

      deliberatelyBlockTheEventLoop(1_500);
      const report = await nextReport(1);
      expect(report.profile?.verdict).toBe('profiled');
      expect(report.profile?.startAckLatencyMs).toEqual(expect.any(Number));
      // V8 may inline the named function into its (transpiled) caller, so assert on location
      const [top] = report.profile?.frames ?? [];
      expect(top.location).toMatch(
        /^src\/core\/server\/integration_tests\/event_loop_watchdog\/event_loop_watchdog\.test\.ts:\d+$/
      );
      expect(top.selfPercent).toBeGreaterThan(80);
    });

    it('does not profile blocks shorter than profileAfter', async () => {
      await startWatchdog();

      deliberatelyBlockTheEventLoop(400);
      const report = await nextReport(1);
      expect(report.blockedMs).toBeGreaterThanOrEqual(300);
      expect(report.profile).toBeUndefined();
    });

    it('reports native CPU-bound blocks as inconclusive', async () => {
      await startWatchdog();

      pbkdf2Sync('password', 'salt', 6_000_000, 64, 'sha512');
      const report = await nextReport(1);
      expect(report.profile?.verdict).toBe('inconclusive');
      expect(report.cpuRatio).toBeGreaterThan(0.5);
    });
  });

  it('keeps candidates of back-to-back blocks separate', async () => {
    await startWatchdog({ maxCandidates: 5 });
    for (const id of ['first', 'second', 'third']) {
      const end = registry.observe({ type: 'task manager', name: `run test:${id}`, id });
      deliberatelyBlockTheEventLoop(450);
      end?.();
      // yield just long enough for the heartbeat to resume before the next block
      await sleep(60);
    }

    await nextReport(3);
    expect(reports().map(({ candidates }) => candidates.map(({ id }) => id))).toEqual([
      ['first'],
      ['second'],
      ['third'],
    ]);
  });

  it('stops detecting when stopped and detects again after restart', async () => {
    await startWatchdog();
    await watchdog?.stop();
    deliberatelyBlockTheEventLoop(500);
    await sleep(500);
    expect(reports()).toHaveLength(0);

    await startWatchdog();
    deliberatelyBlockTheEventLoop(500);
    expect((await nextReport(1)).blockedMs).toBeGreaterThanOrEqual(400);
  });
});
