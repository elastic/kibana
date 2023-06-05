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
  CleanupUnknownAndExcludedDocsRefreshState,
  SetDocMigrationStartedState,
  SetDocMigrationStartedWaitForInstancesState,
  OutdatedDocumentsSearchRefreshState,
  UpdateDocumentModelVersionsState,
  UpdateDocumentModelVersionsWaitForInstancesState,
} from './state';
import type { MigratorContext } from './context';
import * as Actions from './actions';
import { createDelayFn } from '../common/utils';
import {
  setMetaMappingMigrationComplete,
  setMetaDocMigrationComplete,
  setMetaDocMigrationStarted,
} from './utils';

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
        batchSize: context.batchSize,
      }),
    UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: (state: UpdateIndexMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: state.updateTargetMappingsTaskId,
        timeout: '60s',
      }),
    UPDATE_MAPPING_MODEL_VERSIONS: (state: UpdateMappingModelVersionState) =>
      Actions.updateIndexMeta({
        client,
        index: state.currentIndex,
        meta: setMetaMappingMigrationComplete({
          meta: state.currentIndexMeta,
          versions: context.typeVirtualVersions,
        }),
      }),
    UPDATE_ALIASES: (state: UpdateAliasesState) =>
      Actions.updateAliases({
        client,
        aliasActions: state.aliasActions,
      }),
    INDEX_STATE_UPDATE_DONE: (state: IndexStateUpdateDoneState) => () => Actions.noop(),
    DOCUMENTS_UPDATE_INIT: (state: DocumentsUpdateInitState) => () => Actions.noop(),
    SET_DOC_MIGRATION_STARTED: (state: SetDocMigrationStartedState) =>
      Actions.updateIndexMeta({
        client,
        index: state.currentIndex,
        meta: setMetaDocMigrationStarted({
          meta: state.currentIndexMeta,
        }),
      }),
    SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES: (
      state: SetDocMigrationStartedWaitForInstancesState
    ) =>
      Actions.waitForDelay({
        delayInSec: context.migrationConfig.zdt.metaPickupSyncDelaySec,
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS: (state: CleanupUnknownAndExcludedDocsState) =>
      Actions.cleanupUnknownAndExcluded({
        client,
        indexName: state.currentIndex,
        discardUnknownDocs: true,
        excludeOnUpgradeQuery: state.excludeOnUpgradeQuery,
        excludeFromUpgradeFilterHooks: state.excludeFromUpgradeFilterHooks,
        knownTypes: context.types,
        removedTypes: context.deletedTypes,
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK: (
      state: CleanupUnknownAndExcludedDocsWaitForTaskState
    ) =>
      Actions.waitForDeleteByQueryTask({
        client,
        taskId: state.deleteTaskId,
        timeout: '120s',
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH: (state: CleanupUnknownAndExcludedDocsRefreshState) =>
      Actions.refreshIndex({
        client,
        index: state.currentIndex,
      }),
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: (state: OutdatedDocumentsSearchOpenPitState) =>
      Actions.openPit({
        client,
        index: state.currentIndex,
      }),
    OUTDATED_DOCUMENTS_SEARCH_READ: (state: OutdatedDocumentsSearchReadState) =>
      Actions.readWithPit({
        client,
        pitId: state.pitId,
        searchAfter: state.lastHitSortValue,
        batchSize: context.migrationConfig.batchSize,
        query: state.outdatedDocumentsQuery,
      }),
    OUTDATED_DOCUMENTS_SEARCH_TRANSFORM: (state: OutdatedDocumentsSearchTransformState) =>
      Actions.transformDocs({
        outdatedDocuments: state.outdatedDocuments,
        transformRawDocs: state.transformRawDocs,
      }),
    OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX: (state: OutdatedDocumentsSearchBulkIndexState) =>
      Actions.bulkOverwriteTransformedDocuments({
        client,
        index: state.currentIndex,
        operations: state.bulkOperationBatches[state.currentBatch],
        refresh: false,
      }),
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (state: OutdatedDocumentsSearchClosePitState) =>
      Actions.closePit({
        client,
        pitId: state.pitId,
      }),
    OUTDATED_DOCUMENTS_SEARCH_REFRESH: (state: OutdatedDocumentsSearchRefreshState) =>
      Actions.refreshIndex({
        client,
        index: state.currentIndex,
      }),
    UPDATE_DOCUMENT_MODEL_VERSIONS: (state: UpdateDocumentModelVersionsState) =>
      Actions.updateIndexMeta({
        client,
        index: state.currentIndex,
        meta: setMetaDocMigrationComplete({
          meta: state.currentIndexMeta,
          versions: context.typeVirtualVersions,
        }),
      }),
    UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES: (
      state: UpdateDocumentModelVersionsWaitForInstancesState
    ) =>
      Actions.waitForDelay({
        delayInSec: context.migrationConfig.zdt.metaPickupSyncDelaySec,
      }),
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
