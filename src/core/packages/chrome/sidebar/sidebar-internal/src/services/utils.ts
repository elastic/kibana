/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const NO_ARGS_KEY = '__no_args__';

export function memoize<T extends (...args: any[]) => any>(
  _target: Object,
  _key: string | symbol,
  descriptor?: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void {
  if (!descriptor || typeof descriptor.value !== 'function') {
    return descriptor;
  }

  const fn = descriptor.value;
  const cacheKey = Symbol(`memoize:${String(_key)}`);

  descriptor.value = function (this: Record<symbol, Map<string, unknown>>, ...args: unknown[]) {
    const key = args.length ? String(args[0]) : NO_ARGS_KEY;
    const cache = this[cacheKey] ?? (this[cacheKey] = new Map<string, unknown>());

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = (fn as (...args: unknown[]) => unknown).apply(this, args);
    cache.set(key, result);
    return result;
  } as unknown as T;

  return descriptor;
}

export function bind<T>(
  _target: Object,
  propertyKey: string | symbol,
  descriptor?: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void {
  if (!descriptor || typeof descriptor.value !== 'function') {
    return descriptor;
  }

  const fn = descriptor.value;
  let definingProperty = false;

  return {
    configurable: true,
    get() {
      if (definingProperty) {
        return fn;
      }
      const value = (fn as (...args: unknown[]) => unknown).bind(this);
      definingProperty = true;
      Object.defineProperty(this, propertyKey, {
        value,
        configurable: true,
        writable: true,
      });
      definingProperty = false;
      return value as T;
    },
  };
}
