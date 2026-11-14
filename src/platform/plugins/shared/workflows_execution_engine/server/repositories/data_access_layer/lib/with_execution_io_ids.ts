/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { executionIoId } from '@kbn/workflows/server';

/** Stamps the IO document ids derived from the execution id. Stored values are not used. */
export function withExecutionIoIds<T extends { id: string }>(document: T): T {
  return {
    ...document,
    inputId: executionIoId('input', document.id),
    outputId: executionIoId('output', document.id),
  } as T;
}

/** Adds calculated `inputId` / `outputId` onto each search hit's `_source`. */
export function attachExecutionIoIdsToHits<T extends { id: string }>(
  response: estypes.SearchResponse<T>
): estypes.SearchResponse<T> {
  for (const hit of response.hits.hits) {
    if (hit._id && hit._source) {
      hit._source = withExecutionIoIds({ ...hit._source, id: hit._id });
    }
  }
  return response;
}
