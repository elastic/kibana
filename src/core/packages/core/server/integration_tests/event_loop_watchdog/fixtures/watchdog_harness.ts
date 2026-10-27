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

import { writeSync } from 'node:fs';
import Path from 'node:path';
import type { Logger } from '@kbn/logging';
import { EventLoopWatchdog } from '@kbn/core-metrics-server-internal';

// The last argument: `node -e <code> <scenario>` puts it at argv[1].
const scenario = process.argv[process.argv.length - 1];
const STATS_INTERVAL_MS = 1_000;

const MAIN_LOG_FD = 3;
const mainLogLines: string[] = [];
const writeMainLogLine = (level: string, message: string) =>
  writeSync(MAIN_LOG_FD, `${JSON.stringify({ level, message })}\n`);
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
const waitForLogLine = async (text: string, timeoutMs: number) => {
  const end = Date.now() + timeoutMs;
  while (!mainLogLines.some((line) => line.includes(text))) {
    if (Date.now() > end) {
      throw new Error(`Timed out waiting for a log line containing "${text}"`);
    }
    await sleep(50);
  }
};

const create = (workerEntry?: string) =>
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
    workerEntry,
  });

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
  exhaust: async () => {
    const watchdog = create(Path.resolve(__dirname, 'throwing_entry.ts'));
    watchdog.start();
    await waitForLogLine('exhausted', 60_000);
    await watchdog.stop();
  },
  oom: async () => {
    const watchdog = create(Path.resolve(__dirname, 'oom_entry.ts'));
    watchdog.start();
    await waitForLogLine('(oom,', 60_000);
    await watchdog.stop();
  },
};

scenarios[scenario]().then(
  () => writeMainLogLine('info', 'harness done'),
  (error) => {
    writeMainLogLine('error', error.message);
    process.exitCode = 1;
  }
);
