/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { DocumentMigrator, KibanaMigrator, buildActiveMappings, mergeTypes } from './src';
export type { KibanaMigratorOptions } from './src';
export { getAggregatedTypesDocuments } from './src/actions/check_for_unknown_docs';
export { addExcludedTypesToBoolQuery } from './src/model/helpers';

// these are only used for integration tests
export {
  bulkOverwriteTransformedDocuments,
  closePit,
  createIndex,
  openPit,
  calculateExcludeFilters,
  checkForUnknownDocs,
  waitForIndexStatus,
  initAction,
  cloneIndex,
  waitForTask,
  updateAndPickupMappings,
  updateMappings,
  updateAliases,
  transformDocs,
  setWriteBlock,
  searchForOutdatedDocuments,
  removeWriteBlock,
  reindex,
  readWithPit,
  refreshIndex,
  pickupUpdatedMappings,
  fetchIndices,
  waitForReindexTask,
  waitForPickupUpdatedMappingsTask,
} from './src/actions';
export type {
  OpenPitResponse,
  ReadWithPit,
  SearchResponse,
  ReindexResponse,
  UpdateByQueryResponse,
  UpdateAndPickupMappingsResponse,
} from './src/actions';
export {
  isClusterShardLimitExceeded,
  isIncompatibleMappingException,
  isWriteBlockException,
  isIndexNotFoundException,
} from './src/actions/es_errors';
export { deterministicallyRegenerateObjectId } from './src/core/document_migrator';
export {
  REMOVED_TYPES,
  type DocumentsTransformFailed,
  type DocumentsTransformSuccess,
} from './src/core';
export { MIGRATION_CLIENT_OPTIONS } from './src/run_resilient_migrator';
