/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';

import { AliasAction, isLeftTypeof } from '../actions';
import { AllActionStates, MigrationLog, State } from '../types';
import type { ResponseType } from '../next';
import { disableUnknownTypeMappingFields } from '../../migrations/core/migration_context';
import {
  createInitialProgress,
  incrementProcessedProgress,
  logProgress,
  setProgressTotal,
} from './progress';
import { delayRetryState, resetRetryState } from './retry_state';
import { extractTransformFailuresReason, extractUnknownDocFailureReason } from './extract_errors';
import type { ExcludeRetryableEsError } from './types';
import {
  getAliases,
  indexBelongsToLaterVersion,
  indexVersion,
  mergeMigrationMappingPropertyHashes,
  throwBadControlState,
  throwBadResponse,
} from './helpers';

export const model = (currentState: State, resW: ResponseType<AllActionStates>): State => {
  // The action response `resW` is weakly typed, the type includes all action
  // responses. Each control state only triggers one action so each control
  // state only has one action response type. This allows us to narrow the
  // response type to only the action response associated with a specific
  // control state using:
  // `const res = resW as ResponseType<typeof stateP.controlState>;`

  let stateP: State = currentState;

  // Handle retryable_es_client_errors. Other left values need to be handled
  // by the control state specific code below.
  if (
    Either.isLeft<unknown, unknown>(resW) &&
    isLeftTypeof(resW.left, 'retryable_es_client_error')
  ) {
    // Retry the same step after an exponentially increasing delay.
    return delayRetryState(stateP, resW.left.message, stateP.retryAttempts);
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
          // Skip to 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT' so that if a new plugin was
          // installed / enabled we can transform any old documents and update
          // the mappings for this plugin's types.
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
          // Source is a none because we didn't do any migration from a source
          // index
          sourceIndex: Option.none,
          targetIndex: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
          targetIndexMappings: mergeMigrationMappingPropertyHashes(
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
        return {
          ...stateP,
          controlState: 'WAIT_FOR_YELLOW_SOURCE',
          sourceIndex: Option.some(source) as Option.Some<string>,
          sourceIndexMappings: indices[source].mappings,
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
          targetIndexMappings: disableUnknownTypeMappingFields(
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
    // If the write block is successfully in place
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
    } else if (Either.isLeft(res)) {
      // If the write block failed because the index doesn't exist, it means
      // another instance already completed the legacy pre-migration. Proceed
      // to the next step.
      if (isLeftTypeof(res.left, 'index_not_found_exception')) {
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
        (isLeftTypeof(left, 'index_not_found_exception') && left.index === stateP.legacyIndex) ||
        isLeftTypeof(left, 'target_index_had_write_block')
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
      } else if (isLeftTypeof(left, 'wait_for_task_completion_timeout')) {
        // After waiting for the specificed timeout, the task has not yet
        // completed. Retry this step to see if the task has completed after an
        // exponential delay. We will basically keep polling forever until the
        // Elasticeasrch task succeeds or fails.
        return delayRetryState(stateP, left.message, Number.MAX_SAFE_INTEGER);
      } else if (
        isLeftTypeof(left, 'index_not_found_exception') ||
        isLeftTypeof(left, 'incompatible_mapping_exception')
      ) {
        // We don't handle the following errors as the algorithm will never
        // run into these during the LEGACY_REINDEX_WAIT_FOR_TASK step:
        //  - index_not_found_exception for the LEGACY_REINDEX target index
        //  - incompatible_mapping_exception
        throwBadResponse(stateP, left as never);
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'LEGACY_DELETE') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'SET_SOURCE_WRITE_BLOCK' };
    } else if (Either.isLeft(res)) {
      const left = res.left;
      if (
        isLeftTypeof(left, 'remove_index_not_a_concrete_index') ||
        (isLeftTypeof(left, 'index_not_found_exception') && left.index === stateP.legacyIndex)
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
        isLeftTypeof(left, 'index_not_found_exception') ||
        isLeftTypeof(left, 'alias_not_found_exception')
      ) {
        // We don't handle the following errors as the migration algorithm
        // will never cause them to occur:
        // - alias_not_found_exception we're not using must_exist
        // - index_not_found_exception for source index into which we reindex
        //   the legacy index
        throwBadResponse(stateP, left as never);
      } else {
        throwBadResponse(stateP, left);
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'WAIT_FOR_YELLOW_SOURCE') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CHECK_UNKNOWN_DOCUMENTS',
      };
    } else {
      return throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'CHECK_UNKNOWN_DOCUMENTS') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    if (Either.isRight(res)) {
      const source = stateP.sourceIndex;
      const target = stateP.versionIndex;
      return {
        ...stateP,
        controlState: 'SET_SOURCE_WRITE_BLOCK',
        sourceIndex: source,
        targetIndex: target,
        targetIndexMappings: disableUnknownTypeMappingFields(
          stateP.targetIndexMappings,
          stateP.sourceIndexMappings
        ),
        versionIndexReadyActions: Option.some<AliasAction[]>([
          { remove: { index: source.value, alias: stateP.currentAlias, must_exist: true } },
          { add: { index: target, alias: stateP.currentAlias } },
          { add: { index: target, alias: stateP.versionAlias } },
          { remove_index: { index: stateP.tempIndex } },
        ]),

        logs: [
          ...stateP.logs,
          ...(res.right.unknownDocs.length > 0
            ? ([
                {
                  level: 'warning',
                  message: `CHECK_UNKNOWN_DOCUMENTS ${extractUnknownDocFailureReason(
                    res.right.unknownDocs,
                    target
                  )}`,
                },
              ] as MigrationLog[])
            : []),
        ],
      };
    } else {
      return throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      // If the write block is successfully in place, proceed to the next step.
      return {
        ...stateP,
        controlState: 'CREATE_REINDEX_TEMP',
      };
    } else if (isLeftTypeof(res.left, 'index_not_found_exception')) {
      // We don't handle the following errors as the migration algorithm
      // will never cause them to occur:
      // - index_not_found_exception
      return throwBadResponse(stateP, res.left as never);
    } else {
      return throwBadResponse(stateP, res.left);
    }
  } else if (stateP.controlState === 'CREATE_REINDEX_TEMP') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT' };
    } else {
      // If the createIndex action receives an 'resource_already_exists_exception'
      // it will wait until the index status turns green so we don't have any
      // left responses to handle here.
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
        sourceIndexPitId: res.right.pitId,
        lastHitSortValue: undefined,
        // placeholders to collect document transform problems
        corruptDocumentIds: [],
        transformErrors: [],
        progress: createInitialProgress(),
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_READ') {
    // we carry through any failures we've seen with transforming documents on state
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      const progress = setProgressTotal(stateP.progress, res.right.totalHits);
      const logs = logProgress(stateP.logs, progress);
      if (res.right.outdatedDocuments.length > 0) {
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX',
          outdatedDocuments: res.right.outdatedDocuments,
          lastHitSortValue: res.right.lastHitSortValue,
          progress,
          logs,
        };
      } else {
        // we don't have any more outdated documents and need to either fail or move on to updating the target mappings.
        if (stateP.corruptDocumentIds.length > 0 || stateP.transformErrors.length > 0) {
          const transformFailureReason = extractTransformFailuresReason(
            stateP.corruptDocumentIds,
            stateP.transformErrors
          );
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: transformFailureReason,
          };
        } else {
          // we don't have any more outdated documents and we haven't encountered any document transformation issues.
          // Close the PIT search and carry on with the happy path.
          return {
            ...stateP,
            controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT',
            logs,
          };
        }
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      const { sourceIndexPitId, ...state } = stateP;
      return {
        ...state,
        controlState: 'SET_TEMP_WRITE_BLOCK',
        sourceIndex: stateP.sourceIndex as Option.Some<string>,
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_INDEX') {
    // We follow a similar control flow as for
    // outdated document search -> outdated document transform -> transform documents bulk index
    // collecting issues along the way rather than failing
    // REINDEX_SOURCE_TO_TEMP_INDEX handles the document transforms
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    // Increment the processed documents, no matter what the results are.
    // Otherwise the progress might look off when there are errors.
    const progress = incrementProcessedProgress(stateP.progress, stateP.outdatedDocuments.length);

    if (Either.isRight(res)) {
      if (stateP.corruptDocumentIds.length === 0 && stateP.transformErrors.length === 0) {
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK', // handles the actual bulk indexing into temp index
          transformedDocs: [...res.right.processedDocs],
          progress,
        };
      } else {
        // we don't have any transform issues with the current batch of outdated docs but
        // we have carried through previous transformation issues.
        // The migration will ultimately fail but before we do that, continue to
        // search through remaining docs for more issues and pass the previous failures along on state
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
          progress,
        };
      }
    } else {
      // we have failures from the current batch of documents and add them to the lists
      const left = res.left;
      if (isLeftTypeof(left, 'documents_transform_failed')) {
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
          corruptDocumentIds: [...stateP.corruptDocumentIds, ...left.corruptDocumentIds],
          transformErrors: [...stateP.transformErrors, ...left.transformErrors],
          progress,
        };
      } else {
        // should never happen
        throwBadResponse(stateP, res as never);
      }
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
        // we're still on the happy path with no transformation failures seen.
        corruptDocumentIds: [],
        transformErrors: [],
      };
    } else {
      if (isLeftTypeof(res.left, 'target_index_had_write_block')) {
        // the temp index has a write block, meaning that another instance already finished and moved forward.
        // close the PIT search and carry on with the happy path.
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT',
        };
      }
      throwBadResponse(stateP, res.left);
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
      if (isLeftTypeof(left, 'index_not_found_exception')) {
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
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'CLONE_TEMP_TO_TARGET') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'REFRESH_TARGET',
      };
    } else {
      const left = res.left;
      if (isLeftTypeof(left, 'index_not_found_exception')) {
        // index_not_found_exception means another instance already completed
        // the MARK_VERSION_INDEX_READY step and removed the temp index
        // We still perform the REFRESH_TARGET, OUTDATED_DOCUMENTS_* and
        // UPDATE_TARGET_MAPPINGS steps since we might have plugins enabled
        // which the other instances don't.
        return {
          ...stateP,
          controlState: 'REFRESH_TARGET',
        };
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'REFRESH_TARGET') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
        pitId: res.right.pitId,
        lastHitSortValue: undefined,
        progress: createInitialProgress(),
        hasTransformedDocs: false,
        corruptDocumentIds: [],
        transformErrors: [],
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SEARCH_READ') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      if (res.right.outdatedDocuments.length > 0) {
        const progress = setProgressTotal(stateP.progress, res.right.totalHits);
        const logs = logProgress(stateP.logs, progress);

        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
          outdatedDocuments: res.right.outdatedDocuments,
          lastHitSortValue: res.right.lastHitSortValue,
          progress,
          logs,
        };
      } else {
        // we don't have any more outdated documents and need to either fail or move on to updating the target mappings.
        if (stateP.corruptDocumentIds.length > 0 || stateP.transformErrors.length > 0) {
          const transformFailureReason = extractTransformFailuresReason(
            stateP.corruptDocumentIds,
            stateP.transformErrors
          );
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: transformFailureReason,
          };
        } else {
          // If there are no more results we have transformed all outdated
          // documents and we didn't encounter any corrupt documents or transformation errors
          // and can proceed to the next step
          return {
            ...stateP,
            controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
          };
        }
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_TRANSFORM') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    // Increment the processed documents, no matter what the results are.
    // Otherwise the progress might look off when there are errors.
    const progress = incrementProcessedProgress(stateP.progress, stateP.outdatedDocuments.length);

    if (Either.isRight(res)) {
      // we haven't seen corrupt documents or any transformation errors thus far in the migration
      // index the migrated docs
      if (stateP.corruptDocumentIds.length === 0 && stateP.transformErrors.length === 0) {
        return {
          ...stateP,
          controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX',
          transformedDocs: [...res.right.processedDocs],
          hasTransformedDocs: true,
          progress,
        };
      } else {
        // We have seen corrupt documents and/or transformation errors
        // skip indexing and go straight to reading and transforming more docs
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
          progress,
        };
      }
    } else {
      if (isLeftTypeof(res.left, 'documents_transform_failed')) {
        // continue to build up any more transformation errors before failing the migration.
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
          corruptDocumentIds: [...stateP.corruptDocumentIds, ...res.left.corruptDocumentIds],
          transformErrors: [...stateP.transformErrors, ...res.left.transformErrors],
          hasTransformedDocs: false,
          progress,
        };
      } else {
        throwBadResponse(stateP, res as never);
      }
    }
  } else if (stateP.controlState === 'TRANSFORMED_DOCUMENTS_BULK_INDEX') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
        corruptDocumentIds: [],
        transformErrors: [],
        hasTransformedDocs: true,
      };
    } else {
      throwBadResponse(stateP, res as never);
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
      throwBadResponse(stateP, res as never);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_REFRESH') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'UPDATE_TARGET_MAPPINGS',
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      const { pitId, hasTransformedDocs, ...state } = stateP;
      if (hasTransformedDocs) {
        return {
          ...state,
          controlState: 'OUTDATED_DOCUMENTS_REFRESH',
        };
      }
      return {
        ...state,
        controlState: 'UPDATE_TARGET_MAPPINGS',
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
      const left = res.left;
      if (isLeftTypeof(left, 'wait_for_task_completion_timeout')) {
        // After waiting for the specified timeout, the task has not yet
        // completed. Retry this step to see if the task has completed after an
        // exponential delay. We will basically keep polling forever until the
        // Elasticsearch task succeeds or fails.
        return delayRetryState(stateP, res.left.message, Number.MAX_SAFE_INTEGER);
      } else {
        throwBadResponse(stateP, left);
      }
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
      if (isLeftTypeof(left, 'alias_not_found_exception')) {
        // the versionIndexReadyActions checks that the currentAlias is still
        // pointing to the source index. If this fails with an
        // alias_not_found_exception another instance has completed a
        // migration from the same source.
        return { ...stateP, controlState: 'MARK_VERSION_INDEX_READY_CONFLICT' };
      } else if (isLeftTypeof(left, 'index_not_found_exception')) {
        if (left.index === stateP.tempIndex) {
          // another instance has already completed the migration and deleted
          // the temporary index
          return { ...stateP, controlState: 'MARK_VERSION_INDEX_READY_CONFLICT' };
        } else {
          // The migration algorithm will never cause a
          // index_not_found_exception for an index other than the temporary
          // index handled above.
          throwBadResponse(stateP, left as never);
        }
      } else if (isLeftTypeof(left, 'remove_index_not_a_concrete_index')) {
        // We don't handle this error as the migration algorithm will never
        // cause it to occur (this error is only relevant to the LEGACY_DELETE
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
