/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import { UnwrapPromise } from '@kbn/utility-types';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  AllActionStates,
  CloneSourceToTargetState,
  CreateNewTargetState,
  InitState,
  LegacyCreateReindexTargetState,
  LegacyDeleteState,
  LegacyReindexState,
  LegacyReindexWaitForTaskState,
  LegacySetWriteBlockState,
  MarkVersionIndexReady,
  OutdatedDocumentsSearch,
  OutdatedDocumentsTransform,
  SetSourceWriteBlockState,
  State,
  UpdateTargetMappingsState,
  UpdateTargetMappingsWaitForTaskState,
} from './types';
import * as Actions from './actions';
import { ElasticsearchClient } from '../../elasticsearch';
import { SavedObjectsRawDoc } from '..';

export type TransformRawDocs = (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>;
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
    SET_SOURCE_WRITE_BLOCK: (state: SetSourceWriteBlockState) =>
      Actions.setWriteBlock(client, state.sourceIndex.value),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex(client, state.targetIndex, state.targetMappings),
    CLONE_SOURCE_TO_TARGET: (state: CloneSourceToTargetState) =>
      Actions.cloneIndex(client, state.sourceIndex.value, state.targetIndex),
    UPDATE_TARGET_MAPPINGS: (state: UpdateTargetMappingsState) =>
      Actions.updateAndPickupMappings(client, state.targetIndex, state.targetMappings),
    UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK: (state: UpdateTargetMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask(client, state.updateTargetMappingsTaskId, '60s'),
    OUTDATED_DOCUMENTS_SEARCH: (state: OutdatedDocumentsSearch) =>
      Actions.searchForOutdatedDocuments(client, state.targetIndex, state.outdatedDocumentsQuery),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      pipe(
        TaskEither.tryCatch(
          () => transformRawDocs(state.outdatedDocuments),
          (e) => {
            throw e;
          }
        ),
        TaskEither.chain((docs) =>
          Actions.bulkOverwriteTransformedDocuments(client, state.targetIndex, docs)
        )
      ),
    MARK_VERSION_INDEX_READY: (state: MarkVersionIndexReady) =>
      Actions.updateAliases(client, state.versionIndexReadyActions.value),
    LEGACY_SET_WRITE_BLOCK: (state: LegacySetWriteBlockState) =>
      Actions.setWriteBlock(client, state.legacyIndex),
    LEGACY_CREATE_REINDEX_TARGET: (state: LegacyCreateReindexTargetState) =>
      Actions.createIndex(client, state.sourceIndex.value, state.legacyReindexTargetMappings),
    LEGACY_REINDEX: (state: LegacyReindexState) =>
      Actions.reindex(client, state.legacyIndex, state.sourceIndex.value, state.preMigrationScript),
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
