/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'worker_threads';

/** One file to scan, dispatched as part of a batch. */
export interface WorkerBatchItem {
  filePath: string;
  relativePath: string;
}

/** Per-file result inside a batched worker response. */
export interface WorkerBatchItemResult {
  relativePath: string;
  success: boolean;
  imports?: string[];
  teams?: string[];
  skipped?: boolean;
  error?: string;
}

/** Shape of a worker's batched response over the message channel. */
export interface WorkerBatchMessage {
  results: WorkerBatchItemResult[];
}

/**
 * Minimal abstraction over `worker_threads.Worker` — covers everything the pool
 * needs, so tests can substitute an `EventEmitter`-backed fake without spawning
 * real threads.
 */
export interface WorkerHandle {
  on(event: 'message', handler: (value: WorkerBatchMessage) => void): unknown;
  on(event: 'error', handler: (error: Error) => void): unknown;
  on(event: 'exit', handler: (exitCode: number) => void): unknown;
  postMessage(value: { files: WorkerBatchItem[] }): void;
  terminate(): Promise<number>;
}

/** Public surface the orchestrator depends on. Allows the test to inject a fake pool. */
export interface WorkerPoolLike {
  processBatch(items: WorkerBatchItem[]): Promise<WorkerBatchItemResult[]>;
  shutdown(): Promise<void>;
}

/** Constructs a worker thread for the given path + initialization data. */
export type WorkerFactory = (workerPath: string, workerData: unknown) => WorkerHandle;

const defaultWorkerFactory: WorkerFactory = (workerPath, workerData) =>
  new Worker(workerPath, { workerData });

interface WorkerBatchTask {
  items: WorkerBatchItem[];
  resolve: (value: WorkerBatchItemResult[]) => void;
  reject: (error: Error) => void;
}

/**
 * Worker pool for processing files in parallel using worker threads.
 * Each worker maintains an in-memory CODEOWNERS matcher and processes a BATCH
 * of files per IPC round-trip; the pool dispatches queued batches to idle
 * workers as they free up.
 *
 * Why batched: per-file IPC dominates wall time on large file sets (~83k files).
 * Posting N files in one message and receiving N results in one reply amortizes
 * `postMessage`/structured-clone overhead across the batch.
 *
 * Failure semantics:
 * - Per-file errors do NOT reject the batch promise. They are surfaced inline
 *   as `{ success: false, error }` entries in the result array. The orchestrator
 *   inspects each entry and decides whether to abort.
 * - A dead worker is evicted via a single `handleWorkerDeath` path driven by
 *   BOTH `'error'` and `'exit'`. `'error'` is raised when the worker throws
 *   asynchronously (Node then terminates it); `'exit'` fires whenever the
 *   worker thread stops, including the clean-exit-without-error case (e.g. a
 *   worker module that calls `process.exit(0)` or drops all event listeners).
 *   Relying only on `'error'` would leak the dead worker into `availableWorkers`
 *   on clean exit and strand the task promise. The handler is idempotent via a
 *   per-pool "already-counted-dead" set so `'error' → 'exit'` never
 *   double-decrements. It evicts from `availableWorkers`, rejects any in-flight
 *   batch, and tries the next queued task.
 * - When the LAST living worker dies, any queued `pendingTasks` are rejected
 *   immediately and any subsequent `processBatch` call rejects synchronously
 *   with `All worker threads have died`. This prevents a deadlock in the
 *   catastrophic case where every worker dies (e.g. module-load failure) and no
 *   thread is left to drain the queue.
 * - `shutdown()` rejects every queued and active batch with a "shutdown" error
 *   and terminates all workers. After shutdown, `processBatch` rejects synchronously.
 */
export class WorkerPool implements WorkerPoolLike {
  private readonly workers: WorkerHandle[] = [];
  private availableWorkers: WorkerHandle[] = [];
  private readonly activeTasks = new Map<WorkerHandle, WorkerBatchTask>();
  private pendingTasks: WorkerBatchTask[] = [];
  private isShuttingDown = false;
  // Counts workers that are still usable (haven't been observed dead via
  // `'error'` or `'exit'`). Decremented exactly once per worker death by the
  // idempotent `handleWorkerDeath` helper.
  private livingWorkerCount = 0;
  // Workers already accounted for by `handleWorkerDeath`. Guards against
  // `'error' → 'exit'` firing in sequence (Node emits 'exit' after 'error' for
  // every terminated worker, and also fires 'exit' on clean termination with
  // no preceding 'error').
  private readonly deadWorkers = new Set<WorkerHandle>();

  constructor(
    workerCount: number,
    workerPath: string,
    workerData: unknown,
    workerFactory: WorkerFactory = defaultWorkerFactory
  ) {
    for (let i = 0; i < workerCount; i++) {
      const worker = workerFactory(workerPath, workerData);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
      this.livingWorkerCount++;

      worker.on('message', (response: WorkerBatchMessage) => {
        const task = this.activeTasks.get(worker);
        if (!task) return;
        this.activeTasks.delete(worker);
        this.availableWorkers.push(worker);

        task.resolve(Array.isArray(response?.results) ? response.results : []);

        this.processNextTask();
      });

      worker.on('error', (error: Error) => {
        this.handleWorkerDeath(worker, error);
      });

      worker.on('exit', () => {
        // Covers the clean-exit case where the worker stops without emitting
        // `'error'` first. No-op when `'error'` already handled this worker.
        this.handleWorkerDeath(worker, new Error('Worker exited unexpectedly'));
      });
    }
  }

  /**
   * Idempotent worker-death path. Called from both `'error'` (carries the real
   * throw) and `'exit'` (carries a synthesized reason for clean exits). The
   * `deadWorkers` guard ensures exactly-once bookkeeping no matter the event
   * ordering.
   */
  private handleWorkerDeath(worker: WorkerHandle, reason: Error): void {
    if (this.deadWorkers.has(worker)) return;
    this.deadWorkers.add(worker);

    // Two cases to cover:
    //   1. Worker died while active: it's in activeTasks, not availableWorkers.
    //   2. Worker died while idle (e.g. module-load throw, or clean
    //      `process.exit(0)` from the worker): it's still in availableWorkers
    //      and must be removed explicitly so `processNextTask` never picks it.
    const availableIdx = this.availableWorkers.indexOf(worker);
    if (availableIdx !== -1) {
      this.availableWorkers.splice(availableIdx, 1);
    }

    const task = this.activeTasks.get(worker);
    if (task) {
      this.activeTasks.delete(worker);
      task.reject(reason);
    }

    this.livingWorkerCount--;

    if (this.livingWorkerCount === 0 && this.pendingTasks.length > 0) {
      // No worker left to drain the queue; reject everything so callers
      // (and the orchestrator's `failureState` early-exit) can abort cleanly.
      const stranded = this.pendingTasks;
      this.pendingTasks = [];
      for (const queued of stranded) {
        queued.reject(new Error('All worker threads have died'));
      }
    }

    this.processNextTask();
  }

  private processNextTask(): void {
    if (
      this.isShuttingDown ||
      this.pendingTasks.length === 0 ||
      this.availableWorkers.length === 0
    ) {
      return;
    }

    const task = this.pendingTasks.shift()!;
    const worker = this.availableWorkers.pop()!;

    this.activeTasks.set(worker, task);

    worker.postMessage({ files: task.items });
  }

  async processBatch(items: WorkerBatchItem[]): Promise<WorkerBatchItemResult[]> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }
    if (this.livingWorkerCount === 0) {
      // Catastrophic prior failure (all workers died). Fast-fail rather than
      // queueing a task no thread can ever pick up.
      throw new Error('All worker threads have died');
    }
    if (items.length === 0) {
      return [];
    }

    return new Promise<WorkerBatchItemResult[]>((resolve, reject) => {
      this.pendingTasks.push({ items, resolve, reject });
      this.processNextTask();
    });
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    for (const task of this.pendingTasks) {
      task.reject(new Error('Worker pool shutdown'));
    }
    this.pendingTasks = [];

    for (const task of this.activeTasks.values()) {
      task.reject(new Error('Worker pool shutdown'));
    }
    this.activeTasks.clear();

    // Force-resolve each terminate() within 1s so a stuck/dead worker can't
    // block the orchestrator's `finally` cleanup indefinitely.
    await Promise.all(
      this.workers.map(
        (worker) =>
          new Promise<void>((resolve) => {
            let settled = false;
            const settle = () => {
              if (settled) return;
              settled = true;
              resolve();
            };
            worker.terminate().then(settle, settle);
            setTimeout(settle, 1000).unref?.();
          })
      )
    );
  }
}
