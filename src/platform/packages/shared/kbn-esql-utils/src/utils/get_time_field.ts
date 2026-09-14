/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { HttpStart } from '@kbn/core/public';
import { TIMEFIELD_ROUTE } from '@kbn/esql-types';
import { LRUCache } from 'lru-cache';

// Caches the in-flight or resolved TIMEFIELD_ROUTE promise by query + routing.
// Storing the Promise (not the resolved value) deduplicates concurrent calls:
// if multiple callers request the same query and routing before the first resolves,
// they all await the same promise instead of each firing a separate HTTP request.
const timeFieldCache = new LRUCache<string, Promise<string | undefined>>({ max: 100 });

/**
 * Resolves the time field for an ES|QL query by calling the server-side timefield API.
 * The API performs a local parse for `?_tstart`/`?_tend` params first, then falls back
 * to `fieldCaps` to detect `@timestamp` on the backing index.
 *
 * Use this on the client when you have HTTP access and need full resolution.
 * For synchronous/server-side contexts where only local parsing is needed,
 * use `parseTimeFieldFromESQLQuery` instead.
 *
 * Concurrent requests for the same query and routing share one HTTP request via an
 * LRU-backed promise cache.
 *
 * @param projectRouting - The effective project routing to forward to the server. Callers
 * should resolve precedence (SET instruction vs picker) before passing this value.
 */
export async function getESQLTimeField({
  query,
  http,
  projectRouting,
}: {
  query: string;
  http?: HttpStart;
  projectRouting?: string;
}): Promise<string | undefined> {
  const cacheKey = JSON.stringify([query, projectRouting]);
  const cached = timeFieldCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  if (!http) {
    return undefined;
  }
  const pendingRequest = http
    .post(TIMEFIELD_ROUTE, { body: JSON.stringify({ query, projectRouting }) })
    .then((response) => (response as { timeField?: string } | undefined)?.timeField)
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch the timefield', error);
      timeFieldCache.delete(cacheKey);
      return undefined;
    });
  timeFieldCache.set(cacheKey, pendingRequest);
  return pendingRequest;
}
