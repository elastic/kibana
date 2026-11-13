/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WATCHDOG = path.join(__dirname, 'run_playwright_with_watchdog.ts');

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitFor = async (condition: () => boolean, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

describe('run_playwright_with_watchdog', () => {
  let tmpDir: string;
  let reportPath: string;
  let pidPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-watchdog-test-'));
    reportPath = path.join(tmpDir, 'report.json');
    pidPath = path.join(tmpDir, 'child.pid');
  });

  afterEach(() => {
    if (fs.existsSync(pidPath)) {
      const pid = Number(fs.readFileSync(pidPath, 'utf8'));
      if (isAlive(pid)) {
        process.kill(pid, 'SIGKILL');
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeChild = (source: string) => {
    const file = path.join(tmpDir, 'child.js');
    fs.writeFileSync(
      file,
      `const fs = require('fs'); fs.writeFileSync(${JSON.stringify(
        pidPath
      )}, String(process.pid)); ${source}`
    );
    return file;
  };

  const runWatchdog = (childFile: string) => {
    const proc = spawn(process.execPath, [WATCHDOG, reportPath, process.execPath, childFile], {
      env: {
        ...process.env,
        SCOUT_WATCHDOG_REPORT_GRACE_MS: '500',
        SCOUT_WATCHDOG_CHECK_INTERVAL_MS: '100',
        SCOUT_WATCHDOG_DIAGNOSTIC_WAIT_MS: '100',
      },
      stdio: 'ignore',
    });
    const exit = new Promise<number | null>((resolve) => proc.on('exit', (code) => resolve(code)));
    return { proc, exit };
  };

  it('passes through the exit code of a command that finishes', async () => {
    const { exit } = runWatchdog(writeChild('process.exit(3)'));

    expect(await exit).toBe(3);
  });

  it('exits with 1 when the command cannot be started', async () => {
    const proc = spawn(process.execPath, [WATCHDOG, reportPath, path.join(tmpDir, 'missing')], {
      stdio: 'ignore',
    });

    expect(await new Promise((resolve) => proc.on('exit', resolve))).toBe(1);
  });

  it('ignores a report left over from an earlier run', async () => {
    fs.writeFileSync(reportPath, '{}');
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(reportPath, past, past);

    const { exit } = runWatchdog(writeChild('setTimeout(() => process.exit(0), 1500)'));

    expect(await exit).toBe(0);
  });

  it('kills a process that is still running after writing its report', async () => {
    const childFile = writeChild(
      `fs.writeFileSync(${JSON.stringify(reportPath)}, '{}'); setInterval(() => {}, 1000)`
    );

    const { exit } = runWatchdog(childFile);

    expect(await exit).toBe(124);
    const pid = Number(fs.readFileSync(pidPath, 'utf8'));
    await waitFor(() => !isAlive(pid));
  });

  it('forwards SIGTERM to the command', async () => {
    const { proc, exit } = runWatchdog(writeChild('setInterval(() => {}, 1000)'));
    await waitFor(() => fs.existsSync(pidPath));

    proc.kill('SIGTERM');

    expect(await exit).toBe(143);
    await waitFor(() => !isAlive(Number(fs.readFileSync(pidPath, 'utf8'))));
  });
});
