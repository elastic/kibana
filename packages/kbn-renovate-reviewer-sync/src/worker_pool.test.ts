/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';

import type { WorkerHandle, WorkerBatchItem, WorkerBatchItemResult } from './worker_pool';
import { WorkerPool } from './worker_pool';

interface PostedMessage {
  files: WorkerBatchItem[];
}

/**
 * In-process fake of `worker_threads.Worker` that implements `WorkerHandle` via
 * EventEmitter so we can drive the pool deterministically without spawning real
 * threads. Each posted batch is captured for inspection; tests trigger the
 * response by emitting `'message'` (or `'error'`).
 */
class FakeWorker extends EventEmitter implements WorkerHandle {
  posted: PostedMessage[] = [];
  terminateCalls = 0;
  terminatePromise: Promise<number>;
  private terminateResolve!: (code: number) => void;

  constructor() {
    super();
    // Default: terminate resolves immediately. Tests can swap this in to
    // simulate a hanging terminate by re-assigning `terminatePromise`.
    this.terminatePromise = Promise.resolve(0);
  }

  /** Replace the terminate promise with one that never resolves (until test does). */
  makeTerminateHang(): void {
    this.terminatePromise = new Promise<number>((resolve) => {
      this.terminateResolve = resolve;
    });
  }

  resolveTerminate(code = 0): void {
    if (this.terminateResolve) {
      this.terminateResolve(code);
    }
  }

  postMessage(value: PostedMessage): void {
    this.posted.push(value);
  }

  terminate(): Promise<number> {
    this.terminateCalls++;
    return this.terminatePromise;
  }

  /**
   * Emit a batched success response for the LAST posted batch. By default,
   * every file in the batch resolves with `{ success: true, imports: [], teams: [] }`;
   * `overrides` can supply per-file customizations keyed by `relativePath`.
   */
  respondBatch(overrides: Record<string, Partial<WorkerBatchItemResult>> = {}): void {
    const last = this.posted[this.posted.length - 1];
    if (!last) {
      throw new Error('respondBatch: no posted message to respond to');
    }
    const results: WorkerBatchItemResult[] = last.files.map((file) => ({
      relativePath: file.relativePath,
      success: true,
      imports: [],
      teams: [],
      ...(overrides[file.relativePath] ?? {}),
    }));
    this.emit('message', { results });
  }

  /**
   * Convenience: respond to the last posted batch with a single failed entry
   * (the rest succeed). Mirrors the worker's per-file failure shape.
   */
  respondBatchFailure(relativePath: string, error = 'boom'): void {
    this.respondBatch({
      [relativePath]: { success: false, error, imports: undefined, teams: undefined },
    });
  }
}

interface BuildPoolResult {
  pool: WorkerPool;
  workers: FakeWorker[];
}

const buildPool = (workerCount: number): BuildPoolResult => {
  const workers: FakeWorker[] = [];
  const pool = new WorkerPool(workerCount, '/fake/worker.js', { x: 1 }, () => {
    const w = new FakeWorker();
    workers.push(w);
    return w;
  });
  return { pool, workers };
};

const batchOf = (...specs: Array<[string, string]>): WorkerBatchItem[] =>
  specs.map(([filePath, relativePath]) => ({ filePath, relativePath }));

/** Yield to allow microtasks (resolved promises) to flush. */
const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('WorkerPool', () => {
  describe('WHEN dispatching a single batch', () => {
    it('SHOULD post the entire batch and resolve with the worker results array', async () => {
      const { pool, workers } = buildPool(1);
      const promise = pool.processBatch(
        batchOf(['/abs/foo.ts', 'foo.ts'], ['/abs/bar.ts', 'bar.ts'])
      );

      await flushMicrotasks();
      expect(workers[0].posted).toEqual([
        {
          files: [
            { filePath: '/abs/foo.ts', relativePath: 'foo.ts' },
            { filePath: '/abs/bar.ts', relativePath: 'bar.ts' },
          ],
        },
      ]);

      workers[0].respondBatch({
        'foo.ts': { imports: ['lodash'], teams: ['@elastic/team-a'] },
        'bar.ts': { skipped: true },
      });

      await expect(promise).resolves.toEqual([
        {
          relativePath: 'foo.ts',
          success: true,
          imports: ['lodash'],
          teams: ['@elastic/team-a'],
        },
        {
          relativePath: 'bar.ts',
          success: true,
          imports: [],
          teams: [],
          skipped: true,
        },
      ]);

      await pool.shutdown();
    });

    it('SHOULD propagate per-file `success: false` entries instead of rejecting the batch', async () => {
      const { pool, workers } = buildPool(1);
      const promise = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts'], ['/abs/b.ts', 'b.ts']));
      await flushMicrotasks();
      workers[0].respondBatchFailure('b.ts', 'regex blew up');

      const results = await promise;
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        relativePath: 'a.ts',
        success: true,
        imports: [],
        teams: [],
      });
      expect(results[1]).toEqual({
        relativePath: 'b.ts',
        success: false,
        error: 'regex blew up',
      });

      await pool.shutdown();
    });

    it('SHOULD resolve with [] for an empty batch without dispatching', async () => {
      const { pool, workers } = buildPool(1);
      await expect(pool.processBatch([])).resolves.toEqual([]);
      expect(workers[0].posted).toEqual([]);
      await pool.shutdown();
    });

    it('SHOULD treat a non-array `results` field as an empty result list', async () => {
      const { pool, workers } = buildPool(1);
      const promise = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']));
      await flushMicrotasks();
      // Defensive: a malformed worker response shouldn't crash the pool.
      workers[0].emit('message', { results: undefined } as any);
      await expect(promise).resolves.toEqual([]);
      await pool.shutdown();
    });
  });

  describe('WHEN more batches than workers are submitted', () => {
    it('SHOULD queue extras and dispatch as workers free up', async () => {
      const { pool, workers } = buildPool(2);

      const p1 = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']));
      const p2 = pool.processBatch(batchOf(['/abs/b.ts', 'b.ts']));
      const p3 = pool.processBatch(batchOf(['/abs/c.ts', 'c.ts']));

      await flushMicrotasks();

      const dispatched = workers.flatMap((w) =>
        w.posted.flatMap((m) => m.files.map((f) => f.relativePath))
      );
      expect(dispatched.length).toEqual(2);
      expect(new Set(dispatched)).toEqual(new Set(['a.ts', 'b.ts']));

      // Free up the worker that picked up 'a.ts'.
      const workerForA = workers.find((w) =>
        w.posted.some((m) => m.files.some((f) => f.relativePath === 'a.ts'))
      )!;
      workerForA.respondBatch();

      await flushMicrotasks();

      const allDispatched = workers.flatMap((w) =>
        w.posted.flatMap((m) => m.files.map((f) => f.relativePath))
      );
      expect(new Set(allDispatched)).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));

      const workerForB = workers.find(
        (w) =>
          w.posted.some((m) => m.files.some((f) => f.relativePath === 'b.ts')) && w !== workerForA
      )!;
      workerForB.respondBatch();
      const workerForC = workers.find((w) =>
        w.posted.some((m) => m.files.some((f) => f.relativePath === 'c.ts'))
      )!;
      workerForC.respondBatch();

      await Promise.all([p1, p2, p3]);
      await pool.shutdown();
    });
  });

  describe('WHEN a worker emits an error while running a batch', () => {
    it('SHOULD reject the in-flight batch promise with the worker error', async () => {
      const { pool, workers } = buildPool(1);
      const promise = pool.processBatch(batchOf(['/abs/foo.ts', 'foo.ts']));
      await flushMicrotasks();
      workers[0].emit('error', new Error('thread crashed'));
      await expect(promise).rejects.toThrow('thread crashed');
      await pool.shutdown();
    });

    it('SHOULD evict the dead worker so future dispatches go elsewhere', async () => {
      const { pool, workers } = buildPool(2);

      const p1 = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']));
      await flushMicrotasks();

      const aWorker = workers.find((w) =>
        w.posted.some((m) => m.files.some((f) => f.relativePath === 'a.ts'))
      )!;
      const otherWorker = workers.find((w) => w !== aWorker)!;

      // Kill aWorker mid-batch — batch rejects, worker is evicted.
      aWorker.emit('error', new Error('died'));
      await expect(p1).rejects.toThrow('died');

      // Submit two more batches. Both should land on the survivor.
      const p2 = pool.processBatch(batchOf(['/abs/b.ts', 'b.ts']));
      const p3 = pool.processBatch(batchOf(['/abs/c.ts', 'c.ts']));
      await flushMicrotasks();

      // The dead worker must not be dispatched to again.
      expect(aWorker.posted.length).toEqual(1);
      expect(otherWorker.posted.length).toEqual(1);
      expect(otherWorker.posted[0].files[0].relativePath).toEqual('b.ts');

      otherWorker.respondBatch();
      await flushMicrotasks();
      expect(otherWorker.posted.length).toEqual(2);
      expect(otherWorker.posted[1].files[0].relativePath).toEqual('c.ts');
      otherWorker.respondBatch();

      await Promise.all([p2, p3]);
      await pool.shutdown();
    });
  });

  describe('WHEN every worker dies before any task is dispatched', () => {
    it('SHOULD reject subsequent processBatch calls synchronously instead of hanging', async () => {
      const { pool, workers } = buildPool(2);

      workers[0].emit('error', new Error('module load failed'));
      workers[1].emit('error', new Error('module load failed'));

      await expect(pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']))).rejects.toThrow(
        'All worker threads have died'
      );

      await pool.shutdown();
    });
  });

  describe('WHEN the last living worker dies with batches queued behind it', () => {
    it('SHOULD reject the queued pending batches rather than leaving them stranded', async () => {
      const { pool, workers } = buildPool(1);

      const inFlight = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']));
      const queued1 = pool.processBatch(batchOf(['/abs/b.ts', 'b.ts']));
      const queued2 = pool.processBatch(batchOf(['/abs/c.ts', 'c.ts']));

      await flushMicrotasks();
      expect(workers[0].posted.length).toEqual(1);

      workers[0].emit('error', new Error('thread crashed'));

      await expect(inFlight).rejects.toThrow('thread crashed');
      await expect(queued1).rejects.toThrow('All worker threads have died');
      await expect(queued2).rejects.toThrow('All worker threads have died');

      await pool.shutdown();
    });
  });

  describe('WHEN a worker emits an error while idle (e.g. module-load failure)', () => {
    it('SHOULD remove it from availableWorkers and never dispatch to it', async () => {
      const { pool, workers } = buildPool(2);

      // Kill workers[0] before any task. It's idle, so no in-flight task to reject.
      workers[0].emit('error', new Error('module load failed'));

      const p1 = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']));
      await flushMicrotasks();

      expect(workers[0].posted).toEqual([]);
      expect(workers[1].posted.length).toEqual(1);

      workers[1].respondBatch();
      await p1;

      const p2 = pool.processBatch(batchOf(['/abs/b.ts', 'b.ts']));
      await flushMicrotasks();
      expect(workers[0].posted).toEqual([]);
      expect(workers[1].posted.length).toEqual(2);
      workers[1].respondBatch();
      await p2;

      await pool.shutdown();
    });
  });

  describe('WHEN shutdown() is called', () => {
    it('SHOULD reject pending batches with "Worker pool shutdown"', async () => {
      const { pool, workers } = buildPool(1);

      const p1 = pool.processBatch(batchOf(['/abs/a.ts', 'a.ts']));
      await flushMicrotasks();
      const p2 = pool.processBatch(batchOf(['/abs/b.ts', 'b.ts']));
      await flushMicrotasks();

      // a.ts is in-flight; b.ts is pending in the queue.
      expect(workers[0].posted.length).toEqual(1);

      const shutdownPromise = pool.shutdown();

      await expect(p1).rejects.toThrow('Worker pool shutdown');
      await expect(p2).rejects.toThrow('Worker pool shutdown');
      await shutdownPromise;
    });

    it('SHOULD call terminate() on every worker', async () => {
      const { pool, workers } = buildPool(3);
      await pool.shutdown();
      for (const w of workers) {
        expect(w.terminateCalls).toEqual(1);
      }
    });

    it('SHOULD reject subsequent processBatch calls', async () => {
      const { pool } = buildPool(1);
      await pool.shutdown();
      await expect(pool.processBatch(batchOf(['/abs/x.ts', 'x.ts']))).rejects.toThrow(
        'Worker pool is shutting down'
      );
    });

    it('SHOULD resolve even when a worker terminate() never settles (1s timeout)', async () => {
      jest.useFakeTimers();
      try {
        const { pool, workers } = buildPool(1);
        workers[0].makeTerminateHang();

        const shutdown = pool.shutdown();

        // Fast-forward the 1s timeout; the pool should give up waiting and resolve.
        jest.advanceTimersByTime(1000);

        await shutdown;
        expect(workers[0].terminateCalls).toEqual(1);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
