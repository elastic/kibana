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

import { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { gt, valid } from 'semver';
import chalk from 'chalk';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { cloneDeep } from 'lodash';
import { flow } from 'fp-ts/lib/function';
import * as Actions from './actions';
import { IndexMapping } from '../mappings';
import { Logger } from '../../logging';
import { SavedObjectsMigrationVersion } from '../types';
import { AliasAction } from './actions';
import { ControlState, stateActionMachine } from './state_action_machine';
import { SavedObjectsRawDoc, SavedObjectsSerializer } from '..';

export interface BaseState extends ControlState {
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
  logs: Array<{ level: 'error' | 'info'; message: string }>;
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
  legacyPreMigrationDoneActions: AliasAction[];
  /** The mappings read from the legacy index, used to create a new reindex
   * target index  */
  legacyReindexTargetMappings: IndexMapping;
};

export type LegacySetWriteBlockState = LegacyBaseState & {
  /** Set a write block on the legacy index to prevent any further writes */
  controlState: 'LEGACY_SET_WRITE_BLOCK';
};

export type LegacyCreateReindexTargetState = LegacyBaseState & {
  /** Prepare a new 'source' index for the migration by cloning the legacy index */
  controlState: 'LEGACY_CREATE_REINDEX_TARGET';
};

export type LegacyReindexState = LegacyBaseState & {
  /** Apply the pre-migration script to the legacy clone to prepare it for a migration */
  controlState: 'LEGACY_REINDEX';
};

export type LegacyReindexWaitForTaskState = LegacyBaseState & {
  /** Apply the pre-migration script to the legacy clone to prepare it for a migration */
  controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK';
  preMigrationUpdateTaskId: string;
};

export type LegacyDeleteState = LegacyBaseState & {
  /** Delete the legacy index */
  controlState: 'LEGACY_DELETE';
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
 * Extracts the version number from a >= 7.11 index
 * @param indexName A >= v7.11 index name
 */
function indexVersion(indexName?: string) {
  return (indexName?.match(/\.kibana_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

/**
 * The current alias e.g. `.kibana`
 * @param state
 */
const currentAlias = (state: State) => state.indexPrefix;
/**
 * The version alias e.g. `.kibana_7.11.0`
 * @param state
 */
const versionAlias = (state: InitState) => state.indexPrefix + '_' + state.kibanaVersion;
/**
 * The name of the concrete legacy index e.g. `.kibana` for version < 6.5 or
 * `.kibana_task_manager` for version < 7.4
 * @param state
 */
const legacyIndex = (state: InitState) => state.indexPrefix;

const versionIndex = (state: InitState) => `${state.indexPrefix}_${state.kibanaVersion}_001`;

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

const delayOrResetRetryState = <S extends State>(
  state: S,
  resW: ResponseType<AllActionStates>
): S => {
  const delayRetryState = (error: Error): S => {
    if (state.retryCount === 5) {
      return {
        ...state,
        controlState: 'FATAL',
        error,
        logs: [
          ...state.logs,
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
        logs: [
          ...state.logs,
          {
            level: 'error',
            message:
              chalk.red('ERROR: ') +
              `Action failed with '${error.message}'. Retrying attempt ${retryCount} out of 5 in ${
                retryDelay / 1000
              } seconds.`,
          },
        ],
      };
    }
  };
  const resetRetryState = (): S => {
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

  let stateP: State = cloneDeep(currentState);
  stateP = delayOrResetRetryState(stateP, resW);
  if (Either.isLeft(resW)) {
    return stateP;
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
        aliases[currentAlias(stateP)] != null &&
        aliases[versionAlias(stateP)] != null &&
        aliases[currentAlias(stateP)] === aliases[versionAlias(stateP)]
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
            indices[aliases[currentAlias(stateP)]].mappings
          ),
          versionIndexReadyActions: Option.none,
        };
      } else if (
        // `.kibana` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 node found `.kibana_7.12.0_001`
        valid(indexVersion(aliases[currentAlias(stateP)])) &&
        gt(indexVersion(aliases[currentAlias(stateP)]), stateP.kibanaVersion)
      ) {
        stateP = {
          ...stateP,
          controlState: 'FATAL',
          error: new Error(
            `The ${currentAlias(
              stateP
            )} alias is pointing to a newer version of Kibana: v${indexVersion(
              aliases[currentAlias(stateP)]
            )}`
          ),
        };
      } else if (
        // If the `.kibana` alias exists
        aliases[currentAlias(stateP)] != null
      ) {
        // The source index is the index the `.kibana` alias points to
        const source = aliases[currentAlias(stateP)];
        const target = versionIndex(stateP);
        stateP = {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: Option.some(source) as Option.Some<string>,
          target,
          targetMappings: mergeMappings(stateP.targetMappings, indices[source].mappings),
          versionIndexReadyActions: Option.some([
            { remove: { index: source, alias: currentAlias(stateP) /* must_exist: true*/ } }, // TODO: blocked by https://github.com/elastic/elasticsearch/issues/62642
            { add: { index: target, alias: currentAlias(stateP) } },
            { add: { index: target, alias: versionAlias(stateP) } },
          ]),
        };
      } else if (indices[legacyIndex(stateP)] != null) {
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

        const target = versionIndex(stateP);
        stateP = {
          ...stateP,
          controlState: 'LEGACY_SET_WRITE_BLOCK',
          source: Option.some(legacyReindexTarget) as Option.Some<string>,
          target,
          targetMappings: mergeMappings(
            stateP.targetMappings,
            indices[legacyIndex(stateP)].mappings
          ),
          legacy: legacyIndex(stateP),
          legacyReindexTargetMappings: indices[legacyIndex(stateP)].mappings,
          legacyPreMigrationDoneActions: [
            { remove_index: { index: legacyIndex(stateP) } },
            {
              add: {
                index: legacyReindexTarget,
                alias: currentAlias(stateP),
              },
            },
          ],
          versionIndexReadyActions: Option.some([
            {
              remove: {
                index: legacyReindexTarget,
                alias: currentAlias(stateP),
                must_exist: true, // TODO: blocked by https://github.com/elastic/elasticsearch/issues/62642
              },
            },
            { add: { index: target, alias: currentAlias(stateP) } },
            { add: { index: target, alias: versionAlias(stateP) } },
          ]),
        };
      } else {
        // This cluster doesn't have an existing Saved Object index, create a
        // new version specific index.
        const target = versionIndex(stateP);
        stateP = {
          ...stateP,
          controlState: 'CREATE_NEW_TARGET',
          source: Option.none as Option.None,
          target,
          versionIndexReadyActions: Option.some([
            { add: { index: target, alias: currentAlias(stateP) } },
            { add: { index: target, alias: versionAlias(stateP) } },
          ]),
        };
      }
    }
    return stateP;
  } else if (stateP.controlState === 'LEGACY_SET_WRITE_BLOCK') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isLeft(res)) {
      // Ignore if legacy index doesn't exist, this probably means another
      // Kibana instance already completed the legacy pre-migration and
      // deleted it
      if (res.left.message === 'index_not_found_exception') {
        return delayOrResetRetryState(stateP, Either.right({}));
      } else {
        return stateP;
      }
    } else {
      return { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
    }
  } else if (stateP.controlState === 'LEGACY_CREATE_REINDEX_TARGET') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isLeft(res)) {
      // Ignore if legacy index doesn't exist, this probably means another
      // Kibana instance already completed the legacy pre-migration and
      // deleted it
      if (res.left.message === 'index_not_found_exception') {
        return delayOrResetRetryState(stateP, Either.right({}));
      } else {
        return stateP;
      }
    } else {
      return {
        ...stateP,
        controlState: 'LEGACY_REINDEX',
      };
    }
  } else if (stateP.controlState === 'LEGACY_REINDEX') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK',
        preMigrationUpdateTaskId: res.right.taskId,
      };
    } else {
      return stateP;
    }
  } else if (stateP.controlState === 'LEGACY_REINDEX_WAIT_FOR_TASK') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res) && Option.isSome(res.right.failures)) {
      // TODO: ignore index closed error
      return { ...stateP, controlState: 'FATAL' };
    }
    return {
      ...stateP,
      controlState: 'LEGACY_DELETE',
    };
  } else if (stateP.controlState === 'LEGACY_DELETE') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isLeft(res)) {
      // Ignore if legacy index doesn't exist, this probably means another
      // Kibana instance already completed the legacy pre-migration and
      // deleted it
      if (res.left.message === 'index_not_found_exception') {
        return delayOrResetRetryState(stateP, Either.right({}));
      } else {
        return stateP;
      }
    } else {
      return { ...stateP, controlState: 'SET_SOURCE_WRITE_BLOCK' };
    }
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
      return {
        ...stateP,
        controlState: 'FATAL',
        logs: [
          ...stateP.logs,
          {
            level: 'error',
            message:
              'Failed to update target mappings: ' + JSON.stringify(res.right.failures.value),
          },
        ],
      };
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
    // TODO Handle "required alias [.kibana] does not exist" errors blocked by https://github.com/elastic/elasticsearch/issues/62642
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
      Actions.fetchIndices(client, [currentAlias(state), versionAlias(state)]),
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
    LEGACY_CREATE_REINDEX_TARGET: (state: LegacyCreateReindexTargetState) =>
      Actions.createIndex(client, state.source.value, state.legacyReindexTargetMappings),
    LEGACY_REINDEX: (state: LegacyReindexState) =>
      Actions.reindex(client, state.legacy, state.source.value, state.preMigrationScript),
    LEGACY_SET_WRITE_BLOCK: (state: LegacySetWriteBlockState) =>
      Actions.setIndexWriteBlock(client, state.legacy),
    LEGACY_REINDEX_WAIT_FOR_TASK: (state: LegacyReindexWaitForTaskState) =>
      Actions.waitForTask(client, state.preMigrationUpdateTaskId, '60s'),
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
    // TS infers (state: never) => ... here because state is inferred to be the
    // intersection of all states instead of the union.
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
  const initialState: State = {
    indexPrefix,
    controlState: 'INIT',
    kibanaVersion,
    preMigrationScript,
    targetMappings,
    migrationVersionPerType,
    retryCount: 0,
    retryDelay: 0,
    logs: [],
  };

  const logStateTransition = (oldState: State, newState: State) => {
    if (newState.logs.length > oldState.logs.length) {
      newState.logs.slice(oldState.logs.length).forEach((log) => logger[log.level](log.message));
    }

    // @ts-expect-error
    const { logs, outdatedDocuments, ...logState } = newState;
    logger.info(
      `${oldState.controlState} -> ${newState.controlState}:${newState.indexPrefix}` +
        JSON.stringify(logState)
    );
  };

  const logActionResponse = (state: State, res: unknown) => {
    logger.info(`${state.controlState} RESPONSE:${state.indexPrefix}` + JSON.stringify(res));
  };

  return await stateActionMachine<State>(
    initialState,
    (state) => next(client, transformRawDocs, state),
    (state, res) => {
      logActionResponse(state, res);
      const newState = model(state, res);
      logStateTransition(state, newState);
      return newState;
    }
  );
}
