/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import { ApiExecutionContext } from './types';
import { internalBulkResolve, isBulkResolveError } from './internals/internal_bulk_resolve';
import { incrementCounterInternal } from './internals/increment_counter_internal';

export interface PerformCreateParams<T = unknown> {
  type: string;
  id: string;
  options: SavedObjectsResolveOptions;
}

export const performResolve = async <T>(
  { type, id, options }: PerformCreateParams<T>,
  apiExecutionContext: ApiExecutionContext
): Promise<SavedObjectsResolveResponse<T>> => {
  const { common: commonHelper } = apiExecutionContext.helpers;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const { resolved_objects: bulkResults } = await internalBulkResolve<T>(
    {
      objects: [{ type, id }],
      options: { ...options, namespace },
      incrementCounterInternal: (t, i, counterFields, opts = {}) =>
        incrementCounterInternal(
          { type: t, id: i, counterFields, options: opts },
          apiExecutionContext
        ),
    },
    apiExecutionContext
  );

  const [result] = bulkResults;
  if (isBulkResolveError(result)) {
    throw result.error;
  }
  return result;
};
