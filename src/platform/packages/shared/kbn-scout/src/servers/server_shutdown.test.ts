/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerServerShutdown, shutdownServers } from './server_shutdown';

it('attempts Elasticsearch shutdown after process teardown fails', async () => {
  const error = new Error('process stop failed');
  const shutdownEs = jest.fn().mockResolvedValue(undefined);

  await expect(
    shutdownServers({ teardown: jest.fn().mockRejectedValue(error) }, shutdownEs)
  ).rejects.toBe(error);
  expect(shutdownEs).toHaveBeenCalledTimes(1);
});

it('waits for managed process and Elasticsearch shutdown after SIGTERM', async () => {
  const markerDir = mkdtempSync(join(tmpdir(), 'scout-shutdown-'));
  const fixture = join(__dirname, '__fixtures__', 'server_shutdown_signal.ts');
  const parent = spawn(process.execPath, ['-r', '@kbn/setup-node-env', fixture, markerDir], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errors = '';
  parent.stderr.on('data', (chunk: Buffer) => {
    errors += chunk.toString();
  });

  try {
    await new Promise<void>((resolve, reject) => {
      parent.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes('SCOUT_SHUTDOWN_READY')) resolve();
      });
      parent.once('exit', () => reject(new Error(`Fixture exited before ready: ${errors}`)));
      parent.once('error', reject);
    });

    const exit = new Promise<void>((resolve, reject) => {
      parent.once('exit', (code, signal) => {
        if (signal || (code !== 0 && code !== 143)) {
          reject(new Error(`Fixture exited with ${signal ?? code}: ${errors}`));
        } else {
          resolve();
        }
      });
    });
    parent.kill('SIGTERM');
    await exit;

    expect(readFileSync(join(markerDir, 'es-stopped'), 'utf8')).toBe('done');
    const childPid = Number(readFileSync(join(markerDir, 'child.pid'), 'utf8'));
    expect(() => process.kill(childPid, 0)).toThrow();
  } finally {
    parent.kill('SIGKILL');
    const childPidFile = join(markerDir, 'child.pid');
    if (existsSync(childPidFile)) {
      const childPid = Number(readFileSync(childPidFile, 'utf8'));
      try {
        process.kill(childPid, 'SIGKILL');
      } catch {
        // The managed child has already stopped.
      }
    }
    rmSync(markerDir, { recursive: true, force: true });
  }
}, 20_000);

describe('registerServerShutdown', () => {
  it('lets the first signal run the shutdown and exits right away on the second one', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const before = process.listeners('SIGINT');

    const remove = registerServerShutdown({ teardown: jest.fn() }, jest.fn());
    const added = process.listeners('SIGINT').filter((l) => !before.includes(l));
    // exit-hook's own listener may be added too; ours is the one that counts signals
    expect(added.length).toBeGreaterThanOrEqual(1);
    const ours = added[added.length - 1] as (signal: NodeJS.Signals) => void;

    ours('SIGINT');
    expect(exitSpy).not.toHaveBeenCalled();

    ours('SIGINT');
    expect(exitSpy).toHaveBeenCalledWith(130);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Received SIGINT again'));

    remove();
    expect(process.listeners('SIGINT')).not.toContain(ours);
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});
