/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogLine, ProcessState, ProcessStatus } from './types';

export interface RunnerCallbacks {
  readonly onChange: (status: ProcessStatus) => void;
  readonly onLine: (line: LogLine) => void;
}

interface ReadyWaiter {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

export const isTerminal = (state: ProcessState): boolean =>
  state === 'stopped' || state === 'exited' || state === 'failed';

/** What the supervisor runs: a child process, or a service inside the supervisor. Tracks its state and readiness. */
export abstract class Runner {
  protected status: ProcessStatus;
  private readyWaiters: ReadyWaiter[] = [];

  constructor(
    protected readonly id: string,
    logFile: string,
    protected readonly callbacks: RunnerCallbacks
  ) {
    this.status = { id, state: 'stopped', logFile };
  }

  public abstract isRunning(): boolean;
  public abstract start(): void;
  /** Resolves once it has stopped. */
  public abstract stop(): Promise<void>;
  /** Signals it without waiting, for exit handlers that cannot await. */
  public abstract signalGroup(signal: NodeJS.Signals): void;

  public getStatus(): ProcessStatus {
    return this.status;
  }

  /** Resolves once it is ready; rejects when it ends or fails before that. */
  public whenReady(): Promise<void> {
    const { state, error } = this.status;
    if (state === 'ready') {
      return Promise.resolve();
    }
    if (isTerminal(state)) {
      return Promise.reject(new Error(`${this.id} is ${state}${error ? `: ${error}` : ''}`));
    }
    return new Promise((resolve, reject) => {
      this.readyWaiters.push({ resolve, reject });
    });
  }

  public markWaiting(): void {
    this.update({ state: 'waiting', error: undefined });
  }

  public markFailed(error: string): void {
    this.update({ state: 'failed', error });
  }

  protected markReady(): void {
    this.update({ state: 'ready', readyAt: new Date().toISOString() });
  }

  protected update(fields: Partial<ProcessStatus>): void {
    this.status = { ...this.status, ...fields };
    const { state } = this.status;
    if (state === 'ready' || isTerminal(state)) {
      const waiters = this.readyWaiters;
      this.readyWaiters = [];
      const error = new Error(
        `${this.id} is ${state}${this.status.error ? `: ${this.status.error}` : ''}`
      );
      waiters.forEach(({ resolve, reject }) => (state === 'ready' ? resolve() : reject(error)));
    }
    this.callbacks.onChange(this.status);
  }
}
