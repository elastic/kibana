/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { gt, valid } from 'semver';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { cloneDeep } from 'lodash';
import { AliasAction, FetchIndexResponse, RetryableEsClientError } from './actions';
import { AllActionStates, InitState, State } from './types';
import { IndexMapping } from '../mappings';
import { ResponseType } from './next';
import { SavedObjectsMigrationVersion } from '../types';
import { disableUnknownTypeMappingFields } from '../migrations/core/migration_context';

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

/**
 * A helper function/type for ensuring that all control state's are handled.
 */
function throwBadControlState(p: never): never;
function throwBadControlState(controlState: any) {
  throw new Error('Unexpected control state: ' + controlState);
}

/**
 * A helper function/type for ensuring that all response types are handled.
 */
function throwBadResponse(state: State, p: never): never;
function throwBadResponse(state: State, res: any): never {
  throw new Error(
    `${state.controlState} received unexpected action response: ` + JSON.stringify(res)
  );
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
 * in the future to detect if mappings were changed. If mappings weren't
 * changed we don't need to reindex but can clone the index to save disk space.
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

function indexBelongsToLaterVersion(indexName: string, kibanaVersion: string): boolean {
  const version = valid(indexVersion(indexName));
  return version != null ? gt(version, kibanaVersion) : false;
}
/**
 * Extracts the version number from a >= 7.11 index
 * @param indexName A >= v7.11 index name
 */
function indexVersion(indexName?: string): string | undefined {
  return (indexName?.match(/.+_(\d+\.\d+\.\d+)_\d+/) || [])[1];
}

/**
 * Creates a record of alias -> index name pairs
 */
function getAliases(indices: FetchIndexResponse) {
  return Object.keys(indices).reduce((acc, index) => {
    Object.keys(indices[index].aliases || {}).forEach((alias) => {
      // TODO throw if multiple .kibana aliases point to the same index?
      acc[alias] = index;
    });
    return acc;
  }, {} as Record<string, string>);
}

const delayRetryState = <S extends State>(state: S, left: RetryableEsClientError): S => {
  if (state.retryCount === MAX_RETRY_ATTEMPTS) {
    return {
      ...state,
      controlState: 'FATAL',
      reason: `Unable to complete the ${state.controlState} step after ${MAX_RETRY_ATTEMPTS} attempts, terminating.`,
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

export type ExcludeRetryableEsError<Response> = Exclude<
  | Exclude<
      Response,
      Either.Either<Response extends Either.Left<unknown> ? Response['left'] : never, never>
    >
  | Either.Either<
      Exclude<
        Response extends Either.Left<unknown> ? Response['left'] : never,
        RetryableEsClientError
      >,
      Response extends Either.Right<unknown> ? Response['right'] : never
    >,
  Either.Left<never>
>;

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
    return delayRetryState(stateP, resW.left);
  } else {
    // If the action didn't fail with a retryable_es_client_error, reset the
    // retry counter and retryDelay state
    stateP = resetRetryState(stateP);
  }

  if (stateP.controlState === 'INIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    if (Either.isRight(res)) {
      const indices = res.right;
      const aliases = getAliases(indices);

      if (
        // `.kibana` and the version specific aliases both exists and
        // are pointing to the same index. This version's migration has already
        // been completed.
        aliases[stateP.currentAlias] != null &&
        aliases[stateP.versionAlias] != null &&
        aliases[stateP.currentAlias] === aliases[stateP.versionAlias]
      ) {
        return {
          ...stateP,
          // Skip to 'OUTDATED_DOCUMENTS_SEARCH' so that if a new plugin was
          // installed / enabled we can transform any old documents and update
          // the mappings for this plugin's types.
          controlState: 'OUTDATED_DOCUMENTS_SEARCH',
          // Source is a none because we didn't do any migration from a source
          // index
          sourceIndex: Option.none,
          targetIndex: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
          targetIndexMappings: disableUnknownTypeMappingFields(
            stateP.targetIndexMappings,
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
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `The ${
            stateP.currentAlias
          } alias is pointing to a newer version of Kibana: v${indexVersion(
            aliases[stateP.currentAlias]
          )}`,
        };
      } else if (
        // If the `.kibana` alias exists
        aliases[stateP.currentAlias] != null
      ) {
        // The source index is the index the `.kibana` alias points to
        const source = aliases[stateP.currentAlias];
        const target = stateP.versionIndex;
        return {
          ...stateP,
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          sourceIndex: Option.some(source) as Option.Some<string>,
          targetIndex: target,
          targetIndexMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetIndexMappings,
            indices[source].mappings
          ),
          versionIndexReadyActions: Option.some<AliasAction[]>([
            { remove: { index: source, alias: stateP.currentAlias, must_exist: true } },
            { add: { index: target, alias: stateP.currentAlias } },
            { add: { index: target, alias: stateP.versionAlias } },
            { remove_index: { index: stateP.tempIndex } },
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
        return {
          ...stateP,
          controlState: 'LEGACY_SET_WRITE_BLOCK',
          sourceIndex: Option.some(legacyReindexTarget) as Option.Some<string>,
          targetIndex: target,
          targetIndexMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetIndexMappings,
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
            { remove_index: { index: stateP.tempIndex } },
          ]),
        };
      } else {
        // This cluster doesn't have an existing Saved Object index, create a
        // new version specific index.
        const target = stateP.versionIndex;
        return {
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
    } else {
      return throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'LEGACY_SET_WRITE_BLOCK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    // If the write block is sucessfully in place
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
    } else if (Either.isLeft(res)) {
      // If the write block failed because the index doesn't exist, it means
      // another instance already completed the legacy pre-migration. Proceed
      // to the next step.
      if (res.left.type === 'index_not_found_exception') {
        return { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
      } else {
        // @ts-expect-error TS doesn't correctly narrow this type to never
        return throwBadResponse(stateP, res);
      }
    } else {
      return throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'LEGACY_CREATE_REINDEX_TARGET') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_REINDEX',
      };
    } else {
      // If the createIndex action receives an 'resource_already_exists_exception'
      // it will wait until the index status turns green so we don't have any
      // left responses to handle here.
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'LEGACY_REINDEX') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK',
        legacyReindexTaskId: res.right.taskId,
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'LEGACY_REINDEX_WAIT_FOR_TASK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_DELETE',
      };
    } else {
      const left = res.left;
      if (
        (left.type === 'index_not_found_exception' && left.index === stateP.legacyIndex) ||
        left.type === 'target_index_had_write_block'
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
      } else {
        // We don't handle the following errors as the algorithm will never
        // run into these during the LEGACY_REINDEX_WAIT_FOR_TASK step:
        //  - index_not_found_exception for the LEGACY_REINDEX target index
        //  - strict_dynamic_mapping_exception
        throwBadResponse(stateP, left as never);
      }
    }
  } else if (stateP.controlState === 'LEGACY_DELETE') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'SET_SOURCE_WRITE_BLOCK' };
    } else if (Either.isLeft(res)) {
      const left = res.left;
      if (
        left.type === 'remove_index_not_a_concrete_index' ||
        (left.type === 'index_not_found_exception' && left.index === stateP.legacyIndex)
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
      } else {
        // We don't handle the following errors as the migration algorithm
        // will never cause them to occur:
        // - alias_not_found_exception we're not using must_exist
        // - index_not_found_exception for source index into which we reindex
        //   the legacy index
        throwBadResponse(stateP, left as never);
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      // If the write block is successfully in place, proceed to the next step.
      return {
        ...stateP,
        controlState: 'CREATE_REINDEX_TEMP',
      };
    } else {
      // We don't handle the following errors as the migration algorithm
      // will never cause them to occur:
      // - index_not_found_exception
      return throwBadResponse(stateP, res as never);
    }
  } else if (stateP.controlState === 'CREATE_REINDEX_TEMP') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'REINDEX_SOURCE_TO_TEMP' };
    } else {
      // If the createIndex action receives an 'resource_already_exists_exception'
      // it will wait until the index status turns green so we don't have any
      // left responses to handle here.
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'REINDEX_SOURCE_TO_TEMP_WAIT_FOR_TASK',
        reindexSourceToTargetTaskId: res.right.taskId,
      };
    } else {
      // Since this is a background task, the request should always succeed,
      // errors only show up in the returned task.
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_WAIT_FOR_TASK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'SET_TEMP_WRITE_BLOCK',
      };
    } else {
      const left = res.left;
      if (
        left.type === 'target_index_had_write_block' ||
        (left.type === 'index_not_found_exception' && left.index === stateP.tempIndex)
      ) {
        // index_not_found_exception:
        //   another instance completed the MARK_VERSION_INDEX_READY and
        //   removed the temp index.
        // target_index_had_write_block
        //   another instance completed the SET_TEMP_WRITE_BLOCK step adding a
        //   write block to the temp index.
        //
        // For simplicity we continue linearly through the next steps even if
        // we know another instance already completed these.
        return {
          ...stateP,
          controlState: 'SET_TEMP_WRITE_BLOCK',
        };
      } else {
        // Don't handle incompatible_mapping_exception as we will never add a write
        // block to the temp index or change the mappings.
        throwBadResponse(stateP, left as never);
      }
    }
  } else if (stateP.controlState === 'SET_TEMP_WRITE_BLOCK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CLONE_TEMP_TO_TARGET',
      };
    } else {
      const left = res.left;
      if (left.type === 'index_not_found_exception') {
        // index_not_found_exception:
        //   another instance completed the MARK_VERSION_INDEX_READY and
        //   removed the temp index.
        //
        // For simplicity we continue linearly through the next steps even if
        // we know another instance already completed these.
        return {
          ...stateP,
          controlState: 'CLONE_TEMP_TO_TARGET',
        };
      } else {
        // @ts-expect-error TS doesn't correctly narrow this to never
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'CLONE_TEMP_TO_TARGET') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH',
      };
    } else {
      const left = res.left;
      if (left.type === 'index_not_found_exception') {
        // index_not_found_exception means another instance alread completed
        // the MARK_VERSION_INDEX_READY step and removed the temp index
        // We still perform the OUTDATED_DOCUMENTS_* and
        // UPDATE_TARGET_MAPPINGS steps since we might have plugins enabled
        // which the other instances don't.
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH',
        };
      }
      throwBadResponse(stateP, res as never);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SEARCH') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
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
        return {
          ...stateP,
          controlState: 'UPDATE_TARGET_MAPPINGS',
        };
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_TRANSFORM') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH',
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK',
        updateTargetMappingsTaskId: res.right.taskId,
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
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
        // already completed this migration and we only transformed outdated
        // documents and updated the mappings for incase a new plugin was
        // enabled.
        return {
          ...stateP,
          controlState: 'DONE',
        };
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'CREATE_NEW_TARGET') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'MARK_VERSION_INDEX_READY',
      };
    } else {
      // If the createIndex action receives an 'resource_already_exists_exception'
      // it will wait until the index status turns green so we don't have any
      // left responses to handle here.
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'MARK_VERSION_INDEX_READY') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'DONE' };
    } else {
      const left = res.left;
      if (left.type === 'alias_not_found_exception') {
        // the versionIndexReadyActions checks that the currentAlias is still
        // pointing to the source index. If this fails with an
        // alias_not_found_exception another instance has completed a
        // migration from the same source.
        return { ...stateP, controlState: 'MARK_VERSION_INDEX_READY_CONFLICT' };
      } else if (
        left.type === 'remove_index_not_a_concrete_index' ||
        left.type === 'index_not_found_exception'
      ) {
        // We don't handle these errors as the migration algorithm will never
        // cause them to occur (these are only relevant to the LEGACY_DELETE
        // step).
        throwBadResponse(stateP, left as never);
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'MARK_VERSION_INDEX_READY_CONFLICT') {
    // If another instance completed a migration from the same source we need
    // to check that the completed migration was performed by a Kibana that's
    // on the same version as this instance.
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      const indices = res.right;
      const aliases = getAliases(indices);
      if (
        aliases[stateP.currentAlias] != null &&
        aliases[stateP.versionAlias] != null &&
        aliases[stateP.currentAlias] === aliases[stateP.versionAlias]
      ) {
        // If the current and version aliases are pointing to the same index
        // the migration was completed by another instance on the same version
        // and it's safe to start serving traffic.
        return { ...stateP, controlState: 'DONE' };
      } else {
        // Fail the migration, the instance that completed the migration is
        // running a different version of Kibana. This avoids a situation where
        // we loose acknowledged writes because two versions are both
        // accepting writes, but are writing into difference indices.
        const conflictingKibanaVersion =
          indexVersion(aliases[stateP.currentAlias]) ?? aliases[stateP.currentAlias];
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `Multiple versions of Kibana are attempting a migration in parallel. Another Kibana instance on version ${conflictingKibanaVersion} completed this migration (this instance is running ${stateP.kibanaVersion}). Ensure that all Kibana instances are running on same version and try again.`,
        };
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'DONE' || stateP.controlState === 'FATAL') {
    // The state-action machine will never call the model in the terminating states
    throwBadControlState(stateP as never);
  } else {
    return throwBadControlState(stateP);
  }
};

/**
 * Construct the initial state for the model
 */
export const createInitialState = ({
  kibanaVersion,
  targetMappings,
  preMigrationScript,
  migrationVersionPerType,
  indexPrefix,
}: {
  kibanaVersion: string;
  targetMappings: IndexMapping;
  preMigrationScript?: string;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
}): InitState => {
  const outdatedDocumentsQuery = {
    bool: {
      should: Object.entries(migrationVersionPerType).map(([type, latestVersion]) => ({
        bool: {
          must: { term: { type } },
          must_not: { term: { [`migrationVersion.${type}`]: latestVersion } },
        },
      })),
    },
  };

  const reindexTargetMappings: IndexMapping = {
    // @ts-expect-error we don't allow plugins to set `dynamic`
    dynamic: false,
    properties: {
      type: { type: 'keyword' },
      migrationVersion: {
        // @ts-expect-error we don't allow plugins to set `dynamic`
        dynamic: 'true',
        type: 'object',
      },
    },
  };

  const initialState: InitState = {
    controlState: 'INIT',
    indexPrefix,
    legacyIndex: indexPrefix,
    currentAlias: indexPrefix,
    versionAlias: `${indexPrefix}_${kibanaVersion}`,
    versionIndex: `${indexPrefix}_${kibanaVersion}_001`,
    tempIndex: `${indexPrefix}_${kibanaVersion}_reindex_temp`,
    kibanaVersion,
    preMigrationScript: Option.fromNullable(preMigrationScript),
    targetIndexMappings: targetMappings,
    tempIndexMappings: reindexTargetMappings,
    outdatedDocumentsQuery,
    retryCount: 0,
    retryDelay: 0,
    logs: [],
  };
  return initialState;
};
