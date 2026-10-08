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
import { performance } from 'node:perf_hooks';
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

describe('EventLoopWatchdog (real worker, real inspector profiler)', () => {
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

  beforeEach(async () => {
    logger = loggerMock.create();
    diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-'));
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: REPO_ROOT,
      diagnosticDir,
      profiling,
    });
    watchdog.start();
    await waitFor(() =>
      messages('info').find((message) => message.startsWith('Event loop watchdog started'))
    );
    await sleep(300); // let the worker start polling
  });

  afterEach(async () => {
    await watchdog.stop();
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
