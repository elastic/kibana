/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'node:worker_threads';
import type { Transferable, WorkerOptions } from 'node:worker_threads';
import type { Logger } from '@kbn/logging';

export type PostMessage<Message> = (
  message: Message,
  transferList?: readonly Transferable[]
) => void;

export interface ManagedWorkerOptions<Message, Received = never> {
  filename: string | URL;
  options: WorkerOptions & { name: string };
  logger: Logger;
  unref: boolean;
  restart: { maxAttempts: number; delayMs: number };
  onStart?(post: PostMessage<Message>): void;
  /** Receives messages posted by the worker. */
  onMessage?(message: Received): void;
  onExit?(): void;
  onExhausted(): void;
}

export interface ManagedWorker {
  start(): void;
  stop(): Promise<void>;
}

/** Owns a dedicated worker's lifecycle; restart policy and application messages come from its consumer. */
export class ManagedWorkerHandle<Message, Received = never> implements ManagedWorker {
  private worker?: Worker;
  private restartTimer?: NodeJS.Timeout;
  private restarts = 0;
  private running = false;
  private stopping?: Promise<void>;
  private termination: Promise<void> = Promise.resolve();

  constructor(private readonly params: ManagedWorkerOptions<Message, Received>) {}

  public start(): void {
    if (this.running) return;
    if (this.stopping) throw new Error('Cannot start a worker while it is stopping');
    this.running = true;
    this.restarts = 0;
    this.spawn();
  }

  public stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.running = false;
    clearTimeout(this.restartTimer);
    this.restartTimer = undefined;
    this.discardWorker();
    this.stopping = this.termination.finally(() => {
      this.stopping = undefined;
    });
    return this.stopping;
  }

  private spawn(): void {
    const { filename, options, logger, onStart, onMessage, unref } = this.params;
    try {
      const worker = new Worker(filename, options);
      this.worker = worker;
      worker.on('error', (error) => {
        logger.warn(`Worker ${options.name} failed: ${error.message}`);
      });
      worker.on('exit', (code) => {
        if (!this.running || this.worker !== worker) return;
        this.worker = undefined;
        this.params.onExit?.();
        this.scheduleRestart(`exited unexpectedly (code ${code})`);
      });
      if (onMessage) worker.on('message', onMessage);
      onStart?.((message, transferList) => worker.postMessage(message, transferList));
      // Apply reference policy after initialization, which can re-ref the worker's message port.
      if (unref) worker.unref();
    } catch (error) {
      this.discardWorker();
      this.scheduleRestart(`failed to start (${error.message})`);
    }
  }

  private scheduleRestart(reason: string): void {
    const { restart, logger, options, onExhausted, unref } = this.params;
    if (this.restarts >= restart.maxAttempts) {
      logger.error(
        `Worker ${options.name} ${reason} and exhausted ${restart.maxAttempts} restarts; inactive until restarted by its consumer`
      );
      onExhausted();
      return;
    }
    const delay = restart.delayMs * 2 ** this.restarts;
    this.restarts++;
    logger.warn(
      `Worker ${options.name} ${reason}; restart ${this.restarts}/${restart.maxAttempts} in ${delay}ms`
    );
    this.restartTimer = setTimeout(() => {
      this.restartTimer = undefined;
      if (this.running) this.spawn();
    }, delay);
    if (unref) this.restartTimer.unref();
  }

  private discardWorker(): void {
    const { worker } = this;
    this.worker = undefined;
    this.params.onExit?.();
    if (!worker) return;
    worker.removeAllListeners('message');
    worker.removeAllListeners('exit');
    worker.removeAllListeners('error');
    // An error emitted during termination must not become an unhandled main-thread exception.
    worker.on('error', () => {});
    this.termination = Promise.all([this.termination, worker.terminate()]).then(() => {});
    // Observe background cleanup failures without hiding them from stop().
    void this.termination.catch((error: Error) => {
      this.params.logger.warn(
        `Worker ${this.params.options.name} termination failed: ${error.message}`
      );
    });
  }
}
