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

// Caches the in-flight or resolved TIMEFIELD_ROUTE promise by query.
// Storing the Promise (not the resolved value) deduplicates concurrent calls:
// if multiple callers request the same query before the first resolves,
// they all await the same promise instead of each firing a separate HTTP request.
const timeFieldCache = new LRUCache<string, Promise<string | undefined>>({ max: 100 });

/**
 * Resolves the default time field for an ES|QL query by calling the timefield API.
 *
 * When `http` is omitted, returns `undefined` (unless a prior successful request
 * for the same query left a value in the in-memory cache).
 *
 * Concurrent requests for the same query share one HTTP request via an LRU-backed promise cache.
 */
export async function getESQLTimeFieldFromQuery({
  query,
  http,
}: {
  query: string;
  http?: HttpStart;
}): Promise<string | undefined> {
  const cached = timeFieldCache.get(query);
  if (cached !== undefined) {
    return cached;
  }
  if (!http) {
    return undefined;
  }
  const pendingRequest = http
    .post(TIMEFIELD_ROUTE, { body: JSON.stringify({ query }) })
    .then((response) => (response as { timeField?: string } | undefined)?.timeField)
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch the timefield', error);
      timeFieldCache.delete(query);
      return undefined;
    });
  timeFieldCache.set(query, pendingRequest);
  return pendingRequest;
}
