/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AllActionStates,
  ReindexSourceToTempOpenPit,
  ReindexSourceToTempRead,
  ReindexSourceToTempClosePit,
  ReindexSourceToTempTransform,
  MarkVersionIndexReady,
  InitState,
  LegacyCreateReindexTargetState,
  LegacyDeleteState,
  LegacyReindexState,
  LegacyReindexWaitForTaskState,
  LegacySetWriteBlockState,
  OutdatedDocumentsTransform,
  SetSourceWriteBlockState,
  State,
  UpdateTargetMappingsState,
  UpdateTargetMappingsWaitForTaskState,
  CreateReindexTempState,
  MarkVersionIndexReadyConflict,
  CreateNewTargetState,
  CloneTempToSource,
  SetTempWriteBlock,
  WaitForYellowSourceState,
  TransformedDocumentsBulkIndex,
  ReindexSourceToTempIndexBulk,
  OutdatedDocumentsSearchOpenPit,
  OutdatedDocumentsSearchRead,
  OutdatedDocumentsSearchClosePit,
  RefreshTarget,
  OutdatedDocumentsRefresh,
  CheckUnknownDocumentsState,
  CalculateExcludeFiltersState,
} from './state';
import { TransformRawDocs } from './types';
import * as Actions from './actions';
import { ElasticsearchClient } from '../../elasticsearch';

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

export const nextActionMap = (client: ElasticsearchClient, transformRawDocs: TransformRawDocs) => {
  return {
    INIT: (state: InitState) =>
      Actions.initAction({ client, indices: [state.currentAlias, state.versionAlias] }),
    WAIT_FOR_YELLOW_SOURCE: (state: WaitForYellowSourceState) =>
      Actions.waitForIndexStatusYellow({ client, index: state.sourceIndex.value }),
    CHECK_UNKNOWN_DOCUMENTS: (state: CheckUnknownDocumentsState) =>
      Actions.checkForUnknownDocs({
        client,
        indexName: state.sourceIndex.value,
        unusedTypesQuery: state.unusedTypesQuery,
        knownTypes: state.knownTypes,
      }),
    SET_SOURCE_WRITE_BLOCK: (state: SetSourceWriteBlockState) =>
      Actions.setWriteBlock({ client, index: state.sourceIndex.value }),
    CALCULATE_EXCLUDE_FILTERS: (state: CalculateExcludeFiltersState) =>
      Actions.calculateExcludeFilters({
        client,
        excludeFromUpgradeFilterHooks: state.excludeFromUpgradeFilterHooks,
      }),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex({
        client,
        indexName: state.targetIndex,
        mappings: state.targetIndexMappings,
      }),
    CREATE_REINDEX_TEMP: (state: CreateReindexTempState) =>
      Actions.createIndex({
        client,
        indexName: state.tempIndex,
        mappings: state.tempIndexMappings,
      }),
    REINDEX_SOURCE_TO_TEMP_OPEN_PIT: (state: ReindexSourceToTempOpenPit) =>
      Actions.openPit({ client, index: state.sourceIndex.value }),
    REINDEX_SOURCE_TO_TEMP_READ: (state: ReindexSourceToTempRead) =>
      Actions.readWithPit({
        client,
        pitId: state.sourceIndexPitId,
        /* When reading we use a source query to exclude saved objects types which
         * are no longer used. These saved objects will still be kept in the outdated
         * index for backup purposes, but won't be available in the upgraded index.
         */
        query: state.unusedTypesQuery,
        batchSize: state.batchSize,
        searchAfter: state.lastHitSortValue,
      }),
    REINDEX_SOURCE_TO_TEMP_CLOSE_PIT: (state: ReindexSourceToTempClosePit) =>
      Actions.closePit({ client, pitId: state.sourceIndexPitId }),
    REINDEX_SOURCE_TO_TEMP_TRANSFORM: (state: ReindexSourceToTempTransform) =>
      Actions.transformDocs({ transformRawDocs, outdatedDocuments: state.outdatedDocuments }),
    REINDEX_SOURCE_TO_TEMP_INDEX_BULK: (state: ReindexSourceToTempIndexBulk) =>
      Actions.bulkOverwriteTransformedDocuments({
        client,
        index: state.tempIndex,
        transformedDocs: state.transformedDocBatches[state.currentBatch],
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * before we reach out to the OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT step.
         * Right now, it's performed during REFRESH_TARGET step.
         */
        refresh: false,
      }),
    SET_TEMP_WRITE_BLOCK: (state: SetTempWriteBlock) =>
      Actions.setWriteBlock({ client, index: state.tempIndex }),
    CLONE_TEMP_TO_TARGET: (state: CloneTempToSource) =>
      Actions.cloneIndex({ client, source: state.tempIndex, target: state.targetIndex }),
    REFRESH_TARGET: (state: RefreshTarget) =>
      Actions.refreshIndex({ client, targetIndex: state.targetIndex }),
    UPDATE_TARGET_MAPPINGS: (state: UpdateTargetMappingsState) =>
      Actions.updateAndPickupMappings({
        client,
        index: state.targetIndex,
        mappings: state.targetIndexMappings,
      }),
    UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK: (state: UpdateTargetMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: state.updateTargetMappingsTaskId,
        timeout: '60s',
      }),
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
      }),
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (state: OutdatedDocumentsSearchClosePit) =>
      Actions.closePit({ client, pitId: state.pitId }),
    OUTDATED_DOCUMENTS_REFRESH: (state: OutdatedDocumentsRefresh) =>
      Actions.refreshIndex({ client, targetIndex: state.targetIndex }),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      Actions.transformDocs({ transformRawDocs, outdatedDocuments: state.outdatedDocuments }),
    TRANSFORMED_DOCUMENTS_BULK_INDEX: (state: TransformedDocumentsBulkIndex) =>
      Actions.bulkOverwriteTransformedDocuments({
        client,
        index: state.targetIndex,
        transformedDocs: state.transformedDocBatches[state.currentBatch],
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * before we reach out to the MARK_VERSION_INDEX_READY step.
         * Right now, it's performed during OUTDATED_DOCUMENTS_REFRESH step.
         */
      }),
    MARK_VERSION_INDEX_READY: (state: MarkVersionIndexReady) =>
      Actions.updateAliases({ client, aliasActions: state.versionIndexReadyActions.value }),
    MARK_VERSION_INDEX_READY_CONFLICT: (state: MarkVersionIndexReadyConflict) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
    LEGACY_SET_WRITE_BLOCK: (state: LegacySetWriteBlockState) =>
      Actions.setWriteBlock({ client, index: state.legacyIndex }),
    LEGACY_CREATE_REINDEX_TARGET: (state: LegacyCreateReindexTargetState) =>
      Actions.createIndex({
        client,
        indexName: state.sourceIndex.value,
        mappings: state.legacyReindexTargetMappings,
      }),
    LEGACY_REINDEX: (state: LegacyReindexState) =>
      Actions.reindex({
        client,
        sourceIndex: state.legacyIndex,
        targetIndex: state.sourceIndex.value,
        reindexScript: state.preMigrationScript,
        requireAlias: false,
        unusedTypesQuery: state.unusedTypesQuery,
      }),
    LEGACY_REINDEX_WAIT_FOR_TASK: (state: LegacyReindexWaitForTaskState) =>
      Actions.waitForReindexTask({ client, taskId: state.legacyReindexTaskId, timeout: '60s' }),
    LEGACY_DELETE: (state: LegacyDeleteState) =>
      Actions.updateAliases({ client, aliasActions: state.legacyPreMigrationDoneActions }),
  };
};

export const next = (client: ElasticsearchClient, transformRawDocs: TransformRawDocs) => {
  const map = nextActionMap(client, transformRawDocs);
  return (state: State) => {
    const delay = <F extends (...args: any) => any>(fn: F): (() => ReturnType<F>) => {
      return () => {
        return state.retryDelay > 0
          ? new Promise((resolve) => setTimeout(resolve, state.retryDelay)).then(fn)
          : fn();
      };
    };

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
      ) => ReturnType<typeof map[AllActionStates]>;
      return delay(nextAction(state));
    }
  };
};
