/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import { runPreBuild } from './pre_build';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

type MockChildProcess = EventEmitter & {
  stderr: EventEmitter;
};

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

const createMockChildProcess = (): MockChildProcess => {
  const child = new EventEmitter() as MockChildProcess;
  child.stderr = new EventEmitter();
  return child;
};

describe('runPreBuild', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves when pre_build.sh exits with code 0', async () => {
    const child = createMockChildProcess();
    mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const promise = runPreBuild();
    child.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.stringContaining('/.buildkite/scripts/lifecycle/pre_build.sh'),
      {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: process.env,
      }
    );
  });

  it('rejects when pre_build.sh exits with non-zero code', async () => {
    const child = createMockChildProcess();
    mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const promise = runPreBuild();
    child.emit('close', 2);

    await expect(promise).rejects.toThrow('pre_build.sh exited with code 2');
  });

  it('rejects when spawn emits an error', async () => {
    const child = createMockChildProcess();
    mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const promise = runPreBuild();
    child.emit('error', new Error('spawn failed'));

    await expect(promise).rejects.toThrow('spawn failed');
  });

  it('forwards stderr output from pre_build.sh', async () => {
    const child = createMockChildProcess();
    mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const promise = runPreBuild();
    const stderrChunk = Buffer.from('pre-build stderr');
    child.stderr.emit('data', stderrChunk);
    child.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(stderrSpy).toHaveBeenCalledWith(stderrChunk);
  });
});
