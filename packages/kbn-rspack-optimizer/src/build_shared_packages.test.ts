/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import execa from 'execa';
import { buildSharedPackages, watchSharedPackages } from './build_shared_packages';

jest.mock('execa');

const execaMock = execa as jest.MockedFunction<typeof execa>;

describe('buildSharedPackages', () => {
  beforeEach(() => {
    execaMock.mockResolvedValue({} as Awaited<ReturnType<typeof execa>>);
  });

  it('uses the cached development build by default', async () => {
    await buildSharedPackages({ repoRoot: '/repo' });

    expect(execaMock).toHaveBeenCalledWith('pnpm', ['kbn', 'build-shared'], {
      cwd: '/repo',
      stdio: 'inherit',
    });
  });

  it('forwards production and cache options', async () => {
    await buildSharedPackages({ repoRoot: '/repo', dist: true, cache: false });

    expect(execaMock).toHaveBeenCalledWith(
      'pnpm',
      ['kbn', 'build-shared', '--dist', '--no-cache'],
      {
        cwd: '/repo',
        stdio: 'inherit',
      }
    );
  });

  it('waits for every watcher and reports later shared rebuilds', async () => {
    jest.useFakeTimers();
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const children = [createWatcher(), createWatcher(), createWatcher()];
    execaMock.mockReset();
    children.forEach(({ child }) => execaMock.mockReturnValueOnce(child));

    const watcherPromise = watchSharedPackages({ repoRoot: '/repo' });
    expect(execaMock).toHaveBeenCalledTimes(2);

    children[0].all.emit('data', successfulBuild);
    await Promise.resolve();
    expect(execaMock).toHaveBeenCalledTimes(3);

    children[1].all.emit('data', successfulBuild);
    children[2].all.emit('data', successfulBuild);
    const watcher = await watcherPromise;
    const onRebuild = jest.fn();
    watcher.onRebuild(onRebuild);

    children[2].all.emit('data', successfulBuild);
    jest.advanceTimersByTime(500);
    expect(onRebuild).toHaveBeenCalledTimes(1);

    await watcher.close();
    expect(children.every(({ child }) => child.kill.mock.calls.length === 1)).toBe(true);
    jest.useRealTimers();
  });
});

const successfulBuild = Buffer.from('webpack 5.96.1 compiled successfully in 100 ms\n');

function createWatcher() {
  const all = new EventEmitter();
  let resolve!: (value: unknown) => void;
  const child = Object.assign(
    new Promise((r) => {
      resolve = r;
    }),
    {
      all,
      kill: jest.fn(() => {
        resolve({});
        return true;
      }),
    }
  ) as unknown as jest.Mocked<ReturnType<typeof execa>>;

  return { all, child };
}
