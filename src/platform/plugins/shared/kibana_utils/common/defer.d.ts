/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
export declare class Defer<T> {
  readonly resolve: (data: T) => void;
  readonly reject: (error: any) => void;
  readonly promise: Promise<T>;
}
export declare const defer: <T>() => Defer<T>;
