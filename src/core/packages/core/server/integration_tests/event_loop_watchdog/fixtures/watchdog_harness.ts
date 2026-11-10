/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Runs in a child process with a piped stdout, the way Kibana runs: the worker writes its log lines
 * to fd 1, and the test reads them there. Main-thread log lines go to fd 3 as JSON, apart from
 * stderr, which also carries whatever Node and the require hook print.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import type { Logger } from '@kbn/logging';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal';
import type { WatchdogProfilingData } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/types';
import { REPORT_BURST } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/constants';

// The last argument: `node -e <code> <scenario>` puts it at argv[1].
const scenario = process.argv[process.argv.length - 1];
const STATS_INTERVAL_MS = 1_000;

const MAIN_LOG_FD = 3;
const mainLogLines: string[] = [];
const writeMainLogLine = (level: string, message: string, at?: number) =>
  writeSync(MAIN_LOG_FD, `${JSON.stringify({ level, message, at })}\n`);
const log =
  (level: string) =>
  (message: string | (() => string)): void => {
    const text = typeof message === 'function' ? message() : message;
    mainLogLines.push(text);
    writeMainLogLine(level, text);
  };
const logger: Logger = {
  trace: () => {},
  debug: () => {},
  info: log('info'),
  warn: log('warn'),
  error: log('error'),
  fatal: log('fatal'),
  log: () => {},
  isLevelEnabled: () => true,
  get: () => logger,
};

const BLOCK_GAP_MS = 500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const blockFor = (ms: number) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // blocks the main thread
  }
};
// V8 runs the CPU profiler's sampler on a thread of its own, which exists only while a profile runs.
const V8_PROFILER_THREAD = 'v8:ProfEvntProc';
const profilerThreadExists = () =>
  readdirSync('/proc/self/task').some((tid) => {
    try {
      return readFileSync(`/proc/self/task/${tid}/comm`, 'utf8').trim() === V8_PROFILER_THREAD;
    } catch {
      return false;
    }
  });
const writeProfilerThreadLine = () => {
  if (process.platform === 'linux') {
    writeMainLogLine('info', `profiler thread ${profilerThreadExists() ? 'running' : 'stopped'}`);
  }
};
const waitForLogLine = async (text: string, timeoutMs: number) => {
  const end = Date.now() + timeoutMs;
  while (!mainLogLines.some((line) => line.includes(text))) {
    if (Date.now() > end) {
      throw new Error(`Timed out waiting for a log line containing "${text}"`);
    }
    await sleep(50);
  }
};

const perPhase = (ms: number) => ({ starting: ms, running: ms });
const NO_PROFILING: WatchdogProfilingData = {
  startAfterMs: perPhase(30_000),
  maxDurationMs: perPhase(10_000),
  cooldownMs: perPhase(60_000),
};
/** Profiles blocks from 1 s, so the scenarios stay short. */
const PROFILING: WatchdogProfilingData = {
  startAfterMs: perPhase(1_000),
  maxDurationMs: perPhase(10_000),
  cooldownMs: perPhase(1_000),
};

const create = (workerEntry?: string, profiling = NO_PROFILING) =>
  new EventLoopWatchdog({
    logger,
    thresholdsMs: { starting: 200, running: 200 },
    statsIntervalMs: STATS_INTERVAL_MS,
    logging: {
      context: 'metrics.event_loop_watchdog',
      level: 'info',
      format: 'json',
      service: { node: { roles: ['background_tasks'] }, version: 'harness', type: 'kibana' },
    },
    profiling,
    workerEntry,
  });

/** Starts the watchdog, marks running and waits a moment, so the next block is a running one. */
const startRunning = async (profiling?: WatchdogProfilingData) => {
  const watchdog = create(undefined, profiling);
  watchdog.start();
  await waitForLogLine('ready', 30_000);
  watchdog.markRunning();
  await sleep(BLOCK_GAP_MS);
  return watchdog;
};

/**
 * Writes a module with many functions that call each other in random chains, so a profile of it
 * has many distinct stacks, like a profile of Kibana. Returns a function that runs for `ms`.
 */
const loadDeepCode = async (functionCount: number, depth: number) => {
  const dir = mkdtempSync(Path.join(Os.tmpdir(), 'watchdog-deep-code-'));
  const file = Path.join(dir, 'deep_code.js');
  const lines = ['let x = 0;', 'const fns = [];'];
  for (let i = 0; i < functionCount; i++) {
    lines.push(
      `fns.push(function f${i}(d, pick) { if (d === 0) { for (let j = 0; j < 2000; j++) x += j; return x; } return fns[pick()](d - 1, pick); });`
    );
  }
  lines.push(
    `module.exports = (ms) => { const end = Date.now() + ms; const pick = () => Math.floor(Math.random() * fns.length); while (Date.now() < end) fns[pick()](${depth}, pick); };`
  );
  writeFileSync(file, lines.join('\n'));
  const { default: run }: { default: (ms: number) => void } = await import(file);
  rmSync(dir, { recursive: true, force: true });
  return run;
};

const scenarios: Record<string, () => Promise<void>> = {
  // 1 block while starting, then 7 while running: 5 warnings, 3 suppressed. Blocks are well over
  // the 200ms threshold, so a briefly stalled worker still has time to poll inside each one, and
  // the gaps between them are long enough that a worker stalled on a busy machine can't see two
  // blocks as one.
  blocks: async () => {
    const watchdog = create();
    watchdog.start();
    await waitForLogLine('ready', 30_000);
    blockFor(500);
    await sleep(BLOCK_GAP_MS);
    watchdog.markRunning();
    await sleep(BLOCK_GAP_MS);
    for (let i = 0; i < 7; i++) {
      blockFor(500);
      await sleep(BLOCK_GAP_MS);
    }
    // Lets the last counts reach a stats log line before stopping.
    await sleep(STATS_INTERVAL_MS * 2);
    await watchdog.stop();
  },
  // Restart 4 is past three failures in a row; the watchdog never runs out of restarts.
  restarts: async () => {
    const watchdog = create(Path.resolve(__dirname, 'throwing_entry.ts'));
    watchdog.start();
    await waitForLogLine('restart 4 in', 60_000);
    await watchdog.stop();
  },
  oom: async () => {
    const watchdog = create(Path.resolve(__dirname, 'oom_entry.ts'));
    watchdog.start();
    await waitForLogLine('(oom,', 60_000);
    await watchdog.stop();
  },
  // Leave time between toggles for the running worker to observe each profiling-state change.
  profiling_toggle: async () => {
    const watchdog = create(Path.resolve(__dirname, 'profiling_slot_entry.ts'));
    watchdog.setProfiling(true);
    watchdog.start();
    await waitForLogLine('ready', 30_000);
    for (const enabled of [false, true]) {
      await sleep(BLOCK_GAP_MS);
      watchdog.setProfiling(enabled);
    }
    await sleep(BLOCK_GAP_MS);
    await watchdog.stop();
  },
  // A block under the start threshold, then one over it: only the second is profiled.
  profile_blocks: async () => {
    const watchdog = await startRunning(PROFILING);
    watchdog.setProfiling(true);
    blockFor(500);
    await sleep(PROFILING.cooldownMs.running + BLOCK_GAP_MS);
    blockFor(4_000);
    await sleep(STATS_INTERVAL_MS * 2);
    await watchdog.stop();
  },
  // The capture stops at its maximum duration while the block goes on; "block ended" is written
  // once it ends, with the time.
  profile_max_duration: async () => {
    const watchdog = await startRunning({ ...PROFILING, maxDurationMs: perPhase(1_000) });
    watchdog.setProfiling(true);
    blockFor(5_000);
    writeMainLogLine('info', 'block ended', Date.now());
    await sleep(STATS_INTERVAL_MS * 2);
    await watchdog.stop();
  },
  // Stopped right after a profiled block ends, while the capture's stop is in flight: the path a
  // watchdog flag change or Kibana shutdown takes.
  profile_shutdown: async () => {
    const watchdog = await startRunning(PROFILING);
    watchdog.setProfiling(true);
    blockFor(3_000);
    await watchdog.stop();
    await sleep(1_000);
    writeProfilerThreadLine();
  },
  // Profiling off right after a profiled block ends: that capture still logs, the next block isn't
  // profiled.
  profile_flag_off: async () => {
    const watchdog = await startRunning(PROFILING);
    watchdog.setProfiling(true);
    blockFor(3_000);
    watchdog.setProfiling(false);
    await sleep(PROFILING.cooldownMs.running + BLOCK_GAP_MS);
    writeMainLogLine('info', 'second block', Date.now());
    blockFor(3_000);
    await sleep(STATS_INTERVAL_MS * 2);
    await watchdog.stop();
  },
  // A 10 s capture of code with many distinct stacks, at the worker's 32 MB limit. Containers run
  // Kibana with --max-old-space-size, which replaces that limit, so this covers other installs.
  profile_large: async () => {
    const run = await loadDeepCode(4_000, 40);
    const watchdog = await startRunning({ ...PROFILING, maxDurationMs: perPhase(10_000) });
    watchdog.setProfiling(true);
    run(12_000);
    await sleep(STATS_INTERVAL_MS * 3);
    await watchdog.stop();
  },
  // The worker crashes while it profiles the main thread; the profiler's thread afterwards shows
  // whether the profiler is still sampling.
  profile_crash: async () => {
    const watchdog = create(Path.resolve(__dirname, 'crash_while_profiling_entry.ts'));
    watchdog.start();
    await waitForLogLine('exited unexpectedly', 30_000);
    await watchdog.stop();
    await sleep(1_000);
    writeProfilerThreadLine();
  },
  // Short blocks use up the warning burst, with one more whose warning is suppressed, then a block
  // that never ends: the test kills the process once the worker reports it.
  permanent_block: async () => {
    await startRunning();
    for (let i = 0; i < REPORT_BURST + 1; i++) {
      blockFor(500);
      await sleep(BLOCK_GAP_MS);
    }
    // Written synchronously, with the time it was written, so the line is out before the main
    // thread blocks.
    writeMainLogLine('info', 'blocking', Date.now());
    for (;;) {
      // blocks the main thread until the process is killed
    }
  },
};

scenarios[scenario]().then(
  () => writeMainLogLine('info', 'harness done'),
  (error) => {
    writeMainLogLine('error', error.message);
    process.exitCode = 1;
  }
);
