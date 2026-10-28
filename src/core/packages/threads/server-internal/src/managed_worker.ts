/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker, type MessagePort } from 'node:worker_threads';
import type {
  ManagedWorker,
  ManagedWorkerExitInfo,
  ManagedWorkerExitReason,
  ManagedWorkerOptions,
  ManagedWorkerState,
  ManagedWorkerStatus,
} from './types';

const BOOTSTRAP_PATH = require.resolve('./worker_bootstrap');

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_DELAY_MS = 1_000;
const DEFAULT_STABLE_UPTIME_MS = 10 * 60 * 1_000;
const DEFAULT_READY_TIMEOUT_MS = 30_000;
const DEFAULT_HEALTH_INTERVAL_MS = 60_000;

interface ControlMessage {
  __kbnManagedWorker: 'ready' | 'health';
  heapUsed?: number;
  heapSizeLimit?: number;
}

const isControlMessage = (message: unknown): message is ControlMessage =>
  typeof message === 'object' && message !== null && '__kbnManagedWorker' in message;

const noop = () => {};

/** Spawns a single worker through the Kibana worker bootstrap and owns its restart lifecycle. */
export const createManagedWorker = <TData = unknown>(
  options: ManagedWorkerOptions<TData>
): ManagedWorker => new ManagedWorkerHandle(options);

// Lifecycle logic adapted from the event-loop watchdog PoC (elastic/kibana#295800).
class ManagedWorkerHandle<TData> implements ManagedWorker {
  private worker?: Worker;
  private restartTimer?: NodeJS.Timeout;
  private readyTimer?: NodeJS.Timeout;
  private running = false;
  private state: ManagedWorkerState = 'stopped';
  private restarts = 0;
  private readyAt?: number;
  private lastExitCode?: number;
  private threadId?: number;
  private heapUsed?: number;
  private heapSizeLimit?: number;
  private stopping?: Promise<void>;
  private termination?: Promise<void>;
  private readyPromise?: Promise<void>;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  private readySettled = false;
  private connectionTransferred = false;

  constructor(private readonly options: ManagedWorkerOptions<TData>) {}

  public start(): void {
    if (this.running) return;
    if (this.stopping) throw new Error('Cannot start a worker while it is stopping');
    this.running = true;
    this.restarts = 0;
    this.readySettled = false;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.state = 'starting';
    this.spawnAfterTermination();
  }

  public ready(): Promise<void> {
    if (!this.readyPromise) {
      return Promise.reject(new Error(`Worker ${this.options.name} has not been started`));
    }
    return this.readyPromise;
  }

  public stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.running = false;
    this.state = 'stopped';
    this.settleReady(new Error(`Worker ${this.options.name} stopped`));
    clearTimeout(this.restartTimer);
    this.restartTimer = undefined;
    this.discardWorker();
    this.stopping = (this.termination ?? Promise.resolve()).finally(() => {
      this.stopping = undefined;
    });
    return this.stopping;
  }

  public status(): ManagedWorkerStatus {
    const { state, restarts, lastExitCode, threadId, readyAt, heapUsed, heapSizeLimit } = this;
    return {
      state,
      restarts,
      lastExitCode,
      threadId,
      startedAt: readyAt === undefined ? undefined : new Date(readyAt),
      heapUsed,
      heapSizeLimit,
    };
  }

  private spawn(): void {
    const {
      name,
      entry,
      workerData,
      resourceLimits,
      logger,
      unref = true,
      readyTimeoutMs = DEFAULT_READY_TIMEOUT_MS,
      healthIntervalMs = DEFAULT_HEALTH_INTERVAL_MS,
    } = this.options;
    this.state = 'starting';
    this.readyAt = undefined;
    this.threadId = undefined;
    this.heapUsed = undefined;
    this.heapSizeLimit = undefined;
    try {
      const transferList: MessagePort[] = [];
      const payload: {
        __entry: string;
        __healthIntervalMs: number;
        __connectionPort?: MessagePort;
        data: TData | undefined;
      } = { __entry: entry, __healthIntervalMs: healthIntervalMs, data: workerData };
      if (this.options.connectionPort && !this.connectionTransferred) {
        payload.__connectionPort = this.options.connectionPort;
        transferList.push(this.options.connectionPort);
        // A MessagePort can be transferred once. Restarts need a new port from the caller.
        this.connectionTransferred = true;
      }
      const worker = new Worker(BOOTSTRAP_PATH, {
        name,
        resourceLimits,
        workerData: payload,
        transferList,
      });
      this.worker = worker;
      this.threadId = worker.threadId;
      // The `error` event precedes `exit`; it only records why, so each failure restarts once.
      let failure: Exclude<ManagedWorkerExitReason, 'ready_timeout'> = 'exit';
      let failureError: Error | undefined;
      worker.on('error', (error: NodeJS.ErrnoException) => {
        failure = error.code === 'ERR_WORKER_OUT_OF_MEMORY' ? 'oom' : 'error';
        failureError = error;
      });
      worker.on('exit', (exitCode) => {
        if (!this.running || this.worker !== worker) return;
        this.handleExit(exitCode, failure, failureError);
      });
      worker.on('message', (message: unknown) => {
        if (this.worker === worker && isControlMessage(message)) this.handleMessage(message);
      });
      this.readyTimer = setTimeout(() => {
        // Defer the decision so a `ready` queued behind a blocked main thread is handled first.
        setImmediate(() => {
          if (this.worker !== worker || this.readyAt !== undefined) return;
          this.discardWorker();
          this.scheduleRestart(`did not report ready within ${readyTimeoutMs}ms`, {
            reason: 'ready_timeout',
          });
        });
      }, readyTimeoutMs);
      if (unref) this.readyTimer.unref();
      logger.info(`Worker ${name} starting (thread ${worker.threadId})`);
      // Unref last: attaching listeners can re-ref the worker's message port.
      if (unref) worker.unref();
    } catch (error) {
      this.discardWorker();
      this.scheduleRestart(`failed to start (${error.message})`);
    }
  }

  private handleMessage({
    __kbnManagedWorker: type,
    heapUsed,
    heapSizeLimit,
  }: ControlMessage): void {
    if (type === 'health') {
      if (typeof heapUsed === 'number') this.heapUsed = heapUsed;
      return;
    }
    if (type !== 'ready' || this.readyAt !== undefined) return;
    clearTimeout(this.readyTimer);
    this.readyTimer = undefined;
    this.readyAt = Date.now();
    this.state = 'running';
    this.settleReady();
    if (typeof heapSizeLimit === 'number') this.heapSizeLimit = heapSizeLimit;
    // The effective limit can differ from resourceLimits: --max-old-space-size overrides it.
    const limit =
      this.heapSizeLimit === undefined
        ? ''
        : `, heap limit ${Math.round(this.heapSizeLimit / 1024 / 1024)} MB`;
    this.options.logger.info(`Worker ${this.options.name} ready (thread ${this.threadId}${limit})`);
  }

  private handleExit(
    exitCode: number,
    reason: Exclude<ManagedWorkerExitReason, 'ready_timeout'>,
    error?: Error
  ): void {
    const { name, logger, restart } = this.options;
    const { stableUptimeMs = DEFAULT_STABLE_UPTIME_MS } = restart ?? {};
    clearTimeout(this.readyTimer);
    this.readyTimer = undefined;
    this.worker = undefined;
    this.lastExitCode = exitCode;
    if (this.readyAt !== undefined && Date.now() - this.readyAt >= stableUptimeMs) {
      this.restarts = 0;
    }
    // The `error` listener stops Node from printing the worker's error, so it is logged here.
    if (error?.stack) logger.debug(`Worker ${name} error: ${error.stack}`);
    const cause = error ? `: ${error.message}` : '';
    this.scheduleRestart(`exited unexpectedly (${reason}, code ${exitCode})${cause}`, {
      exitCode,
      reason,
    });
  }

  private scheduleRestart(failure: string, exit?: ManagedWorkerExitInfo): void {
    if (!this.running) return;
    const { name, logger, unref = true, onExit, onExhausted } = this.options;
    const { maxAttempts = DEFAULT_MAX_ATTEMPTS, initialDelayMs = DEFAULT_INITIAL_DELAY_MS } =
      this.options.restart ?? {};
    if (this.restarts >= maxAttempts) {
      this.running = false;
      this.state = 'exhausted';
      this.settleReady(new Error(`Worker ${name} ${failure}`));
      logger.error(
        `Worker ${name} ${failure} and exhausted ${maxAttempts} restarts; inactive until started again`
      );
      // Consumer callbacks run after the state transition; onExit may have stopped or restarted.
      if (exit) this.notify('onExit', () => onExit?.(exit));
      if (this.state === 'exhausted') this.notify('onExhausted', () => onExhausted?.());
      return;
    }
    const delay = initialDelayMs * 2 ** this.restarts;
    this.restarts++;
    this.state = 'restarting';
    logger.warn(`Worker ${name} ${failure}; restart ${this.restarts}/${maxAttempts} in ${delay}ms`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = undefined;
      this.spawnAfterTermination();
    }, delay);
    if (unref) this.restartTimer.unref();
    // Consumer callbacks run after the state transition, so a stop() from onExit sees it.
    if (exit) this.notify('onExit', () => onExit?.(exit));
  }

  // A worker discarded after a ready timeout may still be terminating; never run two at once.
  // A worker only spawns once no termination is pending, and none can start while no worker
  // exists, so at most one is ever pending. start() throws until a stop() settles, and that
  // waits on the same termination, so checking `running` is enough to drop a replacement after
  // stop(). A termination that never settles blocks this, like it blocks stop().
  private spawnAfterTermination(): void {
    if (!this.running) return;
    const { termination } = this;
    if (!termination) {
      this.spawn();
      return;
    }
    this.options.logger.debug(
      `Worker ${this.options.name} waiting for the previous worker to terminate`
    );
    void termination.then(() => this.spawnAfterTermination());
  }

  // A throwing consumer callback must not become an uncaught exception on the main thread.
  private notify(callback: 'onExit' | 'onExhausted', run: () => void): void {
    try {
      run();
    } catch (error) {
      this.options.logger.error(`Worker ${this.options.name} ${callback} failed: ${error.message}`);
    }
  }

  private settleReady(error?: Error): void {
    if (this.readySettled) return;
    this.readySettled = true;
    if (error) {
      this.rejectReady?.(error);
      return;
    }
    this.resolveReady?.();
  }

  private discardWorker(): void {
    clearTimeout(this.readyTimer);
    this.readyTimer = undefined;
    const { worker } = this;
    this.worker = undefined;
    if (!worker) return;
    worker.removeAllListeners('message');
    worker.removeAllListeners('exit');
    worker.removeAllListeners('error');
    // An error emitted during termination must not become an unhandled main-thread exception.
    worker.on('error', noop);
    // terminate() resolves on `exit` and never rejects (Node's lib/internal/worker.js). Clearing on
    // rejection too keeps a future change from blocking every later spawn.
    const clear = () => {
      this.termination = undefined;
    };
    this.termination = worker.terminate().then(clear, clear);
  }
}
