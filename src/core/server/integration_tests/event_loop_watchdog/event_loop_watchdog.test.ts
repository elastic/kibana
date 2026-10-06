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
import Zlib from 'node:zlib';
import { setTimeout as sleep } from 'node:timers/promises';
import { Profile } from 'pprof-format';
import { REPO_ROOT } from '@kbn/repo-info';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  EventLoopWatchdog,
  loadPprof,
} from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/event_loop_watchdog';

const limits = {
  windowMs: 3_000,
  minFlaggedWindowMs: 500,
  maxSessionMs: 60_000,
  maxKeptProfiles: 10,
};

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
  let rotations: number;

  const messages = (level: 'info' | 'warn' | 'error') =>
    logger[level].mock.calls.map(([message]) => String(message));
  const profileLogs = () =>
    logger.warn.mock.calls.filter(([message]) =>
      String(message).startsWith('Event loop block profile')
    );

  beforeEach(async () => {
    logger = loggerMock.create();
    rotations = 0;
    diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-'));
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: REPO_ROOT,
      diagnosticDir,
      limits,
      loadProfiler: async () => {
        const loaded = await loadPprof();
        const stop = loaded.time.stop.bind(loaded.time);
        return {
          ...loaded,
          time: {
            ...loaded.time,
            start: loaded.time.start.bind(loaded.time),
            runWithContext: loaded.time.runWithContext.bind(loaded.time),
            stop: (restart, ...rest) => {
              if (restart) rotations++;
              return stop(restart, ...rest);
            },
          },
        };
      },
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
    'keeps a labelled profile of a %sms block, locating the blocking code',
    async (blockMs) => {
      watchdog.runWithLabels(
        {
          type: 'task manager',
          name: 'run workflow:run',
          id: 'task-id',
          child: { type: 'workflow step', name: 'test.cpuSpin' },
        },
        () => spinTheEventLoop(blockMs)
      );
      const [message, meta] = await waitFor(() => profileLogs()[0]);
      expect(messages('warn').some((m) => m.startsWith('Event loop blocked for ~'))).toBe(true);
      // V8 may inline the hot spin into its caller, so match the source file rather than the name.
      expect(profileTopLocation(meta)).toContain('event_loop_watchdog.test.ts');
      expect(message).toContain('workflow step:test.cpuSpin in task manager:run workflow:run');
      const profile = (meta as { kibana: { event_loop_watchdog: { profile: any } } }).kibana
        .event_loop_watchdog.profile;
      expect(profile).toMatchObject({ scope: 'blocks', kept: `1/${limits.maxKeptProfiles}` });
      expect(profile.samples).toBeGreaterThan(0);

      const decoded = Profile.decode(Zlib.gunzipSync(Fs.readFileSync(profile.file)));
      expect(decoded.sample.length).toBeGreaterThan(0);
      expect(Path.dirname(profile.file)).toBe(diagnosticDir);
      expect(logger.error).not.toHaveBeenCalled();
    }
  );

  it('locates unlabelled blocks too (every sample is timestamped on the epoch clock)', async () => {
    spinTheEventLoop(500);
    const [message, meta] = await waitFor(() => profileLogs()[0]);
    expect(message).toContain('100% unlabelled');
    expect(profileTopLocation(meta)).toContain('event_loop_watchdog.test.ts');
    expect(
      (meta as { kibana: { event_loop_watchdog: { profile: any } } }).kibana.event_loop_watchdog
        .profile.scope
    ).toBe('blocks');
  });

  it('discards windows without blocks', async () => {
    await waitFor(() => (rotations >= 1 ? true : undefined), limits.windowMs * 3);
    expect(profileLogs()).toHaveLength(0);
    expect(Fs.readdirSync(diagnosticDir)).toEqual([]);
  });

  it('ends the session and disposes the profiler on stop', async () => {
    await watchdog.stop();
    expect(
      messages('info').some((m) => m.startsWith('Event loop profiling ended (watchdog stopped)'))
    ).toBe(true);
    // A new session can start after a restart (the native profiler was disposed).
    watchdog.start();
    await waitFor(() =>
      messages('info').filter((m) => m.startsWith('Event loop profiling started')).length === 2
        ? true
        : undefined
    );
  });
});
