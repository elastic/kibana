/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import type { InternalThreadsStart, ManagedWorker } from '@kbn/core-threads-server-internal';
import type { Logger } from '@kbn/logging';
import type { AdmissionLimits } from './admission';
import {
  BLOCK_THRESHOLD_MS,
  HEARTBEAT_INTERVAL_MS,
  SLOT_COUNT,
  Slot,
  WATCHDOG_WORKER_NAME,
  monotonicUs,
  type MainToWorkerMessage,
  type WatchdogWorkerData,
  type WorkerToMainMessage,
} from './types';

export const MAX_RESTARTS = 3;
export const RESTART_BASE_DELAY_MS = 1_000;
const WORKER_ENTRY = Path.resolve(__dirname, 'worker_entry.js');

export interface EventLoopWatchdogParams {
  threads: InternalThreadsStart;
  logger: Logger;
  sanitizeRoot: string;
  diagnosticDir?: string;
  admissionLimits?: AdmissionLimits;
  profiling?: WatchdogWorkerData['profiling'];
  workerEntry?: string;
}

/**
 * Main-thread side: only stamps the heartbeat the worker watches. Detection and profiling run in
 * the worker, which profiles this thread through an inspector session when a block is egregious.
 */
export class EventLoopWatchdog {
  private worker?: ManagedWorker;
  private heartbeatTimer?: NodeJS.Timeout;
  private stopping?: Promise<void>;
  private shared?: BigInt64Array;
  private runningSinceUs = 0;

  constructor(private readonly params: EventLoopWatchdogParams) {}

  public start(): void {
    if (this.worker) return;
    if (this.stopping) throw new Error('Cannot start the watchdog while it is stopping');
    const {
      threads,
      logger,
      sanitizeRoot,
      diagnosticDir,
      admissionLimits,
      profiling,
      workerEntry,
    } = this.params;
    const shared = new BigInt64Array(
      new SharedArrayBuffer(SLOT_COUNT * BigInt64Array.BYTES_PER_ELEMENT)
    );
    Atomics.store(shared, Slot.heartbeat, BigInt(monotonicUs()));
    Atomics.store(shared, Slot.runningSince, BigInt(this.runningSinceUs));
    this.shared = shared;
    this.heartbeatTimer = setInterval(
      () => Atomics.store(shared, Slot.heartbeat, BigInt(monotonicUs())),
      HEARTBEAT_INTERVAL_MS
    );
    this.heartbeatTimer.unref();

    const workerData: WatchdogWorkerData = {
      shared: shared.buffer as SharedArrayBuffer,
      sanitizeRoot,
      diagnosticDir,
      admissionLimits,
      profiling,
    };
    this.worker = threads.createWorker<MainToWorkerMessage, WorkerToMainMessage>({
      filename: workerEntry ?? WORKER_ENTRY,
      options: {
        workerData,
        name: WATCHDOG_WORKER_NAME,
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
      },
      logger,
      unref: true,
      restart: { maxAttempts: MAX_RESTARTS, delayMs: RESTART_BASE_DELAY_MS },
      onMessage: ({ level, message, meta }) => logger[level](message, meta),
      onExhausted: () => {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      },
    });
    this.worker.start();
    logger.info(
      `Event loop watchdog started (threshold ${BLOCK_THRESHOLD_MS}ms, heartbeat ${HEARTBEAT_INTERVAL_MS}ms)`
    );
  }

  /** Marks the end of startup: later blocks are written within the running budget. */
  public markRunning(): void {
    if (this.runningSinceUs) return;
    this.runningSinceUs = monotonicUs();
    if (this.shared) Atomics.store(this.shared, Slot.runningSince, BigInt(this.runningSinceUs));
  }

  public stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    const { worker } = this;
    if (!worker) return Promise.resolve();
    this.worker = undefined;
    this.shared = undefined;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    // Terminating the worker also ends its inspector session (and so any running profile).
    this.stopping = worker
      .stop()
      .then(() => this.params.logger.info('Event loop watchdog stopped'))
      .finally(() => {
        this.stopping = undefined;
      });
    return this.stopping;
  }
}
