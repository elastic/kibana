/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpanOptions } from './with_span';
import { withSpan } from './with_span';

// Track instrumented functions to avoid double wrapping (no prototype pollution)
const INSTRUMENTED_FUNCS = new WeakSet<Function>();

// Helper to detect async functions
const isAsyncFunction = (fn: unknown): fn is (...args: any[]) => Promise<any> => {
  return typeof fn === 'function' && fn.constructor?.name === 'AsyncFunction';
};

const TRANSPILED_ASYNC_MARKERS = ['__awaiter', '_asyncToGenerator', 'regeneratorRuntime'];

// Detect async functions transpiled to helpers such as __awaiter or _asyncToGenerator
const isTranspiledAsyncFunction = (fn: unknown): fn is (...args: any[]) => Promise<any> => {
  if (typeof fn !== 'function') {
    return false;
  }

  const source = Function.prototype.toString.call(fn);
  return TRANSPILED_ASYNC_MARKERS.some((marker) => source.includes(marker));
};

const IGNORE_LIST = ['kibanaServer.request'];

/**
 * Wrap each async method on a class instance or plain object in a withSpan() call using the method name.
 * Mutates the target (and its prototype chain) in-place.
 */
export function instrumentAsyncMethods(
  name: string,
  instance: object,
  getSpanOptions?: (prevSpanOptions: SpanOptions) => SpanOptions
): void {
  if (instance === null || typeof instance !== 'object') {
    return;
  }

  const visited = new Set<object>();
  let current: object | null = instance;

  const shouldStopTraversal = (target: object | null) =>
    target === null || typeof target !== 'object' || target === Object.prototype;

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);

    const propertyNames = Object.getOwnPropertyNames(current);

    for (const propertyName of propertyNames) {
      if (propertyName === 'constructor') {
        continue;
      }

      const spanName = `${name}.${propertyName}`;

      if (IGNORE_LIST.includes(spanName)) {
        return;
      }

      const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);
      if (!descriptor || descriptor.get || descriptor.set) {
        continue;
      }

      const fn = descriptor.value;
      if (typeof fn !== 'function') {
        continue;
      }

      if (INSTRUMENTED_FUNCS.has(fn)) {
        continue;
      }

      if (!isAsyncFunction(fn) && !isTranspiledAsyncFunction(fn)) {
        continue;
      }

      const originalFn = fn;

      const wrappedFn = function wrapped(this: unknown, ...args: any[]) {
        let spanOptions: SpanOptions = {
          name: spanName,
        };

        if (getSpanOptions) {
          spanOptions = getSpanOptions(spanOptions);
        }

        return withSpan(spanOptions, () => originalFn.apply(this, args));
      };

      INSTRUMENTED_FUNCS.add(originalFn);
      INSTRUMENTED_FUNCS.add(wrappedFn);

      Object.defineProperty(current, propertyName, {
        ...descriptor,
        value: wrappedFn,
      });
    }

    const nextPrototype = Object.getPrototypeOf(current);
    if (shouldStopTraversal(nextPrototype)) {
      break;
    }

    current = nextPrototype;
  }
}
