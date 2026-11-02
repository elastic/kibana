/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import { timer } from 'rxjs';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';

export class SearchAbortController {
  private inputAbortSignals: AbortSignal[] = new Array();
  private abortController: AbortController = new AbortController();
  private timeoutSub?: Subscription;
  private destroyed = false;

  constructor(timeout?: number) {
    if (timeout) {
      this.timeoutSub = timer(timeout).subscribe(() => {
        this.abortController.abort(AbortReason.TIMEOUT);
        this.timeoutSub!.unsubscribe();
      });
    }
  }

  private abortHandler = () => {
    const allAborted = this.inputAbortSignals.every((signal) => signal.aborted);
    if (allAborted) {
      this.abortController.abort(this.inputAbortSignals[0].reason);
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

  public abort(reason?: AbortReason) {
    this.cleanup();
    this.abortController.abort(reason);
  }

  public isTimeout() {
    return this.abortController.signal.reason === AbortReason.TIMEOUT;
  }

  public isCanceled() {
    return this.abortController.signal.reason === AbortReason.CANCELED;
  }
}
