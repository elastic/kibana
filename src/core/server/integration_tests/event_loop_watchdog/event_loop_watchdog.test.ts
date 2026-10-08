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
import { setTimeout as sleep } from 'node:timers/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/event_loop_watchdog';
import { createV8CpuProfiler } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/profiling_session';
import {
  sampleTimestamps,
  type CpuProfile,
} from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/profile_summary';

const limits = {
  windowMs: 3_000,
  minFlaggedWindowMs: 500,
  maxSessionMs: 60_000,
};
// one ranked file, then only records: a later, smaller block is logged but not written
const admissionLimits = { maxLargest: 1, minGrowth: 1.25, maxRanked: 1, maxFiles: 10 };

function spinTheEventLoop(ms: number) {
  const until = performance.now() + ms;
  let counter = 0;
  while (performance.now() < until) counter++;
  return counter;
}

const profileTopLocation = (meta: unknown): string => {
  const { frames } = (meta as { kibana: { event_loop_watchdog: { profile: any } } }).kibana
    .event_loop_watchdog.profile;
  return frames
    .slice(0, 2)
    .flatMap(({ location, callers }: { location?: string; callers: string[] }) => [
      location ?? '',
      ...callers,
    ])
    .join(' ');
};

const waitFor = async <T>(fn: () => T | undefined, timeoutMs = 15_000): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = fn();
    if (value !== undefined) return value;
    await sleep(20);
  }
  throw new Error('timed out waiting for condition');
};

describe('EventLoopWatchdog (real worker, real profiler)', () => {
  let logger: MockedLogger;
  let watchdog: EventLoopWatchdog;
  let diagnosticDir: string;
  let starts: number;

  const messages = (level: 'info' | 'warn' | 'error') =>
    logger[level].mock.calls.map(([message]) => String(message));
  const profileLogs = () =>
    logger.warn.mock.calls.filter(([message]) =>
      String(message).startsWith('Event loop block profile')
    );

  beforeEach(async () => {
    logger = loggerMock.create();
    starts = 0;
    diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-'));
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: REPO_ROOT,
      diagnosticDir,
      limits,
      admissionLimits,
      profiler: (() => {
        const profiler = createV8CpuProfiler();
        return {
          start: () => {
            starts++;
            return profiler.start();
          },
        };
      })(),
    });
    watchdog.start();
    await waitFor(() =>
      messages('info').find((message) => message.startsWith('Event loop profiling started'))
    );
    // Let a heartbeat follow the profiler start: a block straight after it would be attributed
    // to the (profiler-caused) start pause.
    await sleep(200);
  });

  afterEach(async () => {
    await watchdog.stop();
    Fs.rmSync(diagnosticDir, { recursive: true, force: true });
  });

  it.each([300, 500, 1_000])(
    'keeps a profile of a %sms block, locating the blocking code',
    async (blockMs) => {
      spinTheEventLoop(blockMs);
      const [, meta] = await waitFor(() => profileLogs()[0]);
      expect(messages('warn').some((m) => m.startsWith('Event loop blocked for ~'))).toBe(true);
      // V8 may inline the hot spin into its caller, so match the source file rather than the name.
      expect(profileTopLocation(meta)).toContain('event_loop_watchdog.test.ts');
      const profile = (meta as { kibana: { event_loop_watchdog: { profile: any } } }).kibana
        .event_loop_watchdog.profile;
      expect(profile).toMatchObject({ scope: 'blocks', kept: 1 });
      // not marked running: Kibana is still starting up
      expect(profile).toMatchObject({ phase: 'startup' });
      expect(Path.basename(profile.file)).toMatch(
        /^event-loop-block-startup-\d{6}ms-.*\.cpuprofile$/
      );
      expect(Path.dirname(profile.file)).toBe(diagnosticDir);
      // roughly the block's share of 99Hz samples was attributed to it
      expect(profile.samples).toBeGreaterThan((blockMs / 1000) * 99 * 0.5);
      expect(profile.samples).toBeLessThan((blockMs / 1000) * 99 * 1.5);

      // a .cpuprofile trimmed to the block and its ±1s context, with the block's samples in it
      const written: CpuProfile = JSON.parse(Fs.readFileSync(profile.file, 'utf8'));
      const timestamps = sampleTimestamps(written);
      expect(written.endTime - written.startTime).toBeLessThanOrEqual(
        (blockMs + 2_000 + 100) * 1000
      );
      expect(timestamps.every((at) => at >= written.startTime && at <= written.endTime)).toBe(true);
      const spinNodes = new Set(
        written.nodes
          .filter(({ callFrame }) => callFrame.url.includes('event_loop_watchdog.test.ts'))
          .map(({ id }) => id)
      );
      expect(written.samples.filter((leaf) => spinNodes.has(leaf)).length).toBeGreaterThan(0);
      expect(logger.error).not.toHaveBeenCalled();
    }
  );

  it('writes only running windows with a larger block, logging the others', async () => {
    watchdog.markRunning();
    await sleep(200); // a block starts at the last heartbeat: let one follow the mark
    spinTheEventLoop(1_000);
    const [, written] = await waitFor(() => profileLogs()[0]);
    expect(
      Path.basename(
        (written as { kibana: { event_loop_watchdog: { profile: any } } }).kibana
          .event_loop_watchdog.profile.file
      )
    ).toMatch(/^event-loop-block-running-001\d{3}ms-/);
    await sleep(200); // let a heartbeat follow the rotation, as after the profiler start
    spinTheEventLoop(300);
    const [message, meta] = await waitFor(() =>
      logger.info.mock.calls.find(([m]) => String(m).startsWith('Event loop block profile #2'))
    );
    expect(message).toMatch(/Not written: not above ~\d+ms/);
    expect(
      (meta as { kibana: { event_loop_watchdog: { profile: any } } }).kibana.event_loop_watchdog
        .profile
    ).toMatchObject({ kept: 2, phase: 'running', notWritten: expect.any(String) });
    expect(Fs.readdirSync(diagnosticDir)).toHaveLength(1);
  });

  it('discards windows without blocks', async () => {
    await waitFor(() => (starts >= 2 ? true : undefined), limits.windowMs * 3);
    expect(profileLogs()).toHaveLength(0);
    expect(Fs.readdirSync(diagnosticDir)).toEqual([]);
  });

  it('ends the session on stop, and starts a new one on restart', async () => {
    await watchdog.stop();
    expect(
      messages('info').some((m) => m.startsWith('Event loop profiling ended (watchdog stopped)'))
    ).toBe(true);
    watchdog.start();
    await waitFor(() =>
      messages('info').filter((m) => m.startsWith('Event loop profiling started')).length === 2
        ? true
        : undefined
    );
  });
});
