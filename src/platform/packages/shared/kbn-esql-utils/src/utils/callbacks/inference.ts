/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { cacheParametrizedAsyncFunction } from './utils/cache';

/**
 * Fetches inference endpoints based on the provided task type.
 * @param http The HTTP service to use for the request.
 * @param taskType The type of inference task to get endpoints for.
 * @returns A promise that resolves to an InferenceEndpointsAutocompleteResult object.
 */
export const getInferenceEndpoints = cacheParametrizedAsyncFunction(
  async (http: HttpStart, taskType: InferenceTaskType) => {
    return await http.get<InferenceEndpointsAutocompleteResult>(
      `/internal/esql/autocomplete/inference_endpoints/${taskType}`
    );
  },
  (http: HttpStart, taskType: InferenceTaskType) => taskType,
  1000 * 60 * 5, // Keep the value in cache for 5 minutes
  1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
);
