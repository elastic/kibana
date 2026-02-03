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

export const getTimeseriesIndices = cacheParametrizedAsyncFunction(
  async (http: HttpStart) => {
    const result = await http.get<IndicesAutocompleteResult>(
      '/internal/esql/autocomplete/timeseries/indices'
    );

    return result;
  },
  (http: HttpStart) => 'timeseries',
  1000 * 60 * 5, // Keep the value in cache for 5 minutes
  1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
);
