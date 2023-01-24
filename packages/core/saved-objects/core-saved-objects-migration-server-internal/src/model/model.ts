/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';

import { type AliasAction, isTypeof } from '../actions';
import type { AllActionStates, State } from '../state';
import type { ResponseType } from '../next';
import {
  createInitialProgress,
  incrementProcessedProgress,
  logProgress,
  setProgressTotal,
} from './progress';
import { delayRetryState, resetRetryState } from './retry_state';
import {
  extractTransformFailuresReason,
  extractUnknownDocFailureReason,
  fatalReasonDocumentExceedsMaxBatchSizeBytes,
  extractDiscardedUnknownDocs,
  extractDiscardedCorruptDocs,
} from './extract_errors';
import type { ExcludeRetryableEsError } from './types';
import {
  addExcludedTypesToBoolQuery,
  addMustClausesToBoolQuery,
  addMustNotClausesToBoolQuery,
  getAliases,
  indexBelongsToLaterVersion,
  indexVersion,
  mergeMigrationMappingPropertyHashes,
  throwBadControlState,
  throwBadResponse,
  versionMigrationCompleted,
  buildRemoveAliasActions,
} from './helpers';
import { createBatches } from './create_batches';
import type { MigrationLog } from '../types';
import { diffMappings } from '../core/build_active_mappings';

export const FATAL_REASON_REQUEST_ENTITY_TOO_LARGE = `While indexing a batch of saved objects, Elasticsearch returned a 413 Request Entity Too Large exception. Ensure that the Kibana configuration option 'migrations.maxBatchSizeBytes' is set to a value that is lower than or equal to the Elasticsearch 'http.max_content_length' configuration option.`;
const CLUSTER_SHARD_LIMIT_EXCEEDED_REASON = `[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources.`;

export const model = (currentState: State, resW: ResponseType<AllActionStates>): State => {
  // The action response `resW` is weakly typed, the type includes all action
  // responses. Each control state only triggers one action so each control
  // state only has one action response type. This allows us to narrow the
  // response type to only the action response associated with a specific
  // control state using:
  // `const res = resW as ResponseType<typeof stateP.controlState>;`

  let stateP: State = currentState;
  let logs: MigrationLog[] = stateP.logs;
  let excludeOnUpgradeQuery = stateP.excludeOnUpgradeQuery;

  // Handle retryable_es_client_errors. Other left values need to be handled
  // by the control state specific code below.
  if (Either.isLeft<unknown, unknown>(resW)) {
    if (isTypeof(resW.left, 'retryable_es_client_error')) {
      // Retry the same step after an exponentially increasing delay.
      return delayRetryState(stateP, resW.left.message, stateP.retryAttempts);
    }
  } else {
    // If any action returns a right response, reset the retryCount and retryDelay state
    stateP = resetRetryState(stateP);
  }

  if (stateP.controlState === 'INIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isLeft(res)) {
      const left = res.left;
      if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
        const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${stateP.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else {
        return throwBadResponse(stateP, left);
      }
    } else if (Either.isRight(res)) {
      // cluster routing allocation is enabled and we can continue with the migration as normal
      const indices = res.right;
      const aliasesRes = getAliases(indices);

      if (Either.isLeft(aliasesRes)) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `The ${
            aliasesRes.left.alias
          } alias is pointing to multiple indices: ${aliasesRes.left.indices.join(',')}.`,
        };
      }

      const aliases = aliasesRes.right;

      // The source index .kibana is pointing to. E.g: ".kibana_8.7.0_001"
      const source = aliases[stateP.currentAlias];

      if (
        // This version's migration has already been completed.
        versionMigrationCompleted(stateP.currentAlias, stateP.versionAlias, aliases)
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
          targetIndex: source!,
          sourceIndexMappings: indices[source!].mappings,
          // in this scenario, a .kibana_X.Y.Z_001 index exists that matches the current kibana version
          // aka we are NOT upgrading to a newer version
          // we inject the target index's current mappings in the state, to check them later
          targetIndexRawMappings: indices[source!].mappings,
          targetIndexMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetIndexMappings,
            indices[source!].mappings
          ),
          versionIndexReadyActions: Option.none,
        };
      } else if (
        // `.kibana` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 instance found the `.kibana` alias
        // pointing to `.kibana_7.12.0_001`
        indexBelongsToLaterVersion(aliases[stateP.currentAlias]!, stateP.kibanaVersion)
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
        // Don't actively participate in this migration but wait for another instance to complete it
        stateP.waitForMigrationCompletion === true
      ) {
        return {
          ...stateP,
          controlState: 'WAIT_FOR_MIGRATION_COMPLETION',
          // Wait for 2s before checking again if the migration has completed
          retryDelay: 2000,
          logs: [
            ...stateP.logs,
            {
              level: 'info',
              message: `Migration required. Waiting until another Kibana instance completes the migration.`,
            },
          ],
        };
      } else if (
        // If the `.kibana` alias exists
        source != null
      ) {
        // CHECKPOINT here we decide to go for yellow source
        return {
          ...stateP,
          aliases,
          controlState: 'WAIT_FOR_YELLOW_SOURCE',
          sourceIndex: Option.some(source!) as Option.Some<string>,
          sourceIndexMappings: indices[source!].mappings,
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
  } else if (stateP.controlState === 'WAIT_FOR_MIGRATION_COMPLETION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    const indices = res.right;
    const aliasesRes = getAliases(indices);
    if (
      // If this version's migration has already been completed we can proceed
      Either.isRight(aliasesRes) &&
      versionMigrationCompleted(stateP.currentAlias, stateP.versionAlias, aliasesRes.right)
    ) {
      return {
        ...stateP,
        // Proceed to 'DONE' and start serving traffic.
        // Because WAIT_FOR_MIGRATION_COMPLETION can only be used by
        // background-task nodes on Cloud, we can be confident that this node
        // has exactly the same plugins enabled as the node that finished the
        // migration. So we won't need to transform any old documents or update
        // the mappings.
        controlState: 'DONE',
        // Source is a none because we didn't do any migration from a source
        // index
        sourceIndex: Option.none,
        targetIndex: `${stateP.indexPrefix}_${stateP.kibanaVersion}_001`,
        versionIndexReadyActions: Option.none,
      };
    } else {
      // When getAliases returns a left 'multiple_indices_per_alias' error or
      // the migration is not yet up to date just continue waiting
      return {
        ...stateP,
        controlState: 'WAIT_FOR_MIGRATION_COMPLETION',
        // Wait for 2s before checking again if the migration has completed
        retryDelay: 2000,
        logs: [
          ...stateP.logs,
          {
            level: 'info',
            message: `Migration required. Waiting until another Kibana instance completes the migration.`,
          },
        ],
      };
    }
  } else if (stateP.controlState === 'PREPARE_COMPATIBLE_MIGRATION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      };
    } else if (Either.isLeft(res)) {
      // Note: if multiple newer Kibana versions are competing with each other to perform a migration,
      // it might happen that another Kibana instance has deleted this instance's version index.
      // NIT to handle this in properly, we'd have to add a PREPARE_COMPATIBLE_MIGRATION_CONFLICT step,
      // similar to MARK_VERSION_INDEX_READY_CONFLICT.
      if (isTypeof(res.left, 'alias_not_found_exception')) {
        // We assume that the alias was already deleted by another Kibana instance
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
        };
      } else {
        throwBadResponse(stateP, res.left as never);
      }
    } else {
      throwBadResponse(stateP, res);
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
      if (isTypeof(res.left, 'index_not_found_exception')) {
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
    if (Either.isLeft(res)) {
      const left = res.left;
      if (isTypeof(left, 'index_not_green_timeout')) {
        // `index_not_green_timeout` for the LEGACY_CREATE_REINDEX_TARGET source index:
        // A yellow status timeout could theoretically be temporary for a busy cluster
        // that takes a long time to allocate the primary and we retry the action to see if
        // we get a response.
        // If the cluster hit the low watermark for disk usage the LEGACY_CREATE_REINDEX_TARGET action will
        // continue to timeout and eventually lead to a failed migration.
        const retryErrorMessage = `${left.message} Refer to ${stateP.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else if (isTypeof(left, 'cluster_shard_limit_exceeded')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${stateP.migrationDocLinks.clusterShardLimitExceeded}`,
        };
      } else {
        return throwBadResponse(stateP, left);
      }
    } else if (Either.isRight(res)) {
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
        (isTypeof(left, 'index_not_found_exception') && left.index === stateP.legacyIndex) ||
        isTypeof(left, 'target_index_had_write_block')
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
      } else if (isTypeof(left, 'wait_for_task_completion_timeout')) {
        // After waiting for the specified timeout, the task has not yet
        // completed. Retry this step to see if the task has completed after an
        // exponential delay. We will basically keep polling forever until the
        // Elasticsearch task succeeds or fails.
        return delayRetryState(stateP, left.message, Number.MAX_SAFE_INTEGER);
      } else if (
        isTypeof(left, 'index_not_found_exception') ||
        isTypeof(left, 'incompatible_mapping_exception')
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
        isTypeof(left, 'remove_index_not_a_concrete_index') ||
        (isTypeof(left, 'index_not_found_exception') && left.index === stateP.legacyIndex)
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
        isTypeof(left, 'index_not_found_exception') ||
        isTypeof(left, 'alias_not_found_exception')
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
      // check the existing mappings to see if we can avoid reindexing
      if (
        // source exists
        Boolean(stateP.sourceIndexMappings._meta?.migrationMappingPropertyHashes) &&
        // ...and mappings are unchanged
        !diffMappings(
          /* actual */
          stateP.sourceIndexMappings,
          /* expected */
          stateP.targetIndexMappings
        )
      ) {
        // The source index .kibana is pointing to. E.g: ".xx8.7.0_001"
        const source = stateP.sourceIndex.value;

        return {
          ...stateP,
          controlState: 'PREPARE_COMPATIBLE_MIGRATION',
          sourceIndex: Option.none,
          targetIndex: source!,
          targetIndexRawMappings: stateP.sourceIndexMappings,
          targetIndexMappings: mergeMigrationMappingPropertyHashes(
            stateP.targetIndexMappings,
            stateP.sourceIndexMappings
          ),
          preTransformDocsActions: [
            // Point the version alias to the source index. This let's other Kibana
            // instances know that a migration for the current version is "done"
            // even though we may be waiting for document transformations to finish.
            { add: { index: source!, alias: stateP.versionAlias } },
            ...buildRemoveAliasActions(source!, Object.keys(stateP.aliases), [
              stateP.currentAlias,
              stateP.versionAlias,
            ]),
          ],
          versionIndexReadyActions: Option.none,
        };
      } else {
        // the mappings have changed, but changes might still be compatible
        return {
          ...stateP,
          controlState: 'CHECK_UNKNOWN_DOCUMENTS',
        };
      }
    } else if (Either.isLeft(res)) {
      const left = res.left;
      if (isTypeof(left, 'index_not_yellow_timeout')) {
        // A yellow status timeout could theoretically be temporary for a busy cluster
        // that takes a long time to allocate the primary and we retry the action to see if
        // we get a response.
        // In the event of retries running out, we link to the docs to help with diagnosing
        // the problem.
        const retryErrorMessage = `${left.message} Refer to ${stateP.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else {
        return throwBadResponse(stateP, left);
      }
    } else {
      return throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'CHECK_UNKNOWN_DOCUMENTS') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    if (isTypeof(res.right, 'unknown_docs_found')) {
      if (!stateP.discardUnknownObjects) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: extractUnknownDocFailureReason(
            stateP.migrationDocLinks.resolveMigrationFailures,
            res.right.unknownDocs
          ),
        };
      }

      // at this point, users have configured kibana to discard unknown objects
      // thus, we can ignore unknown documents and proceed with the migration
      logs = [
        ...stateP.logs,
        { level: 'warning', message: extractDiscardedUnknownDocs(res.right.unknownDocs) },
      ];

      const unknownTypes = [...new Set(res.right.unknownDocs.map(({ type }) => type))];

      excludeOnUpgradeQuery = addExcludedTypesToBoolQuery(
        unknownTypes,
        stateP.excludeOnUpgradeQuery?.bool
      );

      excludeOnUpgradeQuery = addMustClausesToBoolQuery(
        [{ exists: { field: 'type' } }],
        excludeOnUpgradeQuery.bool
      );
    }

    const source = stateP.sourceIndex;
    const target = stateP.versionIndex;
    return {
      ...stateP,
      controlState: 'SET_SOURCE_WRITE_BLOCK',
      logs,
      excludeOnUpgradeQuery,
      sourceIndex: source,
      targetIndex: target,
      versionIndexReadyActions: Option.some<AliasAction[]>([
        { remove: { index: source.value, alias: stateP.currentAlias, must_exist: true } },
        { add: { index: target, alias: stateP.currentAlias } },
        { add: { index: target, alias: stateP.versionAlias } },
        { remove_index: { index: stateP.tempIndex } },
      ]),
    };
  } else if (stateP.controlState === 'SET_SOURCE_WRITE_BLOCK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      // If the write block is successfully in place, proceed to the next step.
      return {
        ...stateP,
        controlState: 'CALCULATE_EXCLUDE_FILTERS',
      };
    } else if (isTypeof(res.left, 'index_not_found_exception')) {
      // We don't handle the following errors as the migration algorithm
      // will never cause them to occur:
      // - index_not_found_exception
      return throwBadResponse(stateP, res.left as never);
    } else {
      return throwBadResponse(stateP, res.left);
    }
  } else if (stateP.controlState === 'CALCULATE_EXCLUDE_FILTERS') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    if (Either.isRight(res)) {
      excludeOnUpgradeQuery = addMustNotClausesToBoolQuery(
        res.right.mustNotClauses,
        stateP.excludeOnUpgradeQuery?.bool
      );

      return {
        ...stateP,
        controlState: 'CREATE_REINDEX_TEMP',
        excludeOnUpgradeQuery,
        logs: [
          ...stateP.logs,
          ...Object.entries(res.right.errorsByType).map(([soType, error]) => ({
            level: 'warning' as const,
            message: `Ignoring excludeOnUpgrade hook on type [${soType}] that failed with error: "${error.toString()}"`,
          })),
        ],
      };
    } else {
      return throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'CREATE_REINDEX_TEMP') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return { ...stateP, controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT' };
    } else if (Either.isLeft(res)) {
      const left = res.left;
      if (isTypeof(left, 'index_not_green_timeout')) {
        // `index_not_green_timeout` for the CREATE_REINDEX_TEMP target temp index:
        // The index status did not go green within the specified timeout period.
        // A green status timeout could theoretically be temporary for a busy cluster.
        //
        // If there is a problem CREATE_REINDEX_TEMP action will
        // continue to timeout and eventually lead to a failed migration.
        const retryErrorMessage = `${left.message} Refer to ${stateP.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else if (isTypeof(left, 'cluster_shard_limit_exceeded')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${stateP.migrationDocLinks.clusterShardLimitExceeded}`,
        };
      } else {
        return throwBadResponse(stateP, left);
      }
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
      logs = logProgress(stateP.logs, progress);
      if (res.right.outdatedDocuments.length > 0) {
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_TRANSFORM',
          outdatedDocuments: res.right.outdatedDocuments,
          lastHitSortValue: res.right.lastHitSortValue,
          progress,
          logs,
        };
      } else {
        // we don't have any more outdated documents and need to either fail or move on to updating the target mappings.
        if (stateP.corruptDocumentIds.length > 0 || stateP.transformErrors.length > 0) {
          if (!stateP.discardCorruptObjects) {
            const transformFailureReason = extractTransformFailuresReason(
              stateP.migrationDocLinks.resolveMigrationFailures,
              stateP.corruptDocumentIds,
              stateP.transformErrors
            );
            return {
              ...stateP,
              controlState: 'FATAL',
              reason: transformFailureReason,
            };
          }

          // at this point, users have configured kibana to discard corrupt objects
          // thus, we can ignore corrupt documents and transform errors and proceed with the migration
          logs = [
            ...stateP.logs,
            {
              level: 'warning',
              message: extractDiscardedCorruptDocs(
                stateP.corruptDocumentIds,
                stateP.transformErrors
              ),
            },
          ];
        }

        // we don't have any more outdated documents and either
        //   we haven't encountered any document transformation issues.
        //   or the user chose to ignore them
        // Close the PIT search and carry on with the happy path.
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT',
          logs,
        };
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
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_TRANSFORM') {
    // We follow a similar control flow as for
    // outdated document search -> outdated document transform -> transform documents bulk index
    // collecting issues along the way rather than failing
    // REINDEX_SOURCE_TO_TEMP_TRANSFORM handles the document transforms
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    // Increment the processed documents, no matter what the results are.
    // Otherwise the progress might look off when there are errors.
    const progress = incrementProcessedProgress(stateP.progress, stateP.outdatedDocuments.length);

    if (
      Either.isRight(res) ||
      (isTypeof(res.left, 'documents_transform_failed') && stateP.discardCorruptObjects)
    ) {
      if (
        (stateP.corruptDocumentIds.length === 0 && stateP.transformErrors.length === 0) ||
        stateP.discardCorruptObjects
      ) {
        const processedDocs = Either.isRight(res)
          ? res.right.processedDocs
          : res.left.processedDocs;
        const batches = createBatches(processedDocs, stateP.tempIndex, stateP.maxBatchSizeBytes);
        if (Either.isRight(batches)) {
          let corruptDocumentIds = stateP.corruptDocumentIds;
          let transformErrors = stateP.transformErrors;

          if (Either.isLeft(res)) {
            corruptDocumentIds = [...stateP.corruptDocumentIds, ...res.left.corruptDocumentIds];
            transformErrors = [...stateP.transformErrors, ...res.left.transformErrors];
          }

          return {
            ...stateP,
            corruptDocumentIds,
            transformErrors,
            controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK', // handles the actual bulk indexing into temp index
            transformedDocBatches: batches.right,
            currentBatch: 0,
            progress,
          };
        } else {
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: fatalReasonDocumentExceedsMaxBatchSizeBytes({
              _id: batches.left.document._id,
              docSizeBytes: batches.left.docSizeBytes,
              maxBatchSizeBytes: batches.left.maxBatchSizeBytes,
            }),
          };
        }
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
      if (isTypeof(left, 'documents_transform_failed')) {
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
      if (stateP.currentBatch + 1 < stateP.transformedDocBatches.length) {
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK',
          currentBatch: stateP.currentBatch + 1,
        };
      } else {
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
        };
      }
    } else {
      if (
        isTypeof(res.left, 'target_index_had_write_block') ||
        isTypeof(res.left, 'index_not_found_exception')
      ) {
        // When the temp index has a write block or has been deleted another
        // instance already completed this step. Close the PIT search and carry
        // on with the happy path.
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT',
        };
      } else if (isTypeof(res.left, 'request_entity_too_large_exception')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: FATAL_REASON_REQUEST_ENTITY_TOO_LARGE,
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
      if (isTypeof(left, 'index_not_found_exception')) {
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
      if (isTypeof(left, 'index_not_found_exception')) {
        // index_not_found_exception means another instance already completed
        // the MARK_VERSION_INDEX_READY step and removed the temp index
        // We still perform the REFRESH_TARGET, OUTDATED_DOCUMENTS_* and
        // UPDATE_TARGET_MAPPINGS steps since we might have plugins enabled
        // which the other instances don't.
        return {
          ...stateP,
          controlState: 'REFRESH_TARGET',
        };
      } else if (isTypeof(left, 'index_not_green_timeout')) {
        // `index_not_green_timeout` for the CLONE_TEMP_TO_TARGET source -> target index:
        // The target index status did not go green within the specified timeout period.
        // The cluster could just be busy and we retry the action.

        // Once we run out of retries, the migration fails.
        // Identifying the cause requires inspecting the ouput of the
        // `_cluster/allocation/explain?index=${targetIndex}` API.
        // Unless the root cause is identified and addressed, the request will
        // continue to timeout and eventually lead to a failed migration.
        const retryErrorMessage = `${left.message} Refer to ${stateP.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else if (isTypeof(left, 'cluster_shard_limit_exceeded')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${stateP.migrationDocLinks.clusterShardLimitExceeded}`,
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
        logs = logProgress(stateP.logs, progress);

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
            stateP.migrationDocLinks.resolveMigrationFailures,
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
        const batches = createBatches(
          res.right.processedDocs,
          stateP.targetIndex,
          stateP.maxBatchSizeBytes
        );
        if (Either.isRight(batches)) {
          return {
            ...stateP,
            controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX',
            transformedDocBatches: batches.right,
            currentBatch: 0,
            hasTransformedDocs: true,
            progress,
          };
        } else {
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: fatalReasonDocumentExceedsMaxBatchSizeBytes({
              _id: batches.left.document._id,
              docSizeBytes: batches.left.docSizeBytes,
              maxBatchSizeBytes: batches.left.maxBatchSizeBytes,
            }),
          };
        }
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
      if (isTypeof(res.left, 'documents_transform_failed')) {
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
      if (stateP.currentBatch + 1 < stateP.transformedDocBatches.length) {
        return {
          ...stateP,
          controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX',
          currentBatch: stateP.currentBatch + 1,
        };
      }
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
        corruptDocumentIds: [],
        transformErrors: [],
        hasTransformedDocs: true,
      };
    } else {
      if (isTypeof(res.left, 'request_entity_too_large_exception')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: FATAL_REASON_REQUEST_ENTITY_TOO_LARGE,
        };
      } else if (
        isTypeof(res.left, 'target_index_had_write_block') ||
        isTypeof(res.left, 'index_not_found_exception')
      ) {
        // we fail on these errors since the target index will never get
        // deleted and should only have a write block if a newer version of
        // Kibana started an upgrade
        throwBadResponse(stateP, res.left as never);
      } else {
        throwBadResponse(stateP, res.left);
      }
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
        controlState: 'CHECK_TARGET_MAPPINGS',
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_REFRESH') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CHECK_TARGET_MAPPINGS',
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'CHECK_TARGET_MAPPINGS') {
    const res = resW as ResponseType<typeof stateP.controlState>;
    if (Either.isRight(res)) {
      if (!res.right.match) {
        return {
          ...stateP,
          controlState: 'UPDATE_TARGET_MAPPINGS',
        };
      }

      // The md5 of the mappings match, so there's no need to update target mappings
      return {
        ...stateP,
        controlState: 'CHECK_VERSION_INDEX_READY_ACTIONS',
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
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'UPDATE_TARGET_MAPPINGS_META',
      };
    } else {
      const left = res.left;
      if (isTypeof(left, 'wait_for_task_completion_timeout')) {
        // After waiting for the specified timeout, the task has not yet
        // completed. Retry this step to see if the task has completed after an
        // exponential delay.  We will basically keep polling forever until the
        // Elasticsearch task succeeds or fails.
        return delayRetryState(stateP, res.left.message, Number.MAX_SAFE_INTEGER);
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS_META') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CHECK_VERSION_INDEX_READY_ACTIONS',
      };
    } else {
      throwBadResponse(stateP, res as never);
    }
  } else if (stateP.controlState === 'CHECK_VERSION_INDEX_READY_ACTIONS') {
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
      // documents and updated the mappings for in case a new plugin was
      // enabled.
      return {
        ...stateP,
        controlState: 'DONE',
      };
    }
  } else if (stateP.controlState === 'CREATE_NEW_TARGET') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'MARK_VERSION_INDEX_READY',
      };
    } else if (Either.isLeft(res)) {
      const left = res.left;
      if (isTypeof(left, 'index_not_green_timeout')) {
        // `index_not_green_timeout` for the CREATE_NEW_TARGET target index:
        // The cluster might just be busy and we retry the action for a set number of times.
        // If the cluster hit the low watermark for disk usage the action will continue to timeout.
        // Unless the disk space is addressed, the LEGACY_CREATE_REINDEX_TARGET action will
        // continue to timeout and eventually lead to a failed migration.
        const retryErrorMessage = `${left.message} Refer to ${stateP.migrationDocLinks.repeatedTimeoutRequests} for information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else if (isTypeof(left, 'cluster_shard_limit_exceeded')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `${CLUSTER_SHARD_LIMIT_EXCEEDED_REASON} See ${stateP.migrationDocLinks.clusterShardLimitExceeded}`,
        };
      } else {
        return throwBadResponse(stateP, left);
      }
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
      if (isTypeof(left, 'alias_not_found_exception')) {
        // the versionIndexReadyActions checks that the currentAlias is still
        // pointing to the source index. If this fails with an
        // alias_not_found_exception another instance has completed a
        // migration from the same source.
        return { ...stateP, controlState: 'MARK_VERSION_INDEX_READY_CONFLICT' };
      } else if (isTypeof(left, 'index_not_found_exception')) {
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
      } else if (isTypeof(left, 'remove_index_not_a_concrete_index')) {
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
      const aliasesRes = getAliases(indices);

      if (Either.isLeft(aliasesRes)) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `The ${
            aliasesRes.left.alias
          } alias is pointing to multiple indices: ${aliasesRes.left.indices.join(',')}.`,
        };
      }

      const aliases = aliasesRes.right;
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
