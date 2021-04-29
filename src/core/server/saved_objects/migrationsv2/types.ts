/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Option from 'fp-ts/lib/Option';
import { estypes } from '@elastic/elasticsearch';
import { ControlState } from './state_action_machine';
import { AliasAction } from './actions';
import { IndexMapping } from '../mappings';
import { SavedObjectsRawDoc } from '..';

export type MigrationLogLevel = 'error' | 'info';

export interface MigrationLog {
  level: MigrationLogLevel;
  message: string;
}

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
  readonly outdatedDocumentsQuery: Record<string, unknown>;
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
   * The number of documents to fetch from Elasticsearch server to run migration over.
   *
   * The higher the value, the faster the migration process will be performed since it reduces
   * the number of round trips between Kibana and Elasticsearch servers.
   * For the migration speed, we have to pay the price of increased memory consumption.
   *
   * Since batchSize defines the number of documents, not their size, it might happen that
   * Elasticsearch fails a request with circuit_breaking_exception when it retrieves a set of
   * saved objects of significant size.
   *
   * In this case, you should set a smaller batchSize value and restart the migration process again.
   */
  readonly batchSize: number;
  readonly logs: MigrationLog[];
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
   * An alias on the target index used as part of an "reindex block" that
   * prevents lost deletes e.g. `.kibana_7.11.0_reindex`.
   */
  readonly tempIndex: string;
  /* When reindexing we use a source query to exclude saved objects types which
   * are no longer used. These saved objects will still be kept in the outdated
   * index for backup purposes, but won't be available in the upgraded index.
   */
  readonly unusedTypesQuery: Option.Option<estypes.QueryContainer>;
}

export type InitState = BaseState & {
  readonly controlState: 'INIT';
};

export type PostInitState = BaseState & {
  /**
   * The source index is the index from which the migration reads. If the
   * Option is a none, we didn't do any migration from a source index, either:
   *  - this is a blank ES cluster and we will perform the CREATE_NEW_TARGET
   *    step
   *  - another Kibana instance already did the source migration and finished
   *    the MARK_VERSION_INDEX_READY step
   */
  readonly sourceIndex: Option.Option<string>;
  /** The target index is the index to which the migration writes */
  readonly targetIndex: string;
  readonly versionIndexReadyActions: Option.Option<AliasAction[]>;
  readonly outdatedDocumentsQuery: Record<string, unknown>;
};

export type DoneState = PostInitState & {
  /** Migration completed successfully */
  readonly controlState: 'DONE';
};

export type FatalState = BaseState & {
  /** Migration terminated with a failure */
  readonly controlState: 'FATAL';
  /** The reason the migration was terminated */
  readonly reason: string;
};

export interface WaitForYellowSourceState extends BaseState {
  /** Wait for the source index to be yellow before requesting it. */
  readonly controlState: 'WAIT_FOR_YELLOW_SOURCE';
  readonly sourceIndex: Option.Some<string>;
  readonly sourceIndexMappings: IndexMapping;
}

export type SetSourceWriteBlockState = PostInitState & {
  /** Set a write block on the source index to prevent any further writes */
  readonly controlState: 'SET_SOURCE_WRITE_BLOCK';
  readonly sourceIndex: Option.Some<string>;
};

export type CreateNewTargetState = PostInitState & {
  /** Blank ES cluster, create a new version-specific target index */
  readonly controlState: 'CREATE_NEW_TARGET';
  readonly sourceIndex: Option.None;
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
};

export type CreateReindexTempState = PostInitState & {
  /**
   * Create a target index with mappings from the source index and registered
   * plugins
   */
  readonly controlState: 'CREATE_REINDEX_TEMP';
  readonly sourceIndex: Option.Some<string>;
};

export interface ReindexSourceToTempOpenPit extends PostInitState {
  /** Open PIT to the source index */
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT';
  readonly sourceIndex: Option.Some<string>;
}

export interface ReindexSourceToTempRead extends PostInitState {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_READ';
  readonly sourceIndexPitId: string;
  readonly lastHitSortValue: number[] | undefined;
}

export interface ReindexSourceToTempClosePit extends PostInitState {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT';
  readonly sourceIndexPitId: string;
}

export interface ReindexSourceToTempIndex extends PostInitState {
  readonly controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX';
  readonly outdatedDocuments: SavedObjectsRawDoc[];
  readonly sourceIndexPitId: string;
  readonly lastHitSortValue: number[] | undefined;
}

export type SetTempWriteBlock = PostInitState & {
  /**
   *
   */
  readonly controlState: 'SET_TEMP_WRITE_BLOCK';
  readonly sourceIndex: Option.Some<string>;
};

export type CloneTempToSource = PostInitState & {
  /**
   * Clone the temporary reindex index into
   */
  readonly controlState: 'CLONE_TEMP_TO_TARGET';
  readonly sourceIndex: Option.Some<string>;
};

export type UpdateTargetMappingsState = PostInitState & {
  /** Update the mappings of the target index */
  readonly controlState: 'UPDATE_TARGET_MAPPINGS';
};

export type UpdateTargetMappingsWaitForTaskState = PostInitState & {
  /** Update the mappings of the target index */
  readonly controlState: 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK';
  readonly updateTargetMappingsTaskId: string;
};

export type OutdatedDocumentsSearch = PostInitState & {
  /** Search for outdated documents in the target index */
  readonly controlState: 'OUTDATED_DOCUMENTS_SEARCH';
};

export type OutdatedDocumentsTransform = PostInitState & {
  /** Transform a batch of outdated documents to their latest version and write them to the target index */
  readonly controlState: 'OUTDATED_DOCUMENTS_TRANSFORM';
  readonly outdatedDocuments: SavedObjectsRawDoc[];
};

export type MarkVersionIndexReady = PostInitState & {
  /**
   * Marks the version-specific index as ready. Once this step is complete,
   * future Kibana instances will not have to prepare a target index by e.g.
   * cloning a source index or creating a new index.
   *
   * To account for newly installed or enabled plugins, Kibana will still
   * perform the `UPDATE_TARGET_MAPPINGS*` and `OUTDATED_DOCUMENTS_*` steps
   * every time it is restarted.
   */
  readonly controlState: 'MARK_VERSION_INDEX_READY';
  readonly versionIndexReadyActions: Option.Some<AliasAction[]>;
};

export type MarkVersionIndexReadyConflict = PostInitState & {
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
};

/**
 * If we're migrating from a legacy index we need to perform some additional
 * steps to prepare this index so that it can be used as a migration 'source'.
 */
export type LegacyBaseState = PostInitState & {
  readonly sourceIndex: Option.Some<string>;
  readonly legacyPreMigrationDoneActions: AliasAction[];
  /**
   * The mappings read from the legacy index, used to create a new reindex
   * target index.
   */
  readonly legacyReindexTargetMappings: IndexMapping;
};

export type LegacySetWriteBlockState = LegacyBaseState & {
  /** Set a write block on the legacy index to prevent any further writes */
  readonly controlState: 'LEGACY_SET_WRITE_BLOCK';
};

export type LegacyCreateReindexTargetState = LegacyBaseState & {
  /**
   * Create a new index into which we can reindex the legacy index. This
   * index will have the same mappings as the legacy index. Once the legacy
   * pre-migration is complete, this index will be used a migration 'source'.
   */
  readonly controlState: 'LEGACY_CREATE_REINDEX_TARGET';
};

export type LegacyReindexState = LegacyBaseState & {
  /**
   * Reindex the legacy index into the new index created in the
   * LEGACY_CREATE_REINDEX_TARGET step (and apply the preMigration script).
   */
  readonly controlState: 'LEGACY_REINDEX';
};

export type LegacyReindexWaitForTaskState = LegacyBaseState & {
  /** Wait for the reindex operation to complete */
  readonly controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK';
  readonly legacyReindexTaskId: string;
};

export type LegacyDeleteState = LegacyBaseState & {
  /**
   * After reindexed has completed, delete the legacy index so that it won't
   * conflict with the `currentAlias` that we want to create in a later step
   * e.g. `.kibana`.
   */
  readonly controlState: 'LEGACY_DELETE';
};

export type State =
  | FatalState
  | InitState
  | DoneState
  | WaitForYellowSourceState
  | SetSourceWriteBlockState
  | CreateNewTargetState
  | CreateReindexTempState
  | ReindexSourceToTempOpenPit
  | ReindexSourceToTempRead
  | ReindexSourceToTempClosePit
  | ReindexSourceToTempIndex
  | SetTempWriteBlock
  | CloneTempToSource
  | UpdateTargetMappingsState
  | UpdateTargetMappingsWaitForTaskState
  | OutdatedDocumentsSearch
  | OutdatedDocumentsTransform
  | MarkVersionIndexReady
  | MarkVersionIndexReadyConflict
  | LegacyCreateReindexTargetState
  | LegacySetWriteBlockState
  | LegacyReindexState
  | LegacyReindexWaitForTaskState
  | LegacyDeleteState;

export type AllControlStates = State['controlState'];
/**
 * All control states that trigger an action (excludes the terminal states
 * 'FATAL' and 'DONE').
 */
export type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;

export type TransformRawDocs = (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>;
