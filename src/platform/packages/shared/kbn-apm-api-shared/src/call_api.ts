/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { isString, startsWith } from 'lodash';
import { LRUCache as LRU } from 'lru-cache';
import hash from 'object-hash';
import type { FetchOptions } from './create_call_apm_api';

function fetchOptionsWithDebug(fetchOptions: FetchOptions, inspectableEsQueriesEnabled: boolean) {
  const debugEnabled =
    inspectableEsQueriesEnabled && startsWith(fetchOptions.pathname, '/internal/apm');

  const { body, ...rest } = fetchOptions;

  return {
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    query: {
      ...fetchOptions.query,
      ...(debugEnabled ? { _inspect: true } : {}),
    },
  };
}

const cache = new LRU<string, any>({ max: 100, ttl: 1000 * 60 * 60 });

export function clearCache() {
  cache.clear();
}

export type CallApi = typeof callApi;

export async function callApi<T = void>(
  { http, uiSettings }: CoreStart | CoreSetup,
  fetchOptions: FetchOptions
): Promise<T> {
  const inspectableEsQueriesEnabled: boolean =
    // For now this needs to be hardcoded as we cannot import the key, as it lives inside the observability plugin,
    // and refactoring it is outside the scope of this PR, but ideally this should be imported from the same place as the key is defined
    uiSettings?.get('observability:enableInspectEsQueries') ?? false;
  const cacheKey = getCacheKey(fetchOptions);
  const cacheResponse = cache.get(cacheKey);
  if (cacheResponse) {
    return cacheResponse;
  }

  const {
    pathname,
    method = 'get',
    ...options
  } = fetchOptionsWithDebug(fetchOptions, inspectableEsQueriesEnabled);

  const lowercaseMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

  const res = await http[lowercaseMethod]<T>(pathname, options);

  if (isCachable(fetchOptions)) {
    cache.set(cacheKey, res);
  }

  return res;
}

// only cache items that has a time range with `start` and `end` params,
// and where `end` is not a timestamp in the future
function isCachable(fetchOptions: FetchOptions) {
  if (fetchOptions.isCachable !== undefined) {
    return fetchOptions.isCachable;
  }

  if (!(fetchOptions.query && fetchOptions.query.start && fetchOptions.query.end)) {
    return false;
  }

  return (
    isString(fetchOptions.query.end) && new Date(fetchOptions.query.end).getTime() < Date.now()
  );
}

// order the options object to make sure that two objects with the same arguments, produce produce the
// same cache key regardless of the order of properties
function getCacheKey(options: FetchOptions) {
  const { pathname, method, body, query, headers } = options;
  return hash({ pathname, method, body, query, headers });
}
