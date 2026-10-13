/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import Os from 'node:os';
import Path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Script } from 'node:vm';
import { setTimeout as sleep } from 'node:timers/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/event_loop_watchdog';
import type { CpuProfile } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/profile_summary';

const profiling = { afterMs: 1_000, maxMs: 5_000, cooldownMs: 60_000 };

function spinTheEventLoop(ms: number) {
  const until = performance.now() + ms;
  let counter = 0;
  while (performance.now() < until) counter++;
  return counter;
}

const waitFor = async <T>(fn: () => T | undefined, timeoutMs = 15_000): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = fn();
    if (value !== undefined) return value;
    await sleep(20);
  }
  throw new Error('timed out waiting for condition');
};

/** A running CPU profiler makes an idle event loop report ~70% utilisation. */
const idleUtilization = async (ms: number) => {
  const start = performance.eventLoopUtilization();
  await sleep(ms);
  return performance.eventLoopUtilization(start).utilization;
};

describe.each([
  { backend: 'inspector', nativeAddonPath: undefined },
  {
    backend: 'native eager',
    nativeAddonPath: Path.resolve(REPO_ROOT, 'data/event_loop_native/profiler.node'),
  },
])('EventLoopWatchdog (real worker, $backend profiler)', ({ nativeAddonPath }) => {
  let logger: MockedLogger;
  let watchdog: EventLoopWatchdog;
  let diagnosticDir: string;

  const messages = (level: 'info' | 'warn' | 'error') =>
    logger[level].mock.calls.map(([message]) => String(message));
  const profileLog = (level: 'info' | 'warn' = 'warn') =>
    logger[level].mock.calls.find(([message]) =>
      String(message).startsWith('Event loop block profile')
    );
  const metaOf = (meta: unknown) =>
    (meta as { kibana: { event_loop_watchdog: { profile: any } } }).kibana.event_loop_watchdog
      .profile;

  beforeAll(() => {
    if (nativeAddonPath) {
      execFileSync(
        process.execPath,
        [
          Path.resolve(
            REPO_ROOT,
            'src/core/packages/metrics/server-internal/src/event_loop_watchdog/native/build.ts'
          ),
          Path.resolve(Path.dirname(process.execPath), '../include/node'),
          Path.dirname(nativeAddonPath),
        ],
        { cwd: REPO_ROOT, stdio: 'pipe' }
      );
    }
  });

  beforeEach(async () => {
    logger = loggerMock.create();
    diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-'));
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: REPO_ROOT,
      diagnosticDir,
      profiling,
      nativeAddonPath,
    });
    watchdog.start();
    await waitFor(() =>
      messages('info').find((message) => message.startsWith('Event loop watchdog started'))
    );
    await sleep(300); // let the worker start polling
  });

  afterEach(async () => {
    await watchdog.dispose();
    Fs.rmSync(diagnosticDir, { recursive: true, force: true });
  });

  it('profiles an egregious block while it lasts, locating the blocking code', async () => {
    spinTheEventLoop(2_500);
    const [message, meta] = await waitFor(() => profileLog());
    const profile = metaOf(meta);
    expect(message).toMatch(/profiled after ~1\d{3}ms, profiler start took ~\d+ms/);
    // the spin is the busy frame, and this test file is the Kibana code it ran from
    expect(message).toContain('Kibana code: ');
    expect(profile.kibanaFrames[0].location).toContain('event_loop_watchdog.test.ts');
    expect(profile).toMatchObject({ phase: 'startup', profiled: 1 });
    // sampled at ~99Hz from when profiling started until the block ended
    expect(profile.samples).toBeGreaterThan(50);
    expect(profile.samples).toBeLessThan(200);

    expect(Path.dirname(profile.file)).toBe(diagnosticDir);
    expect(Path.basename(profile.file)).toMatch(
      /^event-loop-block-startup-002\d{3}ms-.*\.cpuprofile$/
    );
    const written: CpuProfile = JSON.parse(Fs.readFileSync(profile.file, 'utf8'));
    expect(written.samples.length).toBeGreaterThan(50);
    expect(logger.error).not.toHaveBeenCalled();
    // the profiler is stopped once the profile is taken
    expect(await idleUtilization(500)).toBeLessThan(0.2);
  });

  it('repeatedly profiles code compiled after preparation, retaining fast native activation', async () => {
    await watchdog.dispose();
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: REPO_ROOT,
      diagnosticDir,
      nativeAddonPath,
      profiling: { afterMs: 400, maxMs: 5_000, cooldownMs: 0 },
    });
    watchdog.start();
    await sleep(300);
    for (let trial = 0; trial < 3; trial++) {
      const file = Path.join(REPO_ROOT, 'src', `late_block_fixture_${trial}.js`);
      const block = new Script(
        `(function lateBlock(milliseconds) {
          const until = Date.now() + milliseconds;
          let counter = 0;
          while (Date.now() < until) counter++;
          return counter;
        })`,
        { filename: file }
      ).runInThisContext() as (milliseconds: number) => number;
      block(1_200);
      const captures = await waitFor(() => {
        const profiles = [...logger.warn.mock.calls, ...logger.info.mock.calls].filter(
          ([message]) => String(message).startsWith('Event loop block profile')
        );
        return profiles.length === trial + 1 ? profiles : undefined;
      });
      const [, meta] = captures.find(([, entry]) => metaOf(entry).profiled === trial + 1) ?? [];
      const captured = metaOf(meta);
      expect(captured.samples).toBeGreaterThan(0);
      if (nativeAddonPath) {
        // The retained eager map must resolve newly compiled scripts, not just old callers.
        expect(
          captured.kibanaFrames.some((frame: { location: string }) =>
            frame.location.includes(`late_block_fixture_${trial}.js`)
          )
        ).toBe(true);
        expect(captured.profilerStartMs).toBeLessThan(500);
      }
      expect(await idleUtilization(300)).toBeLessThan(0.2);
    }
  });

  it('does not profile shorter blocks', async () => {
    spinTheEventLoop(500);
    await waitFor(() =>
      messages('warn').find((message) => message.startsWith('Event loop blocked for ~'))
    );
    await sleep(500);
    expect(profileLog()).toBeUndefined();
    expect(Fs.readdirSync(diagnosticDir)).toEqual([]);
  });

  it('names running blocks once startup is over', async () => {
    watchdog.markRunning();
    await sleep(200); // a block starts at the last heartbeat: let one follow the mark
    spinTheEventLoop(1_500);
    const [, meta] = await waitFor(() => profileLog());
    expect(Path.basename(metaOf(meta).file)).toMatch(/^event-loop-block-running-001\d{3}ms-/);
  });

  it('never leaves the profiler running when stopped in the middle of a profile', async () => {
    spinTheEventLoop(1_500); // profiling started during the block...
    await watchdog.stop(); // ...and the worker is terminated before it took the profile
    expect(await idleUtilization(500)).toBeLessThan(0.2);
    expect(messages('info')).toContain('Event loop watchdog stopped');
  });
});
