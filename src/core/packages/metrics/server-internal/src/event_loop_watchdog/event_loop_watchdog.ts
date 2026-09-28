/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { Logger, LogMeta } from '@kbn/logging';
import type { ActivityRegistry } from './activity_registry';
import { formatReportMessage } from './format';
import type {
  BlockReport,
  LiveNoticeFormat,
  MainToWorkerMessage,
  WatchdogOptions,
  WatchdogWorkerData,
  WorkerToMainMessage,
} from './types';

/** Maximum automatic restarts after unexpected worker exits, until the next enable. */
export const MAX_RESTARTS = 3;
export const RESTART_BASE_DELAY_MS = 1_000;
const WORKER_ENTRY = Path.resolve(__dirname, 'worker_entry.js');
const STDOUT_FD = 1;

interface WatchdogLogMeta extends LogMeta {
  kibana: { event_loop_watchdog: BlockReport };
}

export interface EventLoopWatchdogParams {
  logger: Logger;
  /** Logger context written in worker-emitted lines, e.g. `metrics.event_loop_watchdog`. */
  loggerName: string;
  options: WatchdogOptions;
  registry: ActivityRegistry;
  /** Format of worker-written live notices; `undefined` disables them. */
  liveNoticeFormat: LiveNoticeFormat | undefined;
  sanitizeRoot: string;
  /** Worker entry module; overridable for tests. */
  workerEntry?: string;
  /** File descriptor for worker-written live notices; defaults to stdout. */
  outputFd?: number;
}

const heartbeatNowUs = (): bigint => process.hrtime.bigint() / 1000n;

/**
 * Removes lifecycle listeners from a worker that is being discarded. An `error` listener must stay
 * installed until termination completes: an unhandled `error` event would throw on the main thread.
 */
const detachWorker = (worker: Worker): void => {
  worker.removeAllListeners('message');
  worker.removeAllListeners('exit');
  worker.removeAllListeners('error');
  worker.on('error', () => {});
};

/**
 * Main-thread side of the watchdog: owns the heartbeat, the worker's lifecycle (with bounded
 * restarts) and forwards activity changes and reports between the registry, worker and logger.
 */
export class EventLoopWatchdog {
  private readonly logger: Logger;
  private worker?: Worker;
  private heartbeatTimer?: NodeJS.Timeout;
  private restartTimer?: NodeJS.Timeout;
  private restarts = 0;
  private running = false;
  private stopping?: Promise<void>;

  constructor(private readonly params: EventLoopWatchdogParams) {
    this.logger = params.logger;
  }

  public get isRunning(): boolean {
    return this.running;
  }

  /** Starts the heartbeat and worker; resets the restart budget. Idempotent. */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.restarts = 0;

    const buffer = new SharedArrayBuffer(BigInt64Array.BYTES_PER_ELEMENT);
    const heartbeat = new BigInt64Array(buffer);
    Atomics.store(heartbeat, 0, heartbeatNowUs());
    this.heartbeatTimer = setInterval(
      () => Atomics.store(heartbeat, 0, heartbeatNowUs()),
      this.params.options.heartbeatIntervalMs
    );
    this.heartbeatTimer.unref();

    this.logger.info(
      `Event loop watchdog started (threshold ${this.params.options.thresholdMs}ms, heartbeat ${this.params.options.heartbeatIntervalMs}ms)`
    );
    this.trySpawnWorker(buffer);
  }

  /** Stops the heartbeat and terminates the worker. Concurrent callers await the same cleanup. */
  public stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    if (!this.running) return Promise.resolve();
    this.stopping = this.doStop().finally(() => {
      this.stopping = undefined;
    });
    return this.stopping;
  }

  private async doStop(): Promise<void> {
    this.running = false;
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.restartTimer);
    this.heartbeatTimer = undefined;
    this.restartTimer = undefined;
    this.params.registry.setListener(undefined);

    const { worker } = this;
    this.worker = undefined;
    if (worker) {
      detachWorker(worker);
      await worker.terminate();
    }
    this.logger.info('Event loop watchdog stopped');
  }

  private spawnWorker(buffer: SharedArrayBuffer): void {
    const { options, liveNoticeFormat, sanitizeRoot, registry, workerEntry, loggerName, outputFd } =
      this.params;
    const workerData: WatchdogWorkerData = {
      heartbeat: buffer,
      options,
      liveNoticeFormat,
      sanitizeRoot,
      loggerName,
      outputFd: outputFd ?? STDOUT_FD,
    };

    const worker = new Worker(workerEntry ?? WORKER_ENTRY, {
      workerData,
      name: 'kibana-event-loop-watchdog',
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
      stdout: false,
      stderr: false,
    });
    // a diagnostic must never keep the process alive
    worker.unref();
    this.worker = worker;

    const post = (message: MainToWorkerMessage) => worker.postMessage(message);
    const snapshot = registry.setListener({
      onStart: (key, activity) => post({ type: 'activity-start', key, activity }),
      onEnd: (key) => post({ type: 'activity-end', key }),
    });
    post({ type: 'snapshot', activities: snapshot });

    worker.on('message', (message: WorkerToMainMessage) => this.onWorkerMessage(message));
    worker.on('error', (error) => {
      this.logger.warn(`Event loop watchdog worker failed: ${error.message}`);
    });
    worker.on('exit', (code) => this.onWorkerExit(worker, buffer, code));
  }

  private onWorkerExit(worker: Worker, buffer: SharedArrayBuffer, code: number): void {
    if (!this.running || this.worker !== worker) return;
    this.worker = undefined;
    this.params.registry.setListener(undefined);
    this.scheduleRestart(buffer, `exited unexpectedly (code ${code})`);
  }

  private scheduleRestart(buffer: SharedArrayBuffer, reason: string): void {
    if (this.restarts >= MAX_RESTARTS) {
      // stay `running` so that disabling and re-enabling resets the budget, but stop the heartbeat
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      this.logger.error(
        `Event loop watchdog worker ${reason} and exhausted ${MAX_RESTARTS} restarts; the watchdog stays inactive until it is disabled and re-enabled`
      );
      return;
    }
    const delay = RESTART_BASE_DELAY_MS * 2 ** this.restarts;
    this.restarts++;
    this.logger.warn(
      `Event loop watchdog worker ${reason}; restart ${this.restarts}/${MAX_RESTARTS} in ${delay}ms`
    );
    this.restartTimer = setTimeout(() => {
      this.restartTimer = undefined;
      if (this.running) this.trySpawnWorker(buffer);
    }, delay);
    this.restartTimer.unref();
  }

  /** Spawns the worker; failures (initial or on restart) go through the bounded restart path. */
  private trySpawnWorker(buffer: SharedArrayBuffer): void {
    try {
      this.spawnWorker(buffer);
    } catch (error) {
      // never let a spawn failure escape, e.g. from a timer callback on the main thread
      this.discardWorker();
      this.scheduleRestart(buffer, `failed to start (${error.message})`);
    }
  }

  private discardWorker(): void {
    const { worker } = this;
    this.worker = undefined;
    this.params.registry.setListener(undefined);
    if (worker) {
      detachWorker(worker);
      worker.terminate().catch(() => {});
    }
  }

  private onWorkerMessage(message: WorkerToMainMessage): void {
    if (message.type === 'ready') {
      this.logger.debug(`Event loop watchdog worker ready (profiler: ${message.profiler})`);
    } else if (message.type === 'report') {
      const { report } = message;
      this.logger.warn<WatchdogLogMeta>(formatReportMessage(report), {
        tags: ['event-loop-watchdog'],
        kibana: { event_loop_watchdog: report },
      });
    } else if (message.type === 'worker-error') {
      this.logger.warn(`Event loop watchdog: ${message.message}`);
    }
  }
}
