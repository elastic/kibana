/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function withTimeout<T>({
  promise,
  timeout,
  errorMessage,
}: {
  promise: Promise<T>;
  timeout: number;
  errorMessage: string;
}) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => setTimeout(() => reject(new Error(errorMessage)), timeout)),
  ]) as Promise<T>;
}
