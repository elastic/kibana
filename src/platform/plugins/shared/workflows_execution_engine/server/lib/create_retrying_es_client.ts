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

const wrapTarget = (target: object, logger: Logger, cache: WeakMap<object, unknown>): object => {
  const cached = cache.get(target);
  if (cached) return cached as object;

  const proxy = new Proxy(target, {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver);

      if (typeof value === 'function') {
        return (...args: unknown[]) =>
          retryTransientEsErrors(
            () => (value as (...a: unknown[]) => Promise<unknown>).apply(t, args),
            { logger }
          );
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
