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
  PostMessage,
} from '@kbn/core-threads-server-internal';
import type { Logger } from '@kbn/logging';
import type { AdmissionLimits } from './admission';
import { ProfilingSession, createV8CpuProfiler } from './profiling_session';
import type { CpuProfiler, KeptProfile, SessionLimits } from './profiling_session';
import {
  BLOCK_THRESHOLD_MS,
  HEARTBEAT_INTERVAL_MS,
  MAX_CLASSIFY_WAIT_MS,
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
  /** Defaults to Node's V8 CPU profiler (`v8.startCpuProfile`). */
  profiler?: CpuProfiler;
  limits?: SessionLimits;
  admissionLimits?: AdmissionLimits;
  workerEntry?: string;
}

/**
 * Main-thread side: stamps the heartbeat the worker watches, and runs the profiling session that
 * keeps the windows the worker flags as containing a block.
 */
export class EventLoopWatchdog {
  private worker?: ManagedWorker;
  private post?: PostMessage<MainToWorkerMessage>;
  private heartbeatTimer?: NodeJS.Timeout;
  private session?: ProfilingSession;
  private stopping?: Promise<void>;
  private generation = 0;
  private shared?: BigInt64Array;
  private readonly profiler: CpuProfiler;
  private runningSinceUs = 0;

  constructor(private readonly params: EventLoopWatchdogParams) {
    this.profiler = params.profiler ?? createV8CpuProfiler();
  }

  public start(): void {
    if (this.worker) return;
    if (this.stopping) throw new Error('Cannot start the watchdog while it is stopping');
    const { threads, logger, sanitizeRoot, diagnosticDir, admissionLimits, workerEntry } =
      this.params;
    const shared = new BigInt64Array(
      new SharedArrayBuffer(SLOT_COUNT * BigInt64Array.BYTES_PER_ELEMENT)
    );
    let lastStampUs = monotonicUs();
    let stallEndedUs = 0;
    Atomics.store(shared, Slot.heartbeat, BigInt(lastStampUs));
    Atomics.store(shared, Slot.runningSince, BigInt(this.runningSinceUs));
    this.shared = shared;
    this.heartbeatTimer = setInterval(() => {
      const nowUs = monotonicUs();
      if (nowUs - lastStampUs >= BLOCK_THRESHOLD_MS * 1000) stallEndedUs = nowUs;
      lastStampUs = nowUs;
      Atomics.store(shared, Slot.heartbeat, BigInt(nowUs));
      // After a stall, hold rotations until the worker has classified it (and counted any block),
      // so that the window holding the block is the one that gets flagged.
      if (
        stallEndedUs &&
        Number(Atomics.load(shared, Slot.classified)) < stallEndedUs &&
        nowUs - stallEndedUs < MAX_CLASSIFY_WAIT_MS * 1000
      ) {
        return;
      }
      stallEndedUs = 0;
      this.session?.tick(Number(Atomics.load(shared, Slot.blocks)));
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref();

    const workerData: WatchdogWorkerData = {
      shared: shared.buffer as SharedArrayBuffer,
      sanitizeRoot,
      diagnosticDir,
      admissionLimits,
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
      onStart: (post) => {
        this.post = post;
      },
      onMessage: ({ level, message, meta }) => logger[level](message, meta),
      onExit: () => {
        this.post = undefined;
      },
      onExhausted: () => {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
        this.generation++; // cancels a pending session start
        this.session?.end('watchdog worker unavailable');
      },
    });
    this.worker.start();
    logger.info(
      `Event loop watchdog started (threshold ${BLOCK_THRESHOLD_MS}ms, heartbeat ${HEARTBEAT_INTERVAL_MS}ms)`
    );
    // The cold start pauses the main thread: let the caller (a flag toggle) complete first.
    const generation = ++this.generation;
    setImmediate(() => this.startProfiling(shared, generation));
  }

  /** Marks the end of startup: later blocks are written within the running budget. */
  public markRunning(): void {
    if (this.runningSinceUs) return;
    this.runningSinceUs = monotonicUs();
    if (this.shared) Atomics.store(this.shared, Slot.runningSince, BigInt(this.runningSinceUs));
  }

  /** Whether a profiling session is collecting samples. */
  public get isProfiling(): boolean {
    return this.session?.isActive ?? false;
  }

  public stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    const { worker } = this;
    if (!worker) return Promise.resolve();
    this.generation++;
    this.session?.end('watchdog stopped');
    this.session = undefined;
    this.worker = undefined;
    this.post = undefined;
    this.shared = undefined;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    this.stopping = worker
      .stop()
      .then(() => this.params.logger.info('Event loop watchdog stopped'))
      .finally(() => {
        this.stopping = undefined;
      });
    return this.stopping;
  }

  private startProfiling(shared: BigInt64Array, generation: number): void {
    if (generation !== this.generation) return;
    const { logger, limits } = this.params;
    try {
      const session = new ProfilingSession({
        profiler: this.profiler,
        limits,
        logger,
        now: monotonicUs,
        markRotation: (phase, atUs) =>
          Atomics.store(
            shared,
            phase === 'start' ? Slot.rotationStart : Slot.rotationEnd,
            BigInt(atUs)
          ),
        onKeep: (profile) => this.sendProfile(profile),
      });
      session.start(Number(Atomics.load(shared, Slot.blocks)));
      this.session = session;
    } catch (error) {
      logger.warn(`Event loop profiling unavailable: ${error.message}`);
    }
  }

  private sendProfile({ json, stoppedAtUs, window, kept }: KeptProfile): void {
    // Only the worker that flagged the window knows its blocks; a string is cheap to post.
    const { post } = this;
    try {
      if (!post) throw new Error('watchdog worker unavailable');
      post({
        type: 'profile',
        json,
        stoppedAtUs,
        windowStartUs: window.startUs,
        windowEndUs: window.endUs,
        kept,
      });
    } catch (error) {
      this.params.logger.warn(`Dropped event loop block profile #${kept}: ${error.message}`);
    }
  }
}
