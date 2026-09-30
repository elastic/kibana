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
import type { Root } from '@kbn/core-root-server-internal';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import {
  createTestServers,
  request,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

const FLAG = 'core.eventLoopWatchdog.enabled';
const logFilePath = Path.join(Os.tmpdir(), `event_loop_watchdog_flag_${process.pid}.log`);

interface LogRecord {
  message: string;
  log: { logger: string; level: string };
  kibana?: {
    event_loop_watchdog?: {
      blockedMs: number;
      candidates: Array<{ type: string; id: string }>;
      cpuRatio: number;
      profile?: { verdict: string; frames: Array<{ location: string }> };
    };
  };
}

const readLogs = (): LogRecord[] =>
  Fs.existsSync(logFilePath)
    ? Fs.readFileSync(logFilePath, 'utf8')
        .split('\n')
        .slice(0, -1)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as LogRecord)
        .filter(({ log }) => log.logger === 'metrics.event_loop_watchdog')
    : [];

const countMessages = (pattern: RegExp) =>
  readLogs().filter(({ message }) => pattern.test(message)).length;

const reports = () =>
  readLogs().filter((record) => record.kibana?.event_loop_watchdog?.blockedMs !== undefined);

const waitFor = async (predicate: () => boolean, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(50);
  }
  throw new Error('timed out waiting for condition');
};

function blockLikeAMisbehavingTask(ms: number) {
  const until = Date.now() + ms;
  while (Date.now() < until);
}

describe('event loop watchdog feature flag (Kibana root)', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let coreStart: InternalCoreStart;
  let outputFd: number;
  const originalThreadsStart = ThreadsService.prototype.start;

  const setFlag = (value: boolean) =>
    request
      .put(root, '/internal/core/_settings')
      .set('Elastic-Api-Version', '1')
      .send({ 'feature_flags.overrides': { [FLAG]: value } })
      .expect(200);

  const runTask = (taskType: string, id: string, blockMs: number) =>
    coreStart.executionContext.withContext(
      { type: 'task manager', name: `run ${taskType}`, id, description: 'run task' },
      async () => {
        await sleep(10);
        blockLikeAMisbehavingTask(blockMs);
      }
    );

  beforeAll(async () => {
    Fs.rmSync(logFilePath, { force: true });
    outputFd = Fs.openSync(logFilePath, 'a');
    // Capture the independent console sink in the same file as main-thread lifecycle logs.
    jest
      .spyOn(ThreadsService.prototype, 'start')
      .mockImplementation(function (this: ThreadsService) {
        const threads = originalThreadsStart.call(this);
        return {
          createWorker: (options) =>
            threads.createWorker({
              ...options,
              options: {
                ...options.options,
                workerData: { ...options.options.workerData, outputFd },
              },
            }),
        };
      });
    const { startES, startKibana } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        kbn: {
          coreApp: { allowDynamicConfigOverrides: true },
          server: { restrictInternalApis: false },
          ops: {
            eventLoopWatchdog: {
              threshold: '200ms',
              heartbeatInterval: '20ms',
              liveNoticeInterval: '300ms',
              profileAfter: '500ms',
              profileCooldown: '0s',
            },
          },
          logging: {
            appenders: {
              file: { type: 'file', fileName: logFilePath, layout: { type: 'json' } },
              diagnostic: { type: 'console', layout: { type: 'json' } },
            },
            loggers: [
              {
                name: 'metrics.event_loop_watchdog',
                level: 'debug',
                appenders: ['file', 'diagnostic'],
              },
            ],
          },
        },
      },
    });
    esServer = await startES();
    ({ root, coreStart } = await startKibana());
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
    jest.restoreAllMocks();
    Fs.closeSync(outputFd);
    Fs.rmSync(logFilePath, { force: true });
  });

  it('is disabled by default', async () => {
    await sleep(500);
    expect(countMessages(/watchdog started/)).toBe(0);
  });

  it('starts when the flag is enabled and attributes blocks to in-flight tasks', async () => {
    await setFlag(true);
    await waitFor(() => countMessages(/profiler ready/) === 1);

    await runTask('test:blocker', 'task-1', 1_000);
    await waitFor(() => reports().length === 1);

    const [report] = reports();
    expect(report.log.level).toBe('WARN');
    expect(report.kibana?.event_loop_watchdog).toEqual(
      expect.objectContaining({
        blockedMs: expect.any(Number),
        candidates: [expect.objectContaining({ type: 'test:blocker', id: 'task-1' })],
        cpuRatio: expect.any(Number),
      })
    );
  });

  it('profiles blocks lasting at least profileAfter', async () => {
    // The profiler needs time to start and to attribute samples in a Kibana-sized process, so the
    // block must continue well beyond `profileAfter` (500ms here) to yield frames.
    await runTask('test:blocker', 'task-profiled', 2_500);
    await waitFor(() => reports().length === 2);

    const profile = reports()[1].kibana?.event_loop_watchdog?.profile;
    expect(profile).toEqual(expect.objectContaining({ verdict: 'profiled' }));
    expect(profile?.frames[0].location).toMatch(/event_loop_watchdog_flag\.test\.ts:\d+$/);
  });

  it('stops when the flag is disabled', async () => {
    await setFlag(false);
    await waitFor(() => countMessages(/watchdog stopped/) === 1);

    await runTask('test:blocker', 'task-2', 600);
    await sleep(1_000);
    expect(reports()).toHaveLength(2);
  });

  it('starts again when re-enabled, with a single worker', async () => {
    await setFlag(true);
    await waitFor(() => countMessages(/worker ready/) === 2);

    await runTask('test:blocker', 'task-3', 600);
    await waitFor(() => reports().length === 3);
    await sleep(500);

    expect(reports()).toHaveLength(3);
    expect(reports()[2].kibana?.event_loop_watchdog?.candidates).toEqual([
      expect.objectContaining({ id: 'task-3' }),
    ]);
    expect(countMessages(/watchdog started/)).toBe(2);
    expect(countMessages(/worker ready/)).toBe(2);
  });
});
