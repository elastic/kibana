/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs';
import type { ChildProcess } from 'child_process';
import { fork } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';

import { RspackOptimizer } from './optimizer';

jest.mock('child_process', () => ({
  fork: jest.fn(),
}));

const mockFork = fork as jest.MockedFunction<typeof fork>;

function createMockChildProcess(): ChildProcess {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    send: jest.Mock;
    kill: jest.Mock;
  };

  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.send = jest.fn();
  child.kill = jest.fn();

  return child as unknown as ChildProcess;
}

function createMockLog(): jest.Mocked<ToolingLog> {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<ToolingLog>;
}

describe('RspackOptimizer', () => {
  const repoRoot = '/repo/kibana';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createOptimizer(
    overrides: Partial<ConstructorParameters<typeof RspackOptimizer>[0]> = {}
  ) {
    return new RspackOptimizer({
      repoRoot,
      log: createMockLog(),
      ...overrides,
    });
  }

  it('run() sends start after worker emits ready (IPC handshake)', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);

    const optimizer = createOptimizer({ dist: true, basePath: '/bp' });
    const runPromise = optimizer.run();

    child.emit('message', { type: 'ready' });

    expect(child.send).toHaveBeenCalledWith({
      type: 'start',
      options: {
        repoRoot,
        outputRoot: repoRoot,
        watch: undefined,
        cache: undefined,
        dist: true,
        examples: undefined,
        themeTags: ['borealislight', 'borealisdark'],
        hmr: undefined,
        basePath: '/bp',
      },
    });

    child.emit('message', { type: 'done', success: true, summary: 'ok' });
    await expect(runPromise).resolves.toBeUndefined();
  });

  it('non-watch success: done with success=true resolves run()', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);
    const log = createMockLog();

    const optimizer = new RspackOptimizer({ repoRoot, log, watch: false });
    const runPromise = optimizer.run();

    child.emit('message', { type: 'ready' });
    child.emit('message', { type: 'done', success: true, summary: 'built' });

    await expect(runPromise).resolves.toBeUndefined();
    expect(log.success).toHaveBeenCalledWith(
      expect.stringContaining('RSPack build completed — built')
    );
  });

  it('non-watch compile failure: done with success=false still resolves run() and emits issue phase', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);

    const optimizer = createOptimizer({ watch: false });
    const phases: string[] = [];
    const sub = optimizer.getPhase$().subscribe((p) => phases.push(p));

    const runPromise = optimizer.run();
    child.emit('message', { type: 'ready' });
    child.emit('message', { type: 'done', success: false, errors: ['x'] });

    await expect(runPromise).resolves.toBeUndefined();
    expect(phases).toContain('issue');
    sub.unsubscribe();
  });

  it('rejects when worker exits with non-zero before shutdown', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);

    const optimizer = createOptimizer();
    const runPromise = optimizer.run();

    child.emit('message', { type: 'ready' });
    child.emit('exit', 1);

    await expect(runPromise).rejects.toThrow('RSPack worker exited with code 1');
  });

  it('rejects when worker emits error', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);

    const log = createMockLog();
    const optimizer = new RspackOptimizer({ repoRoot, log });
    const runPromise = optimizer.run();

    child.emit('message', { type: 'ready' });
    const err = new Error('boom');
    child.emit('error', err);

    await expect(runPromise).rejects.toThrow(err);
    expect(log.error).toHaveBeenCalledWith('RSPack worker error: boom');
  });

  it('stop() sends SIGKILL to the worker', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);

    const optimizer = createOptimizer();
    const runPromise = optimizer.run();

    child.emit('message', { type: 'ready' });
    await optimizer.stop();

    expect(child.kill).toHaveBeenCalledWith('SIGKILL');

    child.emit('exit', 0);
    await expect(runPromise).resolves.toBeUndefined();
  });

  it('forwards IPC log messages to ToolingLog by level', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);
    const log = createMockLog();

    const optimizer = new RspackOptimizer({ repoRoot, log });
    const runPromise = optimizer.run();

    child.emit('message', { type: 'ready' });
    child.emit('message', { type: 'log', level: 'info', message: 'i' });
    child.emit('message', { type: 'log', level: 'error', message: 'e' });
    child.emit('message', { type: 'log', level: 'warning', message: 'w' });
    child.emit('message', { type: 'log', level: 'success', message: 's' });
    child.emit('message', { type: 'log', level: 'debug', message: 'd' });
    child.emit('message', { type: 'done', success: true });

    await runPromise;

    expect(log.info).toHaveBeenCalledWith('i');
    expect(log.error).toHaveBeenCalledWith('e');
    expect(log.warning).toHaveBeenCalledWith('w');
    expect(log.success).toHaveBeenCalledWith('s');
    expect(log.debug).toHaveBeenCalledWith('d');
  });

  it('isReady$() emits true after a successful done', async () => {
    const child = createMockChildProcess();
    mockFork.mockReturnValue(child);

    const optimizer = createOptimizer();
    const readyPromise = firstValueFrom(
      optimizer.isReady$().pipe(
        filter((v) => v === true),
        take(1)
      )
    );

    const runPromise = optimizer.run();
    child.emit('message', { type: 'ready' });
    child.emit('message', { type: 'done', success: true });

    await expect(readyPromise).resolves.toBe(true);
    await runPromise;
  });
});
