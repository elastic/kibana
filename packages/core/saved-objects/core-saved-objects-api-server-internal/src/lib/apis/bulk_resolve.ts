/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type SavedObject, BulkResolveError } from '@kbn/core-saved-objects-server';
import {
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import { errorContent } from './utils';
import { ApiExecutionContext } from './types';
import { internalBulkResolve, isBulkResolveError } from './internals/internal_bulk_resolve';
import { incrementCounterInternal } from './internals/increment_counter_internal';

export interface PerformCreateParams<T = unknown> {
  objects: SavedObjectsBulkResolveObject[];
  options: SavedObjectsResolveOptions;
}

export const performBulkResolve = async <T>(
  { objects, options }: PerformCreateParams<T>,
  apiExecutionContext: ApiExecutionContext
): Promise<SavedObjectsBulkResolveResponse<T>> => {
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
    incrementCounterInternal: (type, id, counterFields, opts = {}) =>
      incrementCounterInternal({ type, id, counterFields, options: opts }, apiExecutionContext),
    encryptionExtension,
    securityExtension,
    objects,
    options: { ...options, namespace },
  });
  const resolvedObjects = bulkResults.map<SavedObjectsResolveResponse<T>>((result) => {
    // extract payloads from saved object errors
    if (isBulkResolveError(result)) {
      const errorResult = result as BulkResolveError;
      const { type, id, error } = errorResult;
      return {
        saved_object: { type, id, error: errorContent(error) } as unknown as SavedObject<T>,
        outcome: 'exactMatch',
      };
    }
    return result;
  });
  return { resolved_objects: resolvedObjects };
};
