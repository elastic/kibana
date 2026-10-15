/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MAX_TIMEOUT_MS = 2 ** 32 - 1;

export interface TimeoutAbortSignal extends AbortSignal, Disposable {
  /**
   * Clears the deadline timer without aborting. Safe to call more than once.
   */
  dispose: () => void;
}

/**
 * Aborts after `timeoutMs`. `dispose()` clears that timer without aborting, so listeners are not retained until the deadline.
 */
export function timeoutSignal(timeoutMs: number): TimeoutAbortSignal {
  assertTimeoutDelay(timeoutMs);

  const controller = new AbortController();
  const signal = controller.signal as TimeoutAbortSignal;
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    timer = undefined;
    controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
  }, timeoutMs);

  // AbortSignal.timeout() does not keep the event loop alive. Browsers and jsdom
  // return a numeric timer id, which has no unref.
  const unref = (timer as { unref?: () => void }).unref;
  if (typeof unref === 'function') {
    unref.call(timer);
  }

  const dispose = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  Object.defineProperty(signal, 'dispose', {
    configurable: true,
    value: dispose,
  });
  if (typeof Symbol.dispose === 'symbol') {
    Object.defineProperty(signal, Symbol.dispose, {
      configurable: true,
      value: dispose,
    });
  }

  return signal;
}

function assertTimeoutDelay(timeoutMs: number): void {
  if (typeof timeoutMs !== 'number') {
    throw new TypeError(
      `The "delay" argument must be of type number. Received ${
        timeoutMs === null ? 'null' : typeof timeoutMs
      }`
    );
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new RangeError(
      `The value of "delay" is out of range. It must be >= 0 && <= ${MAX_TIMEOUT_MS}. Received ${timeoutMs}`
    );
  }
}
