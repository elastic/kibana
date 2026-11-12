/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { constants } from 'node:os';

/**
 * Runs a Playwright command and kills it when it stops printing output.
 *
 * Playwright sometimes hangs after all tests and reporters have finished. Once the JSON report
 * exists the run is over, so a short silence is enough to call it a hang; before that, a long
 * silence is. On a hang the process group is dumped (and Node diagnostic reports requested)
 * before the kill, and the script exits with 124 like `timeout`.
 *
 * Usage: node run_playwright_with_watchdog.ts <json report path> <command> [args...]
 */

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const POST_REPORT_IDLE_TIMEOUT_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 1000;
const DIAGNOSTIC_REPORT_WAIT_MS = 10 * 1000;
const KILL_GRACE_MS = 30 * 1000;
const TIMEOUT_EXIT_CODE = 124;

const [reportPath, command, ...args] = process.argv.slice(2);

if (!reportPath || !command) {
  console.error('Usage: run_playwright_with_watchdog.ts <json report path> <command> [args...]');
  process.exit(1);
}

// The child leads its own process group, so one signal also reaches workers and browsers.
const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const { pid } = child;

const killGroup = (signal: NodeJS.Signals) => {
  if (pid === undefined) {
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    // already gone
  }
};

const dumpProcessGroup = (): number[] => {
  const nodePids: number[] = [];
  const rows = execFileSync('ps', ['-eo', 'pid,pgid,stat,etime,comm,args'], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .map((row) => row.trim())
    .filter((row) => row.split(/\s+/)[1] === String(pid));

  console.log(`Process group ${pid} (pid pgid stat etime comm args):\n${rows.join('\n')}`);

  for (const row of rows) {
    const [rowPid, , , , comm] = row.split(/\s+/);
    if (comm === 'node') {
      nodePids.push(Number(rowPid));
    }
  }
  return nodePids;
};

let lastOutputAt = Date.now();
let killedByWatchdog = false;

child.stdout.on('data', (chunk) => {
  lastOutputAt = Date.now();
  process.stdout.write(chunk);
});
child.stderr.on('data', (chunk) => {
  lastOutputAt = Date.now();
  process.stderr.write(chunk);
});

const watchdog = setInterval(() => {
  const idleMs = Date.now() - lastOutputAt;
  const limitMs = existsSync(reportPath) ? POST_REPORT_IDLE_TIMEOUT_MS : IDLE_TIMEOUT_MS;
  if (idleMs < limitMs) {
    return;
  }

  clearInterval(watchdog);
  killedByWatchdog = true;
  console.log(`Playwright printed nothing for ${Math.round(idleMs / 1000)}s, killing it`);

  // Needs NODE_OPTIONS=--report-on-signal --report-signal=SIGUSR2 on the Playwright process
  for (const nodePid of dumpProcessGroup()) {
    process.kill(nodePid, 'SIGUSR2');
  }

  setTimeout(() => {
    killGroup('SIGTERM');
    setTimeout(() => {
      killGroup('SIGKILL');
      process.exit(TIMEOUT_EXIT_CODE);
    }, KILL_GRACE_MS);
  }, DIAGNOSTIC_REPORT_WAIT_MS);
}, CHECK_INTERVAL_MS);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    killGroup(signal);
    setTimeout(() => killGroup('SIGKILL'), KILL_GRACE_MS).unref();
  });
}

child.on('error', (error) => {
  console.error(`Failed to start ${command}: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearInterval(watchdog);
  if (killedByWatchdog) {
    return;
  }

  process.exitCode = signal ? 128 + (constants.signals[signal] ?? 0) : code ?? 1;
  // Reap leftovers so they don't keep the output pipes open
  killGroup('SIGKILL');
});
