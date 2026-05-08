/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { EsqlDatasetsResult } from '@kbn/esql-types';
import { DATASETS_ROUTE } from '@kbn/esql-types';
import { cacheParametrizedAsyncFunction } from './utils/cache';

/**
 * Fetches all ES|QL datasets from the cluster (GET _query/dataset).
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the datasets list.
 */
export const getDatasets = cacheParametrizedAsyncFunction(
  async (http: HttpStart) => {
    try {
      const result = await http.get<EsqlDatasetsResult>(DATASETS_ROUTE);
      return result ?? { datasets: [] };
    } catch {
      return { datasets: [] };
    }
  },
  (http: HttpStart) => 'datasets',
  1000 * 60 * 5, // Keep the value in cache for 5 minutes
  1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
);
