import type { ActionErrorTypeMap as BaseActionErrorTypeMap } from '../../actions';
export { fetchIndices, waitForIndexStatus, createIndex, updateAliases, updateMappings, updateAndPickupMappings, cleanupUnknownAndExcluded, waitForDeleteByQueryTask, waitForPickupUpdatedMappingsTask, refreshIndex, openPit, readWithPit, closePit, transformDocs, bulkOverwriteTransformedDocuments, noop, type IncompatibleClusterRoutingAllocation, type RetryableEsClientError, type WaitForTaskCompletionTimeout, type IndexNotFound, } from '../../actions';
export { updateIndexMeta, type UpdateIndexMetaParams } from './update_index_meta';
export { waitForDelay, type WaitForDelayParams } from './wait_for_delay';
export type ActionErrorTypeMap = BaseActionErrorTypeMap;
/** Type guard for narrowing the type of a left */
export declare function isTypeof<T extends keyof ActionErrorTypeMap>(res: any, typeString: T): res is ActionErrorTypeMap[T];
