/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { Worker } from 'worker_threads';
import { zstdCompressSync, zstdDecompress } from 'zlib';
import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { MessageFromWorker, MessageToWorker } from './messages';

/**
 * How long to wait for a `get` response from the worker before falling back
 * to the ES rehydration path.
 *
 * When compressIpc=false the worker returns payloads as plain JSON strings
 * (structured-clone). For large step outputs (e.g. 8 × 4 MB = 32 MB) the V8
 * serializer/deserializer takes ~100–250 ms under heap pressure, so 50 ms was
 * too tight. When compressIpc=true the worker transfers zstd-compressed
 * Uint8Arrays (zero-copy); main-thread decompression is async on the libuv
 * threadpool and is much faster for large batches. 500 ms covers both paths.
 */
const SQLITE_GET_TIMEOUT_MS = 500;

interface PendingGet {
  resolve: (result: Map<string, JsonValue | null>) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingCleanup {
  resolve: () => void;
  reject: (err: Error) => void;
}

/**
 * Main-thread async client for the SQLite worker thread.
 *
 * Ordering guarantee: `put` and `get` both postMessage to the same singleton
 * worker via its single FIFO message queue. A `get` for a given step execution
 * id cannot outrun its own prior `put` within the same process.
 *
 * Created once in plugin.start() when sqliteCache.enabled=true and shared
 * across all concurrent workflow executions via dependencies injection.
 */
export class SqliteCacheClient {
  private worker: Worker | null = null;
  private degraded = false;
  private readonly pendingGets = new Map<string, PendingGet>();
  private readonly pendingCleanups = new Map<string, PendingCleanup>();
  private correlationCounter = 0;
  private readonly logger: Logger;
  private readonly isDist: boolean;
  private readonly compressIpc: boolean;
  private readonly jsonbStorage: boolean;

  constructor(
    logger: Logger,
    isDist: boolean,
    opts: { compressIpc: boolean; jsonbStorage: boolean } = {
      compressIpc: false,
      jsonbStorage: false,
    }
  ) {
    this.logger = logger;
    this.isDist = isDist;
    this.compressIpc = opts.compressIpc;
    this.jsonbStorage = opts.jsonbStorage;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const workerPath = path.resolve(
      __dirname,
      this.isDist ? './db_worker.js' : './db_worker_src_harness.js'
    );

    const worker = new Worker(workerPath, {
      workerData: { compressIpc: this.compressIpc, jsonbStorage: this.jsonbStorage },
    });
    this.worker = worker;

    worker.on('message', (msg: MessageFromWorker) => {
      if (msg.type === 'get_result') {
        const pending = this.pendingGets.get(msg.correlationId);
        if (!pending) return; // already timed out
        clearTimeout(pending.timer);
        this.pendingGets.delete(msg.correlationId);

        if (msg.compressed) {
          // Decompress each non-null payload asynchronously on the libuv threadpool,
          // then JSON.parse. A corrupt buffer resolves an empty Map (ES fallback).
          const decompressions = msg.payloads.map((raw) =>
            raw != null
              ? new Promise<Buffer>((res, rej) =>
                  zstdDecompress(raw as Uint8Array, (err, buf) => (err ? rej(err) : res(buf)))
                )
              : Promise.resolve(null)
          );
          Promise.all(decompressions)
            .then((bufs) => {
              const result = new Map<string, JsonValue | null>();
              for (let i = 0; i < msg.ids.length; i++) {
                const buf = bufs[i];
                result.set(
                  msg.ids[i],
                  buf != null ? (JSON.parse(buf.toString()) as JsonValue) : null
                );
              }
              pending.resolve(result);
            })
            .catch(() => {
              // Corrupt decompression — fall back to ES for this batch
              pending.resolve(new Map());
            });
        } else {
          const result = new Map<string, JsonValue | null>();
          for (let i = 0; i < msg.ids.length; i++) {
            const raw = msg.payloads[i] as string | null;
            result.set(msg.ids[i], raw != null ? (JSON.parse(raw) as JsonValue) : null);
          }
          pending.resolve(result);
        }
      } else if (msg.type === 'cleanup_result') {
        const pending = this.pendingCleanups.get(msg.correlationId);
        if (!pending) return;
        this.pendingCleanups.delete(msg.correlationId);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve();
        }
      }
    });

    worker.on('error', (err) => {
      this.logger.warn(`SQLite cache worker error: ${err.message}`);
    });

    worker.on('exit', (code) => {
      if (!this.degraded) {
        this.logger.warn(`SQLite cache worker exited (code=${code}); degrading to ES fallback`);
        this.degraded = true;
      }
      this.worker = null;
      // Drain all in-flight gets immediately so callers don't wait for the timeout
      for (const [id, pending] of this.pendingGets) {
        clearTimeout(pending.timer);
        pending.resolve(new Map());
        this.pendingGets.delete(id);
      }
      // Drain in-flight cleanups
      for (const [id, pending] of this.pendingCleanups) {
        pending.resolve();
        this.pendingCleanups.delete(id);
      }
    });

    return worker;
  }

  public put(stepExecutionId: string, workflowRunId: string, value: JsonValue | null): void {
    if (this.degraded) return;

    // Encode then transfer zero-copy. When compressIpc=true, zstd-compress the JSON
    // bytes synchronously (single step output, ~2–5 ms) so the put FIFO order is
    // preserved — an async compress here could let a subsequent get outrun the put.
    const payload = this.compressIpc
      ? zstdCompressSync(Buffer.from(JSON.stringify(value)))
      : new TextEncoder().encode(JSON.stringify(value));

    const msg: MessageToWorker = {
      type: 'put',
      stepExecutionId,
      workflowRunId,
      payload,
    };

    try {
      this.ensureWorker().postMessage(msg, [payload.buffer]);
    } catch (err) {
      this.logger.warn(
        `SQLite cache put failed: ${err instanceof Error ? err.message : String(err)}`
      );
      this.degraded = true;
    }
  }

  public get(
    stepExecutionIds: readonly string[],
    workflowRunId: string
  ): Promise<Map<string, JsonValue | null>> {
    if (this.degraded || stepExecutionIds.length === 0) {
      return Promise.resolve(new Map());
    }

    const correlationId = String(++this.correlationCounter);

    return new Promise<Map<string, JsonValue | null>>((resolve) => {
      const timer = setTimeout(() => {
        // Delete before resolving — prevents map accumulation when worker is degraded
        this.pendingGets.delete(correlationId);
        this.logger.debug(
          `SQLite cache get timed out after ${SQLITE_GET_TIMEOUT_MS}ms for ${stepExecutionIds.length} id(s); falling back to ES`
        );
        resolve(new Map());
      }, SQLITE_GET_TIMEOUT_MS);

      this.pendingGets.set(correlationId, { resolve, timer });

      const msg: MessageToWorker = {
        type: 'get',
        correlationId,
        stepExecutionIds: stepExecutionIds as string[],
        workflowRunId,
      };

      try {
        this.ensureWorker().postMessage(msg);
      } catch (err) {
        clearTimeout(timer);
        this.pendingGets.delete(correlationId);
        this.logger.warn(
          `SQLite cache get failed: ${err instanceof Error ? err.message : String(err)}`
        );
        this.degraded = true;
        resolve(new Map());
      }
    });
  }

  public async cleanup(workflowRunId: string): Promise<void> {
    if (this.degraded) return;

    const correlationId = String(++this.correlationCounter);

    return new Promise<void>((resolve, reject) => {
      this.pendingCleanups.set(correlationId, { resolve, reject });

      const msg: MessageToWorker = { type: 'cleanup', correlationId, workflowRunId };

      try {
        this.ensureWorker().postMessage(msg);
      } catch (err) {
        this.pendingCleanups.delete(correlationId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  public async shutdown(): Promise<void> {
    if (!this.worker) return;
    const w = this.worker;
    this.worker = null;
    const msg: MessageToWorker = { type: 'shutdown' };
    w.postMessage(msg);
    await new Promise<void>((resolve) => w.once('exit', () => resolve()));
  }
}
