/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { constants } from 'node:os';

/**
 * Runs a Playwright command and kills it if it is still alive well after writing the JSON report.
 *
 * Playwright sometimes hangs after all tests and reporters have finished. The JSON report is
 * written at the end of the run, so a process that outlives it by minutes is hung. Before the kill
 * the process group is dumped and Node diagnostic reports are requested (this needs
 * NODE_OPTIONS=--report-on-signal --report-signal=SIGUSR2 on the Playwright process).
 * Exits with 124 after a kill, like `timeout`.
 *
 * Usage: node run_playwright_with_watchdog.ts <json report path> <command> [args...]
 */

const REPORT_GRACE_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 1000;
const DIAGNOSTIC_REPORT_WAIT_MS = 10 * 1000;
const SIGNAL_GRACE_MS = 30 * 1000;
const TIMEOUT_EXIT_CODE = 124;

const [reportPath, command, ...args] = process.argv.slice(2);

if (!reportPath || !command) {
  console.error('Usage: run_playwright_with_watchdog.ts <json report path> <command> [args...]');
  process.exit(1);
}

const startedAt = Date.now();

// The child leads its own process group, so one signal also reaches workers and browsers.
const child = spawn(command, args, { stdio: 'inherit', detached: true });
const { pid } = child;

const sendSignal = (target: number, signal: NodeJS.Signals) => {
  try {
    process.kill(target, signal);
  } catch {
    // already gone
  }
};

const killGroup = (signal: NodeJS.Signals) => {
  if (pid !== undefined) {
    sendSignal(-pid, signal);
  }
};

const dumpProcessGroup = (): number[] => {
  const rows = execFileSync('ps', ['-eo', 'pid,pgid,stat,etime,comm,args'], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .map((row) => row.trim())
    .filter((row) => row.split(/\s+/)[1] === String(pid));

  console.log(`Process group ${pid} (pid pgid stat etime comm args):\n${rows.join('\n')}`);

  return rows
    .map((row) => row.split(/\s+/))
    .filter(([, , , , comm]) => comm === 'node')
    .map(([rowPid]) => Number(rowPid));
};

// An older report from a previous run does not count
const isReportWritten = () => existsSync(reportPath) && statSync(reportPath).mtimeMs >= startedAt;

let reportSeenAt: number | undefined;
let killedByWatchdog = false;

const watchdog = setInterval(() => {
  if (!isReportWritten()) {
    return;
  }

  reportSeenAt ??= Date.now();
  const lingerMs = Date.now() - reportSeenAt;
  if (lingerMs < REPORT_GRACE_MS) {
    return;
  }

  clearInterval(watchdog);
  killedByWatchdog = true;
  console.log(`Playwright is still running ${Math.round(lingerMs / 1000)}s after its report`);

  for (const nodePid of dumpProcessGroup()) {
    sendSignal(nodePid, 'SIGUSR2');
  }

  setTimeout(() => {
    killGroup('SIGKILL');
    process.exit(TIMEOUT_EXIT_CODE);
  }, DIAGNOSTIC_REPORT_WAIT_MS);
}, CHECK_INTERVAL_MS);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    killGroup(signal);
    setTimeout(() => killGroup('SIGKILL'), SIGNAL_GRACE_MS).unref();
  });
}

child.on('error', (error) => {
  console.error(`Failed to start ${command}: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearInterval(watchdog);
  if (!killedByWatchdog) {
    process.exitCode = signal ? 128 + (constants.signals[signal] ?? 0) : code ?? 1;
  }
});
