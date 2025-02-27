/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export async function withTimeout<T>({
  promise,
  timeoutMs,
}: {
  promise: Promise<T>;
  timeoutMs: number;
}): Promise<{ timedout: true } | { timedout: false; value: T }> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return (await Promise.race([
      promise.then((v) => ({ value: v, timedout: false })),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve({ timedout: true }), timeoutMs);
      }),
    ])) as Promise<{ timedout: true } | { timedout: false; value: T }>;
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export function isPromise<T>(maybePromise: T | Promise<T>): maybePromise is Promise<T> {
  return maybePromise ? typeof (maybePromise as Promise<T>).then === 'function' : false;
}
