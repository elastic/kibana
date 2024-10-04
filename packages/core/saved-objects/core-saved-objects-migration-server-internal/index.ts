/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { DocumentMigrator, KibanaMigrator, buildActiveMappings, buildTypesMappings } from './src';
export type { KibanaMigratorOptions } from './src';
export { getAggregatedTypesDocuments } from './src/actions/check_for_unknown_docs';
export {
  addExcludedTypesToBoolQuery,
  createBulkIndexOperationTuple,
  createBulkDeleteOperationBody,
} from './src/model/helpers';

// these are only used for integration tests
export {
  bulkOverwriteTransformedDocuments,
  closePit,
  createIndex,
  openPit,
  calculateExcludeFilters,
  checkForUnknownDocs,
  waitForIndexStatus,
  cloneIndex,
  waitForTask,
  updateAndPickupMappings,
  updateMappings,
  updateAliases,
  transformDocs,
  setWriteBlock,
  removeWriteBlock,
  reindex,
  readWithPit,
  refreshIndex,
  pickupUpdatedMappings,
  fetchIndices,
  waitForReindexTask,
  waitForPickupUpdatedMappingsTask,
  checkClusterRoutingAllocationEnabled,
} from './src/actions';
export type {
  OpenPitResponse,
  ReadWithPit,
  ReindexResponse,
  UpdateByQueryResponse,
  UpdateAndPickupMappingsResponse,
  EsResponseTooLargeError,
} from './src/actions';
export {
  isClusterShardLimitExceeded,
  isIncompatibleMappingException,
  isWriteBlockException,
  isIndexNotFoundException,
} from './src/actions/es_errors';
export {
  REMOVED_TYPES,
  deterministicallyRegenerateObjectId,
  type DocumentsTransformFailed,
  type DocumentsTransformSuccess,
} from './src/core';
