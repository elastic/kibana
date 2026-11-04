/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { type IndicesAutocompleteResult, JOIN_INDICES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { getRemoteClustersFromESQLQuery } from '../query_parsing_helpers';

/**
 * Fetches join indices based on the provided ESQL query.
 * Caching is handled at the call site (React-level useMemo) so that
 * projectRouting changes automatically invalidate the cache.
 */
export const getJoinIndices = async (
  query: string,
  http: HttpStart,
  projectRouting?: string,
  signal?: AbortSignal
): Promise<IndicesAutocompleteResult> => {
  const remoteClusters = getRemoteClustersFromESQLQuery(query);
  const httpQuery = {
    ...(remoteClusters?.length ? { remoteClusters: remoteClusters.join(',') } : {}),
    ...(projectRouting ? { projectRouting } : {}),
  };
  return http.get<IndicesAutocompleteResult>(JOIN_INDICES_AUTOCOMPLETE_ROUTE, {
    query: httpQuery,
    signal,
  });
};
