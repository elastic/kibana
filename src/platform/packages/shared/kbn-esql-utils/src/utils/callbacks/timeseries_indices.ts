/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import {
  type IndicesAutocompleteResult,
  TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE,
} from '@kbn/esql-types';

/**
 * Fetches time series indices from the server.
 * Caching is handled at the call site (React-level useMemo) so that
 * projectRouting changes automatically invalidate the cache.
 */
export const getTimeseriesIndices = async (
  http: HttpStart,
  projectRouting?: string,
  signal?: AbortSignal
): Promise<IndicesAutocompleteResult> => {
  const query = projectRouting ? { projectRouting } : undefined;
  return http.get<IndicesAutocompleteResult>(TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE, {
    query,
    signal,
  });
};
