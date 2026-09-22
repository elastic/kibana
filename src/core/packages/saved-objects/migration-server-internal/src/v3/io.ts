/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as E from 'fp-ts/Either';
import * as Option from 'fp-ts/Option';
import { omit } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { AliasAction } from '../actions';
import type { CleanupNotNeeded, CleanupStarted } from '../actions/cleanup_unknown_and_excluded';
import type { DocumentIdAndType, UnknownDocsFound } from '../actions/check_for_unknown_docs';
import type { CleanupSuccessfulResponse } from '../actions/wait_for_delete_by_query_task';
import type { IncompatibleClusterRoutingAllocation } from '../actions/check_cluster_routing_allocation';
import type { IndexNotYellowTimeout } from '../actions/wait_for_index_status';
import type { RetryableEsClientError } from '../actions/catch_retryable_es_client_errors';
import type { TransformRawDocs } from '../types';
import * as Actions from '../actions';
import {
  adaptEither,
  mapRetryableFailure,
  runTaskEither,
  type RetryableFailureResponse,
} from './io_helpers';
import type * as REFRESH_SOURCE from './steps/refresh_source';
import type * as INIT from './steps/init';
import type * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';
import type * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';
import type * as UPDATE_SOURCE_MAPPINGS_PROPERTIES from './steps/update_source_mappings_properties';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED from './steps/cleanup_unknown_and_excluded';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import type * as PREPARE_COMPATIBLE_MIGRATION from './steps/prepare_compatible_migration';
import type * as CREATE_NEW_TARGET from './steps/create_new_target';
import type * as CHECK_TARGET_MAPPINGS from './steps/check_target_mappings';
import type * as UPDATE_TARGET_MAPPINGS_PROPERTIES from './steps/update_target_mappings_properties';
import type * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './steps/update_target_mappings_properties_wait_for_task';
import type * as UPDATE_TARGET_MAPPINGS_META from './steps/update_target_mappings_meta';
import type * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './steps/outdated_documents_search_open_pit';
import type * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import type * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './steps/outdated_documents_search_close_pit';
import type * as OUTDATED_DOCUMENTS_REFRESH from './steps/outdated_documents_refresh';
import type * as OUTDATED_DOCUMENTS_TRANSFORM from './steps/outdated_documents_transform';
import type * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './steps/transformed_documents_bulk_index';
import type * as MARK_VERSION_INDEX_READY from './steps/mark_version_index_ready';
import type * as MARK_VERSION_INDEX_READY_CONFLICT from './steps/mark_version_index_ready_conflict';
import type { PostInitState } from './migration_state';

export type { RetryableFailureResponse };

export type InitResponse =
  | RetryableFailureResponse
  | { readonly type: 'wait_for_migration_completion'; readonly postInit: PostInitFields }
  | { readonly type: 'wait_for_yellow_source'; readonly postInit: SourceExistsPostInit }
  | { readonly type: 'create_index_check_routing'; readonly postInit: CreateIndexPostInit }
  | { readonly type: 'fatal'; readonly reason: string };

export interface PostInitFields {
  readonly aliases: PostInitState['aliases'];
  readonly sourceIndex: PostInitState['sourceIndex'];
  readonly sourceIndexMappings: PostInitState['sourceIndexMappings'];
  readonly targetIndex: string;
  readonly versionIndexReadyActions: PostInitState['versionIndexReadyActions'];
}

export interface SourceExistsPostInit extends PostInitFields {
  readonly sourceIndex: Option.Some<string>;
  readonly sourceIndexMappings: Option.Some<IndexMapping>;
}

export interface CreateIndexPostInit extends PostInitFields {
  readonly sourceIndex: Option.None;
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
}

export type FetchIndicesResponse =
  | RetryableFailureResponse
  | { readonly type: 'indices'; readonly indices: Actions.FetchIndexResponse }
  | { readonly type: 'fatal'; readonly reason: string };

export type WaitForYellowSourceResponse =
  | RetryableFailureResponse
  | { readonly type: 'yellow' }
  | { readonly type: 'index_not_yellow_timeout'; readonly message: string };

export type UpdateSourceMappingsPropertiesResponse =
  | RetryableFailureResponse
  | { readonly type: 'mapping_update_succeeded' }
  | { readonly type: 'mapping_update_failed' };

export type ClusterRoutingAllocationResponse =
  | RetryableFailureResponse
  | { readonly type: 'ok' }
  | { readonly type: 'incompatible_cluster_routing_allocation' };

export type CleanupUnknownAndExcludedResponse =
  | RetryableFailureResponse
  | {
      readonly type: 'cleanup_started';
      readonly taskId: string;
      readonly unknownDocs: DocumentIdAndType[];
      readonly errorsByType: Record<string, Error>;
    }
  | { readonly type: 'cleanup_not_needed'; readonly preTransform: PrepareCompatibleExtras }
  | { readonly type: 'unknown_docs_found'; readonly reason: string };

export interface PrepareCompatibleExtras {
  readonly targetIndexMappings: PostInitState['targetIndexMappings'];
  readonly preTransformDocsActions: import('../actions').AliasAction[];
}

export type CleanupWaitForTaskResponse =
  | RetryableFailureResponse
  | {
      readonly type: 'completed';
      readonly mustRefresh: boolean;
      readonly preTransform: PrepareCompatibleExtras;
    }
  | { readonly type: 'wait_for_task_completion_timeout'; readonly message: string }
  | { readonly type: 'task_failed'; readonly reason: string };

export type UpdateAliasesResponse =
  | RetryableFailureResponse
  | { readonly type: 'success' }
  | { readonly type: 'alias_not_found_exception' };

export type RefreshSourceResponse = RetryableFailureResponse | { readonly type: 'success' };

export type CreateNewTargetResponse =
  | RetryableFailureResponse
  | { readonly type: 'created' }
  | { readonly type: 'index_already_exists' }
  | { readonly type: 'index_not_green_timeout'; readonly message: string }
  | { readonly type: 'cluster_shard_limit_exceeded' };

export type CheckTargetMappingsResponse =
  | RetryableFailureResponse
  | { readonly type: 'types_match' }
  | { readonly type: 'index_mappings_incomplete' }
  | { readonly type: 'types_changed'; readonly updatedTypes: string[] }
  | { readonly type: 'types_added' };

export type UpdateTargetMappingsPropertiesResponse =
  | RetryableFailureResponse
  | { readonly type: 'task_started'; readonly taskId: string };

export type WaitForPickupMappingsTaskResponse =
  | RetryableFailureResponse
  | { readonly type: 'completed' }
  | { readonly type: 'wait_for_task_completion_timeout'; readonly message: string }
  | { readonly type: 'task_completed_with_retriable_error'; readonly message: string };

export type UpdateMappingsMetaResponse = RetryableFailureResponse | { readonly type: 'success' };

export interface NoopResponse {
  readonly type: 'noop';
}

export type OpenPitResponse =
  | RetryableFailureResponse
  | { readonly type: 'opened'; readonly pitId: string };

export type ReadWithPitResponse =
  | RetryableFailureResponse
  | {
      readonly type: 'hits';
      readonly pitId: string;
      readonly outdatedDocuments: SavedObjectsRawDoc[];
      readonly lastHitSortValue: number[] | undefined;
      readonly totalHits: number;
    }
  | { readonly type: 'no_outdated_docs'; readonly pitId: string }
  | { readonly type: 'es_response_too_large'; readonly contentLength: number };

export type ClosePitResponse = RetryableFailureResponse | { readonly type: 'closed' };

export type TransformDocsResponse =
  | RetryableFailureResponse
  | { readonly type: 'transformed'; readonly processedDocs: SavedObjectsRawDoc[] }
  | {
      readonly type: 'documents_transform_failed';
      readonly processedDocs: SavedObjectsRawDoc[];
      readonly corruptDocumentIds: string[];
      readonly transformErrors: import('../core').TransformErrorObjects[];
    };

export type BulkIndexResponse =
  | RetryableFailureResponse
  | { readonly type: 'indexed' }
  | { readonly type: 'request_entity_too_large_exception' }
  | { readonly type: 'unavailable_shards_exception'; readonly message: string };

export type MarkVersionIndexReadyResponse =
  | RetryableFailureResponse
  | { readonly type: 'success' }
  | { readonly type: 'aliases_updated' }
  | { readonly type: 'alias_not_found_exception' };

export interface IO {
  readonly init: (state: INIT.State) => Promise<InitResponse>;
  readonly fetchIndices: (
    state: WAIT_FOR_MIGRATION_COMPLETION.State | MARK_VERSION_INDEX_READY_CONFLICT.State
  ) => Promise<FetchIndicesResponse>;
  readonly waitForYellowSource: (
    state: WAIT_FOR_YELLOW_SOURCE.State
  ) => Promise<WaitForYellowSourceResponse>;
  readonly updateSourceMappingsProperties: (
    state: UPDATE_SOURCE_MAPPINGS_PROPERTIES.State
  ) => Promise<UpdateSourceMappingsPropertiesResponse>;
  readonly checkClusterRoutingAllocation: () => Promise<ClusterRoutingAllocationResponse>;
  readonly cleanupUnknownAndExcluded: (
    state: CLEANUP_UNKNOWN_AND_EXCLUDED.State
  ) => Promise<CleanupUnknownAndExcludedResponse>;
  readonly waitForDeleteByQueryTask: (
    state: CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.State
  ) => Promise<CleanupWaitForTaskResponse>;
  readonly updateAliases: (
    state: PREPARE_COMPATIBLE_MIGRATION.State | MARK_VERSION_INDEX_READY.State
  ) => Promise<UpdateAliasesResponse>;
  readonly refreshSource: (state: REFRESH_SOURCE.State) => Promise<RefreshSourceResponse>;
  readonly refreshTarget: (
    state: OUTDATED_DOCUMENTS_REFRESH.State
  ) => Promise<RefreshSourceResponse>;
  readonly createIndex: (state: CREATE_NEW_TARGET.State) => Promise<CreateNewTargetResponse>;
  readonly checkTargetMappings: (
    state: CHECK_TARGET_MAPPINGS.State
  ) => Promise<CheckTargetMappingsResponse>;
  readonly updateAndPickupMappings: (
    state: UPDATE_TARGET_MAPPINGS_PROPERTIES.State
  ) => Promise<UpdateTargetMappingsPropertiesResponse>;
  readonly waitForPickupUpdatedMappingsTask: (
    state: UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.State
  ) => Promise<WaitForPickupMappingsTaskResponse>;
  readonly updateMappingsMeta: (
    state: UPDATE_TARGET_MAPPINGS_META.State
  ) => Promise<UpdateMappingsMetaResponse>;
  readonly noop: () => Promise<NoopResponse>;
  readonly openPit: (state: OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.State) => Promise<OpenPitResponse>;
  readonly readWithPit: (
    state: OUTDATED_DOCUMENTS_SEARCH_READ.State
  ) => Promise<ReadWithPitResponse>;
  readonly closePit: (
    state: OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.State
  ) => Promise<ClosePitResponse>;
  readonly transformDocs: (
    state: OUTDATED_DOCUMENTS_TRANSFORM.State
  ) => Promise<TransformDocsResponse>;
  readonly bulkIndex: (state: TRANSFORMED_DOCUMENTS_BULK_INDEX.State) => Promise<BulkIndexResponse>;
}

export interface CreateIOParams {
  readonly client: ElasticsearchClient;
  readonly transformRawDocs: TransformRawDocs;
  readonly removedTypes: string[];
}

export const createIO = ({ client, transformRawDocs, removedTypes }: CreateIOParams): IO => ({
  init: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] })
      )
    );
    if (E.isLeft(either)) {
      if ((either.left as RetryableFailureResponse).type === 'retryable_failure') {
        return either.left as RetryableFailureResponse;
      }
    }
    const indices = (either as E.Right<Actions.FetchIndexResponse>).right;
    const { getAliases, indexBelongsToLaterVersion, hasLaterVersionAlias, aliasVersion } =
      await import('../model/helpers');
    const { initialModelVersion } = await import(
      '@kbn/core-saved-objects-base-server-internal/src/model_version/constants'
    );
    const { getVirtualVersionsFromMappings } = await import(
      '@kbn/core-saved-objects-base-server-internal'
    );
    const aliasesRes = getAliases(indices);
    if (E.isLeft(aliasesRes)) {
      return {
        type: 'fatal',
        reason: `The ${
          aliasesRes.left.alias
        } alias is pointing to multiple indices: ${aliasesRes.left.indices.join(',')}.`,
      };
    }
    const aliases = aliasesRes.right;
    if (indexBelongsToLaterVersion(state.kibanaVersion, aliases[state.currentAlias])) {
      const { indexVersion } = await import('../model/helpers');
      return {
        type: 'fatal',
        reason: `The ${
          state.currentAlias
        } alias is pointing to a newer version of Kibana: v${indexVersion(
          aliases[state.currentAlias]
        )}`,
      };
    }
    const laterVersionAlias = hasLaterVersionAlias(state.kibanaVersion, aliases);
    if (laterVersionAlias) {
      return {
        type: 'fatal',
        reason: `The ${laterVersionAlias} alias refers to a newer version of Kibana: v${aliasVersion(
          laterVersionAlias
        )}`,
      };
    }
    const source = aliases[state.currentAlias];
    const newVersionTarget = state.versionIndex;
    let mappings = source ? indices[source]?.mappings : undefined;
    if (mappings) {
      const mappingVersions = getVirtualVersionsFromMappings({
        mappings,
        source: 'mappingVersions',
        minimumVirtualVersion: initialModelVersion,
      });
      if (mappingVersions) {
        mappings = { ...mappings, _meta: { ...mappings._meta, mappingVersions } };
      }
    }
    const postInit: PostInitFields = {
      aliases,
      sourceIndex: Option.fromNullable(source),
      sourceIndexMappings: Option.fromNullable(mappings),
      versionIndexReadyActions: Option.none,
      targetIndex: newVersionTarget,
    };
    if (state.waitForMigrationCompletion) {
      return {
        type: 'wait_for_migration_completion',
        postInit: { ...postInit, sourceIndex: Option.none, targetIndex: newVersionTarget },
      };
    }
    if (Option.isSome(postInit.sourceIndex) && Option.isSome(postInit.sourceIndexMappings)) {
      return {
        type: 'wait_for_yellow_source',
        postInit: {
          ...postInit,
          sourceIndex: postInit.sourceIndex,
          sourceIndexMappings: postInit.sourceIndexMappings,
          targetIndex: postInit.sourceIndex.value,
        },
      };
    }
    const createIndexPostInit: CreateIndexPostInit = {
      ...postInit,
      sourceIndex: Option.none as Option.None,
      targetIndex: newVersionTarget,
      versionIndexReadyActions: Option.some([
        { add: { index: newVersionTarget, alias: state.currentAlias } },
        { add: { index: newVersionTarget, alias: state.versionAlias } },
      ]) as Option.Some<AliasAction[]>,
    };
    return { type: 'create_index_check_routing', postInit: createIndexPostInit };
  },
  fetchIndices: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] })
      )
    );
    if (E.isLeft(either)) {
      if ((either.left as RetryableFailureResponse).type === 'retryable_failure') {
        return either.left as RetryableFailureResponse;
      }
    }
    return { type: 'indices', indices: (either as E.Right<Actions.FetchIndexResponse>).right };
  },
  waitForYellowSource: async (state) =>
    adaptEither<
      RetryableEsClientError | IndexNotYellowTimeout,
      Record<string, never>,
      WaitForYellowSourceResponse
    >(
      Actions.waitForIndexStatus({ client, index: state.sourceIndex.value, status: 'yellow' }),
      () => ({ type: 'yellow' as const }),
      (left): WaitForYellowSourceResponse =>
        left.type === 'index_not_yellow_timeout'
          ? { type: 'index_not_yellow_timeout', message: left.message }
          : { type: 'retryable_failure', message: String(left) }
    ),
  updateSourceMappingsProperties: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.updateSourceMappingsProperties({
          client,
          indexTypes: state.indexTypes,
          sourceIndex: state.sourceIndex.value,
          indexMappings: state.sourceIndexMappings.value,
          appMappings: state.targetIndexMappings,
          latestMappingsVersions: state.latestMappingsVersions,
          hashToVersionMap: state.hashToVersionMap,
        })
      )
    );
    if (E.isLeft(either)) {
      if ((either.left as RetryableFailureResponse).type === 'retryable_failure') {
        return either.left as RetryableFailureResponse;
      }
      return { type: 'mapping_update_failed' as const };
    }
    return { type: 'mapping_update_succeeded' as const };
  },
  checkClusterRoutingAllocation: async () =>
    adaptEither<
      RetryableEsClientError | IncompatibleClusterRoutingAllocation,
      Record<string, never>,
      ClusterRoutingAllocationResponse
    >(
      Actions.checkClusterRoutingAllocationEnabled(client),
      () => ({ type: 'ok' as const }),
      (left): ClusterRoutingAllocationResponse =>
        left.type === 'incompatible_cluster_routing_allocation'
          ? { type: 'incompatible_cluster_routing_allocation' }
          : { type: 'retryable_failure', message: String(left) }
    ),
  cleanupUnknownAndExcluded: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.cleanupUnknownAndExcluded({
          client,
          indexName: state.sourceIndex.value,
          discardUnknownDocs: state.discardUnknownObjects,
          excludeOnUpgradeQuery: state.excludeOnUpgradeQuery,
          excludeFromUpgradeFilterHooks: state.excludeFromUpgradeFilterHooks,
          knownTypes: state.knownTypes,
          removedTypes,
        })
      )
    );
    if (E.isRight(either)) {
      const right = either.right as CleanupStarted | CleanupNotNeeded;
      if (right.type === 'cleanup_started') {
        return {
          type: 'cleanup_started',
          taskId: right.taskId,
          unknownDocs: right.unknownDocs,
          errorsByType: right.errorsByType,
        };
      }
      const { getPrepareCompatibleMigrationStateProperties } = await import('../model/helpers');
      return {
        type: 'cleanup_not_needed',
        preTransform: getPrepareCompatibleMigrationStateProperties(
          state as unknown as
            | import('../state').CleanupUnknownAndExcluded
            | import('../state').CleanupUnknownAndExcludedWaitForTaskState
        ),
      };
    }
    const { extractUnknownDocFailureReason } = await import('../model/extract_errors');
    const left = either.left as UnknownDocsFound;
    return {
      type: 'unknown_docs_found',
      reason: extractUnknownDocFailureReason(
        state.migrationDocLinks.resolveMigrationFailures,
        left.unknownDocs
      ),
    };
  },
  waitForDeleteByQueryTask: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.waitForDeleteByQueryTask({
          client,
          taskId: state.deleteByQueryTaskId,
          timeout: '120s',
        })
      )
    );
    if (E.isRight(either)) {
      const right = either.right as CleanupSuccessfulResponse;
      const { getPrepareCompatibleMigrationStateProperties } = await import('../model/helpers');
      return {
        type: 'completed',
        mustRefresh: state.mustRefresh || typeof right.deleted === 'undefined' || right.deleted > 0,
        preTransform: getPrepareCompatibleMigrationStateProperties(
          state as unknown as import('../state').CleanupUnknownAndExcluded
        ),
      };
    }
    if (either.left.type === 'wait_for_task_completion_timeout') {
      return { type: 'wait_for_task_completion_timeout', message: either.left.message };
    }
    return { type: 'task_failed', reason: 'delete by query failed' };
  },
  updateAliases: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.updateAliases({
          client,
          aliasActions:
            'preTransformDocsActions' in state
              ? state.preTransformDocsActions
              : state.versionIndexReadyActions.value,
        })
      )
    );
    if (E.isRight(either)) {
      return { type: 'success' as const };
    }
    const left = either.left;
    if ((left as RetryableFailureResponse).type === 'retryable_failure') {
      return left as RetryableFailureResponse;
    }
    if (left.type === 'alias_not_found_exception') {
      return { type: 'alias_not_found_exception' as const };
    }
    return { type: 'retryable_failure', message: String(left) };
  },
  refreshSource: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(Actions.refreshIndex({ client, index: state.sourceIndex.value }))
    );
    if (E.isRight(either)) {
      return { type: 'success' as const };
    }
    return either.left as RetryableFailureResponse;
  },
  refreshTarget: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(Actions.refreshIndex({ client, index: state.targetIndex }))
    );
    if (E.isRight(either)) {
      return { type: 'success' as const };
    }
    return either.left as RetryableFailureResponse;
  },
  createIndex: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.createIndex({
          client,
          indexName: state.targetIndex,
          mappings: state.targetIndexMappings,
          esCapabilities: state.esCapabilities,
        })
      )
    );
    if (E.isRight(either)) {
      return either.right === 'index_already_exists'
        ? { type: 'index_already_exists' as const }
        : { type: 'created' as const };
    }
    const left = either.left;
    if ((left as { type: string }).type === 'retryable_failure')
      return left as RetryableFailureResponse;
    if (left.type === 'index_not_green_timeout') {
      return { type: 'index_not_green_timeout', message: left.message };
    }
    if (left.type === 'cluster_shard_limit_exceeded') {
      return { type: 'cluster_shard_limit_exceeded' as const };
    }
    return { type: 'retryable_failure', message: String(left) };
  },
  checkTargetMappings: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.checkTargetTypesMappings({
          indexTypes: state.indexTypes,
          indexMappings: Option.toUndefined(state.sourceIndexMappings),
          appMappings: state.targetIndexMappings,
          latestMappingsVersions: state.latestMappingsVersions,
          hashToVersionMap: state.hashToVersionMap,
        })
      )
    );
    if (E.isRight(either)) return { type: 'types_match' };
    const left = either.left;
    if ((left as RetryableFailureResponse).type === 'retryable_failure')
      return left as RetryableFailureResponse;
    if (left.type === 'index_mappings_incomplete') return { type: 'index_mappings_incomplete' };
    if (left.type === 'types_changed')
      return { type: 'types_changed', updatedTypes: left.updatedTypes };
    if (left.type === 'types_added') return { type: 'types_added' };
    return { type: 'retryable_failure', message: String(left) };
  },
  updateAndPickupMappings: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.updateAndPickupMappings({
          client,
          index: state.targetIndex,
          mappings: omit(state.targetIndexMappings, ['_meta']),
          batchSize: state.batchSize,
          query: Option.toUndefined(state.updatedTypesQuery),
        })
      )
    );
    if (E.isRight(either)) return { type: 'task_started', taskId: either.right.taskId };
    return either.left as RetryableFailureResponse;
  },
  waitForPickupUpdatedMappingsTask: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.waitForPickupUpdatedMappingsTask({
          client,
          taskId: state.updateTargetMappingsTaskId,
          timeout: '60s',
        })
      )
    );
    if (E.isRight(either)) return { type: 'completed' };
    const left = either.left;
    if ((left as RetryableFailureResponse).type === 'retryable_failure')
      return left as RetryableFailureResponse;
    if (left.type === 'wait_for_task_completion_timeout') {
      return { type: 'wait_for_task_completion_timeout', message: left.message };
    }
    if (left.type === 'task_completed_with_retriable_error') {
      return { type: 'task_completed_with_retriable_error', message: left.message };
    }
    return { type: 'retryable_failure', message: String(left) };
  },
  updateMappingsMeta: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.updateMappings({
          client,
          index: state.targetIndex,
          mappings: omit(state.targetIndexMappings, ['properties']),
        })
      )
    );
    if (E.isRight(either)) return { type: 'success' };
    return either.left as RetryableFailureResponse;
  },
  noop: async () => ({ type: 'noop' }),
  openPit: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(Actions.openPit({ client, index: state.targetIndex }))
    );
    if (E.isRight(either)) return { type: 'opened', pitId: either.right.pitId };
    return either.left as RetryableFailureResponse;
  },
  readWithPit: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.readWithPit({
          client,
          pitId: state.pitId,
          query: state.outdatedDocumentsQuery,
          batchSize: state.batchSize,
          searchAfter: state.lastHitSortValue,
          maxResponseSizeBytes: state.maxReadBatchSizeBytes,
          seqNoPrimaryTerm: true,
        })
      )
    );
    if (E.isRight(either)) {
      const right = either.right;
      if (right.outdatedDocuments.length > 0) {
        return {
          type: 'hits',
          pitId: right.pitId,
          outdatedDocuments: right.outdatedDocuments,
          lastHitSortValue: right.lastHitSortValue,
          totalHits: right.totalHits ?? 0,
        };
      }
      return { type: 'no_outdated_docs', pitId: right.pitId };
    }
    const left = either.left;
    if ((left as RetryableFailureResponse).type === 'retryable_failure')
      return left as RetryableFailureResponse;
    if (left.type === 'es_response_too_large') {
      return { type: 'es_response_too_large', contentLength: left.contentLength };
    }
    return { type: 'retryable_failure', message: String(left) };
  },
  closePit: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(Actions.closePit({ client, pitId: state.pitId }))
    );
    if (E.isRight(either)) return { type: 'closed' };
    return either.left as RetryableFailureResponse;
  },
  transformDocs: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.transformDocs({ transformRawDocs, outdatedDocuments: state.outdatedDocuments })
      )
    );
    if (E.isRight(either))
      return { type: 'transformed', processedDocs: either.right.processedDocs };
    const left = either.left;
    if ((left as RetryableFailureResponse).type === 'retryable_failure')
      return left as RetryableFailureResponse;
    if (left.type === 'documents_transform_failed') {
      return {
        type: 'documents_transform_failed',
        processedDocs: left.processedDocs,
        corruptDocumentIds: left.corruptDocumentIds,
        transformErrors: left.transformErrors,
      };
    }
    return { type: 'retryable_failure', message: String(left) };
  },
  bulkIndex: async (state) => {
    const either = mapRetryableFailure(
      await runTaskEither(
        Actions.bulkOverwriteTransformedDocuments({
          client,
          index: state.targetIndex,
          operations: state.bulkOperationBatches[state.currentBatch],
          refresh: false,
        })
      )
    );
    if (E.isRight(either)) return { type: 'indexed' };
    const left = either.left;
    if ((left as RetryableFailureResponse).type === 'retryable_failure')
      return left as RetryableFailureResponse;
    if (left.type === 'request_entity_too_large_exception')
      return { type: 'request_entity_too_large_exception' };
    if (left.type === 'unavailable_shards_exception') {
      return { type: 'unavailable_shards_exception', message: left.message };
    }
    return { type: 'retryable_failure', message: String(left) };
  },
});
