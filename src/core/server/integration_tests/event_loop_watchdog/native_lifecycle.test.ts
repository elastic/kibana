/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import Path from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';
import { REPO_ROOT } from '@kbn/repo-info';
import { loadNativeProfiler } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/native_profiler';

describe('native request abandonment', () => {
  const path = Path.resolve(REPO_ROOT, 'data/event_loop_native/lifecycle/profiler.node');
  let worker: Worker;
  let target: number;
  const receive = async (): Promise<string> => {
    const [message] = await once(worker, 'message');
    return message as string;
  };
  const idleElu = async (): Promise<number> => {
    const start = performance.eventLoopUtilization();
    await sleep(300);
    return performance.eventLoopUtilization(start).utilization;
  };

  beforeAll(() => {
    execFileSync(
      process.execPath,
      [
        Path.resolve(
          REPO_ROOT,
          'src/core/packages/metrics/server-internal/src/event_loop_watchdog/native/build.ts'
        ),
        Path.resolve(Path.dirname(process.execPath), '../include/node'),
        Path.dirname(path),
      ],
      { cwd: REPO_ROOT, stdio: 'pipe' }
    );
  });
  beforeEach(async () => {
    target = loadNativeProfiler(path).initialize(10101);
    worker = new Worker(
      `
      const { parentPort, workerData } = require('node:worker_threads');
      const binding = require(workerData.path);
      let request;
      parentPort.on('message', (command) => {
        if (command === 'many') {
          for (let i = 0; i < 40; i++) {
            binding.abandon(binding.request(workerData.target, true));
          }
          parentPort.postMessage('many abandoned');
        } else if (command === 'start') {
          request = binding.request(workerData.target, true);
          // Leave the completed start unpolled: the caller disconnects before its ack.
          setTimeout(() => parentPort.postMessage('started'), 100);
        } else {
          binding.abandon(request);
          parentPort.postMessage('abandoned');
        }
      });
      parentPort.postMessage('ready');
    `,
      { eval: true, workerData: { path, target } }
    );
    await receive();
  });
  afterEach(async () => {
    await worker.terminate();
    loadNativeProfiler(path).dispose(target);
  });

  it('removes pending requests without exhausting the 32-request queue', async () => {
    const reply = receive();
    worker.postMessage('many');
    expect(await reply).toBe('many abandoned');
    await sleep(100);
    expect(await idleElu()).toBeLessThan(0.2);
  });

  it('stops a completed but unpolled start on the target isolate', async () => {
    let reply = receive();
    worker.postMessage('start');
    expect(await reply).toBe('started');
    expect(await idleElu()).toBeGreaterThan(0.2);
    reply = receive();
    worker.postMessage('abandon');
    expect(await reply).toBe('abandoned');
    await sleep(100);
    expect(await idleElu()).toBeLessThan(0.2);
  });
});
