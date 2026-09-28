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
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/event_loop_watchdog';
import { ActivityRegistry } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/activity_registry';
import type {
  BlockReport,
  WatchdogOptions,
} from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/types';

const baseOptions: WatchdogOptions = {
  thresholdMs: 200,
  heartbeatIntervalMs: 20,
  pollIntervalMs: 10,
  liveNoticeIntervalMs: 300,
  maxLiveNoticesPerBlock: 3,
  maxProfileDurationMs: 10_000,
  profileCooldownMs: 0,
  maxCandidates: 2,
  profileSamplingIntervalUs: 1_000,
  maxFrames: 5,
};

// A named function so that it can be recognised in the profile summary.
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

  const reports = (): BlockReport[] =>
    logger.warn.mock.calls
      .map(([, meta]) => meta as { kibana?: { event_loop_watchdog?: BlockReport } } | undefined)
      .flatMap((meta) =>
        meta?.kibana?.event_loop_watchdog ? [meta.kibana.event_loop_watchdog] : []
      );

  const nextReport = (count: number) =>
    waitFor(() => (reports().length >= count ? reports()[count - 1] : undefined));

  const liveNoticeLines = () =>
    Fs.readFileSync(outputPath, 'utf8')
      .split('\n')
      .filter((line) => line.includes('Event loop still blocked'));

  const startWatchdog = async (options: Partial<WatchdogOptions> = {}) => {
    watchdog = new EventLoopWatchdog({
      logger,
      loggerName: 'metrics.event_loop_watchdog',
      options: { ...baseOptions, ...options },
      registry,
      liveNoticeFormat: 'json',
      sanitizeRoot: REPO_ROOT,
      outputFd,
    });
    const readyCalls = () =>
      logger.debug.mock.calls.filter(([message]) => String(message).includes('worker ready'))
        .length;
    const before = readyCalls();
    watchdog.start();
    await waitFor(() => (readyCalls() > before ? true : undefined));
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

  it('writes live notices during a JS block and reports frames and candidates afterwards', async () => {
    // started before the watchdog was enabled: must still be a candidate
    const endEarly = registry.observe({ type: 'task manager', name: 'run test:early', id: 'a' });
    await startWatchdog();
    const endLate = registry.observe({ type: 'task manager', name: 'run test:late', id: 'b' });
    registry.observe({ type: 'task manager', name: 'run test:third', id: 'c' });
    registry.observe({ type: 'application', name: 'not tracked' });
    await sleep(100);

    deliberatelyBlockTheEventLoop(1_500);
    const blockEndedAt = Date.now();
    // the blocking task finishes right after the block, before the profile is summarised
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
    }

    const report = await nextReport(1);
    expect(report.blockedMs).toBeGreaterThanOrEqual(1_300);
    expect(report.profile.verdict).toBe('profiled');
    expect(report.profile.startLatencyMs).toEqual(expect.any(Number));
    // V8 may inline the named function into its (transpiled) caller, so assert on location
    // and the combined frame/caller description rather than on the leaf function name alone.
    const [top] = report.profile.frames;
    expect(top.location).toMatch(
      /^src\/core\/server\/integration_tests\/event_loop_watchdog\/event_loop_watchdog\.test\.ts:\d+$/
    );
    expect(top.selfPercent).toBeGreaterThan(80);
    expect(report.cpuRatio).toBeGreaterThan(0.5);
    expect(report.candidates).toEqual([
      expect.objectContaining({ kind: 'task', type: 'test:early', id: 'a' }),
      expect.objectContaining({ kind: 'task', type: 'test:late', id: 'b' }),
    ]);
    expect(report.omittedCandidates).toBe(1);
    expect(report.liveNotices).toBe(notices.length);
  });

  it('reports syscall blocks as inconclusive with a low CPU ratio', async () => {
    await startWatchdog();
    execSync('sleep 1.2');

    expect(liveNoticeLines().length).toBeGreaterThanOrEqual(1);
    const report = await nextReport(1);
    expect(report.profile.verdict).toBe('inconclusive');
    expect(report.profile.frames).toEqual([]);
    expect(report.cpuRatio).toBeLessThan(0.3);
  });

  it('reports native CPU-bound blocks as inconclusive with a high CPU ratio', async () => {
    await startWatchdog();
    const started = Date.now();
    pbkdf2Sync('password', 'salt', 6_000_000, 64, 'sha512');
    const blockedMs = Date.now() - started;

    const report = await nextReport(1);
    expect(blockedMs).toBeGreaterThan(baseOptions.thresholdMs * 2);
    expect(report.profile.verdict).toBe('inconclusive');
    expect(report.cpuRatio).toBeGreaterThan(0.5);
  });

  it('applies the profile cooldown to subsequent blocks', async () => {
    await startWatchdog({ profileCooldownMs: 60_000 });
    deliberatelyBlockTheEventLoop(500);
    expect((await nextReport(1)).profile.verdict).toBe('profiled');

    deliberatelyBlockTheEventLoop(500);
    const second = await nextReport(2);
    expect(second.profile).toEqual(
      expect.objectContaining({
        verdict: 'unavailable',
        reason: expect.stringMatching(/rate limit/),
      })
    );
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
