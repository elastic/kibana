/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export class TimeoutAbortedError extends Error {
  constructor() {
    super('Timeout aborted');
    this.name = 'TimeoutAbortedError';
  }
}

/**
 * Creates a Promise that resolves after the specified timeout, unless aborted.
 * If the abort signal is triggered (or already aborted), the promise rejects immediately.
 *
 * @param timeout - The timeout duration in milliseconds
 * @param abortSignal - An AbortSignal to cancel the timeout
 * @returns A Promise that resolves after the timeout or rejects if aborted
 * @throws {Error} Throws 'Timeout aborted' if the signal is aborted
 */
export function abortableTimeout(timeout: number, abortSignal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already aborted before setting up timeout
    if (abortSignal.aborted) {
      reject(new TimeoutAbortedError());
      return;
    }

    const timeoutId = setTimeout(() => {
      abortSignal.removeEventListener('abort', onAbort);
      resolve();
    }, timeout);

    const onAbort = () => {
      clearTimeout(timeoutId);
      abortSignal.removeEventListener('abort', onAbort);
      reject(new TimeoutAbortedError());
    };

    abortSignal.addEventListener('abort', onAbort);
  });
}
