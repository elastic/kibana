export { DocumentMigrator, KibanaMigrator, buildActiveMappings, buildTypesMappings } from './src';
export type { KibanaMigratorOptions } from './src';
export { getAggregatedTypesDocuments } from './src/actions/check_for_unknown_docs';
export { addExcludedTypesToBoolQuery, createBulkIndexOperationTuple, createBulkDeleteOperationBody, } from './src/model/helpers';
export { bulkOverwriteTransformedDocuments, closePit, createIndex, openPit, calculateExcludeFilters, checkForUnknownDocs, waitForIndexStatus, waitForTask, updateAndPickupMappings, updateMappings, updateAliases, transformDocs, readWithPit, refreshIndex, pickupUpdatedMappings, fetchIndices, waitForPickupUpdatedMappingsTask, checkClusterRoutingAllocationEnabled, } from './src/actions';
export type { OpenPitResponse, ReadWithPit, UpdateByQueryResponse, UpdateAndPickupMappingsResponse, EsResponseTooLargeError, } from './src/actions';
export { isClusterShardLimitExceeded, isIncompatibleMappingException, isWriteBlockException, isIndexNotFoundException, } from './src/actions/es_errors';
export { deterministicallyRegenerateObjectId, type DocumentsTransformFailed, type DocumentsTransformSuccess, } from './src/core';
