/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription, timer } from 'rxjs';

export enum AbortReason {
  Timeout = 'timeout',
}

export class SearchAbortController {
  private inputAbortSignals: AbortSignal[] = new Array();
  private abortController: AbortController = new AbortController();
  private timeoutSub?: Subscription;
  private destroyed = false;
  private reason?: AbortReason;

  constructor(timeout?: number) {
    if (timeout) {
      this.timeoutSub = timer(timeout).subscribe(() => {
        this.reason = AbortReason.Timeout;
        this.abortController.abort();
        this.timeoutSub!.unsubscribe();
      });
    }
  }

  private abortHandler = () => {
    const allAborted = this.inputAbortSignals.every((signal) => signal.aborted);
    if (allAborted) {
      this.abortController.abort();
      this.cleanup();
    }
  };

  public cleanup() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.timeoutSub?.unsubscribe();
    this.inputAbortSignals.forEach((abortSignal) => {
      abortSignal.removeEventListener('abort', this.abortHandler);
    });
  }

  public addAbortSignal(inputSignal: AbortSignal) {
    if (this.destroyed) {
      return;
    }

    this.inputAbortSignals.push(inputSignal);

    if (inputSignal.aborted) {
      this.abortHandler();
    } else {
      // abort our internal controller if the input signal aborts
      inputSignal.addEventListener('abort', this.abortHandler);
    }
  }

  public getSignal() {
    return this.abortController.signal;
  }

  public abort() {
    this.cleanup();
    this.abortController.abort();
  }

  public isTimeout() {
    return this.reason === AbortReason.Timeout;
  }
}
