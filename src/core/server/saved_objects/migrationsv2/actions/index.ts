/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DocumentsTransformFailed } from '../../migrations/core/migrate_raw_docs';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { pickupUpdatedMappings } from './pickup_updated_mappings';
import type { AliasNotFound, RemoveIndexNotAConcreteIndex } from './update_aliases';
import { waitForIndexStatusYellow } from './wait_for_index_status_yellow';
import type { IncompatibleMappingException } from './wait_for_reindex_task';
import type { WaitForTaskCompletionTimeout } from './wait_for_task';
import { waitForTask } from './wait_for_task';
export { bulkOverwriteTransformedDocuments } from './bulk_overwrite_transformed_documents';
export type { BulkOverwriteTransformedDocumentsParams } from './bulk_overwrite_transformed_documents';
export { calculateExcludeFilters } from './calculate_exclude_filters';
export type {
  CalculatedExcludeFilter,
  CalculateExcludeFiltersParams,
} from './calculate_exclude_filters';
export { checkForUnknownDocs } from './check_for_unknown_docs';
export type {
  CheckForUnknownDocsFoundDoc,
  CheckForUnknownDocsParams,
  UnknownDocsFound,
} from './check_for_unknown_docs';
export { cloneIndex } from './clone_index';
export type { CloneIndexParams, CloneIndexResponse } from './clone_index';
export { closePit } from './close_pit';
export type { ClosePitParams } from './close_pit';
export {
  BATCH_SIZE,
  DEFAULT_TIMEOUT,
  INDEX_AUTO_EXPAND_REPLICAS,
  INDEX_NUMBER_OF_SHARDS,
  WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
} from './constants';
export { createIndex } from './create_index';
export type { CreateIndexParams } from './create_index';
export { fetchIndices } from './fetch_indices';
// actions/* imports
export type { FetchIndexResponse, FetchIndicesParams } from './fetch_indices';
export { openPit, pitKeepAlive } from './open_pit';
export type { OpenPitParams, OpenPitResponse } from './open_pit';
export type { UpdateByQueryResponse } from './pickup_updated_mappings';
export { readWithPit } from './read_with_pit';
export type { ReadWithPit, ReadWithPitParams } from './read_with_pit';
export { refreshIndex } from './refresh_index';
export type { RefreshIndexParams } from './refresh_index';
export { reindex } from './reindex';
export type { ReindexParams, ReindexResponse } from './reindex';
export { removeWriteBlock } from './remove_write_block';
export type { RemoveWriteBlockParams } from './remove_write_block';
export { searchForOutdatedDocuments } from './search_for_outdated_documents';
export type {
  SearchForOutdatedDocumentsOptions,
  SearchResponse,
} from './search_for_outdated_documents';
export { setWriteBlock } from './set_write_block';
export type { SetWriteBlockParams } from './set_write_block';
export { transformDocs } from './transform_docs';
export type { TransformDocsParams } from './transform_docs';
export { updateAliases } from './update_aliases';
export type { AliasAction, UpdateAliasesParams } from './update_aliases';
export { updateAndPickupMappings } from './update_and_pickup_mappings';
export type {
  UpdateAndPickupMappingsParams,
  UpdateAndPickupMappingsResponse,
} from './update_and_pickup_mappings';
export { verifyReindex } from './verify_reindex';
export type { VerifyReindexParams } from './verify_reindex';
export type { WaitForIndexStatusYellowParams } from './wait_for_index_status_yellow';
export { waitForPickupUpdatedMappingsTask } from './wait_for_pickup_updated_mappings_task';
export { waitForReindexTask } from './wait_for_reindex_task';
export type { WaitForTaskCompletionTimeout, WaitForTaskResponse } from './wait_for_task';
export type { RetryableEsClientError };
export type { AliasNotFound, RemoveIndexNotAConcreteIndex };
export { pickupUpdatedMappings };
export { waitForTask };
export { waitForIndexStatusYellow };

export interface IndexNotFound {
  type: 'index_not_found_exception';
  index: string;
}

export interface WaitForReindexTaskFailure {
  readonly cause: { type: string; reason: string };
}

export interface TargetIndexHadWriteBlock {
  type: 'target_index_had_write_block';
}

export interface RequestEntityTooLargeException {
  type: 'request_entity_too_large_exception';
}

/** @internal */
export interface AcknowledgeResponse {
  acknowledged: boolean;
  shardsAcknowledged: boolean;
}

// Map of left response 'type' string -> response interface
export interface ActionErrorTypeMap {
  wait_for_task_completion_timeout: WaitForTaskCompletionTimeout;
  retryable_es_client_error: RetryableEsClientError;
  index_not_found_exception: IndexNotFound;
  target_index_had_write_block: TargetIndexHadWriteBlock;
  incompatible_mapping_exception: IncompatibleMappingException;
  alias_not_found_exception: AliasNotFound;
  remove_index_not_a_concrete_index: RemoveIndexNotAConcreteIndex;
  documents_transform_failed: DocumentsTransformFailed;
  request_entity_too_large_exception: RequestEntityTooLargeException;
}

/**
 * Type guard for narrowing the type of a left
 */
export function isLeftTypeof<T extends keyof ActionErrorTypeMap>(
  res: any,
  typeString: T
): res is ActionErrorTypeMap[T] {
  return res.type === typeString;
}
