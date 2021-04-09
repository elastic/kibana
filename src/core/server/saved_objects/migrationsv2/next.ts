/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { UnwrapPromise } from '@kbn/utility-types';
import type {
  AllActionStates,
  ReindexSourceToTempState,
  MarkVersionIndexReady,
  InitState,
  LegacyCreateReindexTargetState,
  LegacyDeleteState,
  LegacyReindexState,
  LegacyReindexWaitForTaskState,
  LegacySetWriteBlockState,
  OutdatedDocumentsSearch,
  OutdatedDocumentsTransform,
  SetSourceWriteBlockState,
  State,
  UpdateTargetMappingsState,
  UpdateTargetMappingsWaitForTaskState,
  CreateReindexTempState,
  ReindexSourceToTempWaitForTaskState,
  MarkVersionIndexReadyConflict,
  CreateNewTargetState,
  CloneTempToSource,
  SetTempWriteBlock,
  WaitForYellowSourceState,
} from './types';
import * as Actions from './actions';
import { ElasticsearchClient } from '../../elasticsearch';
import { SavedObjectsRawDoc } from '../serialization';
import {
  DocumentsTransformFailed,
  DocumentsTransformSuccess,
} from '../migrations/core/migrate_raw_docs';

// How do i handle this type now that transformRawDocs is actually running migrateRawDocsNonThrowing
// migrateRawDocsNonThrowing returns an Either.left with failed docs or an Either.right with successfylly processed/transformed docs
export type TransformRawDocs = (
  processedDocs: SavedObjectsRawDoc[] | { corruptSavedObjectIds: string[]; type: string }
) => Promise<DocumentsTransformSuccess | DocumentsTransformFailed>;

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
      Actions.waitForIndexStatusYellow(client, state.sourceIndex),
    SET_SOURCE_WRITE_BLOCK: (state: SetSourceWriteBlockState) =>
      Actions.setWriteBlock(client, state.sourceIndex.value),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex(client, state.targetIndex, state.targetIndexMappings),
    CREATE_REINDEX_TEMP: (state: CreateReindexTempState) =>
      Actions.createIndex(client, state.tempIndex, state.tempIndexMappings),
    REINDEX_SOURCE_TO_TEMP: (state: ReindexSourceToTempState) =>
      Actions.reindex(
        client,
        state.sourceIndex.value,
        state.tempIndex,
        Option.none,
        false,
        state.unusedTypesQuery
      ),
    SET_TEMP_WRITE_BLOCK: (state: SetTempWriteBlock) =>
      Actions.setWriteBlock(client, state.tempIndex),
    REINDEX_SOURCE_TO_TEMP_WAIT_FOR_TASK: (state: ReindexSourceToTempWaitForTaskState) =>
      Actions.waitForReindexTask(client, state.reindexSourceToTargetTaskId, '60s'),
    CLONE_TEMP_TO_TARGET: (state: CloneTempToSource) =>
      Actions.cloneIndex(client, state.tempIndex, state.targetIndex),
    UPDATE_TARGET_MAPPINGS: (state: UpdateTargetMappingsState) =>
      Actions.updateAndPickupMappings(client, state.targetIndex, state.targetIndexMappings),
    UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK: (state: UpdateTargetMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask(client, state.updateTargetMappingsTaskId, '60s'),
    OUTDATED_DOCUMENTS_SEARCH: (state: OutdatedDocumentsSearch) =>
      Actions.searchForOutdatedDocuments(client, {
        batchSize: state.batchSize,
        targetIndex: state.targetIndex,
        outdatedDocumentsQuery: state.outdatedDocumentsQuery,
      }),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      // this needs to change because we're no longer throwing anything from the transformRawDocs method
      TaskEither.tryCatch(
        () => transformRawDocs(state.outdatedDocuments), // one of { processedDocs } or { type: 'document_transform_failed', corruptSavedObjectIds }
        (e) => {
          // TINA: we throw for realy bad errors
          throw e;
        }
      ),
    TRANSFORMED_DOCUMENTS_BULK_INDEX: (state: any) =>
      // The call to this action was being handled in OUTDATES_DOCUMENTS_TRANSFORM:
      //         TaskEither.chain((docs) =>
      //     Actions.bulkOverwriteTransformedDocuments(client, state.targetIndex, docs)
      //   )
      // ),
      // How to I get access to the processedDocs now?
      Actions.bulkOverwriteTransformedDocuments(client, state.targetIndex, docs.processedDocs),
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
