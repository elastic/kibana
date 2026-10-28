/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorker, WorkerLoggingConfig } from '@kbn/core-threads-server-internal';
import { createManagedWorker } from '@kbn/core-threads-server-internal';
import type { Logger } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
import type { Phase, WatchdogWorkerData } from './types';
import {
  HEARTBEAT_INTERVAL_MS,
  SLOT_COUNT,
  Slot,
  WATCHDOG_WORKER_NAME,
  monotonicUs,
} from './constants';

// The worker used 20-24 MB of heap over 10 minutes in dev, with the require hook loaded.
const WORKER_MAX_OLD_GENERATION_SIZE_MB = 64;
const WORKER_MAX_YOUNG_GENERATION_SIZE_MB = 16;

export interface EventLoopWatchdogParams {
  logger: Logger;
  thresholdsMs: Readonly<Record<Phase, number>>;
  statsIntervalMs: number;
  logging: WorkerLoggingConfig;
  /** Overrides the worker entry, for tests. */
  workerEntry?: string;
}

/** Main-thread side: stamps the heartbeat the worker watches. Detection runs in the worker. */
export class EventLoopWatchdog {
  private worker?: ManagedWorker;
  private heartbeatTimer?: NodeJS.Timeout;
  private stopping?: Promise<void>;
  private shared?: BigInt64Array;
  private runningSinceUs = 0;

  constructor(private readonly params: EventLoopWatchdogParams) {}

  public start(): void {
    if (this.worker) {
      return;
    }
    if (this.stopping) {
      throw new Error('Cannot start the event loop watchdog while it is stopping');
    }
    const { logger, thresholdsMs, statsIntervalMs, logging, workerEntry } = this.params;
    // Resolve first: if it throws, no heartbeat timer is left behind.
    const entry = workerEntry ?? require.resolve('./worker');
    const shared = new BigInt64Array(
      new SharedArrayBuffer(SLOT_COUNT * BigInt64Array.BYTES_PER_ELEMENT)
    );
    // Stamp before the worker starts, so its first poll doesn't see a stale heartbeat.
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
      thresholdsMs,
      statsIntervalMs,
      logging,
    };
    this.worker = createManagedWorker<WatchdogWorkerData>({
      name: WATCHDOG_WORKER_NAME,
      entry,
      workerData,
      resourceLimits: {
        maxOldGenerationSizeMb: WORKER_MAX_OLD_GENERATION_SIZE_MB,
        maxYoungGenerationSizeMb: WORKER_MAX_YOUNG_GENERATION_SIZE_MB,
      },
      logger,
      unref: true,
      onExhausted: () => this.clearHeartbeat(),
    });
    this.worker.start();
    logger.info(
      `Event loop watchdog started (block threshold ${thresholdsMs.running}ms, ${thresholdsMs.starting}ms while starting)`
    );
    this.warnIfSilent();
  }

  /** A watchdog whose log lines are off looks the same as a Kibana without blocks. */
  private warnIfSilent(): void {
    const { logger, logging } = this.params;
    const level = LogLevel.fromId(logging.level);
    if (!logging.format) {
      logger.warn(
        `Event loop watchdog log lines are off: no console appender is configured for logger [${logging.context}]`
      );
    } else if (!level.supports(LogLevel.Warn)) {
      // Logged at error: this logger's level hides warn.
      logger.error(
        `Event loop watchdog log lines are off: logger [${logging.context}] has level [${logging.level}], and block warnings are written at [warn]`
      );
    } else if (!level.supports(LogLevel.Info)) {
      logger.warn(
        `Event loop watchdog stats log lines are off: logger [${logging.context}] has level [${logging.level}], and they are written at [info]`
      );
    }
  }

  /**
   * Marks the end of startup. Stores the time of the call rather than a precomputed time: this
   * runs on the main thread, so it can't run during a block, and a block can't switch phase.
   */
  public markRunning(): void {
    if (this.runningSinceUs) {
      return;
    }
    this.runningSinceUs = monotonicUs();
    if (this.shared) {
      Atomics.store(this.shared, Slot.runningSince, BigInt(this.runningSinceUs));
      // Also stamp the heartbeat, so a block that starts right after this is measured from a
      // heartbeat that's already running, not one up to an interval older.
      Atomics.store(this.shared, Slot.heartbeat, BigInt(this.runningSinceUs));
    }
  }

  public stop(): Promise<void> {
    if (this.stopping) {
      return this.stopping;
    }
    const { worker } = this;
    if (!worker) {
      return Promise.resolve();
    }
    this.worker = undefined;
    this.shared = undefined;
    this.clearHeartbeat();
    this.stopping = worker
      .stop()
      .then(() => this.params.logger.info('Event loop watchdog stopped'))
      .finally(() => {
        this.stopping = undefined;
      });
    return this.stopping;
  }

  private clearHeartbeat(): void {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }
}
