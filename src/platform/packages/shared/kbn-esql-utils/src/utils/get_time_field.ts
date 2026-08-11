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
 * Resolves the time field for an ES|QL query by calling the server-side timefield API.
 * The API performs a local parse for `?_tstart`/`?_tend` params first, then falls back
 * to `fieldCaps` to detect `@timestamp` on the backing index.
 *
 * Use this on the client when you have HTTP access and need full resolution.
 * For synchronous/server-side contexts where only local parsing is needed,
 * use `parseTimeFieldFromESQLQuery` instead.
 *
 * Concurrent requests for the same query share one HTTP request via an LRU-backed
 * promise cache.
 */
export async function getESQLTimeField({
  query,
  http,
}: {
  query: string;
  http?: HttpStart;
}): Promise<string | undefined> {
  // The Monaco ESQL editor stores queries with non-breaking spaces (\u00a0) instead
  // of regular spaces. The ESQL parser does not treat \u00a0 as whitespace, so queries
  // with non-breaking spaces are silently unparseable, causing the timefield route to
  // return undefined and leaving the ad-hoc data view without a timeFieldName.
  // Normalize before caching and sending so callers using Monaco output behave
  // identically to callers that have already normalized the query.
  const normalizedQuery = query.replace(/\u00a0/g, ' ');
  const cached = timeFieldCache.get(normalizedQuery);
  if (cached !== undefined) {
    return cached;
  }
  if (!http) {
    return undefined;
  }
  const pendingRequest = http
    .post(TIMEFIELD_ROUTE, { body: JSON.stringify({ query: normalizedQuery }) })
    .then((response) => (response as { timeField?: string } | undefined)?.timeField)
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch the timefield', error);
      timeFieldCache.delete(normalizedQuery);
      return undefined;
    });
  timeFieldCache.set(normalizedQuery, pendingRequest);
  return pendingRequest;
}
