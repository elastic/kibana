/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  SavedObjectsRawDoc,
  SavedObjectsMappingProperties,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
} from '@kbn/core-saved-objects-server';
import type { IndexMapping, IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import type { MigrationLog, Progress, TransformRawDocs } from '../../types';
import type { ControlState } from '../../state_action_machine';
import type { BulkOperationBatch } from '../../model/create_batches';
import type { AliasAction } from '../../actions';
import type { TransformErrorObjects } from '../../core';

export interface BaseState extends ControlState {
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly logs: MigrationLog[];
  /**
   * When true, will fully skip document migration, and will transition directly to DONE
   * after the INDEX_STATE_UPDATE_DONE stage.
   *
   * This flag is set to `true` in the following scenarios:
   * - on nodes without the `migrator` role, the flag will always be `true`.
   * - if the migrator create the index, the workflow will set the flag to `true` given there is nothing to migrate.
   */
  readonly skipDocumentMigration: boolean;
}

/** Initial state before any action is performed */
export interface InitState extends BaseState {
  readonly controlState: 'INIT';
}

/**
 * Common state properties available after the `INIT` stage
 */
export interface PostInitState extends BaseState {
  /**
   * The index we're currently migrating.
   */
  readonly currentIndex: string;
  /**
   * The aliases that are already present for the current index.
   */
  readonly aliases: string[];
  /**
   * The alias actions to perform to update the aliases.
   */
  readonly aliasActions: AliasAction[];
  /**
   * The *previous* mappings (and _meta), as they were when we resolved the index
   * information. This shouldn't be updated once populated.
   */
  readonly previousMappings: IndexMapping;
  /**
   * The *current* _meta field of the index.
   * All operations updating this field will update in the state accordingly.
   */
  readonly currentIndexMeta: IndexMappingMeta;
  /**
   * The previous algorithm that was last used to migrate this index.
   * Used for v2->zdt state conversion.
   */
  readonly previousAlgorithm: 'zdt' | 'v2';
}

/**
 * Common state properties available after the `DOCUMENTS_UPDATE_INIT` stage
 */
export interface PostDocInitState extends PostInitState {
  readonly excludeOnUpgradeQuery: QueryDslQueryContainer;
  readonly excludeFromUpgradeFilterHooks: Record<
    string,
    SavedObjectTypeExcludeFromUpgradeFilterHook
  >;
  readonly outdatedDocumentsQuery: QueryDslQueryContainer;
  readonly transformRawDocs: TransformRawDocs;
}

export interface OutdatedDocumentsSearchState extends PostDocInitState {
  readonly pitId: string;
  readonly lastHitSortValue: number[] | undefined;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: TransformErrorObjects[];
  readonly progress: Progress;
  readonly hasTransformedDocs: boolean;
}

export interface CreateTargetIndexState extends BaseState {
  readonly controlState: 'CREATE_TARGET_INDEX';
  readonly currentIndex: string;
  readonly indexMappings: IndexMapping;
  readonly creationAliases: string[];
}

export interface UpdateIndexMappingsState extends PostInitState {
  readonly controlState: 'UPDATE_INDEX_MAPPINGS';
  readonly additiveMappingChanges: SavedObjectsMappingProperties;
}

export interface UpdateIndexMappingsWaitForTaskState extends PostInitState {
  readonly controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK';
  readonly updateTargetMappingsTaskId: string;
}

export interface UpdateMappingModelVersionState extends PostInitState {
  readonly controlState: 'UPDATE_MAPPING_MODEL_VERSIONS';
}

export interface UpdateAliasesState extends PostInitState {
  readonly controlState: 'UPDATE_ALIASES';
}

export interface IndexStateUpdateDoneState extends PostInitState {
  readonly controlState: 'INDEX_STATE_UPDATE_DONE';
}

export interface DocumentsUpdateInitState extends PostInitState {
  readonly controlState: 'DOCUMENTS_UPDATE_INIT';
}

export interface SetDocMigrationStartedState extends PostDocInitState {
  readonly controlState: 'SET_DOC_MIGRATION_STARTED';
}

export interface SetDocMigrationStartedWaitForInstancesState extends PostDocInitState {
  readonly controlState: 'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES';
}

export interface CleanupUnknownAndExcludedDocsState extends PostDocInitState {
  readonly controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS';
  readonly hasDeletedDocs?: boolean;
}

export interface CleanupUnknownAndExcludedDocsWaitForTaskState extends PostDocInitState {
  readonly controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK';
  readonly deleteTaskId: string;
  readonly hasDeletedDocs?: boolean;
}

export interface CleanupUnknownAndExcludedDocsRefreshState extends PostDocInitState {
  readonly controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH';
}

export interface OutdatedDocumentsSearchOpenPitState extends PostDocInitState {
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT';
}

export interface OutdatedDocumentsSearchReadState extends OutdatedDocumentsSearchState {
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ';
}

export interface OutdatedDocumentsSearchTransformState extends OutdatedDocumentsSearchState {
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM';
  readonly outdatedDocuments: SavedObjectsRawDoc[];
}

export interface OutdatedDocumentsSearchBulkIndexState extends OutdatedDocumentsSearchState {
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX';
  readonly bulkOperationBatches: BulkOperationBatch[];
  readonly currentBatch: number;
}

export interface OutdatedDocumentsSearchClosePitState extends OutdatedDocumentsSearchState {
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT';
}

export interface OutdatedDocumentsSearchRefreshState extends OutdatedDocumentsSearchState {
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_REFRESH';
}

export interface UpdateDocumentModelVersionsState extends PostDocInitState {
  readonly controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS';
}

export interface UpdateDocumentModelVersionsWaitForInstancesState extends PostInitState {
  readonly controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES';
}

/** Migration completed successfully */
export interface DoneState extends BaseState {
  readonly controlState: 'DONE';
}

/** Migration terminated with a failure */
export interface FatalState extends BaseState {
  readonly controlState: 'FATAL';
  /** The reason the migration was terminated */
  readonly reason: string;
}

export type State =
  | InitState
  | DoneState
  | FatalState
  | CreateTargetIndexState
  | UpdateIndexMappingsState
  | UpdateIndexMappingsWaitForTaskState
  | UpdateMappingModelVersionState
  | UpdateAliasesState
  | IndexStateUpdateDoneState
  | DocumentsUpdateInitState
  | SetDocMigrationStartedState
  | SetDocMigrationStartedWaitForInstancesState
  | CleanupUnknownAndExcludedDocsState
  | CleanupUnknownAndExcludedDocsWaitForTaskState
  | CleanupUnknownAndExcludedDocsRefreshState
  | OutdatedDocumentsSearchOpenPitState
  | OutdatedDocumentsSearchReadState
  | OutdatedDocumentsSearchTransformState
  | OutdatedDocumentsSearchBulkIndexState
  | OutdatedDocumentsSearchClosePitState
  | UpdateDocumentModelVersionsState
  | UpdateDocumentModelVersionsWaitForInstancesState
  | OutdatedDocumentsSearchRefreshState;

export type AllControlStates = State['controlState'];

export type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;

/**
 * Manually maintained reverse-lookup map used by `StateFromAction`
 */
export interface ControlStateMap {
  INIT: InitState;
  FATAL: FatalState;
  DONE: DoneState;
  CREATE_TARGET_INDEX: CreateTargetIndexState;
  UPDATE_INDEX_MAPPINGS: UpdateIndexMappingsState;
  UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: UpdateIndexMappingsWaitForTaskState;
  UPDATE_MAPPING_MODEL_VERSIONS: UpdateMappingModelVersionState;
  UPDATE_ALIASES: UpdateAliasesState;
  INDEX_STATE_UPDATE_DONE: IndexStateUpdateDoneState;
  DOCUMENTS_UPDATE_INIT: DocumentsUpdateInitState;
  SET_DOC_MIGRATION_STARTED: SetDocMigrationStartedState;
  SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES: SetDocMigrationStartedWaitForInstancesState;
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS: CleanupUnknownAndExcludedDocsState;
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK: CleanupUnknownAndExcludedDocsWaitForTaskState;
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH: CleanupUnknownAndExcludedDocsRefreshState;
  OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: OutdatedDocumentsSearchOpenPitState;
  OUTDATED_DOCUMENTS_SEARCH_READ: OutdatedDocumentsSearchReadState;
  OUTDATED_DOCUMENTS_SEARCH_TRANSFORM: OutdatedDocumentsSearchTransformState;
  OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX: OutdatedDocumentsSearchBulkIndexState;
  OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: OutdatedDocumentsSearchClosePitState;
  OUTDATED_DOCUMENTS_SEARCH_REFRESH: OutdatedDocumentsSearchRefreshState;
  UPDATE_DOCUMENT_MODEL_VERSIONS: UpdateDocumentModelVersionsState;
  UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES: UpdateDocumentModelVersionsWaitForInstancesState;
}

/**
 * Utility type to reverse lookup an `AllControlStates` to it's corresponding State subtype.
 */
export type StateFromControlState<T extends AllControlStates> = ControlStateMap[T];

/**
 * Utility type to reverse lookup an `AllActionStates` to it's corresponding State subtype.
 */
export type StateFromActionState<T extends AllActionStates> = StateFromControlState<T>;
