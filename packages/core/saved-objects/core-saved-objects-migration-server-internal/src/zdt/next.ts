/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AllActionStates,
  State,
  InitState,
  CreateTargetIndexState,
  UpdateIndexMappingsState,
  UpdateIndexMappingsWaitForTaskState,
  UpdateMappingModelVersionState,
  UpdateAliasesState,
  CleanupUnknownAndExcludedDocsState,
  CleanupUnknownAndExcludedDocsWaitForTaskState,
  DocumentsUpdateInitState,
  IndexStateUpdateDoneState,
  OutdatedDocumentsSearchBulkIndexState,
  OutdatedDocumentsSearchClosePitState,
  OutdatedDocumentsSearchOpenPitState,
  OutdatedDocumentsSearchReadState,
  OutdatedDocumentsSearchTransformState,
  RefreshIndexAfterCleanupState,
  SetDocMigrationStartedState,
  SetDocMigrationStartedWaitForInstancesState,
  UpdateDocumentModelVersionsState,
  UpdateDocumentModelVersionsWaitForInstancesState,
} from './state';
import type { MigratorContext } from './context';
import * as Actions from './actions';
import { createDelayFn } from '../common/utils';

export type ActionMap = ReturnType<typeof nextActionMap>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = Awaited<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

/** @deprecated */
const NOT_IMPLEMENTED_YET = () => Promise.resolve({} as any);

export const nextActionMap = (context: MigratorContext) => {
  const client = context.elasticsearchClient;
  return {
    INIT: (state: InitState) =>
      Actions.init({
        client,
        indices: [`${context.indexPrefix}_*`],
      }),
    CREATE_TARGET_INDEX: (state: CreateTargetIndexState) =>
      Actions.createIndex({
        client,
        indexName: state.currentIndex,
        mappings: state.indexMappings,
      }),
    UPDATE_INDEX_MAPPINGS: (state: UpdateIndexMappingsState) =>
      Actions.updateAndPickupMappings({
        client,
        index: state.currentIndex,
        mappings: { properties: state.additiveMappingChanges },
      }),
    UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: (state: UpdateIndexMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: state.updateTargetMappingsTaskId,
        timeout: '60s',
      }),
    UPDATE_MAPPING_MODEL_VERSIONS: (state: UpdateMappingModelVersionState) =>
      Actions.updateMappings({
        client,
        index: state.currentIndex,
        mappings: {
          properties: {},
          _meta: state.currentIndexMeta,
        },
      }),
    UPDATE_ALIASES: (state: UpdateAliasesState) =>
      Actions.updateAliases({
        client,
        aliasActions: state.aliasActions,
      }),
    INDEX_STATE_UPDATE_DONE: (state: IndexStateUpdateDoneState) => NOT_IMPLEMENTED_YET,
    DOCUMENTS_UPDATE_INIT: (state: DocumentsUpdateInitState) => NOT_IMPLEMENTED_YET,
    SET_DOC_MIGRATION_STARTED: (state: SetDocMigrationStartedState) => NOT_IMPLEMENTED_YET,
    SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES: (
      state: SetDocMigrationStartedWaitForInstancesState
    ) => NOT_IMPLEMENTED_YET,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS: (state: CleanupUnknownAndExcludedDocsState) =>
      NOT_IMPLEMENTED_YET,
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK: (
      state: CleanupUnknownAndExcludedDocsWaitForTaskState
    ) => NOT_IMPLEMENTED_YET,
    REFRESH_INDEX_AFTER_CLEANUP: (state: RefreshIndexAfterCleanupState) => NOT_IMPLEMENTED_YET,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: (state: OutdatedDocumentsSearchOpenPitState) =>
      NOT_IMPLEMENTED_YET,
    OUTDATED_DOCUMENTS_SEARCH_READ: (state: OutdatedDocumentsSearchReadState) =>
      NOT_IMPLEMENTED_YET,
    OUTDATED_DOCUMENTS_SEARCH_TRANSFORM: (state: OutdatedDocumentsSearchTransformState) =>
      NOT_IMPLEMENTED_YET,
    OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX: (state: OutdatedDocumentsSearchBulkIndexState) =>
      NOT_IMPLEMENTED_YET,
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (state: OutdatedDocumentsSearchClosePitState) =>
      NOT_IMPLEMENTED_YET,
    UPDATE_DOCUMENT_MODEL_VERSIONS: (state: UpdateDocumentModelVersionsState) =>
      NOT_IMPLEMENTED_YET,
    UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES: (
      state: UpdateDocumentModelVersionsWaitForInstancesState
    ) => NOT_IMPLEMENTED_YET,
  };
};

export const next = (context: MigratorContext) => {
  const map = nextActionMap(context);

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
      ) => ReturnType<typeof map[AllActionStates]>;
      return delay(nextAction(state));
    }
  };
};
