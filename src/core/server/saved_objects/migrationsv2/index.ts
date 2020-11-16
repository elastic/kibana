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
import { gt } from 'semver';
import chalk from 'chalk';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as Actions from './actions';
import { IndexMapping } from '../mappings';
import { Logger } from '../../logging';
import { SavedObjectsMigrationVersion } from '../types';
import { SavedObjectsRawDoc, SavedObjectsSerializer } from '..';

export interface BaseState {
  /** The first part of the index name such as `.kibana` or `.kibana_task_manager` */
  indexPrefix: string;
  /** Kibana version number */
  kibanaVersion: string;
  /** The source index is the index from which the migration reads */
  source: string;
  /** The target index is the index to which the migration writes */
  target: string;
  /** The mappings to apply to the target index */
  targetMappings: IndexMapping;
  /** Script to apply to a legacy index before it can be used as a migration source */
  preMigrationScript?: string;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  retryCount: number;
  retryDelay: number;
  aliases: Record<string, string>;
  log: Array<{ level: 'error' | 'info'; message: string }>;
}

// Initial state
export type InitState = BaseState & {
  controlState: 'INIT';
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

export type SetSourceWriteBlockState = BaseState & {
  /** Set a write block on the source index to prevent any further writes */
  controlState: 'SET_SOURCE_WRITE_BLOCK';
};

export type InitNewIndicesState = BaseState & {
  /** Blank ES cluster, create new kibana indices */
  controlState: 'INIT_NEW_INDICES';
};

export type CloneSourceState = BaseState & {
  /** Create the target index by cloning the source index */
  controlState: 'CLONE_SOURCE';
};

export type UpdateTargetMappingsState = BaseState & {
  /** Update the mappings of the target index */
  controlState: 'UPDATE_TARGET_MAPPINGS';
};

export type UpdateTargetMappingsWaitForTaskState = BaseState & {
  /** Update the mappings of the target index */
  controlState: 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK';
  updateTargetMappingsTaskId: string;
};

export type OutdatedDocumentsSearch = BaseState & {
  /** Start a scroll search for outdated documents in the target index */
  controlState: 'OUTDATED_DOCUMENTS_SEARCH';
  outdatedDocumentsQuery: Record<string, unknown>;
};

export type OutdatedDocumentsScroll = BaseState & {
  /** Retrieve the next batch of results from the scroll search for outdated documents in the target index */
  controlState: 'OUTDATED_DOCUMENTS_SCROLL';
  transformDocumentsScrollId: string;
};

export type OutdatedDocumentsTransform = BaseState & {
  /** Transform a batch of outdated documents to their latest version and write them to the target index */
  controlState: 'OUTDATED_DOCUMENTS_TRANSFORM';
  outdatedDocuments: SavedObjectsRawDoc[];
  transformDocumentsScrollId: string;
};

export type OutdatedDocumentsClearScroll = BaseState & {
  /** When there are no more results, clear the scroll */
  controlState: 'OUTDATED_DOCUMENTS_CLEAR_SCROLL';
  transformDocumentsScrollId: string;
};

/**
 * If there's a legacy index prepare it for migration.
 */
export type LegacyBaseState = BaseState & {
  legacy: string;
};

export type CloneLegacyState = LegacyBaseState & {
  /** Create a 'source' index for the migration by cloning the legacy index */
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
  | InitNewIndicesState
  | CloneSourceState
  | UpdateTargetMappingsState
  | UpdateTargetMappingsWaitForTaskState
  | OutdatedDocumentsSearch
  | OutdatedDocumentsScroll
  | OutdatedDocumentsTransform
  | OutdatedDocumentsClearScroll
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

function indexVersion(indexName: string) {
  return (indexName.match(/\.kibana_(\d+\.\d+\.\d+)_\d+/) || [])[1];
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

type Await<T> = T extends PromiseLike<infer U> ? U : T;

type AllControlStates = State['controlState'];
/**
 * All control states that trigger an action (excludes the terminal states
 * 'FATAL' and 'DONE').
 */
type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
type ResponseType<ControlState extends AllActionStates> = Await<
  ReturnType<ReturnType<typeof nextActionMap>[ControlState]>
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
          targetMappings: mergeMappings(
            stateP.targetMappings,
            indices[aliases[CURRENT_ALIAS]].mappings
          ),
        };
      } else if (
        // `.kibana` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 node found `.kibana_7.12.0_001`
        aliases[CURRENT_ALIAS] != null &&
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
        stateP = {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source,
          target: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
          targetMappings: mergeMappings(stateP.targetMappings, indices[source].mappings),
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

        stateP = {
          ...stateP,
          controlState: 'SET_LEGACY_WRITE_BLOCK',
          source: `${stateP.indexPrefix}_${legacyVersion}_001`,
          target: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
          targetMappings: mergeMappings(stateP.targetMappings, indices[LEGACY_INDEX].mappings),
          legacy: `.kibana`,
        };
      } else {
        // This cluster doesn't have an existing Saved Object index, create a
        // new version specific index.
        stateP = {
          ...stateP,
          controlState: 'INIT_NEW_INDICES',
          target: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
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
    return { ...stateP, controlState: 'CLONE_SOURCE' };
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    return { ...stateP, controlState: 'CLONE_SOURCE' };
  } else if (stateP.controlState === 'CLONE_SOURCE') {
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
    return { ...stateP, controlState: 'DONE' };
  } else if (stateP.controlState === 'INIT_NEW_INDICES') {
    return { ...stateP, controlState: 'DONE' };
  } else if (stateP.controlState === 'DONE' || stateP.controlState === 'FATAL') {
    return stateP;
  } else {
    return throwBadControlState(stateP);
  }
};

export const nextActionMap = (
  client: ElasticsearchClient,
  transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) => Promise<SavedObjectsRawDoc[]>,
  state: State
) => {
  return {
    FATAL: null,
    DONE: null,
    INIT: Actions.fetchIndices(client, ['.kibana', '.kibana_7.11.0']),
    SET_SOURCE_WRITE_BLOCK: Actions.setIndexWriteBlock(client, state.source),
    INIT_NEW_INDICES: Actions.createIndex(client, state.target, state.targetMappings),
    CLONE_SOURCE: Actions.cloneIndex(client, state.source, state.target),
    UPDATE_TARGET_MAPPINGS: Actions.updateAndPickupMappings(
      client,
      state.target,
      (state as UpdateTargetMappingsState).targetMappings
    ),
    UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK:
      // Wait for the updateTargetMappingsTaskId task to complete
      Actions.waitForTask(
        client,
        (state as UpdateTargetMappingsWaitForTaskState).updateTargetMappingsTaskId,
        '60s'
      ),
    OUTDATED_DOCUMENTS_SEARCH: Actions.search(
      client,
      state.target,
      (state as OutdatedDocumentsSearch).outdatedDocumentsQuery
    ),
    TARGET_DOCUMENTS_SCROLL: Actions.scroll(
      client,
      (state as OutdatedDocumentsScroll).transformDocumentsScrollId
    ),
    TARGET_DOCUMENTS_CLEAR_SCROLL: Actions.clearScroll(
      client,
      (state as OutdatedDocumentsClearScroll).transformDocumentsScrollId
    ),
    TARGET_DOCUMENTS_TRANSFORM: pipe(
      TaskEither.tryCatch(
        () => transformRawDocs((state as OutdatedDocumentsTransform).outdatedDocuments),
        (e) => {
          throw e;
        }
      ),
      TaskEither.chain((docs) => Actions.bulkIndex(client, state.target, docs))
    ),
    CLONE_LEGACY: pipe(
      // Clone legacy index into a new source index, will ignore index exists error
      Actions.cloneIndex(client, (state as CloneLegacyState).legacy, state.source),
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
    SET_LEGACY_WRITE_BLOCK: pipe(
      Actions.setIndexWriteBlock(client, (state as SetLegacyWriteBlockState).legacy),
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
    PRE_MIGRATE_LEGACY:
      // Start an update by query to pre-migrate the source index using the
      // supplied script.
      Actions.updateByQuery(client, state.source, state.preMigrationScript),
    PRE_MIGRATE_LEGACY_WAIT_FOR_TASK:
      // Wait for the preMigrationUpdateTaskId task to complete
      Actions.waitForTask(
        client,
        (state as PreMigrateLegacyWaitForTaskState).preMigrationUpdateTaskId,
        '60s'
      ),
    DELETE_LEGACY: pipe(
      Actions.deleteIndex(client, (state as DeleteLegacyState).legacy),
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
  const delay = <F extends () => any>(fn: F): (() => ReturnType<F>) => {
    return () => {
      return state.retryDelay > 0
        ? new Promise((resolve) => setTimeout(resolve, state.retryDelay)).then(fn)
        : fn();
    };
  };

  const map = nextActionMap(client, transformRawDocs, state);

  const nextAction = map[state.controlState];
  if (nextAction != null) {
    return delay(nextAction);
  } else {
    return nextAction;
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
    aliases: {},
    source: '',
    preMigrationScript,
    target: '',
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
      chalk.magentaBright(state.controlState),
      chalk.cyanBright('RESPONSE\n'),
      actionResult
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
    console.log(chalk.magentaBright(state.controlState + '\n'), state);

    nextAction = next(client, transformRawDocs, state);
  }

  console.log(chalk.greenBright('DONE\n'), state);
}
