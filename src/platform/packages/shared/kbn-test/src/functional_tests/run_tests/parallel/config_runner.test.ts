/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import execa from 'execa';
import type { ExecaChildProcess, ExecaReturnValue } from 'execa';

import { ConfigRunner } from './config_runner';

jest.mock('execa');

class MockChildProcess extends EventEmitter {
  public readonly stdout: PassThrough;
  public readonly stderr: PassThrough;
  public exitCode: number | null = null;
  public signalCode: NodeJS.Signals | null = null;
  public killed = false;
  public readonly send = jest.fn();
  public readonly kill = jest.fn();
  public readonly command = 'node scripts/functional_tests';
  public readonly escapedCommand = this.command;
  public readonly sentMessages: unknown[] = [];

  private readonly promise: Promise<ExecaReturnValue<string>>;
  private resolvePromise!: (value: ExecaReturnValue<string>) => void;

  constructor() {
    super();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.promise = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  then: ExecaChildProcess['then'] = (onfulfilled, onrejected) => {
    return this.promise.then(onfulfilled, onrejected);
  };

  catch: ExecaChildProcess['catch'] = (onrejected) => {
    return this.promise.catch(onrejected);
  };

  finally(onfinally?: (() => void) | null) {
    return this.promise.finally(onfinally ?? undefined);
  }

  complete(overrides: Partial<ExecaReturnValue<string>> = {}) {
    const result: ExecaReturnValue<string> = {
      command: this.command,
      escapedCommand: this.escapedCommand,
      exitCode: overrides.exitCode ?? 0,
      stdout: overrides.stdout ?? '',
      stderr: overrides.stderr ?? '',
      failed: overrides.failed ?? false,
      timedOut: overrides.timedOut ?? false,
      killed: overrides.killed ?? false,
      signal: overrides.signal,
      signalDescription: overrides.signalDescription,
      isCanceled: overrides.isCanceled ?? false,
      all: overrides.all,
    };

    this.exitCode = result.exitCode;
    this.signalCode = (result.signal as NodeJS.Signals | undefined) ?? null;
    this.killed = result.killed;

    this.resolvePromise(result);
    this.stdout.emit('end');
    this.stderr.emit('end');
    this.emit('exit', result.exitCode, result.signal);
    this.emit('close', result.exitCode, result.signal);
  }
}

describe('ConfigRunner', () => {
  const mockExeca = execa as jest.MockedFunction<typeof execa>;
  let spawned: MockChildProcess[];
  let stdoutWrites: string[];
  let stderrWrites: string[];
  let stdoutSpy: jest.SpyInstance<
    boolean,
    [string | Uint8Array, ((err?: Error | null | undefined) => void)?]
  >;
  let stderrSpy: jest.SpyInstance<
    boolean,
    [string | Uint8Array, ((err?: Error | null | undefined) => void)?]
  >;

  const createRunner = () =>
    new ConfigRunner({
      path: 'path/to/config',
      command: {
        exec: 'node',
        args: ['scripts/functional_tests', '--config=path/to/config'],
      },
      ports: {
        agentless: 6200,
        es: 6201,
        esTransport: 6202,
        packageRegistry: 6203,
        kibana: 6204,
        fleet: 6205,
      },
    });

  const lastSpawned = () => {
    const instance = spawned[spawned.length - 1];
    if (!instance) {
      throw new Error('mock process has not been spawned');
    }
    return instance;
  };

  beforeEach(() => {
    spawned = [];
    stdoutWrites = [];
    stderrWrites = [];

    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      stdoutWrites.push(Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk));
      return true;
    }) as typeof stdoutSpy;

    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => {
      stderrWrites.push(Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk));
      return true;
    }) as typeof stderrSpy;

    mockExeca.mockImplementation((() => {
      const proc = new MockChildProcess();
      spawned.push(proc);
      return proc as unknown as ExecaChildProcess<string>;
    }) as any);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    mockExeca.mockReset();
  });

  it('buffers output until warmup completes', async () => {
    const runner = createRunner();
    const startPromise = runner.start();
    const proc = lastSpawned();

    proc.stdout.emit('data', Buffer.from('buffered line\n'));
    proc.stderr.emit('data', Buffer.from('buffered err\n'));

    expect(stdoutWrites.join('')).toContain('Warming path/to/config');
    expect(stdoutWrites.join('')).not.toContain('buffered line');
    expect(stderrWrites.join('')).not.toContain('buffered err');

    proc.emit('message', 'FTR_WARMUP_DONE');
    await startPromise;

    expect(stdoutWrites.join('')).toContain('buffered line');
    expect(stderrWrites.join('')).toContain('buffered err');
  });

  it('sends continue and resolves when the child exits', async () => {
    const runner = createRunner();
    const startPromise = runner.start();
    const proc = lastSpawned();

    proc.emit('message', 'FTR_WARMUP_DONE');
    await startPromise;

    const runPromise = runner.run();
    expect(proc.send).toHaveBeenCalledWith('FTR_CONTINUE');

    proc.stdout.emit('data', Buffer.from('live output\n'));
    proc.complete({ exitCode: 0, stdout: 'live output\n' });

    const result = await runPromise;
    expect(result.exitCode).toBe(0);

    const completedCount = stdoutWrites.filter((line) =>
      line.includes('Completed path/to/config')
    ).length;
    expect(completedCount).toBe(1);
    expect(stdoutWrites.join('')).toContain('live output');
  });

  it('resolves start when the child exits before warmup', async () => {
    const runner = createRunner();
    const startPromise = runner.start();
    const proc = lastSpawned();

    proc.stdout.emit('data', Buffer.from('early data\n'));
    proc.complete({ exitCode: 1 });

    await startPromise;

    expect(stdoutWrites.join('')).toContain('early data');
    expect(stdoutWrites.join('')).toContain('Completed path/to/config');
  });

  it('throws if run is called before start', async () => {
    const runner = createRunner();
    await expect(runner.run()).rejects.toThrow('`run` was called before `start`');
  });

  it('returns the same completion promise when run is called multiple times', async () => {
    const runner = createRunner();
    const startPromise = runner.start();
    const proc = lastSpawned();

    proc.emit('message', 'FTR_WARMUP_DONE');
    await startPromise;

    const first = runner.run();
    const second = runner.run();
    expect(second).toStrictEqual(first);
    expect(proc.send).toHaveBeenCalledTimes(1);

    proc.complete({ exitCode: 0 });
    await first;
  });

  it('logs the command line when run begins', async () => {
    const runner = createRunner();
    const startPromise = runner.start();
    const proc = lastSpawned();

    proc.emit('message', 'FTR_WARMUP_DONE');
    await startPromise;

    const runPromise = runner.run();
    proc.complete({ exitCode: 0 });
    await runPromise;

    const combined = stdoutWrites.join('');
    expect(combined).toContain('node scripts/functional_tests --pause --config=path/to/config');
  });

  it('destroys stdio streams when the child completes', async () => {
    const runner = createRunner();
    const startPromise = runner.start();
    const proc = lastSpawned();

    proc.emit('message', 'FTR_WARMUP_DONE');
    await startPromise;

    const stdoutDestroy = jest.spyOn(proc.stdout, 'destroy');
    const stderrDestroy = jest.spyOn(proc.stderr, 'destroy');

    const runPromise = runner.run();
    proc.complete({ exitCode: 0 });
    await runPromise;

    expect(stdoutDestroy).toHaveBeenCalled();
    expect(stderrDestroy).toHaveBeenCalled();

    stdoutDestroy.mockRestore();
    stderrDestroy.mockRestore();
  });
});
