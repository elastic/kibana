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
import { parseTimeFieldFromESQLQuery } from './query_parsing_helpers';

// Caches the in-flight or resolved TIMEFIELD_ROUTE promise by query.
// Storing the Promise (not the resolved value) deduplicates concurrent calls:
// if multiple callers request the same query before the first resolves,
// they all await the same promise instead of each firing a separate HTTP request.
const timeFieldCache = new LRUCache<string, Promise<string | undefined>>({ max: 100 });

/**
 * Resolves the time field for an ES|QL query.
 *
 * Without `http`: parses the query locally for `?_tstart`/`?_tend` named params —
 * fast, sync-equivalent, works server-side. Returns `undefined` when the query
 * has no time filter params.
 *
 * With `http`: calls the timefield API, which does the same local parse first and
 * then falls back to `fieldCaps` to detect `@timestamp` on the backing index.
 * Concurrent requests for the same query share one HTTP request via an LRU-backed
 * promise cache.
 */
export async function getESQLTimeField(
  query: string,
  options?: { http?: HttpStart }
): Promise<string | undefined> {
  if (!options?.http) {
    return parseTimeFieldFromESQLQuery(query);
  }

  const { http } = options;
  const cached = timeFieldCache.get(query);
  if (cached !== undefined) {
    return cached;
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
