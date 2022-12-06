/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsResolveResponse } from './resolve';

/**
 * Object parameters for the bulk resolve operation
 *
 * @public
 */
export interface SavedObjectsBulkResolveObject {
  /** ID of the object to resiolve */
  id: string;
  /** Type of the object to resolve */
  type: string;
}

/**
 * Return type of the Saved Objects `bulkResolve()` method.
 *
 * @public
 */
export interface SavedObjectsBulkResolveResponse<T = unknown> {
  /** array of {@link SavedObjectsResolveResponse} */
  resolved_objects: Array<SavedObjectsResolveResponse<T>>;
}
