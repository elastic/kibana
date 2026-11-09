/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from './retry_transient_es_errors';

type AnyFunction = (...args: unknown[]) => unknown;

interface WrappedMethod {
  original: AnyFunction;
  wrapped: AnyFunction;
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value !== null &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as { then?: unknown }).then === 'function';

const wrapMethod = (target: object, method: AnyFunction, logger: Logger): AnyFunction => {
  return (...args: unknown[]) => {
    // Synchronous helpers (e.g. `child()`) must keep their return value; only async calls are retried.
    const firstResult = method.apply(target, args);
    if (!isThenable(firstResult)) {
      return firstResult;
    }

    let isFirstAttempt = true;
    return retryTransientEsErrors(
      async () => {
        if (isFirstAttempt) {
          isFirstAttempt = false;
          return firstResult;
        }
        return method.apply(target, args);
      },
      { logger }
    );
  };
};

const wrapTarget = (target: object, logger: Logger, cache: WeakMap<object, unknown>): object => {
  const cached = cache.get(target);
  if (cached) return cached as object;

  // Keeps wrapper identity stable across property accesses (`client.search === client.search`).
  const methods = new Map<PropertyKey, WrappedMethod>();

  const proxy = new Proxy(target, {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver);

      if (typeof value === 'function') {
        const existing = methods.get(prop);
        if (existing && existing.original === value) {
          return existing.wrapped;
        }
        const wrapped = wrapMethod(t, value as AnyFunction, logger);
        methods.set(prop, { original: value as AnyFunction, wrapped });
        return wrapped;
      }

      if (value !== null && typeof value === 'object') {
        return wrapTarget(value as object, logger, cache);
      }

      return value;
    },
  });

  cache.set(target, proxy);
  return proxy;
};

export const createRetryingEsClient = (
  esClient: ElasticsearchClient,
  logger: Logger
): ElasticsearchClient => wrapTarget(esClient, logger, new WeakMap()) as ElasticsearchClient;
