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
import { getIndexPatternFromESQLQuery } from './get_index_pattern_from_query';

const timeFieldCache = new LRUCache<string, Promise<string | undefined>>({ max: 100 });

export async function getESQLTimeField({
  query,
  http,
  projectRouting,
}: {
  query: string;
  http?: HttpStart;
  projectRouting?: string;
}): Promise<string | undefined> {
  const hasTimeParams = parseTimeFieldFromESQLQuery(query) !== undefined;
  const cacheSegment = hasTimeParams ? query : getIndexPatternFromESQLQuery(query);
  const cacheKey = JSON.stringify([cacheSegment, projectRouting]);

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
