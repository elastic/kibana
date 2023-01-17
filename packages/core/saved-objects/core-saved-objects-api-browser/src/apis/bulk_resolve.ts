/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ResolvedSimpleSavedObject } from './resolve';

/**
 * Return type of the Saved Objects `bulkResolve()` method.
 *
 * @public
 * @deprecated See https://github.com/elastic/dev/issues/2194
 */
export interface SavedObjectsBulkResolveResponse<T = unknown> {
  /** Array of {@link ResolvedSimpleSavedObject} that were resolved */
  resolved_objects: Array<ResolvedSimpleSavedObject<T>>;
}
