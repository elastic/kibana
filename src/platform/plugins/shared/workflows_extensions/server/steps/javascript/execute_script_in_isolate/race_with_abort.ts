/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type ivm from 'isolated-vm';
import { createAbortError } from './create_abort_error';

export const raceWithAbort = async <T>(
  promise: Promise<T>,
  abortSignal: AbortSignal,
  isolate: ivm.Isolate
): Promise<T> => {
  if (abortSignal.aborted) {
    if (!isolate.isDisposed) {
      isolate.dispose();
    }
    throw createAbortError();
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      if (!isolate.isDisposed) {
        isolate.dispose();
      }
      reject(createAbortError());
    };

    abortSignal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        abortSignal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        abortSignal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
};
