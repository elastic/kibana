/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Assert from 'node:assert/strict';
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Script } from 'node:vm';
import { setTimeout as sleep } from 'node:timers/promises';
import { ThreadsService } from '@kbn/core-threads-server-internal';
import type { Logger, LogMeta, LogMessageSource } from '@kbn/logging';
import type { WatchdogLogMeta } from '../types';
import type { CpuProfile } from '../profile_summary';
import { EventLoopWatchdog } from '../event_loop_watchdog';

const run = async (): Promise<void> => {
  const mode = process.argv[2] ?? process.argv[1] ?? 'native';
  Assert(['none', 'metadata', 'inspector', 'native', 'native-lazy', 'native-early'].includes(mode));
  const functions = Number(process.env.BENCH_FUNCTIONS ?? 30000);
  const addon = Path.resolve(process.env.BENCH_ADDON ?? 'data/event_loop_native/profiler.node');
  const diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'native-watchdog-'));
  interface ProfileMeta {
    samples: number;
    profilerStartMs: number;
    profiledAfterMs: number;
    file: string;
  }
  const captures: ProfileMeta[] = [];
  const record = (message: LogMessageSource, meta?: LogMeta): void => {
    const text = typeof message === 'function' ? message() : message;
    const profile = (meta as WatchdogLogMeta | undefined)?.kibana?.event_loop_watchdog?.profile as
      | ProfileMeta
      | undefined;
    if (text.startsWith('Event loop block profile') && profile) captures.push(profile);
  };
  const fail = (message: LogMessageSource | Error): never => {
    throw message instanceof Error
      ? message
      : new Error(typeof message === 'function' ? message() : message);
  };
  const logger: Logger = {
    info: record,
    warn: (message, meta) => record(message instanceof Error ? message.message : message, meta),
    error: fail,
    fatal: fail,
    debug: () => {},
    trace: () => {},
    log: () => {},
    isLevelEnabled: () => true,
    get: () => logger,
  };
  const native = mode !== 'none' && mode !== 'inspector';
  const prepare = () =>
    new EventLoopWatchdog({
      threads: new ThreadsService().start(),
      logger,
      sanitizeRoot: process.cwd(),
      diagnosticDir,
      nativeAddonPath: native ? addon : undefined,
      nativeLogging: mode === 'native-lazy' ? 'lazy' : 'eager',
      profiling: {
        afterMs: mode === 'none' || mode === 'metadata' ? 60000 : 400,
        maxMs: 10000,
        cooldownMs: 0,
      },
    });
  const memoryBefore = process.memoryUsage();
  let watchdog: EventLoopWatchdog | undefined;
  let prepareMs = 0;
  if (mode === 'native-early') {
    const before = performance.now();
    watchdog = prepare();
    prepareMs = performance.now() - before;
  }
  const compileAt = performance.now();
  const fixture = Array.from({ length: functions }, (_, index) => {
    const body = Array.from(
      { length: 50 },
      (_statement, offset) =>
        'value = ((value + ' + (index + offset + 1) + ') * 1.000001) % 100000;'
    ).join('\n');
    const fn = new Script(
      '(function(value) {\n' + body + '\nreturn value; })'
    ).runInThisContext() as (value: number) => number;
    fn(1);
    fn(2);
    return fn;
  });
  const compileMs = performance.now() - compileAt;
  if (mode !== 'native-early') {
    const before = performance.now();
    watchdog = prepare();
    prepareMs = performance.now() - before;
  }

  let result = 0;
  const fixedWork = (): number => {
    const before = performance.now();
    let value = 1;
    for (let index = 0; index < 5000000; index++) value = (value * 1.000001 + index) % 100000;
    result += value;
    return performance.now() - before;
  };
  const blockTheEventLoop = (ms: number): number => {
    const deadline = performance.now() + ms;
    let value = 1;
    let batches = 0;
    while (performance.now() < deadline) {
      for (let index = 0; index < 20000; index++) value = (value * 1.000001 + index) % 100000;
      batches++;
    }
    result += value;
    return batches;
  };
  const timed = async (work: () => Promise<void>) => {
    const before = performance.now();
    const cpu = process.cpuUsage();
    const elu = performance.eventLoopUtilization();
    await work();
    const elapsedMs = performance.now() - before;
    const usage = process.cpuUsage(cpu);
    return {
      elapsedMs,
      cpuMs: (usage.user + usage.system) / 1000,
      elu: performance.eventLoopUtilization(elu).utilization,
      memory: process.memoryUsage(),
    };
  };
  const output: object[] = [];
  Assert(watchdog);
  try {
    watchdog.start();
    watchdog.markRunning();
    await sleep(500);
    fixedWork();
    await sleep(500);
    const idleBefore = await timed(async () => {
      await sleep(1500);
    });
    const workMs: number[] = [];
    for (let trial = 0; trial < 5; trial++) {
      workMs.push(fixedWork());
      await sleep(100);
    }
    await sleep(300);
    const trials = mode === 'none' || mode === 'metadata' ? 3 : 5;
    for (let trial = 0; trial < trials; trial++) {
      // New scripts after initialization exercise live code-map maintenance.
      const late = new Script(
        '(function(value) { return value * ' + (trial + 7) + '; })'
      ).runInThisContext() as (value: number) => number;
      result += late(trial);
      const beforeCount = captures.length;
      const cpu = process.cpuUsage();
      const before = performance.now();
      const batches = blockTheEventLoop(1400);
      const durationMs = performance.now() - before;
      if (mode !== 'none' && mode !== 'metadata') {
        const deadline = performance.now() + 5000;
        while (captures.length === beforeCount && performance.now() < deadline) await sleep(10);
        Assert.equal(captures.length, beforeCount + 1);
        const capture = captures[beforeCount];
        const profile: CpuProfile = JSON.parse(Fs.readFileSync(capture.file, 'utf8'));
        Assert(profile.samples.length > 0);
        const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
        let timestamp = profile.startTime;
        let firstUsefulUs: number | undefined;
        let firstPeriodicUs: number | undefined;
        let namedBlockerSamples = 0;
        for (const [index, id] of profile.samples.entries()) {
          timestamp += profile.timeDeltas[index];
          const node = nodes.get(id);
          if (node?.callFrame.functionName === 'blockTheEventLoop') namedBlockerSamples++;
          const benchmarkFrame = node?.callFrame.url.includes('benchmark.ts');
          if (benchmarkFrame && firstUsefulUs === undefined) {
            firstUsefulUs = timestamp - profile.startTime;
          }
          if (
            benchmarkFrame &&
            index > 0 &&
            timestamp > profile.startTime &&
            firstPeriodicUs === undefined
          ) {
            firstPeriodicUs = timestamp - profile.startTime;
          }
        }
        Assert.notEqual(firstUsefulUs, undefined, 'Benchmark script absent from profile');
        Assert.notEqual(firstPeriodicUs, undefined, 'No periodic blocker sample');
        if (process.env.BENCH_PROFILE_DIR) {
          Fs.mkdirSync(process.env.BENCH_PROFILE_DIR, { recursive: true });
          Fs.copyFileSync(
            capture.file,
            Path.join(
              process.env.BENCH_PROFILE_DIR,
              mode + '-' + process.pid + '-' + trial + '.cpuprofile'
            )
          );
        }
        output.push({
          trial,
          durationMs,
          batches,
          capture,
          firstUsefulFromProfileStartMs: Number(firstUsefulUs) / 1000,
          firstPeriodicFromProfileStartMs: Number(firstPeriodicUs) / 1000,
          firstPeriodicUpperBoundFromHeartbeatMs:
            capture.profiledAfterMs + capture.profilerStartMs + Number(firstPeriodicUs) / 1000,
          namedBlockerSamples,
          nodes: profile.nodes.length,
          samples: profile.samples.length,
        });
      } else {
        output.push({ trial, durationMs, batches });
      }
      const usage = process.cpuUsage(cpu);
      Object.assign(output[output.length - 1], { cpuMs: (usage.user + usage.system) / 1000 });
      await sleep(400);
    }
    const idleAfter = await timed(async () => {
      await sleep(1500);
    });
    const memoryRetained = process.memoryUsage();
    await watchdog.dispose();
    await sleep(100);
    process.stdout.write(
      JSON.stringify({
        mode,
        node: process.version,
        v8: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
        functions,
        prepareMs,
        compileMs,
        memoryBefore,
        memoryRetained,
        memoryDisposed: process.memoryUsage(),
        idleBefore,
        idleAfter,
        workMs,
        output,
        fixture: fixture.length,
        result,
      }) + '\n'
    );
  } finally {
    await watchdog.dispose();
    Fs.rmSync(diagnosticDir, { recursive: true, force: true });
  }
};
void run().catch((error: Error) => {
  process.stderr.write(String(error.stack ?? error) + '\n');
  process.exitCode = 1;
});
