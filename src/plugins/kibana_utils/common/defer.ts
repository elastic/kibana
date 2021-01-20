/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * An externally resolvable/rejectable "promise". Use it to resolve/reject
 * promise at any time.
 *
 * ```ts
 * const future = new Defer();
 *
 * future.promise.then(value => console.log(value));
 *
 * future.resolve(123);
 * ```
 */
export class Defer<T> {
  public readonly resolve!: (data: T) => void;
  public readonly reject!: (error: any) => void;
  public readonly promise: Promise<T> = new Promise<T>((resolve, reject) => {
    (this as any).resolve = resolve;
    (this as any).reject = reject;
  });
}

export const defer = <T>() => new Defer<T>();
