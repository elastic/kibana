/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type SavedObjectsBulkResolveObject,
  type SavedObjectsResolveOptions,
  type SavedObjectsResolveResponse,
  type SavedObjectsIncrementCounterField,
  type SavedObjectsIncrementCounterOptions,
} from '@kbn/core-saved-objects-api-server';
import { type SavedObject, type BulkResolveError } from '@kbn/core-saved-objects-server';
import type { ApiExecutionContext } from '../types';
/**
 * Parameters for the internal bulkResolve function.
 *
 * @internal
 */
export interface InternalBulkResolveParams {
  objects: SavedObjectsBulkResolveObject[];
  options?: SavedObjectsResolveOptions;
  incrementCounterInternal: <T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options?: SavedObjectsIncrementCounterOptions<T>
  ) => Promise<SavedObject<T>>;
}
/**
 * The response when objects are resolved.
 *
 * @public
 */
export interface InternalSavedObjectsBulkResolveResponse<T = unknown> {
  resolved_objects: Array<SavedObjectsResolveResponse<T> | BulkResolveError>;
}
export declare function internalBulkResolve<T>(
  params: InternalBulkResolveParams,
  apiExecutionContext: ApiExecutionContext
): Promise<InternalSavedObjectsBulkResolveResponse<T>>;
