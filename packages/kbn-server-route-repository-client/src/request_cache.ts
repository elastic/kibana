/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { HttpFetchOptions } from '@kbn/core-http-browser';
import { RequestCacheOptions } from '@kbn/server-route-repository-utils';

type Request = Pick<HttpFetchOptions, 'body' | 'query' | 'method'> & { pathname: string };

export interface RequestCache {
  fetch<T>(request: Request, options: RequestCacheOptions, cb: () => Promise<T>): Promise<T>;
}

interface Storage {
  set(id: string, response: unknown): void;
  get(id: string): unknown;
  has(id: string): boolean;
}

const importHashingLibrary = once(() => import('object-hash').then((m) => m.default));

async function createInMemoryClient(): Promise<Storage> {
  const { default: LruCache } = await import('lru-cache');

  const cache = new LruCache({
    max: 50,
  });

  return {
    get: (id) => cache.get(id),
    has: (id) => cache.has(id),
    set: (id, value) => cache.set(id, value),
  };
}

export function createRequestCache(): RequestCache {
  async function getId(request: Request) {
    const hash = await importHashingLibrary();

    const { pathname, method, body, query } = request;
    return hash({ pathname, method, body, query });
  }

  const getInMemoryClient = once(async () => {
    return await createInMemoryClient();
  });

  return {
    fetch: async (request, options, cb) => {
      const method = request.method || 'GET';

      const shouldCacheRequest =
        options.mode !== 'never' && (options.mode === 'always' || method.toLowerCase() === 'get');

      if (!shouldCacheRequest) {
        return cb();
      }

      const shouldFetchFromCache = shouldCacheRequest && !options.refresh;

      const [id, client] = await Promise.all([getId(request), getInMemoryClient()]);

      if (shouldFetchFromCache && client.has(id)) {
        return client.get(id) as any;
      }

      const response = await cb();

      client.set(id, response);

      return response;
    },
  };
}
