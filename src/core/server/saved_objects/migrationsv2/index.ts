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

/* eslint-disable no-console */

import { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { gt, valid } from 'semver';
import chalk from 'chalk';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { flow } from 'fp-ts/lib/function';
import * as Actions from './actions';
import { IndexMapping } from '../mappings';
import { Logger } from '../../logging';
import { SavedObjectsMigrationVersion } from '../types';
import { AliasAction } from './actions';
import { SavedObjectsRawDoc, SavedObjectsSerializer } from '..';

export interface BaseState {
  /** The first part of the index name such as `.kibana` or `.kibana_task_manager` */
  indexPrefix: string;
  /** Kibana version number */
  kibanaVersion: string;
  /** The mappings to apply to the target index */
  targetMappings: IndexMapping;
  /** Script to apply to a legacy index before it can be used as a migration source */
  preMigrationScript?: string;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  retryCount: number;
  retryDelay: number;
  log: Array<{ level: 'error' | 'info'; message: string }>;
}

export type InitState = BaseState & {
  controlState: 'INIT';
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
  source: Option.Option<string>;
  /** The target index is the index to which the migration writes */
  target: string;
  versionIndexReadyActions: Option.Option<AliasAction[]>;
};

export type DoneState = BaseState & {
  /** Migration completed successfully */
  controlState: 'DONE';
};

export type FatalState = BaseState & {
  /** Migration terminated with a failure */
  controlState: 'FATAL';
  error?: Error;
};

export type SetSourceWriteBlockState = PostInitState & {
  /** Set a write block on the source index to prevent any further writes */
  controlState: 'SET_SOURCE_WRITE_BLOCK';
  source: Option.Some<string>;
};

export type CreateNewTargetState = PostInitState & {
  /** Blank ES cluster, create a new version-specific target index */
  controlState: 'CREATE_NEW_TARGET';
  source: Option.None;
};

export type CloneSourceToTargetState = PostInitState & {
  /** Create the target index by cloning the source index */
  controlState: 'CLONE_SOURCE_TO_TARGET';
  source: Option.Some<string>;
};

export type UpdateTargetMappingsState = PostInitState & {
  /** Update the mappings of the target index */
  controlState: 'UPDATE_TARGET_MAPPINGS';
};

export type UpdateTargetMappingsWaitForTaskState = PostInitState & {
  /** Update the mappings of the target index */
  controlState: 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK';
  updateTargetMappingsTaskId: string;
};

export type OutdatedDocumentsSearch = PostInitState & {
  /** Start a scroll search for outdated documents in the target index */
  controlState: 'OUTDATED_DOCUMENTS_SEARCH';
  outdatedDocumentsQuery: Record<string, unknown>;
};

export type OutdatedDocumentsScroll = PostInitState & {
  /** Retrieve the next batch of results from the scroll search for outdated documents in the target index */
  controlState: 'OUTDATED_DOCUMENTS_SCROLL';
  transformDocumentsScrollId: string;
};

export type OutdatedDocumentsTransform = PostInitState & {
  /** Transform a batch of outdated documents to their latest version and write them to the target index */
  controlState: 'OUTDATED_DOCUMENTS_TRANSFORM';
  outdatedDocuments: SavedObjectsRawDoc[];
  transformDocumentsScrollId: string;
};

export type OutdatedDocumentsClearScroll = PostInitState & {
  /** When there are no more results, clear the scroll */
  controlState: 'OUTDATED_DOCUMENTS_CLEAR_SCROLL';
  transformDocumentsScrollId: string;
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
  controlState: 'MARK_VERSION_INDEX_READY';
  versionIndexReadyActions: Option.Some<AliasAction[]>;
};

/**
 * If there's a legacy index prepare it for migration.
 */
export type LegacyBaseState = PostInitState & {
  legacy: string;
  source: Option.Some<string>;
};

export type CloneLegacyState = LegacyBaseState & {
  /** Prepare a new 'source' index for the migration by cloning the legacy index */
  controlState: 'CLONE_LEGACY';
};

export type SetLegacyWriteBlockState = LegacyBaseState & {
  /** Set a write block on the legacy index to prevent any further writes */
  controlState: 'SET_LEGACY_WRITE_BLOCK';
};

export type PreMigrateLegacyState = LegacyBaseState & {
  /** Apply the pre-migration script to the legacy clone to prepare it for a migration */
  controlState: 'PRE_MIGRATE_LEGACY';
};

export type PreMigrateLegacyWaitForTaskState = LegacyBaseState & {
  /** Apply the pre-migration script to the legacy clone to prepare it for a migration */
  controlState: 'PRE_MIGRATE_LEGACY_WAIT_FOR_TASK';
  preMigrationUpdateTaskId: string;
};

export type DeleteLegacyState = LegacyBaseState & {
  /** Delete the legacy index */
  controlState: 'DELETE_LEGACY';
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
  | OutdatedDocumentsScroll
  | OutdatedDocumentsTransform
  | OutdatedDocumentsClearScroll
  | MarkVersionIndexReady
  | CloneLegacyState
  | SetLegacyWriteBlockState
  | PreMigrateLegacyState
  | PreMigrateLegacyWaitForTaskState
  | DeleteLegacyState;

/**
 * A helper function/type for ensuring that all control state's are handled.
 */
function throwBadControlState(p: never): never;
function throwBadControlState(controlState: any) {
  throw new Error('Unknown control state: ' + controlState);
}

function indexVersion(indexName?: string) {
  return (indexName?.match(/\.kibana_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

/**
 * Merge the _meta mappings of an index with the given target mappings.
 *
 * @remarks Mapping updates are commutative (deeply merged) by Elasticsearch,
 * except for the _meta key. The source index we're migrating from might
 * contain documents created by a plugin that is disabled in the Kibana
 * instance performing this migration. We merge the _meta mappings from the
 * source index into the targetMappings to ensure that any
 * `migrationPropertyHashes` for disabled plugins aren't lost.
 *
 * Right now we don't use these `migrationPropertyHashes` but it could be used
 * in the future to optimize the `UPDATE_TARGET_MAPPINGS` step.
 *
 * @param targetMappings
 * @param indexMappings
 */
function mergeMappings(targetMappings: IndexMapping, indexMappings: IndexMapping) {
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

type Await<T> = T extends PromiseLike<infer U> ? U : never;

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
export type ResponseType<ControlState extends AllActionStates> = Await<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

const delayOrResetRetryState = (state: State, resW: ResponseType<AllActionStates>): State => {
  const delayRetryState = (error: Error): State => {
    if (state.retryCount === 5) {
      return {
        ...state,
        controlState: 'FATAL',
        error,
        log: [
          { level: 'error', message: 'Unable to complete action after 5 attempts, terminating.' },
        ],
      };
    } else {
      const retryCount = state.retryCount + 1;
      const retryDelay = 1000 * Math.pow(2, retryCount); // 2s, 4s, 8s, 16s, 32s, 64s

      return {
        ...state,
        retryCount,
        retryDelay,
        log: [
          {
            level: 'error',
            message:
              chalk.red('ERROR: ') +
              `Action failed with '${error.message}'. Retrying attempt ${retryCount} out of 5 in ${
                retryDelay / 1000
              } seconds.`,
          },
          ...state.log,
        ],
      };
    }
  };
  const resetRetryState = (): State => {
    return { ...state, ...{ retryCount: 0, retryDelay: 0 } };
  };

  return Either.fold(delayRetryState, resetRetryState)(resW);
};

export const model = (currentState: State, resW: ResponseType<AllActionStates>): State => {
  // The action response `resW` is weakly typed, the type includes all action
  // responses. Each control state only triggers one action so each control
  // state only has one action response type. This allows us to narrow the
  // response type to only the action response associated with a specific
  // control state using
  // `const res = resW as ResponseType<typeof stateP.controlState>;`

  let stateP: State = { ...currentState, ...{ log: [] } };
  stateP = delayOrResetRetryState(stateP, resW);
  if (Either.isLeft(resW)) {
    return stateP;
  }

  if (stateP.controlState === 'INIT') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    const CURRENT_ALIAS = stateP.indexPrefix;
    const VERSION_ALIAS = stateP.indexPrefix + '_' + stateP.kibanaVersion;
    const LEGACY_INDEX = stateP.indexPrefix;

    if (Either.isRight(res)) {
      const indices = res.right;
      const aliases = Object.keys(indices).reduce((acc, index) => {
        Object.keys(indices[index].aliases || {}).forEach((alias) => {
          // TODO handle multiple .kibana aliases pointing to the same index?
          acc[alias] = index;
        });
        return acc;
      }, {} as Record<string, string>);

      if (
        // `.kibana` and the version specific aliases both exists and
        // are pointing to the same index. This version's migration has already
        // been completed.
        aliases[CURRENT_ALIAS] != null &&
        aliases[VERSION_ALIAS] != null &&
        aliases[CURRENT_ALIAS] === aliases[VERSION_ALIAS]
      ) {
        stateP = {
          ...stateP,
          // Skip to 'UPDATE_TARGET_MAPPINGS' to update the mappings and
          // transform any outdated documents for in case a new plugin was
          // installed / enabled.
          controlState: 'UPDATE_TARGET_MAPPINGS',
          // Source is a none because we didn't do any migration from a source
          // index
          source: Option.none,
          target: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
          targetMappings: mergeMappings(
            stateP.targetMappings,
            indices[aliases[CURRENT_ALIAS]].mappings
          ),
          versionIndexReadyActions: Option.none,
        };
      } else if (
        // `.kibana` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 node found `.kibana_7.12.0_001`
        valid(indexVersion(aliases[CURRENT_ALIAS])) &&
        gt(indexVersion(aliases[CURRENT_ALIAS]), stateP.kibanaVersion)
      ) {
        stateP = {
          ...stateP,
          controlState: 'FATAL',
          error: new Error(
            `The ${CURRENT_ALIAS} alias is pointing to a newer version of Kibana: v${indexVersion(
              aliases[CURRENT_ALIAS]
            )}`
          ),
        };
      } else if (
        // If the `.kibana` alias exists
        aliases[CURRENT_ALIAS] != null
      ) {
        // The source index is the index the `.kibana` alias points to
        const source = aliases[CURRENT_ALIAS];
        const target = `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`;
        stateP = {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: Option.some(source) as Option.Some<string>,
          target,
          targetMappings: mergeMappings(stateP.targetMappings, indices[source].mappings),
          versionIndexReadyActions: Option.some([
            { remove: { index: source, alias: CURRENT_ALIAS, must_exist: true } },
            { add: { index: target, alias: CURRENT_ALIAS } },
            { add: { index: target, alias: VERSION_ALIAS } },
          ]),
        };
      } else if (indices[LEGACY_INDEX] != null) {
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

        const target = `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`;
        stateP = {
          ...stateP,
          controlState: 'SET_LEGACY_WRITE_BLOCK',
          source: Option.some(`${stateP.indexPrefix}_${legacyVersion}_001`) as Option.Some<string>,
          target,
          targetMappings: mergeMappings(stateP.targetMappings, indices[LEGACY_INDEX].mappings),
          legacy: `.kibana`,
          versionIndexReadyActions: Option.some([
            { add: { index: target, alias: CURRENT_ALIAS } },
            { add: { index: target, alias: VERSION_ALIAS } },
          ]),
        };
      } else {
        // This cluster doesn't have an existing Saved Object index, create a
        // new version specific index.
        const target = `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`;
        stateP = {
          ...stateP,
          controlState: 'CREATE_NEW_TARGET',
          source: Option.none as Option.None,
          target,
          versionIndexReadyActions: Option.some([
            { add: { index: target, alias: CURRENT_ALIAS } },
            { add: { index: target, alias: VERSION_ALIAS } },
          ]),
        };
      }
    }
    return stateP;
  } else if (stateP.controlState === 'SET_LEGACY_WRITE_BLOCK') {
    return { ...stateP, controlState: 'CLONE_LEGACY' };
  } else if (stateP.controlState === 'CLONE_LEGACY') {
    if (stateP.preMigrationScript != null) {
      return {
        ...stateP,
        controlState: 'PRE_MIGRATE_LEGACY',
      };
    } else {
      return { ...stateP, controlState: 'SET_SOURCE_WRITE_BLOCK' };
    }
  } else if (stateP.controlState === 'PRE_MIGRATE_LEGACY') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      stateP = {
        ...stateP,
        controlState: 'PRE_MIGRATE_LEGACY_WAIT_FOR_TASK',
        preMigrationUpdateTaskId: res.right.taskId,
      };
    }
    return stateP;
  } else if (stateP.controlState === 'PRE_MIGRATE_LEGACY_WAIT_FOR_TASK') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res) && Option.isSome(res.right.failures)) {
      // TODO: ignore index closed error
      return { ...stateP, controlState: 'FATAL' };
    }
    return { ...stateP, controlState: 'DELETE_LEGACY' };
  } else if (stateP.controlState === 'DELETE_LEGACY') {
    return { ...stateP, controlState: 'CLONE_SOURCE_TO_TARGET' };
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    return { ...stateP, controlState: 'CLONE_SOURCE_TO_TARGET' };
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
    if (Either.isRight(res) && Option.isSome(res.right.failures)) {
      return { ...stateP, controlState: 'FATAL' };
    }
    const outdatedDocumentsQuery = {
      bool: {
        should: Object.entries(stateP.migrationVersionPerType).map(([type, latestVersion]) => ({
          bool: {
            must: [
              { exists: { field: type } },
              {
                bool: {
                  must_not: { term: { [`migrationVersion.${type}`]: '7.11.0' } }, // TODO replace with `latestVersion`
                },
              },
            ],
          },
        })),
      },
    };
    return {
      ...stateP,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH',
      outdatedDocumentsQuery,
    };
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SEARCH') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      // If there are no more results, clear the scroll
      if (res.right.docs.length === 0) {
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_CLEAR_SCROLL',
          transformDocumentsScrollId: res.right.scrollId,
        };
      }

      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
        transformDocumentsScrollId: res.right.scrollId,
        outdatedDocuments: res.right.docs,
      };
    }
    return stateP;
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SCROLL') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      // If there are no more results, clear the scroll
      if (res.right.docs.length === 0) {
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_CLEAR_SCROLL',
        };
      }
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
        transformDocumentsScrollId: res.right.scrollId,
        outdatedDocuments: res.right.docs,
      };
    }
    return stateP;
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_TRANSFORM') {
    return {
      ...stateP,
      controlState: 'OUTDATED_DOCUMENTS_SCROLL',
    };
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_CLEAR_SCROLL') {
    if (Option.isSome(stateP.versionIndexReadyActions)) {
      return {
        ...stateP,
        controlState: 'MARK_VERSION_INDEX_READY',
        versionIndexReadyActions: stateP.versionIndexReadyActions,
      };
    } else {
      return {
        ...stateP,
        controlState: 'DONE',
      };
    }
  } else if (stateP.controlState === 'CREATE_NEW_TARGET') {
    if (Option.isSome(stateP.versionIndexReadyActions)) {
      return {
        ...stateP,
        controlState: 'MARK_VERSION_INDEX_READY',
        versionIndexReadyActions: stateP.versionIndexReadyActions,
      };
    } else {
      return {
        ...stateP,
        controlState: 'DONE',
      };
    }
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
      Actions.fetchIndices(client, [
        state.indexPrefix,
        state.indexPrefix + '_' + state.kibanaVersion,
      ]),
    SET_SOURCE_WRITE_BLOCK: (state: SetSourceWriteBlockState) =>
      Actions.setIndexWriteBlock(client, state.source.value),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex(client, state.target, state.targetMappings),
    CLONE_SOURCE_TO_TARGET: (state: CloneSourceToTargetState) =>
      Actions.cloneIndex(client, state.source.value, state.target),
    UPDATE_TARGET_MAPPINGS: (state: UpdateTargetMappingsState) =>
      Actions.updateAndPickupMappings(client, state.target, state.targetMappings),
    UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK: (state: UpdateTargetMappingsWaitForTaskState) =>
      Actions.waitForTask(client, state.updateTargetMappingsTaskId, '60s'),
    OUTDATED_DOCUMENTS_SEARCH: (state: OutdatedDocumentsSearch) =>
      Actions.search(client, state.target, state.outdatedDocumentsQuery),
    OUTDATED_DOCUMENTS_SCROLL: (state: OutdatedDocumentsScroll) =>
      Actions.scroll(client, state.transformDocumentsScrollId),
    OUTDATED_DOCUMENTS_CLEAR_SCROLL: (state: OutdatedDocumentsClearScroll) =>
      Actions.clearScroll(client, state.transformDocumentsScrollId),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      pipe(
        TaskEither.tryCatch(
          () => transformRawDocs(state.outdatedDocuments),
          (e) => {
            throw e;
          }
        ),
        TaskEither.chain((docs) => Actions.bulkIndex(client, state.target, docs))
      ),
    MARK_VERSION_INDEX_READY: (state: MarkVersionIndexReady) =>
      Actions.updateAliases(client, state.versionIndexReadyActions.value),
    CLONE_LEGACY: flow(
      // Clone legacy index into a new source index, will ignore index exists error
      (state: CloneLegacyState) => Actions.cloneIndex(client, state.legacy, state.source.value),
      TaskEither.orElse((error) => {
        // Ignore if legacy index doesn't exist, this probably means another
        // Kibana instance already completed the legacy pre-migration and
        // deleted it
        if (error.message === 'index_not_found_exception') {
          return TaskEither.right({ acknowledged: true, shardsAcknowledged: true });
        } else {
          return TaskEither.left(error);
        }
      })
    ),
    SET_LEGACY_WRITE_BLOCK: flow(
      (state: SetLegacyWriteBlockState) => Actions.setIndexWriteBlock(client, state.legacy),
      TaskEither.orElse((error) => {
        // Ignore if legacy index doesn't exist, this probably means another
        // Kibana instance already completed the legacy pre-migration and
        // deleted it
        if (error.message === 'index_not_found_exception') {
          return TaskEither.right({ acknowledged: true });
        } else {
          return TaskEither.left(error);
        }
      })
    ),
    PRE_MIGRATE_LEGACY: (state: PreMigrateLegacyState) =>
      // Start an update by query to pre-migrate the source index using the
      // supplied script.
      Actions.updateByQuery(client, state.source.value, state.preMigrationScript),
    PRE_MIGRATE_LEGACY_WAIT_FOR_TASK: (state: PreMigrateLegacyWaitForTaskState) =>
      // Wait for the preMigrationUpdateTaskId task to complete
      Actions.waitForTask(client, state.preMigrationUpdateTaskId, '60s'),
    DELETE_LEGACY: flow(
      (state: DeleteLegacyState) => Actions.deleteIndex(client, state.legacy),
      TaskEither.orElse((error) => {
        // Ignore if legacy index doesn't exist, this probably means another
        // Kibana instance already completed the legacy pre-migration and
        // deleted it
        if (error.message === 'index_not_found_exception') {
          return TaskEither.right({});
        } else {
          return TaskEither.left(error);
        }
      })
    ),
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
    // TS infers (state: never) => ... here because state is inferred to be the
    // intersection of all states instead of the union.
    const nextAction = map[state.controlState] as (
      state: State
    ) => ReturnType<typeof map[AllActionStates]>;
    return delay(nextAction(state));
  }
};

/**
 * A state-action machine for performing Saved Object Migrations.
 *
 * Based on https://www.microsoft.com/en-us/research/uploads/prod/2016/12/Computation-and-State-Machines.pdf
 *
 * The state-action machine defines it's behaviour in steps. Each step is a
 * transition from a state s_i to the state s_i+1 caused by an action a_i.
 *
 * s_i   -> a_i -> s_i+1
 * s_i+1 -> a_i+1 -> s_i+2
 *
 * Given a state s1, `next(s1)` returns the next action to execute. Actions are
 * asynchronous, once the action resolves, we can use the action response to
 * determine the next state to transition to as defined by the function
 * `model(state, response)`.
 *
 * We can then loosely define a step as:
 * s_i+1 = model(s_i, await next(s_i)())
 *
 * When there are no more actions returned by `next` the state-action machine
 * terminates.
 */
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
  let state: State = {
    indexPrefix,
    controlState: 'INIT',
    kibanaVersion,
    preMigrationScript,
    targetMappings,
    migrationVersionPerType,
    retryCount: 0,
    retryDelay: 0,
    log: [],
  };

  let controlStateStepCounter = 0;

  console.log(chalk.magentaBright('INIT\n'));
  let nextAction = next(client, transformRawDocs, state);

  while (nextAction != null) {
    const actionResult = await nextAction();

    console.log(
      chalk.magentaBright(`${state.controlState}:${state.indexPrefix}`),
      chalk.cyanBright('RESPONSE\n'),
      JSON.stringify(actionResult, null, 2)
    );

    const newState = model(state, actionResult);
    if (newState.log.length > 0) {
      newState.log.forEach((log) => console[log.level](log.message));
    }
    controlStateStepCounter =
      newState.controlState === state.controlState ? controlStateStepCounter + 1 : 0;
    if (controlStateStepCounter > 10) {
      throw new Error("Control state didn't change after 10 steps aborting.");
    }
    state = newState;
    console.log(
      chalk.magentaBright(`${state.controlState}:${state.indexPrefix}` + '\n'),
      JSON.stringify(state)
    );

    nextAction = next(client, transformRawDocs, state);
  }

  console.log(chalk.greenBright('DONE\n'), state);
}
