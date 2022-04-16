/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { DocumentsTransformFailed } from '../core/migrate_raw_docs';

export {
  BATCH_SIZE,
  DEFAULT_TIMEOUT,
  INDEX_AUTO_EXPAND_REPLICAS,
  INDEX_NUMBER_OF_SHARDS,
  WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
} from './constants';

export type { RetryableEsClientError };

// actions/* imports
export type { InitActionParams, UnsupportedClusterRoutingAllocation } from './initialize_action';
export { initAction } from './initialize_action';

export type { FetchIndexResponse, FetchIndicesParams } from './fetch_indices';
export { fetchIndices } from './fetch_indices';

export type { SetWriteBlockParams } from './set_write_block';
export { setWriteBlock } from './set_write_block';

export type { RemoveWriteBlockParams } from './remove_write_block';
export { removeWriteBlock } from './remove_write_block';

export type { CloneIndexResponse, CloneIndexParams } from './clone_index';
export { cloneIndex } from './clone_index';

export type { WaitForIndexStatusYellowParams } from './wait_for_index_status_yellow';
import { waitForIndexStatusYellow } from './wait_for_index_status_yellow';

export type { WaitForTaskResponse, WaitForTaskCompletionTimeout } from './wait_for_task';
import { waitForTask, WaitForTaskCompletionTimeout } from './wait_for_task';

export type { UpdateByQueryResponse } from './pickup_updated_mappings';
import { pickupUpdatedMappings } from './pickup_updated_mappings';

export type { OpenPitResponse, OpenPitParams } from './open_pit';
export { openPit, pitKeepAlive } from './open_pit';

export type { ReadWithPit, ReadWithPitParams } from './read_with_pit';
export { readWithPit } from './read_with_pit';

export type { ClosePitParams } from './close_pit';
export { closePit } from './close_pit';

export type { TransformDocsParams } from './transform_docs';
export { transformDocs } from './transform_docs';

export type { RefreshIndexParams } from './refresh_index';
export { refreshIndex } from './refresh_index';

export type { ReindexResponse, ReindexParams } from './reindex';
export { reindex } from './reindex';

import type { IncompatibleMappingException } from './wait_for_reindex_task';

export { waitForReindexTask } from './wait_for_reindex_task';

export type { VerifyReindexParams } from './verify_reindex';
export { verifyReindex } from './verify_reindex';

import type { AliasNotFound, RemoveIndexNotAConcreteIndex } from './update_aliases';

export type { AliasAction, UpdateAliasesParams } from './update_aliases';
export { updateAliases } from './update_aliases';

export type { CreateIndexParams } from './create_index';
export { createIndex } from './create_index';

export type {
  UpdateAndPickupMappingsResponse,
  UpdateAndPickupMappingsParams,
} from './update_and_pickup_mappings';
export { updateAndPickupMappings } from './update_and_pickup_mappings';

import type { UnknownDocsFound } from './check_for_unknown_docs';
import type { UnsupportedClusterRoutingAllocation } from './initialize_action';

export type {
  CheckForUnknownDocsParams,
  UnknownDocsFound,
  CheckForUnknownDocsFoundDoc,
} from './check_for_unknown_docs';
export { checkForUnknownDocs } from './check_for_unknown_docs';

export { waitForPickupUpdatedMappingsTask } from './wait_for_pickup_updated_mappings_task';

export type {
  SearchResponse,
  SearchForOutdatedDocumentsOptions,
} from './search_for_outdated_documents';
export { searchForOutdatedDocuments } from './search_for_outdated_documents';

export type { BulkOverwriteTransformedDocumentsParams } from './bulk_overwrite_transformed_documents';
export { bulkOverwriteTransformedDocuments } from './bulk_overwrite_transformed_documents';

export type {
  CalculateExcludeFiltersParams,
  CalculatedExcludeFilter,
} from './calculate_exclude_filters';
export { calculateExcludeFilters } from './calculate_exclude_filters';

export { pickupUpdatedMappings, waitForTask, waitForIndexStatusYellow };
export type { AliasNotFound, RemoveIndexNotAConcreteIndex };

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
  unknown_docs_found: UnknownDocsFound;
  unsupported_cluster_routing_allocation: UnsupportedClusterRoutingAllocation;
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
