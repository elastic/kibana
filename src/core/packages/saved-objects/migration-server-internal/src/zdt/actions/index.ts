/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionErrorTypeMap as BaseActionErrorTypeMap } from '../../actions';

export {
  fetchIndices,
  waitForIndexStatus,
  createIndex,
  updateAliases,
  updateMappings,
  updateAndPickupMappings,
  cleanupUnknownAndExcluded,
  waitForDeleteByQueryTask,
  waitForPickupUpdatedMappingsTask,
  refreshIndex,
  openPit,
  readWithPit,
  closePit,
  transformDocs,
  bulkOverwriteTransformedDocuments,
  noop,
  type IncompatibleClusterRoutingAllocation,
  type RetryableEsClientError,
  type WaitForTaskCompletionTimeout,
  type IndexNotFound,
} from '../../actions';

export { updateIndexMeta, type UpdateIndexMetaParams } from './update_index_meta';
export { waitForDelay, type WaitForDelayParams } from './wait_for_delay';

// alias in case we need to extend it with zdt specific actions/errors
export type ActionErrorTypeMap = BaseActionErrorTypeMap;

/** Type guard for narrowing the type of a left */
export function isTypeof<T extends keyof ActionErrorTypeMap>(
  res: any,
  typeString: T
): res is ActionErrorTypeMap[T] {
  return res.type === typeString;
}
