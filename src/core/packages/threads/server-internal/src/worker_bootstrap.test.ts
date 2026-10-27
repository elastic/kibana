/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ENTRY = '/managed-worker-test/entry';

describe('worker_bootstrap', () => {
  let loaded: string[];
  let postMessage: jest.Mock;

  const runBootstrap = ({ dist, entryThrows = false }: { dist: boolean; entryThrows?: boolean }) =>
    jest.isolateModules(() => {
      jest.doMock('@kbn/repo-info', () => ({ isKibanaDistributable: () => dist }));
      jest.doMock('@kbn/setup-node-env', () => loaded.push('setup-node-env'));
      jest.doMock('@kbn/setup-node-env/dist', () => loaded.push('setup-node-env/dist'));
      jest.doMock('node:worker_threads', () => ({
        parentPort: { postMessage },
        workerData: { __entry: ENTRY, __healthIntervalMs: 50 },
      }));
      jest.doMock(
        ENTRY,
        () => {
          loaded.push('entry');
          if (entryThrows) throw new Error('entry failed');
          return {};
        },
        { virtual: true }
      );
      require('./worker_bootstrap');
    });

  beforeEach(() => {
    jest.useFakeTimers();
    loaded = [];
    postMessage = jest.fn();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sets up the dev environment before the entry, then reports ready', () => {
    runBootstrap({ dist: false });
    expect(loaded).toEqual(['setup-node-env', 'entry']);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      __kbnManagedWorker: 'ready',
      heapSizeLimit: expect.any(Number),
    });
  });

  it('sets up the dist environment in a distributable', () => {
    runBootstrap({ dist: true });
    expect(loaded).toEqual(['setup-node-env/dist', 'entry']);
    expect(postMessage).toHaveBeenCalledWith({
      __kbnManagedWorker: 'ready',
      heapSizeLimit: expect.any(Number),
    });
  });

  it('reports heap usage on the health interval', () => {
    runBootstrap({ dist: false });
    jest.advanceTimersByTime(50);
    expect(postMessage).toHaveBeenLastCalledWith({
      __kbnManagedWorker: 'health',
      heapUsed: expect.any(Number),
    });
  });

  it('does not report ready when the entry fails to load', () => {
    expect(() => runBootstrap({ dist: false, entryThrows: true })).toThrow('entry failed');
    expect(postMessage).not.toHaveBeenCalled();
  });
});
