/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UnwrapPromise } from '@kbn/utility-types';
import type {
  AllActionStates,
  ReindexSourceToTempOpenPit,
  ReindexSourceToTempRead,
  ReindexSourceToTempClosePit,
  ReindexSourceToTempIndex,
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
  TransformRawDocs,
  OutdatedDocumentsSearchOpenPit,
  OutdatedDocumentsSearchRead,
  OutdatedDocumentsSearchClosePit,
  RefreshTarget,
  OutdatedDocumentsRefresh,
} from './types';
import * as Actions from './actions';
import { ElasticsearchClient } from '../../elasticsearch';

type ActionMap = ReturnType<typeof nextActionMap>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = UnwrapPromise<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

export const nextActionMap = (client: ElasticsearchClient, transformRawDocs: TransformRawDocs) => {
  return {
    INIT: (state: InitState) =>
      Actions.fetchIndices(client, [state.currentAlias, state.versionAlias]),
    WAIT_FOR_YELLOW_SOURCE: (state: WaitForYellowSourceState) =>
      Actions.waitForIndexStatusYellow(client, state.sourceIndex.value),
    SET_SOURCE_WRITE_BLOCK: (state: SetSourceWriteBlockState) =>
      Actions.setWriteBlock(client, state.sourceIndex.value),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex(client, state.targetIndex, state.targetIndexMappings),
    CREATE_REINDEX_TEMP: (state: CreateReindexTempState) =>
      Actions.createIndex(client, state.tempIndex, state.tempIndexMappings),
    REINDEX_SOURCE_TO_TEMP_OPEN_PIT: (state: ReindexSourceToTempOpenPit) =>
      Actions.openPit(client, state.sourceIndex.value),
    REINDEX_SOURCE_TO_TEMP_READ: (state: ReindexSourceToTempRead) =>
      Actions.readWithPit(
        client,
        state.sourceIndexPitId,
        /* When reading we use a source query to exclude saved objects types which
         * are no longer used. These saved objects will still be kept in the outdated
         * index for backup purposes, but won't be available in the upgraded index.
         */
        state.unusedTypesQuery,
        state.batchSize,
        state.lastHitSortValue
      ),
    REINDEX_SOURCE_TO_TEMP_CLOSE_PIT: (state: ReindexSourceToTempClosePit) =>
      Actions.closePit(client, state.sourceIndexPitId),
    REINDEX_SOURCE_TO_TEMP_INDEX: (state: ReindexSourceToTempIndex) =>
      Actions.transformDocs(
        client,
        transformRawDocs,
        state.outdatedDocuments,
        state.tempIndex,
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * before we reach out to the OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT step.
         * Right now, it's performed during REFRESH_TARGET step.
         */
        false
      ),
    SET_TEMP_WRITE_BLOCK: (state: SetTempWriteBlock) =>
      Actions.setWriteBlock(client, state.tempIndex),
    CLONE_TEMP_TO_TARGET: (state: CloneTempToSource) =>
      Actions.cloneIndex(client, state.tempIndex, state.targetIndex),
    REFRESH_TARGET: (state: RefreshTarget) => Actions.refreshIndex(client, state.targetIndex),
    UPDATE_TARGET_MAPPINGS: (state: UpdateTargetMappingsState) =>
      Actions.updateAndPickupMappings(client, state.targetIndex, state.targetIndexMappings),
    UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK: (state: UpdateTargetMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask(client, state.updateTargetMappingsTaskId, '60s'),
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: (state: OutdatedDocumentsSearchOpenPit) =>
      Actions.openPit(client, state.targetIndex),
    OUTDATED_DOCUMENTS_SEARCH_READ: (state: OutdatedDocumentsSearchRead) =>
      Actions.readWithPit(
        client,
        state.pitId,
        // search for outdated documents only
        state.outdatedDocumentsQuery,
        state.batchSize,
        state.lastHitSortValue
      ),
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (state: OutdatedDocumentsSearchClosePit) =>
      Actions.closePit(client, state.pitId),
    OUTDATED_DOCUMENTS_REFRESH: (state: OutdatedDocumentsRefresh) =>
      Actions.refreshIndex(client, state.targetIndex),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      Actions.transformDocs(
        client,
        transformRawDocs,
        state.outdatedDocuments,
        state.targetIndex,
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * before we reach out to the MARK_VERSION_INDEX_READY step.
         * Right now, it's performed during OUTDATED_DOCUMENTS_REFRESH step.
         */
        false
      ),
    MARK_VERSION_INDEX_READY: (state: MarkVersionIndexReady) =>
      Actions.updateAliases(client, state.versionIndexReadyActions.value),
    MARK_VERSION_INDEX_READY_CONFLICT: (state: MarkVersionIndexReadyConflict) =>
      Actions.fetchIndices(client, [state.currentAlias, state.versionAlias]),
    LEGACY_SET_WRITE_BLOCK: (state: LegacySetWriteBlockState) =>
      Actions.setWriteBlock(client, state.legacyIndex),
    LEGACY_CREATE_REINDEX_TARGET: (state: LegacyCreateReindexTargetState) =>
      Actions.createIndex(client, state.sourceIndex.value, state.legacyReindexTargetMappings),
    LEGACY_REINDEX: (state: LegacyReindexState) =>
      Actions.reindex(
        client,
        state.legacyIndex,
        state.sourceIndex.value,
        state.preMigrationScript,
        false,
        state.unusedTypesQuery
      ),
    LEGACY_REINDEX_WAIT_FOR_TASK: (state: LegacyReindexWaitForTaskState) =>
      Actions.waitForReindexTask(client, state.legacyReindexTaskId, '60s'),
    LEGACY_DELETE: (state: LegacyDeleteState) =>
      Actions.updateAliases(client, state.legacyPreMigrationDoneActions),
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
