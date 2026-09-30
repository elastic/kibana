/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import type {
  InternalThreadsStart,
  ManagedWorker,
  WorkerLoggingConfig,
} from '@kbn/core-threads-server-internal';
import type { Logger } from '@kbn/logging';
import type { ActivityRegistry } from './activity_registry';
import type { MainToWorkerMessage, WatchdogOptions, WatchdogWorkerData } from './types';
import { WATCHDOG_WORKER_NAME } from './types';

export const MAX_RESTARTS = 3;
export const RESTART_BASE_DELAY_MS = 1_000;
const WORKER_ENTRY = Path.resolve(__dirname, 'worker_entry.js');

export interface EventLoopWatchdogParams {
  threads: InternalThreadsStart;
  logger: Logger;
  logging: WorkerLoggingConfig;
  options: WatchdogOptions;
  registry: ActivityRegistry;
  sanitizeRoot: string;
  workerEntry?: string;
  outputFd?: number;
}

const heartbeatNowUs = (): bigint => process.hrtime.bigint() / 1000n;

/** Maintains the heartbeat and activity stream; Threads owns the diagnostic worker's lifecycle. */
export class EventLoopWatchdog {
  private worker?: ManagedWorker;
  private heartbeatTimer?: NodeJS.Timeout;
  private stopping?: Promise<void>;

  constructor(private readonly params: EventLoopWatchdogParams) {}

  public get isRunning(): boolean {
    return this.worker !== undefined;
  }

  public start(): void {
    if (this.worker) return;
    if (this.stopping) throw new Error('Cannot start the watchdog while it is stopping');
    const buffer = new SharedArrayBuffer(BigInt64Array.BYTES_PER_ELEMENT);
    const heartbeat = new BigInt64Array(buffer);
    Atomics.store(heartbeat, 0, heartbeatNowUs());
    this.heartbeatTimer = setInterval(
      () => Atomics.store(heartbeat, 0, heartbeatNowUs()),
      this.params.options.heartbeatIntervalMs
    );
    this.heartbeatTimer.unref();
    const { options, logging, registry, workerEntry, outputFd, sanitizeRoot, logger } = this.params;
    const workerData: WatchdogWorkerData = {
      heartbeat: buffer,
      options,
      logging,
      outputFd: outputFd ?? 1,
      sanitizeRoot,
    };
    this.worker = this.params.threads.createWorker<MainToWorkerMessage>({
      filename: workerEntry ?? WORKER_ENTRY,
      options: {
        workerData,
        name: WATCHDOG_WORKER_NAME,
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
        stdout: false,
        stderr: false,
      },
      logger,
      unref: true,
      restart: { maxAttempts: MAX_RESTARTS, delayMs: RESTART_BASE_DELAY_MS },
      onStart: (post) => {
        const activities = registry.setListener({
          onStart: (key, activity) => post({ type: 'activity-start', key, activity }),
          onEnd: (key) => post({ type: 'activity-end', key }),
        });
        post({ type: 'snapshot', activities });
      },
      onExit: () => registry.setListener(undefined),
      onExhausted: () => {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      },
    });
    logger.info(
      `Event loop watchdog started (threshold ${options.thresholdMs}ms, heartbeat ${options.heartbeatIntervalMs}ms)`
    );
    this.worker.start();
  }

  public stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    const { worker } = this;
    if (!worker) return Promise.resolve();
    this.worker = undefined;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    this.stopping = worker
      .stop()
      .then(() => {
        this.params.logger.info('Event loop watchdog stopped');
      })
      .finally(() => {
        this.stopping = undefined;
      });
    return this.stopping;
  }
}
