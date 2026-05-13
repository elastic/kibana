/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { IndicesAutocompleteResult } from '@kbn/esql-types';
import { cacheParametrizedAsyncFunction } from './utils/cache';
import { getRemoteClustersFromESQLQuery } from '../query_parsing_helpers';

const getLookupIndices = cacheParametrizedAsyncFunction(
  async (http: HttpStart, remoteClusters?: string) => {
    const query = remoteClusters ? { remoteClusters } : {};

    const result = await http.get<IndicesAutocompleteResult>(
      '/internal/esql/autocomplete/join/indices',
      { query }
    );

    return result;
  },
  (http: HttpStart, remoteClusters?: string) => remoteClusters || '',
  1000 * 60 * 5, // Keep the value in cache for 5 minutes
  1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
);

/**
 * Fetches join indices based on the provided ESQL query.
 * @param query The ESQL query string to extract remote clusters from.
 * @param http The HTTP service to use for the request.
 * @param cacheOptions Optional cache options to control cache behavior.
 * @returns A promise that resolves to an IndicesAutocompleteResult object.
 */
export const getJoinIndices = async (
  query: string,
  http: HttpStart,
  cacheOptions?: { forceRefresh?: boolean }
) => {
  const remoteClusters = getRemoteClustersFromESQLQuery(query);
  const result = await getLookupIndices.call(
    { forceRefresh: cacheOptions?.forceRefresh },
    http,
    remoteClusters?.join(',')
  );
  return result;
};
