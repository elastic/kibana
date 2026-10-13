/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'node:perf_hooks';
import { Script } from 'node:vm';
import { setTimeout as sleep } from 'node:timers/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/event_loop_watchdog';

const profiling = { afterMs: 300, maxMs: 5_000, cooldownMs: 60_000, sampleIntervalMs: 100 };

function spinTheEventLoop(ms: number) {
  const until = performance.now() + ms;
  let counter = 0;
  while (performance.now() < until) counter++;
  return counter;
}

// A `debugger;` statement, as dependencies may contain (compiled at runtime, outside lint).
const debuggerStatement = new Script('debugger; 1;');
const runDebuggerStatement = () => debuggerStatement.runInThisContext();

const waitFor = async <T>(fn: () => T | undefined, timeoutMs = 15_000): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = fn();
    if (value !== undefined) return value;
    await sleep(20);
  }
  throw new Error('timed out waiting for condition');
};

describe('EventLoopWatchdog (real worker, real debugger)', () => {
  let logger: MockedLogger;
  let watchdog: EventLoopWatchdog;

  const messages = (level: 'info' | 'warn') =>
    logger[level].mock.calls.map(([message]) => String(message));
  const samplesLog = () =>
    logger.warn.mock.calls.find(([message]) =>
      String(message).startsWith('Event loop block stack samples')
    );

  beforeEach(async () => {
    logger = loggerMock.create();
    watchdog = new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: REPO_ROOT,
      profiling,
    });
    watchdog.start();
    await waitFor(() =>
      messages('info').find((message) => message.startsWith('Event loop watchdog debugger enabled'))
    );
    await sleep(200);
  });

  afterEach(async () => {
    await watchdog.stop();
  });

  it('samples the stack during a block, locating the blocking code', async () => {
    spinTheEventLoop(1_500);
    const [message, meta] = await waitFor(() => samplesLog());
    const samples = (meta as { kibana: { event_loop_watchdog: { samples: any } } }).kibana
      .event_loop_watchdog.samples;
    expect(samples.kibanaFrames[0].location).toContain('event_loop_watchdog.test.ts');
    // ~10Hz from ~300ms into a 1.5s block
    expect(samples.samples).toBeGreaterThanOrEqual(5);
    expect(samples.firstSampleAfterMs).toBeLessThan(1_000);
    expect(samples.pauseMsMedian).toBeGreaterThan(0);
    expect(message).toMatch(/first sample after ~\d+ms/);
  });

  it('does not sample shorter blocks', async () => {
    spinTheEventLoop(250);
    await waitFor(() =>
      messages('warn').find((message) => message.startsWith('Event loop blocked for ~'))
    );
    await sleep(300);
    expect(samplesLog()).toBeUndefined();
  });

  it('does not pause on `debugger;` statements', async () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) runDebuggerStatement();
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('leaves no debugger behind when stopped', async () => {
    await watchdog.stop();
    const start = performance.now();
    runDebuggerStatement();
    expect(performance.now() - start).toBeLessThan(50);
    expect(messages('info')).toContain('Event loop watchdog stopped');
  });
});
