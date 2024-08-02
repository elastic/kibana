/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Either } from 'fp-ts/lib/Either';
import { right } from 'fp-ts/lib/Either';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { DocumentsTransformFailed } from '../core/migrate_raw_docs';

export {
  DEFAULT_TIMEOUT,
  INDEX_AUTO_EXPAND_REPLICAS,
  INDEX_NUMBER_OF_SHARDS,
  WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
} from './constants';

export type { RetryableEsClientError };

// actions/* imports
export type { IncompatibleClusterRoutingAllocation } from './check_cluster_routing_allocation';
export { checkClusterRoutingAllocationEnabled } from './check_cluster_routing_allocation';

export type { FetchIndexResponse, FetchIndicesParams } from './fetch_indices';
export { fetchIndices } from './fetch_indices';

export type { SafeWriteBlockParams } from './safe_write_block';
export { safeWriteBlock } from './safe_write_block';

export type { SetWriteBlockParams } from './set_write_block';
export { setWriteBlock } from './set_write_block';

export type { RemoveWriteBlockParams } from './remove_write_block';
export { removeWriteBlock } from './remove_write_block';

export type { CloneIndexResponse, CloneIndexParams } from './clone_index';
export { cloneIndex } from './clone_index';

export type {
  WaitForIndexStatusParams,
  IndexNotYellowTimeout,
  IndexNotGreenTimeout,
} from './wait_for_index_status';
import type { IndexNotGreenTimeout, IndexNotYellowTimeout } from './wait_for_index_status';
import { waitForIndexStatus } from './wait_for_index_status';

export type { WaitForTaskResponse, WaitForTaskCompletionTimeout } from './wait_for_task';
import { waitForTask, WaitForTaskCompletionTimeout } from './wait_for_task';

export type { UpdateByQueryResponse } from './pickup_updated_mappings';
import { pickupUpdatedMappings } from './pickup_updated_mappings';

export type { OpenPitResponse, OpenPitParams } from './open_pit';
export { openPit } from './open_pit';

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

import type { AliasNotFound, RemoveIndexNotAConcreteIndex } from './update_aliases';

export type { AliasAction, UpdateAliasesParams } from './update_aliases';
export { updateAliases } from './update_aliases';

export { cleanupUnknownAndExcluded } from './cleanup_unknown_and_excluded';

export { waitForDeleteByQueryTask } from './wait_for_delete_by_query_task';

export type { CreateIndexParams, ClusterShardLimitExceeded } from './create_index';

export { synchronizeMigrators } from './synchronize_migrators';

export { createIndex } from './create_index';

export { checkTargetTypesMappings } from './check_target_mappings';

export const noop = async (): Promise<Either<never, 'noop'>> => right('noop' as const);

export type {
  UpdateAndPickupMappingsResponse,
  UpdateAndPickupMappingsParams,
} from './update_and_pickup_mappings';
export { updateAndPickupMappings } from './update_and_pickup_mappings';

export { updateMappings, type IncompatibleMappingException } from './update_mappings';

export {
  type UpdateSourceMappingsPropertiesParams,
  updateSourceMappingsProperties,
} from './update_source_mappings_properties';

import type { UnknownDocsFound } from './check_for_unknown_docs';
import type { IncompatibleClusterRoutingAllocation } from './check_cluster_routing_allocation';
import type { ClusterShardLimitExceeded } from './create_index';
import type { SynchronizationFailed } from './synchronize_migrators';
import type { IndexMappingsIncomplete, TypesChanged } from './check_target_mappings';

export type {
  CheckForUnknownDocsParams,
  UnknownDocsFound,
  DocumentIdAndType,
} from './check_for_unknown_docs';
export { checkForUnknownDocs } from './check_for_unknown_docs';

export { waitForPickupUpdatedMappingsTask } from './wait_for_pickup_updated_mappings_task';

export type { BulkOverwriteTransformedDocumentsParams } from './bulk_overwrite_transformed_documents';
export { bulkOverwriteTransformedDocuments } from './bulk_overwrite_transformed_documents';

export type {
  CalculateExcludeFiltersParams,
  CalculatedExcludeFilter,
} from './calculate_exclude_filters';
export { calculateExcludeFilters } from './calculate_exclude_filters';

export { pickupUpdatedMappings, waitForTask, waitForIndexStatus };
export type { AliasNotFound, RemoveIndexNotAConcreteIndex };

export interface IndexNotFound {
  type: 'index_not_found_exception';
  index: string;
}

export interface OperationNotSupported {
  type: 'operation_not_supported';
  operationName: string;
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

export interface EsResponseTooLargeError {
  type: 'es_response_too_large';
  contentLength: number;
}

export interface SourceEqualsTarget {
  type: 'source_equals_target';
  index: string;
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
  incompatible_cluster_routing_allocation: IncompatibleClusterRoutingAllocation;
  index_not_green_timeout: IndexNotGreenTimeout;
  index_not_yellow_timeout: IndexNotYellowTimeout;
  cluster_shard_limit_exceeded: ClusterShardLimitExceeded;
  es_response_too_large: EsResponseTooLargeError;
  synchronization_failed: SynchronizationFailed;
  index_mappings_incomplete: IndexMappingsIncomplete;
  types_changed: TypesChanged;
  operation_not_supported: OperationNotSupported;
  source_equals_target: SourceEqualsTarget;
}

/**
 * Type guard for narrowing the type of a left
 */
export function isTypeof<T extends keyof ActionErrorTypeMap>(
  res: any,
  typeString: T
): res is ActionErrorTypeMap[T] {
  return res.type === typeString;
}
