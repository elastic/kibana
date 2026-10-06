/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
/**
 * Fetches inference endpoints based on the provided task type.
 * @param http The HTTP service to use for the request.
 * @param taskType The type of inference task to get endpoints for.
 * @returns A promise that resolves to an InferenceEndpointsAutocompleteResult object.
 */
export declare const getInferenceEndpoints: (
  this:
    | {
        forceRefresh?: boolean;
      }
    | undefined
    | void,
  _http: import('@kbn/core/public').HttpSetup,
  taskType: string,
  _signal?: AbortSignal | undefined
) => Promise<InferenceEndpointsAutocompleteResult>;
