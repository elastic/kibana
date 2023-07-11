/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const {
    registry,
    helpers,
    allowedTypes,
    client,
    migrator,
    serializer,
    extensions = {},
  } = apiExecutionContext;
  const { common: commonHelper } = helpers;
  const { securityExtension, encryptionExtension } = extensions;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const { resolved_objects: bulkResults } = await internalBulkResolve<T>({
    registry,
    allowedTypes,
    client,
    migrator,
    serializer,
    getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
    incrementCounterInternal: (t, i, counterFields, opts = {}) =>
      incrementCounterInternal(
        { type: t, id: i, counterFields, options: opts },
        apiExecutionContext
      ),
    encryptionExtension,
    securityExtension,
    objects: [{ type, id }],
    options: { ...options, namespace },
  });
  const [result] = bulkResults;
  if (isBulkResolveError(result)) {
    throw result.error;
  }
  return result;
};
