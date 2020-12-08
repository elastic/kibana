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

import { gt, valid } from 'semver';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { cloneDeep } from 'lodash';
import { UnwrapPromise } from '@kbn/utility-types';
import { ElasticsearchClient } from '../../elasticsearch';
import * as Actions from './actions';
import { IndexMapping } from '../mappings';
import { Logger, LogMeta } from '../../logging';
import { SavedObjectsMigrationVersion } from '../types';
import { AliasAction } from './actions';
import { ControlState, stateActionMachine } from './state_action_machine';
import { MigrationResult, MigrationStatus } from '../migrations/core';
import { SavedObjectsRawDoc, SavedObjectsSerializer } from '..';

/**
 * How many times to retry a failing step.
 *
 * Waiting for a task to complete will cause a failing step every time the
 * wait_for_task action times out e.g. the following sequence has 3 retry
 * attempts:
 * LEGACY_REINDEX_WAIT_FOR_TASK (60s timeout) ->
 * LEGACY_REINDEX_WAIT_FOR_TASK (2s delay, 60s timeout) ->
 * LEGACY_REINDEX_WAIT_FOR_TASK (4s delay, 60s timeout) ->
 * LEGACY_REINDEX_WAIT_FOR_TASK (success) -> ...
 *
 * This places an upper limit to how long we will wait for a task to complete.
 * The duration of a step is the time it takes for the action to complete plus
 * the exponential retry delay:
 * max_task_runtime = 2+4+8+16+32+64*(MAX_RETRY_ATTEMPTS-5) + ACTION_DURATION*MAX_RETRY_ATTEMPTS
 *
 * For MAX_RETRY_ATTEMPTS=10, ACTION_DURATION=60
 * max_task_runtime = 16.46 minutes
 */
const MAX_RETRY_ATTEMPTS = 10;

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
  readonly targetMappings: IndexMapping;
  /** Script to apply to a legacy index before it can be used as a migration source */
  readonly preMigrationScript: Option.Option<string>;
  readonly outdatedDocumentsQuery: Record<string, unknown>;
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly logs: Array<{ level: 'error' | 'info'; message: string }>;
}

export type InitState = BaseState & {
  readonly controlState: 'INIT';
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
};

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

export type CloneSourceToTargetState = PostInitState & {
  /** Create the target index by cloning the source index */
  readonly controlState: 'CLONE_SOURCE_TO_TARGET';
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
  | SetSourceWriteBlockState
  | CreateNewTargetState
  | CloneSourceToTargetState
  | UpdateTargetMappingsState
  | UpdateTargetMappingsWaitForTaskState
  | OutdatedDocumentsSearch
  | OutdatedDocumentsTransform
  | MarkVersionIndexReady
  | LegacyCreateReindexTargetState
  | LegacySetWriteBlockState
  | LegacyReindexState
  | LegacyReindexWaitForTaskState
  | LegacyDeleteState;

/**
 * A helper function/type for ensuring that all control state's are handled.
 */
function throwBadControlState(p: never): never;
function throwBadControlState(controlState: any) {
  throw new Error('Unknown control state: ' + controlState);
}

/**
 * A helper function/type for ensuring that all response types are handled.
 */
function throwBadResponse(p: never): never;
function throwBadResponse(res: any): never {
  throw new Error('Unexpected action response: ' + res);
}

function indexBelongsToLaterVersion(indexName: string, kibanaVersion: string): boolean {
  const version = valid(indexVersion(indexName));
  return version != null ? gt(version, kibanaVersion) : false;
}
/**
 * Extracts the version number from a >= 7.11 index
 * @param indexName A >= v7.11 index name
 */
function indexVersion(indexName?: string): string | undefined {
  return (indexName?.match(/\.kibana_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

/**
 * Merge the _meta.migrationMappingPropertyHashes mappings of an index with
 * the given target mappings.
 *
 * @remarks Mapping updates are commutative (deeply merged) by Elasticsearch,
 * except for the _meta key. The source index we're migrating from might
 * contain documents created by a plugin that is disabled in the Kibana
 * instance performing this migration. We merge the
 * _meta.migrationMappingPropertyHashes mappings from the source index into
 * the targetMappings to ensure that any `migrationPropertyHashes` for
 * disabled plugins aren't lost.
 *
 * Right now we don't use these `migrationPropertyHashes` but it could be used
 * in the future to optimize the `UPDATE_TARGET_MAPPINGS` step.
 *
 * @param targetMappings
 * @param indexMappings
 */
function mergeMigrationMappingPropertyHashes(
  targetMappings: IndexMapping,
  indexMappings: IndexMapping
) {
  return {
    ...targetMappings,
    _meta: {
      migrationMappingPropertyHashes: {
        ...indexMappings._meta?.migrationMappingPropertyHashes,
        ...targetMappings._meta?.migrationMappingPropertyHashes,
      },
    },
  };
}

type AllControlStates = State['controlState'];
/**
 * All control states that trigger an action (excludes the terminal states
 * 'FATAL' and 'DONE').
 */
type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;

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

const delayRetryState = <S extends State>(state: S, left: Actions.RetryableEsClientError): S => {
  if (state.retryCount === MAX_RETRY_ATTEMPTS) {
    return {
      ...state,
      controlState: 'FATAL',
      logs: [
        ...state.logs,
        {
          level: 'error',
          message: `Unable to complete action after ${MAX_RETRY_ATTEMPTS} attempts, terminating.`,
        },
      ],
    };
  } else {
    const retryCount = state.retryCount + 1;
    const retryDelay = 1000 * Math.min(Math.pow(2, retryCount), 64); // 2s, 4s, 8s, 16s, 32s, 64s, 64s, 64s ...

    return {
      ...state,
      retryCount,
      retryDelay,
      logs: [
        ...state.logs,
        {
          level: 'error',
          message: `Action failed with '${
            left.message
          }'. Retrying attempt ${retryCount} out of ${MAX_RETRY_ATTEMPTS} in ${
            retryDelay / 1000
          } seconds.`,
        },
      ],
    };
  }
};
const resetRetryState = <S extends State>(state: S): S => {
  return { ...state, ...{ retryCount: 0, retryDelay: 0 } };
};

export const model = (currentState: State, resW: ResponseType<AllActionStates>): State => {
  // The action response `resW` is weakly typed, the type includes all action
  // responses. Each control state only triggers one action so each control
  // state only has one action response type. This allows us to narrow the
  // response type to only the action response associated with a specific
  // control state using:
  // `const res = resW as ResponseType<typeof stateP.controlState>;`

  let stateP: State = cloneDeep(currentState);

  // Handle retryable_es_client_errors. Other left values need to be handled
  // by the control state specific code below.
  if (Either.isLeft<unknown, unknown>(resW) && resW.left.type === 'retryable_es_client_error') {
    // Retry the same step after an exponentially increasing delay.
    stateP = delayRetryState(stateP, resW.left);
    return stateP;
  } else {
    // If the action didn't fail with a retryable_es_client_error, reset the
    // retry counter and retryDelay state
    stateP = resetRetryState(stateP);
  }

  if (stateP.controlState === 'INIT') {
    const res = resW as ResponseType<typeof stateP.controlState>;

    if (Either.isRight(res)) {
      const indices = res.right;
      const aliases = Object.keys(indices).reduce((acc, index) => {
        Object.keys(indices[index].aliases || {}).forEach((alias) => {
          // TODO throw if multiple .kibana aliases point to the same index?
          acc[alias] = index;
        });
        return acc;
      }, {} as Record<string, string>);

      if (
        // `.kibana` and the version specific aliases both exists and
        // are pointing to the same index. This version's migration has already
        // been completed.
        aliases[stateP.currentAlias] != null &&
        aliases[stateP.versionAlias] != null &&
        aliases[stateP.currentAlias] === aliases[stateP.versionAlias]
      ) {
        stateP = {
          ...stateP,
          // Skip to 'UPDATE_TARGET_MAPPINGS' to update the mappings and
          // transform any outdated documents for in case a new plugin was
          // installed / enabled.
          controlState: 'UPDATE_TARGET_MAPPINGS',
          // Source is a none because we didn't do any migration from a source
          // index
          sourceIndex: Option.none,
          targetIndex: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
          targetMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetMappings,
            indices[aliases[stateP.currentAlias]].mappings
          ),
          versionIndexReadyActions: Option.none,
        };
      } else if (
        // `.kibana` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 instance found the `.kibana` alias
        // pointing to `.kibana_7.12.0_001`
        indexBelongsToLaterVersion(aliases[stateP.currentAlias], stateP.kibanaVersion)
      ) {
        stateP = {
          ...stateP,
          controlState: 'FATAL',
          logs: [
            ...stateP.logs,
            {
              level: 'error',
              message: `The ${
                stateP.currentAlias
              } alias is pointing to a newer version of Kibana: v${indexVersion(
                aliases[stateP.currentAlias]
              )}`,
            },
          ],
        };
      } else if (
        // If the `.kibana` alias exists
        aliases[stateP.currentAlias] != null
      ) {
        // The source index is the index the `.kibana` alias points to
        const source = aliases[stateP.currentAlias];
        const target = stateP.versionIndex;
        stateP = {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          sourceIndex: Option.some(source) as Option.Some<string>,
          targetIndex: target,
          targetMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetMappings,
            indices[source].mappings
          ),
          versionIndexReadyActions: Option.some<AliasAction[]>([
            { remove: { index: source, alias: stateP.currentAlias, must_exist: true } },
            { add: { index: target, alias: stateP.currentAlias } },
            { add: { index: target, alias: stateP.versionAlias } },
          ]),
        };
      } else if (indices[stateP.legacyIndex] != null) {
        // Migrate from a legacy index

        // If the user used default index names we can narrow the version
        // number we use when creating a backup index. This is purely to help
        // users more easily identify how "old" and index is so that they can
        // decide if it's safe to delete these rollback backups. Because
        // backups are kept for rollback, a version number is more useful than
        // a date.
        let legacyVersion = '';
        if (stateP.indexPrefix === '.kibana') {
          legacyVersion = 'pre6.5.0';
        } else if (stateP.indexPrefix === '.kibana_task_manager') {
          legacyVersion = 'pre7.4.0';
        } else {
          legacyVersion = 'pre' + stateP.kibanaVersion;
        }

        const legacyReindexTarget = `${stateP.indexPrefix}_${legacyVersion}_001`;

        const target = stateP.versionIndex;
        stateP = {
          ...stateP,
          controlState: 'LEGACY_SET_WRITE_BLOCK',
          sourceIndex: Option.some(legacyReindexTarget) as Option.Some<string>,
          targetIndex: target,
          targetMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetMappings,
            indices[stateP.legacyIndex].mappings
          ),
          legacyReindexTargetMappings: indices[stateP.legacyIndex].mappings,
          legacyPreMigrationDoneActions: [
            { remove_index: { index: stateP.legacyIndex } },
            {
              add: {
                index: legacyReindexTarget,
                alias: stateP.currentAlias,
              },
            },
          ],
          versionIndexReadyActions: Option.some<AliasAction[]>([
            {
              remove: {
                index: legacyReindexTarget,
                alias: stateP.currentAlias,
                must_exist: true,
              },
            },
            { add: { index: target, alias: stateP.currentAlias } },
            { add: { index: target, alias: stateP.versionAlias } },
          ]),
        };
      } else {
        // This cluster doesn't have an existing Saved Object index, create a
        // new version specific index.
        const target = stateP.versionIndex;
        stateP = {
          ...stateP,
          controlState: 'CREATE_NEW_TARGET',
          sourceIndex: Option.none as Option.None,
          targetIndex: target,
          versionIndexReadyActions: Option.some([
            { add: { index: target, alias: stateP.currentAlias } },
            { add: { index: target, alias: stateP.versionAlias } },
          ]) as Option.Some<AliasAction[]>,
        };
      }
    }
    return stateP;
  } else if (stateP.controlState === 'LEGACY_SET_WRITE_BLOCK') {
    const res = resW as ResponseType<typeof stateP.controlState>;

    // If the write block is sucessfully in place
    if (Either.isRight(res)) {
      stateP = { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
    } else if (Either.isLeft(res)) {
      // If the write block failed because the index doesn't exist, it means
      // another instance already completed the legacy pre-migration. Proceed
      // to the next step.
      if (res.left.type === 'index_not_found_exception') {
        stateP = { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
      }
    }

    return stateP;
  } else if (stateP.controlState === 'LEGACY_CREATE_REINDEX_TARGET') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_REINDEX',
      };
    } else {
      return stateP;
    }
  } else if (stateP.controlState === 'LEGACY_REINDEX') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      stateP = {
        ...stateP,
        controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK',
        legacyReindexTaskId: res.right.taskId,
      };
    }
    return stateP;
  } else if (stateP.controlState === 'LEGACY_REINDEX_WAIT_FOR_TASK') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_DELETE',
      };
    } else {
      if (
        (res.left.type === 'index_not_found_exception' && res.left.index === stateP.legacyIndex) ||
        res.left.type === 'target_index_had_write_block'
      ) {
        // index_not_found_exception for the LEGACY_REINDEX source index:
        // another instance already complete the LEGACY_DELETE step.
        //
        // target_index_had_write_block: another instance already completed the
        // SET_SOURCE_WRITE_BLOCK step.
        //
        // If we detect that another instance has already completed a step, we
        // can technically skip ahead in the process until after the completed
        // step. However, by not skipping ahead we limit branches in the
        // control state progression and simplify the implementation.
        return { ...stateP, controlState: 'LEGACY_DELETE' };
      } else if (
        res.left.type === 'index_not_found_exception' &&
        res.left.index === stateP.sourceIndex.value
      ) {
        // index_not_found_exception for the LEGACY_REINDEX target index
        // (stateP.source.value): the migration algorithm will never delete
        // this index so it must be caused by something external
        return {
          ...stateP,
          controlState: 'FATAL',
          logs: [
            ...stateP.logs,
            {
              level: 'error',
              message: `LEGACY_REINDEX failed because the reindex destination index [${stateP.sourceIndex.value}] does not exist.`,
            },
          ],
        };
      }
      return { ...stateP, controlState: 'FATAL' };
    }
  } else if (stateP.controlState === 'LEGACY_DELETE') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isLeft(res)) {
      if (
        res.left.type === 'remove_index_not_a_concrete_index' ||
        (res.left.type === 'index_not_found_exception' && res.left.index === stateP.legacyIndex)
      ) {
        // index_not_found_exception, another Kibana instance already
        // deleted the legacy index
        //
        // remove_index_not_a_concrete_index, another Kibana instance already
        // deleted the legacy index and created a .kibana alias
        //
        // If we detect that another instance has already completed a step, we
        // can technically skip ahead in the process until after the completed
        // step. However, by not skipping ahead we limit branches in the
        // control state progression and simplify the implementation.
        return { ...stateP, controlState: 'SET_SOURCE_WRITE_BLOCK' };
      } else if (
        res.left.type === 'index_not_found_exception' &&
        res.left.index === stateP.sourceIndex.value
      ) {
        return {
          ...stateP,
          controlState: 'FATAL',
          logs: [
            ...stateP.logs,
            {
              level: 'error',
              message: `LEGACY_DELETE failed because the source index [${stateP.sourceIndex.value}] does not exist.`,
            },
          ],
        };
      }
    } else {
      return { ...stateP, controlState: 'SET_SOURCE_WRITE_BLOCK' };
    }
    return stateP;
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    // If the write block is successfully in place, proceed to the next step.
    if (Either.isRight(res)) {
      stateP = { ...stateP, controlState: 'CLONE_SOURCE_TO_TARGET' };
    } else if (Either.isLeft(res)) {
      if (res.left.type === 'index_not_found_exception') {
        // If the write block failed because the index doesn't exist, it means
        // another instance already completed the legacy pre-migration. Proceed
        // to the next step.
        stateP = { ...stateP, controlState: 'CLONE_SOURCE_TO_TARGET' };
      }
    } else {
      return throwBadResponse(res);
    }

    return stateP;
  } else if (stateP.controlState === 'CLONE_SOURCE_TO_TARGET') {
    return { ...stateP, controlState: 'UPDATE_TARGET_MAPPINGS' };
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      stateP = {
        ...stateP,
        controlState: 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK',
        updateTargetMappingsTaskId: res.right.taskId,
      };
    }
    return stateP;
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res) && res.right === 'pickup_updated_mappings_succeeded') {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH',
      };
    } else {
      return {
        ...stateP,
        controlState: 'FATAL',
      };
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SEARCH') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      // If outdated documents were found, transform them
      if (res.right.outdatedDocuments.length > 0) {
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
          outdatedDocuments: res.right.outdatedDocuments,
        };
      } else {
        // If there are no more results we have transformed all outdated
        // documents and can proceed to the next step
        if (Option.isSome(stateP.versionIndexReadyActions)) {
          // If there are some versionIndexReadyActions we performed a full
          // migration and need to point the aliases to our newly migrated
          // index.
          return {
            ...stateP,
            controlState: 'MARK_VERSION_INDEX_READY',
            versionIndexReadyActions: stateP.versionIndexReadyActions,
          };
        } else {
          // If there are none versionIndexReadyActions another instance
          // already completed this migration and we only updated the mappings
          // and transformed outdated documents for incase a new plugin was
          // enabled.
          return {
            ...stateP,
            controlState: 'DONE',
          };
        }
      }
    }
    return stateP;
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_TRANSFORM') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res) && res.right === 'bulk_index_succeeded') {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH',
      };
    } else {
      return {
        ...stateP,
        controlState: 'FATAL',
      };
    }
  } else if (stateP.controlState === 'CREATE_NEW_TARGET') {
    return {
      ...stateP,
      controlState: 'MARK_VERSION_INDEX_READY',
    };
  } else if (stateP.controlState === 'MARK_VERSION_INDEX_READY') {
    return { ...stateP, controlState: 'DONE' };
  } else if (stateP.controlState === 'DONE' || stateP.controlState === 'FATAL') {
    return stateP;
  } else {
    return throwBadControlState(stateP);
  }
};

export const nextActionMap = (
  client: ElasticsearchClient,
  transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>
) => {
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

export const next = (
  client: ElasticsearchClient,
  transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>,
  state: State
) => {
  const delay = <F extends (...args: any) => any>(fn: F): (() => ReturnType<F>) => {
    return () => {
      return state.retryDelay > 0
        ? new Promise((resolve) => setTimeout(resolve, state.retryDelay)).then(fn)
        : fn();
    };
  };

  const map = nextActionMap(client, transformRawDocs);

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

export async function migrationStateMachine({
  client,
  kibanaVersion,
  targetMappings,
  logger,
  preMigrationScript,
  transformRawDocs,
  migrationVersionPerType,
  indexPrefix,
}: {
  client: ElasticsearchClient;
  kibanaVersion: string;
  targetMappings: IndexMapping;
  preMigrationScript?: string;
  logger: Logger;
  serializer: SavedObjectsSerializer;
  transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
}) {
  const outdatedDocumentsQuery = {
    bool: {
      should: Object.entries(migrationVersionPerType).map(([type, latestVersion]) => ({
        bool: {
          must: [
            { exists: { field: type } },
            {
              bool: {
                must_not: { term: { [`migrationVersion.${type}`]: latestVersion } },
              },
            },
          ],
        },
      })),
    },
  };

  const indexLogger = logger.get(indexPrefix.slice(1));

  const initialState: State = {
    controlState: 'INIT',
    indexPrefix,
    legacyIndex: indexPrefix,
    currentAlias: indexPrefix,
    versionAlias: indexPrefix + '_' + kibanaVersion,
    versionIndex: `${indexPrefix}_${kibanaVersion}_001`,
    kibanaVersion,
    preMigrationScript: Option.fromNullable(preMigrationScript),
    targetMappings,
    outdatedDocumentsQuery,
    retryCount: 0,
    retryDelay: 0,
    logs: [],
  };

  const logStateTransition = (oldState: State, newState: State) => {
    if (newState.logs.length > oldState.logs.length) {
      newState.logs
        .slice(oldState.logs.length)
        .forEach((log) => indexLogger[log.level](log.message));
    }

    // Sanitize the state for logging by removing logs and documents which
    // might contain sensitive information.
    // @ts-expect-error outdatedDocuments don't exist in all states
    const { logs, outdatedDocuments, ...logState } = newState;
    indexLogger.info(`${oldState.controlState} -> ${newState.controlState}: `, logState);
  };

  const logActionResponse = (state: State, res: unknown) => {
    indexLogger.info(`${state.controlState} RESPONSE`, res as LogMeta);
  };

  const finalState = await stateActionMachine<State>(
    initialState,
    (state) => next(client, transformRawDocs, state),
    (state, res) => {
      logActionResponse(state, res);
      const newState = model(state, res);
      logStateTransition(state, newState);
      return newState;
    }
  );

  if (finalState.controlState === 'DONE') {
    return Option.fold<string, MigrationResult>(
      () => ({
        status: 'patched' as const,
        destIndex: finalState.targetIndex,
        elapsedMs: 0,
      }),
      (sourceIndex) => ({
        status: 'migrated' as const,
        destIndex: finalState.targetIndex,
        sourceIndex,
        elapsedMs: 0,
      })
    )(finalState.sourceIndex);
  } else {
    throw new Error(
      `Unable to complete saved object migrations for the [${finalState.indexPrefix}] index. Please check the health of your Elasticsearch cluster.`
    );
  }
}
