/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import { omit } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  AllActionStates,
  CheckTargetTypesMappingsState,
  CleanupUnknownAndExcluded,
  CleanupUnknownAndExcludedWaitForTaskState,
  CreateNewTargetState,
  InitState,
  MarkVersionIndexReady,
  MarkVersionIndexReadyConflict,
  OutdatedDocumentsRefresh,
  OutdatedDocumentsSearchClosePit,
  OutdatedDocumentsSearchOpenPit,
  OutdatedDocumentsSearchRead,
  OutdatedDocumentsTransform,
  PrepareCompatibleMigration,
  RefreshSource,
  State,
  TransformedDocumentsBulkIndex,
  UpdateSourceMappingsPropertiesState,
  UpdateTargetMappingsMeta,
  UpdateTargetMappingsPropertiesState,
  UpdateTargetMappingsPropertiesWaitForTaskState,
  WaitForMigrationCompletionState,
  WaitForYellowSourceState,
} from './state';
import { createDelayFn } from './common/utils';
import type { TransformRawDocs } from './types';
import * as Actions from './actions';

type ActionMap = ReturnType<typeof nextActionMap>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = Awaited<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

export const nextActionMap = (
  client: ElasticsearchClient,
  transformRawDocs: TransformRawDocs,
  removedTypes: string[]
) => {
  return {
    INIT: (state: InitState) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
    WAIT_FOR_MIGRATION_COMPLETION: (state: WaitForMigrationCompletionState) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
    WAIT_FOR_YELLOW_SOURCE: (state: WaitForYellowSourceState) =>
      Actions.waitForIndexStatus({ client, index: state.sourceIndex.value, status: 'yellow' }),
    UPDATE_SOURCE_MAPPINGS_PROPERTIES: (state: UpdateSourceMappingsPropertiesState) =>
      Actions.updateSourceMappingsProperties({
        client,
        indexTypes: state.indexTypes,
        sourceIndex: state.sourceIndex.value,
        indexMappings: state.sourceIndexMappings.value,
        appMappings: state.targetIndexMappings,
        latestMappingsVersions: state.latestMappingsVersions,
        hashToVersionMap: state.hashToVersionMap,
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED: (state: CleanupUnknownAndExcluded) =>
      Actions.cleanupUnknownAndExcluded({
        client,
        indexName: state.sourceIndex.value,
        discardUnknownDocs: state.discardUnknownObjects,
        excludeOnUpgradeQuery: state.excludeOnUpgradeQuery,
        excludeFromUpgradeFilterHooks: state.excludeFromUpgradeFilterHooks,
        knownTypes: state.knownTypes,
        removedTypes,
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK: (
      state: CleanupUnknownAndExcludedWaitForTaskState
    ) =>
      Actions.waitForDeleteByQueryTask({
        client,
        taskId: state.deleteByQueryTaskId,
        timeout: '120s',
      }),
    PREPARE_COMPATIBLE_MIGRATION: (state: PrepareCompatibleMigration) =>
      Actions.updateAliases({ client, aliasActions: state.preTransformDocsActions }),
    REFRESH_SOURCE: (state: RefreshSource) =>
      Actions.refreshIndex({ client, index: state.sourceIndex.value }),
    CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION: () =>
      Actions.checkClusterRoutingAllocationEnabled(client),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex({
        client,
        indexName: state.targetIndex,
        mappings: state.targetIndexMappings,
        esCapabilities: state.esCapabilities,
      }),
    CHECK_TARGET_MAPPINGS: (state: CheckTargetTypesMappingsState) =>
      Actions.checkTargetTypesMappings({
        indexTypes: state.indexTypes,
        indexMappings: Option.toUndefined(state.sourceIndexMappings),
        appMappings: state.targetIndexMappings,
        latestMappingsVersions: state.latestMappingsVersions,
        hashToVersionMap: state.hashToVersionMap,
      }),
    UPDATE_TARGET_MAPPINGS_PROPERTIES: (state: UpdateTargetMappingsPropertiesState) =>
      Actions.updateAndPickupMappings({
        client,
        index: state.targetIndex,
        mappings: omit(state.targetIndexMappings, ['_meta']), // ._meta property will be updated on a later step
        batchSize: state.batchSize,
        query: Option.toUndefined(state.updatedTypesQuery),
      }),
    UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK: (
      state: UpdateTargetMappingsPropertiesWaitForTaskState
    ) =>
      Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: state.updateTargetMappingsTaskId,
        timeout: '60s',
      }),
    UPDATE_TARGET_MAPPINGS_META: (state: UpdateTargetMappingsMeta) => {
      return Actions.updateMappings({
        client,
        index: state.targetIndex,
        mappings: omit(state.targetIndexMappings, ['properties']), // properties already updated on a previous step
      });
    },
    CHECK_VERSION_INDEX_READY_ACTIONS: () => Actions.noop,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: (state: OutdatedDocumentsSearchOpenPit) =>
      Actions.openPit({ client, index: state.targetIndex }),
    OUTDATED_DOCUMENTS_SEARCH_READ: (state: OutdatedDocumentsSearchRead) =>
      Actions.readWithPit({
        client,
        pitId: state.pitId,
        // search for outdated documents only
        query: state.outdatedDocumentsQuery,
        batchSize: state.batchSize,
        searchAfter: state.lastHitSortValue,
        maxResponseSizeBytes: state.maxReadBatchSizeBytes,
        seqNoPrimaryTerm: true,
      }),
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (state: OutdatedDocumentsSearchClosePit) =>
      Actions.closePit({ client, pitId: state.pitId }),
    OUTDATED_DOCUMENTS_REFRESH: (state: OutdatedDocumentsRefresh) =>
      Actions.refreshIndex({ client, index: state.targetIndex }),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      Actions.transformDocs({ transformRawDocs, outdatedDocuments: state.outdatedDocuments }),
    TRANSFORMED_DOCUMENTS_BULK_INDEX: (state: TransformedDocumentsBulkIndex) =>
      Actions.bulkOverwriteTransformedDocuments({
        client,
        index: state.targetIndex,
        operations: state.bulkOperationBatches[state.currentBatch],
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * Right now, it's performed during OUTDATED_DOCUMENTS_REFRESH step.
         */
        refresh: false,
      }),
    MARK_VERSION_INDEX_READY: (state: MarkVersionIndexReady) =>
      Actions.updateAliases({ client, aliasActions: state.versionIndexReadyActions.value }),
    MARK_VERSION_INDEX_READY_CONFLICT: (state: MarkVersionIndexReadyConflict) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
  };
};

export const next = (
  client: ElasticsearchClient,
  transformRawDocs: TransformRawDocs,
  removedTypes: string[]
) => {
  const map = nextActionMap(client, transformRawDocs, removedTypes);
  return (state: State) => {
    const delay = createDelayFn(state);

    if (state.controlState === 'DONE' || state.controlState === 'FATAL') {
      // Return null if we're in one of the terminating states
      return null;
    } else {
      // Otherwise return the delayed action
      // We use an explicit cast as otherwise TS infers `(state: never) => ...`
      // here because state is inferred to be the intersection of all states
      // instead of the union.
      const nextAction = map[state.controlState] as (
        state: State
      ) => ReturnType<(typeof map)[AllActionStates]>;
      return delay(nextAction(state));
    }
  };
};
