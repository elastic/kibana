/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RpcTarget } from 'capnweb';
import { isRemotableInstance } from './remotable';

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/** Wraps remotable return values so Cap'n Web can stub them. Plain data is returned unchanged. */
export function wrapRpcResult(result: unknown): unknown {
  if (isThenable(result)) {
    return Promise.resolve(result).then((value) => wrapRpcResult(value));
  }
  if (isRemotableInstance(result)) {
    return expose(result);
  }
  return result;
}

/**
 * Adapts an ordinary instance into an `RpcTarget`.
 * Methods are copied onto the adapter prototype and invoked with the author instance as `this`,
 * so private fields stay on that instance.
 */
export function expose(target: object): RpcTarget {
  class Adapter extends RpcTarget {}
  const proto = Adapter.prototype as unknown as Record<string, unknown>;
  let cursor: object | null = Object.getPrototypeOf(target) as object | null;
  while (cursor && cursor !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(cursor)) {
      if (name === 'constructor' || name.startsWith('_') || typeof proto[name] === 'function') {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
      if (typeof descriptor?.value !== 'function') continue;
      const method = descriptor.value as (...args: unknown[]) => unknown;
      proto[name] = function (...args: unknown[]) {
        return wrapRpcResult(method.apply(target, args));
      };
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  return new Adapter();
}
