/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/lib/Option';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DocLinks } from '@kbn/doc-links';
import type {
  SavedObjectsRawDoc,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
} from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  IndexTypesMap,
  VirtualVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { ControlState } from './state_action_machine';
import type { AliasAction } from './actions';
import type { TransformErrorObjects } from './core';
import type { MigrationLog, Progress } from './types';
import type { BulkOperation } from './model/create_batches';
import type { Aliases } from './model/helpers';

export interface BaseState extends ControlState {
  /** The first part of the index name such as `.kibana` or `.kibana_task_manager` */
  readonly indexPrefix: string;
  /**
   * The name of the concrete legacy index (if it exists) e.g. `.kibana` for <
   * 6.5 or `.kibana_task_manager` for < 7.4
   */
  readonly legacyIndex: string;
  /** Kibana version number */
  readonly kibanaVersion: string;
  /** The mappings to apply to the target index */
  readonly targetIndexMappings: IndexMapping;
  /**
   * Special mappings set when creating the temp index into which we reindex.
   * These mappings have `dynamic: false` to allow for any kind of outdated
   * document to be written to the index, but still define mappings for the
   * `migrationVersion` and `type` fields so that we can search for and
   * transform outdated documents.
   */
  readonly tempIndexMappings: IndexMapping;
  /** Script to apply to a legacy index before it can be used as a migration source */
  readonly preMigrationScript: Option.Option<string>;
  readonly outdatedDocumentsQuery: QueryDslQueryContainer;
  readonly retryCount: number;
  readonly retryDelay: number;
  /**
   * How many times to retry a step that fails with retryable_es_client_error
   * such as a statusCode: 503 or a snapshot_in_progress_exception.
   *
   * We don't want to immediately crash Kibana and cause a reboot for these
   * intermittent. However, if we're still receiving e.g. a 503 after 10 minutes
   * this is probably not just a temporary problem so we stop trying and exit
   * with a fatal error.
   *
   * Because of the exponential backoff the total time we will retry such errors
   * is:
   * max_retry_time = 2+4+8+16+32+64*(RETRY_ATTEMPTS-5) + ACTION_DURATION*RETRY_ATTEMPTS
   *
   * For RETRY_ATTEMPTS=15 (default), ACTION_DURATION=0
   * max_retry_time = 11.7 minutes
   */
  readonly retryAttempts: number;
  /**
   * The number of documents to process in each batch. This determines the
   * maximum number of documents that will be read and written in a single
   * request.
   *
   * The higher the value, the faster the migration process will be performed
   * since it reduces the number of round trips between Kibana and
   * Elasticsearch servers. For the migration speed, we have to pay the price
   * of increased memory consumption and HTTP payload size.
   *
   * Since we cannot control the size in bytes of a batch when reading,
   * Elasticsearch might fail with a circuit_breaking_exception when it
   * retrieves a set of saved objects of significant size. In this case, you
   * should set a smaller batchSize value and restart the migration process
   * again.
   *
   * When writing batches, we limit the number of documents in a batch
   * (batchSize) as well as the size of the batch in bytes (maxBatchSizeBytes).
   */
  readonly maxBatchSize: number;
  /**
   * The number of documents to process in each batch. Under most circumstances
   * batchSize == maxBatchSize. But if we fail to read a batch because of a
   * Nodejs `RangeError` we'll temporarily half `batchSize` and retry.
   */
  readonly batchSize: number;
  /**
   * When writing batches, limits the batch size in bytes to ensure that we
   * don't construct HTTP requests which would exceed Elasticsearch's
   * http.max_content_length which defaults to 100mb.
   */
  readonly maxBatchSizeBytes: number;
  /**
   * If a read batch exceeds this limit we half the batchSize and retry. By
   * not JSON.parsing and transforming large batches we can avoid RangeErrors
   * or Kibana OOMing.
   */
  readonly maxReadBatchSizeBytes: number;
  readonly logs: MigrationLog[];
  /**
   * If saved objects exist which have an unknown type they will cause
   * the migration to fail. If this flag is set to `true`, kibana will
   * discard the unknown objects and proceed with the migration.
   * This can happen, for instance, if a plugin that had registered some
   * saved objects is disabled.
   */
  readonly discardUnknownObjects: boolean;
  /**
   * If saved objects exist which are corrupt or they can't be migrated due to
   * transform errors, they will cause the migration to fail. If this flag is set
   * to `true`, kibana will discard the objects that cause these errors
   * and proceed with the migration.
   */
  readonly discardCorruptObjects: boolean;
  /**
   * The current alias e.g. `.kibana` which always points to the latest
   * version index
   */
  readonly currentAlias: string;
  /**
   * The version alias e.g. `.kibana_7.11.0` which points to the index used
   * by this version of Kibana e.g. `.kibana_7.11.0_001`
   */
  readonly versionAlias: string;
  /**
   * The index used by this version of Kibana e.g. `.kibana_7.11.0_001`
   */
  readonly versionIndex: string;
  /**
   * A temporary index used as part of an "reindex block" that
   * prevents lost deletes e.g. `.kibana_7.11.0_reindex`.
   */
  readonly tempIndex: string;
  /**
   * An alias to the tempIndex used to prevent ES from auto-creating the temp
   * index if one node deletes it while another writes to it
   * e.g. `.kibana_7.11.0_reindex_temp_alias`.
   */
  readonly tempIndexAlias: string;
  /**
   * When upgrading to a more recent kibana version, some saved object types
   * might be conflicting or no longer used.
   * When reindexing, we use a source query to exclude types which are:
   * - no longer used
   * - unknown (e.g. belonging to plugins that have been disabled)
   * - explicitly excluded from upgrades by plugin developers
   * These saved objects will still be kept in the outdated
   * index for backup purposes, but won't be available in the upgraded index.
   */
  readonly excludeOnUpgradeQuery: QueryDslQueryContainer;
  /**
   * The list of known SO types that are registered.
   */
  readonly knownTypes: string[];
  /**
   * Contains a list of the SO types that are currently assigned to this migrator's index
   */
  readonly indexTypes: string[];
  /**
   * Contains information about the most recent model version where each type has been modified
   */
  readonly latestMappingsVersions: VirtualVersionMap;
  /**
   * Contains a map holding information about [md5 => modelVersion] equivalence
   */
  readonly hashToVersionMap: Record<string, string>;
  /**
   * All exclude filter hooks registered for types on this index. Keyed by type name.
   */
  readonly excludeFromUpgradeFilterHooks: Record<
    string,
    SavedObjectTypeExcludeFromUpgradeFilterHook
  >;
  /**
   * DocLinks for savedObjects. to reference online documentation
   */
  readonly migrationDocLinks: DocLinks['kibanaUpgradeSavedObjects'];
  readonly waitForMigrationCompletion: boolean;
  /**
   * This flag tells the migrator that SO documents must be redistributed,
   * i.e. stored in different system indices, compared to where they are currently stored.
   * This requires reindexing documents.
   */
  readonly mustRelocateDocuments: boolean;
  /**
   * This object holds a relation of all the types that are stored in each index, e.g.:
   * {
   *  '.kibana': [ 'type_1', 'type_2', ... 'type_N' ],
   *  '.kibana_cases': [ 'type_N+1', 'type_N+2', ... 'type_N+M' ],
   *  ...
   * }
   */
  readonly indexTypesMap: IndexTypesMap;
  /** Capabilities of the ES cluster we're using */
  readonly esCapabilities: ElasticsearchCapabilities;
}

export interface InitState extends BaseState {
  readonly controlState: 'INIT';
}

export interface PostInitState extends BaseState {
  readonly aliases: Aliases;
  /**
   * The source index is the index from which the migration reads. If the
   * Option is a none, we didn't do any migration from a source index, either:
   *  - this is a blank ES cluster and we will perform the CREATE_NEW_TARGET
   *    step
   *  - another Kibana instance already did the source migration and finished
   *    the MARK_VERSION_INDEX_READY step
   */
  readonly sourceIndex: Option.Option<string>;
  readonly sourceIndexMappings: Option.Option<IndexMapping>;
  /** The target index is the index to which the migration writes */
  readonly targetIndex: string;
  readonly versionIndexReadyActions: Option.Option<AliasAction[]>;
}

export interface SourceExistsState extends PostInitState {
  readonly sourceIndex: Option.Some<string>;
  readonly sourceIndexMappings: Option.Some<IndexMapping>;
}

export interface WaitForMigrationCompletionState extends PostInitState {
  /** Wait until another instance completes the migration */
  readonly controlState: 'WAIT_FOR_MIGRATION_COMPLETION';
}

export interface DoneState extends PostInitState {
  /** Migration completed successfully */
  readonly controlState: 'DONE';
}

export interface CleanupUnknownAndExcluded extends SourceExistsState {
  /** Clean the source index, removing SOs with unknown and excluded types */
  readonly controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED';
  /** The cleanup operation has deleted one or more documents, we gotta refresh the index */
  readonly mustRefresh?: boolean;
}

export interface CleanupUnknownAndExcludedWaitForTaskState extends SourceExistsState {
  readonly controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK';
  readonly deleteByQueryTaskId: string;
  /** The cleanup operation has deleted one or more documents, we gotta refresh the index */
  readonly mustRefresh?: boolean;
}

/**
 * Compatibe migrations do not require migrating to a new index because all
 * schema changes are compatible with current index mappings.
 *
 * Before running the compatible migration we need to prepare. For example, we
 * need to make sure that no older Kibana versions are still writing to target
 * index.
 */
export interface PrepareCompatibleMigration extends SourceExistsState {
  /** We have found a schema-compatible migration, this means we can optimise our migration steps */
  readonly controlState: 'PREPARE_COMPATIBLE_MIGRATION';
  /** Alias-level actions that prepare for this migration */
  readonly preTransformDocsActions: AliasAction[];
  /** Indicates whether we must refresh the index */
  readonly mustRefresh?: boolean;
}

export interface RefreshSource extends SourceExistsState {
  /** Refresh source index before searching for outdated docs */
  readonly controlState: 'REFRESH_SOURCE';
}

export interface FatalState extends BaseState {
  /** Migration terminated with a failure */
  readonly controlState: 'FATAL';
  /** The reason the migration was terminated */
  readonly reason: string;
  /** The delay in milliseconds before throwing the FATAL exception */
  readonly throwDelayMillis?: number;
}

export interface WaitForYellowSourceState extends SourceExistsState {
  /** Wait for the source index to be yellow before reading from it. */
  readonly controlState: 'WAIT_FOR_YELLOW_SOURCE';
}

export interface UpdateSourceMappingsPropertiesState extends SourceExistsState {
  readonly controlState: 'UPDATE_SOURCE_MAPPINGS_PROPERTIES';
}

export interface CheckUnknownDocumentsState extends SourceExistsState {
  /** Check if any unknown document is present in the source index */
  readonly controlState: 'CHECK_UNKNOWN_DOCUMENTS';
}

export interface SetSourceWriteBlockState extends SourceExistsState {
  /** Set a write block on the source index to prevent any further writes */
  readonly controlState: 'SET_SOURCE_WRITE_BLOCK';
}

export interface CalculateExcludeFiltersState extends SourceExistsState {
  readonly controlState: 'CALCULATE_EXCLUDE_FILTERS';
}

export interface CreateNewTargetState extends PostInitState {
  /** Blank ES cluster, create a new version-specific target index */
  readonly controlState: 'CREATE_NEW_TARGET';
  readonly sourceIndex: Option.None;
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
}

export interface CreateReindexTempState extends PostInitState {
  /**
   * Create a target index with mappings from the source index and registered
   * plugins
   */
  readonly controlState: 'CREATE_REINDEX_TEMP';
}

export interface ReadyToReindexSyncState extends PostInitState {
  /** Open PIT to the source index */
  readonly controlState: 'READY_TO_REINDEX_SYNC';
}

export interface ReindexSourceToTempOpenPit extends SourceExistsState {
  /** Open PIT to the source index */
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT';
}

interface ReindexSourceToTempBatch extends SourceExistsState {
  readonly sourceIndexPitId: string;
  readonly lastHitSortValue: number[] | undefined;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: TransformErrorObjects[];
  readonly progress: Progress;
}

export interface ReindexSourceToTempRead extends ReindexSourceToTempBatch {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_READ';
}

export interface ReindexSourceToTempClosePit extends SourceExistsState {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT';
  readonly sourceIndexPitId: string;
}

export interface ReindexSourceToTempTransform extends ReindexSourceToTempBatch {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_TRANSFORM';
  readonly outdatedDocuments: SavedObjectsRawDoc[];
}

export interface ReindexSourceToTempIndexBulk extends ReindexSourceToTempBatch {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK';
  readonly bulkOperationBatches: BulkOperation[][];
  readonly currentBatch: number;
}

export interface DoneReindexingSyncState extends PostInitState {
  /** Open PIT to the source index */
  readonly controlState: 'DONE_REINDEXING_SYNC';
}

export interface SetTempWriteBlock extends PostInitState {
  readonly controlState: 'SET_TEMP_WRITE_BLOCK';
}

export interface CloneTempToTarget extends PostInitState {
  /**
   * Clone the temporary reindex index into
   */
  readonly controlState: 'CLONE_TEMP_TO_TARGET';
}

export interface RefreshTarget extends PostInitState {
  /** Refresh temp index before searching for outdated docs */
  readonly controlState: 'REFRESH_TARGET';
  readonly targetIndex: string;
}

export interface CheckClusterRoutingAllocationState extends SourceExistsState {
  readonly controlState: 'CHECK_CLUSTER_ROUTING_ALLOCATION';
}

export interface CheckTargetTypesMappingsState extends PostInitState {
  readonly controlState: 'CHECK_TARGET_MAPPINGS';
}

export interface UpdateTargetMappingsPropertiesState extends PostInitState {
  /** Update the mappings of the target index */
  readonly controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES';
  readonly updatedTypesQuery: Option.Option<QueryDslQueryContainer>;
}

export interface UpdateTargetMappingsPropertiesWaitForTaskState extends PostInitState {
  /** Update the mappings of the target index */
  readonly controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK';
  readonly updateTargetMappingsTaskId: string;
}

export interface UpdateTargetMappingsMeta extends PostInitState {
  /** Update the mapping _meta information with the hashes of the mappings for each plugin */
  readonly controlState: 'UPDATE_TARGET_MAPPINGS_META';
}

export interface CheckVersionIndexReadyActions extends PostInitState {
  readonly controlState: 'CHECK_VERSION_INDEX_READY_ACTIONS';
}

export interface OutdatedDocumentsSearchOpenPit extends PostInitState {
  /** Open PiT for target index to search for outdated documents */
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT';
}

export interface OutdatedDocumentsSearchRead extends PostInitState {
  /** Search for outdated documents in the target index */
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ';
  readonly pitId: string;
  readonly lastHitSortValue: number[] | undefined;
  readonly hasTransformedDocs: boolean;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: TransformErrorObjects[];
  readonly progress: Progress;
}

export interface OutdatedDocumentsSearchClosePit extends PostInitState {
  /** Close PiT for target index when found all outdated documents */
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT';
  readonly pitId: string;
  readonly hasTransformedDocs: boolean;
}

export interface OutdatedDocumentsRefresh extends PostInitState {
  /** Reindex transformed documents */
  readonly controlState: 'OUTDATED_DOCUMENTS_REFRESH';
  readonly targetIndex: string;
}

export interface OutdatedDocumentsTransform extends PostInitState {
  /** Transform a batch of outdated documents to their latest version*/
  readonly controlState: 'OUTDATED_DOCUMENTS_TRANSFORM';
  readonly pitId: string;
  readonly outdatedDocuments: SavedObjectsRawDoc[];
  readonly lastHitSortValue: number[] | undefined;
  readonly hasTransformedDocs: boolean;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: TransformErrorObjects[];
  readonly progress: Progress;
}

export interface TransformedDocumentsBulkIndex extends PostInitState {
  /**
   * Write the up-to-date transformed documents to the target index
   */
  readonly controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX';
  readonly bulkOperationBatches: BulkOperation[][];
  readonly currentBatch: number;
  readonly lastHitSortValue: number[] | undefined;
  readonly hasTransformedDocs: boolean;
  readonly pitId: string;
  readonly progress: Progress;
}

export interface MarkVersionIndexReady extends PostInitState {
  /**
   * Marks the version-specific index as ready. Once this step is complete,
   * future Kibana instances will not have to prepare a target index by e.g.
   * cloning a source index or creating a new index.
   *
   * To account for newly installed or enabled plugins, Kibana will still
   * perform the `UPDATE_TARGET_MAPPINGS_PROPERTIES*` and `OUTDATED_DOCUMENTS_*` steps
   * every time it is restarted.
   */
  readonly controlState: 'MARK_VERSION_INDEX_READY';
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
}

export interface MarkVersionIndexReadySync extends PostInitState {
  /** Single "client.indices.updateAliases" operation
   * to update multiple indices' aliases simultaneously
   * */
  readonly controlState: 'MARK_VERSION_INDEX_READY_SYNC';
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
}

export interface MarkVersionIndexReadyConflict extends PostInitState {
  /**
   * If the MARK_VERSION_INDEX_READY step fails another instance was
   * performing the migration in parallel and won the race to marking the
   * migration as complete. This step ensures that the instance that won the
   * race is running the same version of Kibana, if it does, the migration is
   * complete and we can go to DONE.
   *
   * If it was a different version of Kibana that completed the migration fail
   * the migration by going to FATAL. If this instance restarts it will either
   * notice that a newer version already completed the migration and refuse to
   * start up, or if it was an older version that completed the migration
   * start a new migration to the latest version.
   */
  readonly controlState: 'MARK_VERSION_INDEX_READY_CONFLICT';
}

/**
 * If we're migrating from a legacy index we need to perform some additional
 * steps to prepare this index so that it can be used as a migration 'source'.
 */
export interface LegacyBaseState extends SourceExistsState {
  readonly legacyPreMigrationDoneActions: AliasAction[];
}

export interface LegacyCheckClusterRoutingAllocationState extends LegacyBaseState {
  readonly controlState: 'LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION';
}

export interface LegacySetWriteBlockState extends LegacyBaseState {
  /** Set a write block on the legacy index to prevent any further writes */
  readonly controlState: 'LEGACY_SET_WRITE_BLOCK';
}

export interface LegacyCreateReindexTargetState extends LegacyBaseState {
  /**
   * Create a new index into which we can reindex the legacy index. This
   * index will have the same mappings as the legacy index. Once the legacy
   * pre-migration is complete, this index will be used a migration 'source'.
   */
  readonly controlState: 'LEGACY_CREATE_REINDEX_TARGET';
}

export interface LegacyReindexState extends LegacyBaseState {
  /**
   * Reindex the legacy index into the new index created in the
   * LEGACY_CREATE_REINDEX_TARGET step (and apply the preMigration script).
   */
  readonly controlState: 'LEGACY_REINDEX';
}

export interface LegacyReindexWaitForTaskState extends LegacyBaseState {
  /** Wait for the reindex operation to complete */
  readonly controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK';
  readonly legacyReindexTaskId: string;
}

export interface LegacyDeleteState extends LegacyBaseState {
  /**
   * After reindexed has completed, delete the legacy index so that it won't
   * conflict with the `currentAlias` that we want to create in a later step
   * e.g. `.kibana`.
   */
  readonly controlState: 'LEGACY_DELETE';
}

export type State = Readonly<
  | CalculateExcludeFiltersState
  | CheckClusterRoutingAllocationState
  | CheckTargetTypesMappingsState
  | CheckUnknownDocumentsState
  | CheckVersionIndexReadyActions
  | CleanupUnknownAndExcluded
  | CleanupUnknownAndExcludedWaitForTaskState
  | CloneTempToTarget
  | CreateNewTargetState
  | CreateReindexTempState
  | DoneReindexingSyncState
  | DoneState
  | FatalState
  | InitState
  | LegacyCheckClusterRoutingAllocationState
  | LegacyCreateReindexTargetState
  | LegacyDeleteState
  | LegacyReindexState
  | LegacyReindexWaitForTaskState
  | LegacySetWriteBlockState
  | MarkVersionIndexReady
  | MarkVersionIndexReadySync
  | MarkVersionIndexReadyConflict
  | OutdatedDocumentsRefresh
  | OutdatedDocumentsSearchClosePit
  | OutdatedDocumentsSearchOpenPit
  | OutdatedDocumentsSearchRead
  | OutdatedDocumentsTransform
  | PrepareCompatibleMigration
  | ReadyToReindexSyncState
  | RefreshSource
  | RefreshTarget
  | ReindexSourceToTempClosePit
  | ReindexSourceToTempIndexBulk
  | ReindexSourceToTempOpenPit
  | ReindexSourceToTempRead
  | ReindexSourceToTempTransform
  | SetSourceWriteBlockState
  | SetTempWriteBlock
  | TransformedDocumentsBulkIndex
  | UpdateSourceMappingsPropertiesState
  | UpdateTargetMappingsMeta
  | UpdateTargetMappingsPropertiesState
  | UpdateTargetMappingsPropertiesWaitForTaskState
  | WaitForMigrationCompletionState
  | WaitForYellowSourceState
>;

export type AllControlStates = State['controlState'];
/**
 * All control states that trigger an action (excludes the terminal states
 * 'FATAL' and 'DONE').
 */
export type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;
