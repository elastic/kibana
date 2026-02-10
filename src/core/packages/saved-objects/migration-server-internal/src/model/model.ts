/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import * as Option from 'fp-ts/Option';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getVirtualVersionsFromMappings } from '@kbn/core-saved-objects-base-server-internal';

import { initialModelVersion } from '@kbn/core-saved-objects-base-server-internal/src/model_version/constants';
import { isTypeof } from '../actions';
import type { AliasAction } from '../actions';
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
  getMigrationType,
  indexBelongsToLaterVersion,
  indexVersion,
  mergeMappingMeta,
  throwBadControlState,
  throwBadResponse,
  versionMigrationCompleted,
  MigrationType,
  increaseBatchSize,
  hasLaterVersionAlias,
  aliasVersion,
  REINDEX_TEMP_SUFFIX,
  getPrepareCompatibleMigrationStateProperties,
} from './helpers';
import { buildTempIndexMap, createBatches } from './create_batches';
import type { MigrationLog } from '../types';
import {
  CLUSTER_SHARD_LIMIT_EXCEEDED_REASON,
  FATAL_REASON_REQUEST_ENTITY_TOO_LARGE,
} from '../common/constants';
import { buildPickupMappingsQuery } from '../core/build_pickup_mappings_query';

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
  if (Either.isLeft<unknown>(resW)) {
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

    if (
      // `.kibana` is pointing to an index that belongs to a later
      // version of Kibana .e.g. a 7.11.0 instance found the `.kibana` alias
      // pointing to `.kibana_7.12.0_001`
      indexBelongsToLaterVersion(stateP.kibanaVersion, aliases[stateP.currentAlias])
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
    }

    const laterVersionAlias = hasLaterVersionAlias(stateP.kibanaVersion, aliases);
    if (
      // a `.kibana_<version>` alias exist, which refers to a later version of Kibana
      // e.g. `.kibana_8.7.0` exists, and current stack version is 8.6.1
      // see https://github.com/elastic/kibana/issues/155136
      laterVersionAlias
    ) {
      return {
        ...stateP,
        controlState: 'FATAL',
        reason: `The ${laterVersionAlias} alias refers to a newer version of Kibana: v${aliasVersion(
          laterVersionAlias
        )}`,
      };
    }

    // The source index .kibana is pointing to. E.g: ".kibana_8.7.0_001"
    const source = aliases[stateP.currentAlias];
    // The target index .kibana WILL be pointing to if we reindex. E.g: ".kibana_8.8.0_001"
    const newVersionTarget = stateP.versionIndex;

    let mappings = source ? indices[source]?.mappings : undefined;

    if (mappings) {
      const mappingVersions = getVirtualVersionsFromMappings({
        mappings,
        source: 'mappingVersions',
        minimumVirtualVersion: initialModelVersion,
      });

      if (mappingVersions) {
        mappings = {
          ...mappings,
          _meta: {
            ...mappings._meta,
            mappingVersions,
          },
        };
      }
    }

    const postInitState = {
      aliases,
      sourceIndex: Option.fromNullable(source),
      sourceIndexMappings: Option.fromNullable(mappings),
      versionIndexReadyActions: Option.none,
    };

    if (
      // Don't actively participate in this migration but wait for another instance to complete it
      stateP.waitForMigrationCompletion === true
    ) {
      return {
        ...stateP,
        ...postInitState,
        sourceIndex: Option.none,
        targetIndex: newVersionTarget,
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
      Option.isSome(postInitState.sourceIndex)
    ) {
      return {
        ...stateP,
        ...postInitState,
        controlState: 'WAIT_FOR_YELLOW_SOURCE',
        sourceIndex: postInitState.sourceIndex,
        sourceIndexMappings: postInitState.sourceIndexMappings as Option.Some<IndexMapping>,
        targetIndex: postInitState.sourceIndex.value, // We preserve the same index, source == target (E.g: ".xx8.7.0_001")
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

      return {
        ...stateP,
        ...postInitState,
        controlState: 'LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION',
        sourceIndex: Option.some(legacyReindexTarget) as Option.Some<string>,
        sourceIndexMappings: Option.some(
          indices[stateP.legacyIndex].mappings
        ) as Option.Some<IndexMapping>,
        targetIndex: newVersionTarget,
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
          { add: { index: newVersionTarget, alias: stateP.currentAlias } },
          { add: { index: newVersionTarget, alias: stateP.versionAlias } },
          { remove_index: { index: stateP.tempIndex } },
        ]),
      };
    } else if (
      // if we must relocate documents to this migrator's index, but the index does NOT yet exist:
      // this migrator must create a temporary index and synchronize with other migrators
      // this is a similar flow to the reindex one, but this migrator will not reindexing anything
      stateP.mustRelocateDocuments
    ) {
      return {
        ...stateP,
        ...postInitState,
        controlState: 'RELOCATE_CHECK_CLUSTER_ROUTING_ALLOCATION',
        sourceIndex: Option.none as Option.None,
        targetIndex: newVersionTarget,
        versionIndexReadyActions: Option.some([
          { add: { index: newVersionTarget, alias: stateP.currentAlias } },
          { add: { index: newVersionTarget, alias: stateP.versionAlias } },
          { remove_index: { index: stateP.tempIndex } },
        ]),
      };
    } else {
      // no need to copy anything over from other indices, we can start with a clean, empty index
      return {
        ...stateP,
        ...postInitState,
        controlState: 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION',
        sourceIndex: Option.none as Option.None,
        targetIndex: newVersionTarget,
        versionIndexReadyActions: Option.some([
          { add: { index: newVersionTarget, alias: stateP.currentAlias } },
          { add: { index: newVersionTarget, alias: stateP.versionAlias } },
        ]) as Option.Some<AliasAction[]>,
      };
    }
  } else if (stateP.controlState === 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CREATE_NEW_TARGET',
      };
    } else {
      const left = res.left;
      if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
        const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${stateP.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'RELOCATE_CHECK_CLUSTER_ROUTING_ALLOCATION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CREATE_REINDEX_TEMP',
      };
    } else {
      const left = res.left;
      if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
        const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${stateP.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else {
        throwBadResponse(stateP, left);
      }
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
  } else if (stateP.controlState === 'LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'LEGACY_SET_WRITE_BLOCK',
      };
    } else {
      const left = res.left;
      if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
        const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${stateP.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else {
        throwBadResponse(stateP, left);
      }
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
      const left = res.left;
      if (isTypeof(left, 'index_not_found_exception')) {
        return { ...stateP, controlState: 'LEGACY_CREATE_REINDEX_TARGET' };
      } else {
        throwBadResponse(stateP, left);
      }
    } else {
      throwBadResponse(stateP, res);
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
        throwBadResponse(stateP, left);
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
      if (stateP.mustRelocateDocuments) {
        // this migrator's index must dispatch documents to other indices,
        // and/or it must receive documents from other indices
        // we must reindex and synchronize with other migrators
        return {
          ...stateP,
          controlState: 'REINDEX_CHECK_CLUSTER_ROUTING_ALLOCATION',
        };
      } else {
        // this migrator is not involved in a relocation, we can proceed with the standard flow
        return {
          ...stateP,
          controlState: 'UPDATE_SOURCE_MAPPINGS_PROPERTIES',
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
        throwBadResponse(stateP, left);
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'UPDATE_SOURCE_MAPPINGS_PROPERTIES') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    const migrationType = getMigrationType({
      isMappingsCompatible: Either.isRight(res),
      isVersionMigrationCompleted: versionMigrationCompleted(
        stateP.currentAlias,
        stateP.versionAlias,
        stateP.aliases
      ),
    });

    switch (migrationType) {
      case MigrationType.Compatible:
        return {
          ...stateP,
          controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED',
        };
      case MigrationType.Incompatible:
        return {
          ...stateP,
          controlState: 'REINDEX_CHECK_CLUSTER_ROUTING_ALLOCATION',
        };
      case MigrationType.Unnecessary:
        return {
          ...stateP,
          // Skip to 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT' so that if a new plugin was
          // installed / enabled we can transform any old documents and update
          // the mappings for this plugin's types.
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
          // Source is a none because we didn't do any migration from a source index
          sourceIndex: Option.none,
          targetIndex: stateP.sourceIndex.value,
          // in this scenario, a .kibana_X.Y.Z_001 index exists that matches the current kibana version
          // aka we are NOT upgrading to a newer version
          // we inject the source index's current mappings in the state, to check them later
          targetIndexMappings: mergeMappingMeta(
            stateP.targetIndexMappings,
            stateP.sourceIndexMappings.value
          ),
        };
      case MigrationType.Invalid:
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: 'Incompatible mappings change on already migrated Kibana instance.',
        };
    }
  } else if (stateP.controlState === 'CLEANUP_UNKNOWN_AND_EXCLUDED') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      if (res.right.type === 'cleanup_started') {
        if (res.right.unknownDocs.length) {
          logs = [
            ...stateP.logs,
            { level: 'warning', message: extractDiscardedUnknownDocs(res.right.unknownDocs) },
          ];
        }

        logs = [
          ...logs,
          ...Object.entries(res.right.errorsByType).map(([soType, error]) => ({
            level: 'warning' as const,
            message: `Ignored excludeOnUpgrade hook on type [${soType}] that failed with error: "${error.toString()}"`,
          })),
        ];

        return {
          ...stateP,
          logs,
          controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK',
          deleteByQueryTaskId: res.right.taskId,
        };
      } else if (res.right.type === 'cleanup_not_needed') {
        // let's move to the step after CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK
        return {
          ...stateP,
          logs,
          controlState: 'PREPARE_COMPATIBLE_MIGRATION',
          ...getPrepareCompatibleMigrationStateProperties(stateP),
        };
      } else {
        throwBadResponse(stateP, res.right);
      }
    } else {
      const reason = extractUnknownDocFailureReason(
        stateP.migrationDocLinks.resolveMigrationFailures,
        res.left.unknownDocs
      );
      return {
        ...stateP,
        controlState: 'FATAL',
        reason,
        logs: [
          ...logs,
          {
            level: 'error',
            message: reason,
          },
        ],
      };
    }
  } else if (stateP.controlState === 'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        logs,
        controlState: 'PREPARE_COMPATIBLE_MIGRATION',
        mustRefresh:
          stateP.mustRefresh || typeof res.right.deleted === 'undefined' || res.right.deleted > 0,
        ...getPrepareCompatibleMigrationStateProperties(stateP),
      };
    } else {
      if (isTypeof(res.left, 'wait_for_task_completion_timeout')) {
        // After waiting for the specified timeout, the task has not yet
        // completed. Retry this step to see if the task has completed after an
        // exponential delay.  We will basically keep polling forever until the
        // Elasticsearch task succeeds or fails.
        return delayRetryState(stateP, res.left.message, Number.MAX_SAFE_INTEGER);
      } else {
        if (stateP.retryCount < stateP.retryAttempts) {
          const retryCount = stateP.retryCount + 1;
          const retryDelay = 1500 + 1000 * Math.random();
          return {
            ...stateP,
            controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED',
            mustRefresh: true,
            retryCount,
            retryDelay,
            logs: [
              ...stateP.logs,
              {
                level: 'warning',
                message: `Errors occurred whilst deleting unwanted documents. Another instance is probably updating or deleting documents in the same index. Retrying attempt ${retryCount}.`,
              },
            ],
          };
        } else {
          const failures = res.left.failures.length;
          const versionConflicts = res.left.versionConflicts ?? 0;

          let reason = `Migration failed because it was unable to delete unwanted documents from the ${stateP.sourceIndex.value} system index (${failures} failures and ${versionConflicts} conflicts)`;
          if (failures) {
            reason += `:\n` + res.left.failures.map((failure: string) => `- ${failure}\n`).join('');
          }
          return {
            ...stateP,
            controlState: 'FATAL',
            reason,
          };
        }
      }
    }
  } else if (stateP.controlState === 'PREPARE_COMPATIBLE_MIGRATION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: stateP.mustRefresh ? 'REFRESH_SOURCE' : 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      };
    } else {
      const left = res.left;
      // Note: if multiple newer Kibana versions are competing with each other to perform a migration,
      // it might happen that another Kibana instance has deleted this instance's version index.
      // NIT to handle this in properly, we'd have to add a PREPARE_COMPATIBLE_MIGRATION_CONFLICT step,
      // similar to MARK_VERSION_INDEX_READY_CONFLICT.
      if (isTypeof(left, 'alias_not_found_exception')) {
        // We assume that the alias was already deleted by another Kibana instance
        return {
          ...stateP,
          controlState: stateP.mustRefresh
            ? 'REFRESH_SOURCE'
            : 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
        };
      } else if (isTypeof(left, 'index_not_found_exception')) {
        // We don't handle the following errors as the migration algorithm
        // will never cause them to occur:
        // - index_not_found_exception
        throwBadResponse(stateP, left as never);
      } else if (isTypeof(left, 'remove_index_not_a_concrete_index')) {
        // We don't handle this error as the migration algorithm will never
        // cause it to occur (this error is only relevant to the LEGACY_DELETE
        // step).
        throwBadResponse(stateP, left as never);
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'REFRESH_SOURCE') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_CHECK_CLUSTER_ROUTING_ALLOCATION') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'CHECK_UNKNOWN_DOCUMENTS',
      };
    } else {
      const left = res.left;
      if (isTypeof(left, 'incompatible_cluster_routing_allocation')) {
        const retryErrorMessage = `[${left.type}] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${stateP.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;
        return delayRetryState(stateP, retryErrorMessage, stateP.retryAttempts);
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'CHECK_UNKNOWN_DOCUMENTS') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    if (isTypeof(res.right, 'unknown_docs_found')) {
      if (!stateP.discardUnknownObjects) {
        const reason = extractUnknownDocFailureReason(
          stateP.migrationDocLinks.resolveMigrationFailures,
          res.right.unknownDocs
        );

        return {
          ...stateP,
          controlState: 'FATAL',
          reason,
          logs: [
            ...logs,
            {
              level: 'error',
              message: reason,
            },
          ],
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
    } else if (isTypeof(res.left, 'source_equals_target')) {
      // As part of a reindex-migration, we wanted to block the source index to prevent updates
      // However, this migrator's source index matches the target index.
      // Thus, another instance's migrator is ahead of us. We skip the clone steps and continue the flow
      return {
        ...stateP,
        controlState: 'REFRESH_TARGET',
      };
    } else if (isTypeof(res.left, 'index_not_found_exception')) {
      // We don't handle the following errors as the migration algorithm
      // will never cause them to occur:
      // - index_not_found_exception
      throwBadResponse(stateP, res.left as never);
    } else {
      throwBadResponse(stateP, res.left);
    }
  } else if (stateP.controlState === 'CALCULATE_EXCLUDE_FILTERS') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;

    if (Either.isRight(res)) {
      excludeOnUpgradeQuery = addMustNotClausesToBoolQuery(
        res.right.filterClauses,
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
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'CREATE_REINDEX_TEMP') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      if (stateP.mustRelocateDocuments) {
        // we are reindexing, and this migrator's index is involved in document relocations
        return { ...stateP, controlState: 'READY_TO_REINDEX_SYNC' };
      } else {
        // we are reindexing but this migrator's index is not involved in any document relocation
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT',
          sourceIndex: stateP.sourceIndex as Option.Some<string>,
          sourceIndexMappings: stateP.sourceIndexMappings as Option.Some<IndexMapping>,
        };
      }
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
        throwBadResponse(stateP, left);
      }
    } else {
      // If the createIndex action receives an 'resource_already_exists_exception'
      // it will wait until the index status turns green so we don't have any
      // left responses to handle here.
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'READY_TO_REINDEX_SYNC') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      if (Option.isSome(stateP.sourceIndex) && Option.isSome(stateP.sourceIndexMappings)) {
        // this migrator's source index exist, reindex its entries
        return {
          ...stateP,
          controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT',
          sourceIndex: stateP.sourceIndex as Option.Some<string>,
          sourceIndexMappings: stateP.sourceIndexMappings as Option.Some<IndexMapping>,
        };
      } else {
        // this migrator's source index did NOT exist
        // this migrator does not need to reindex anything (others might need to)
        return { ...stateP, controlState: 'DONE_REINDEXING_SYNC' };
      }
    } else if (Either.isLeft(res)) {
      const left = res.left;

      if (isTypeof(left, 'synchronization_failed')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: 'An error occurred whilst waiting for other migrators to get to this step.',
          throwDelayMillis: 1000, // another migrator has failed for a reason, let it take Kibana down and log its problem
        };
      } else {
        throwBadResponse(stateP, left);
      }
    } else {
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
        logs: [
          ...logs,
          {
            level: 'info',
            message: `REINDEX_SOURCE_TO_TEMP_OPEN_PIT PitId:${res.right.pitId}`,
          },
        ],
      };
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_READ') {
    // we carry through any failures we've seen with transforming documents on state
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      const sourceIndexPitId = res.right.pitId;
      const progress = setProgressTotal(stateP.progress, res.right.totalHits);
      logs = logProgress(stateP.logs, progress);
      if (res.right.outdatedDocuments.length > 0) {
        return {
          ...stateP,
          sourceIndexPitId,
          controlState: 'REINDEX_SOURCE_TO_TEMP_TRANSFORM',
          outdatedDocuments: res.right.outdatedDocuments,
          lastHitSortValue: res.right.lastHitSortValue,
          progress,
          logs,
          // We succeeded in reading this batch, so increase the batch size for the next request.
          batchSize: increaseBatchSize(stateP),
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
          sourceIndexPitId,
          controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT',
          logs,
        };
      }
    } else {
      const left = res.left;
      if (isTypeof(left, 'es_response_too_large')) {
        if (stateP.batchSize === 1) {
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: `After reducing the read batch size to a single document, the Elasticsearch response content length was ${left.contentLength}bytes which still exceeded migrations.maxReadBatchSizeBytes. Increase migrations.maxReadBatchSizeBytes and try again.`,
          };
        } else {
          const batchSize = Math.max(Math.floor(stateP.batchSize / 2), 1);
          return {
            ...stateP,
            batchSize,
            controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
            logs: [
              ...stateP.logs,
              {
                level: 'warning',
                message: `Read a batch with a response content length of ${left.contentLength} bytes which exceeds migrations.maxReadBatchSizeBytes, retrying by reducing the batch size in half to ${batchSize}.`,
              },
            ],
          };
        }
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      const { sourceIndexPitId, ...state } = stateP;

      if (stateP.mustRelocateDocuments) {
        return {
          ...state,
          controlState: 'DONE_REINDEXING_SYNC',
        };
      } else {
        return {
          ...stateP,
          controlState: 'SET_TEMP_WRITE_BLOCK',
          sourceIndex: stateP.sourceIndex as Option.Some<string>,
          sourceIndexMappings: Option.none,
        };
      }
    } else {
      throwBadResponse(stateP, res);
    }
  } else if (stateP.controlState === 'DONE_REINDEXING_SYNC') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'SET_TEMP_WRITE_BLOCK',
        sourceIndex: stateP.sourceIndex as Option.Some<string>,
        sourceIndexMappings: Option.none,
      };
    } else if (Either.isLeft(res)) {
      const left = res.left;

      if (isTypeof(left, 'synchronization_failed')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: 'An error occurred whilst waiting for other migrators to get to this step.',
          throwDelayMillis: 1000, // another migrator has failed for a reason, let it take Kibana down and log its problem
        };
      } else {
        throwBadResponse(stateP, left);
      }
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
        const documents = Either.isRight(res) ? res.right.processedDocs : res.left.processedDocs;
        const batches = createBatches({
          documents,
          maxBatchSizeBytes: stateP.maxBatchSizeBytes,
          typeIndexMap: buildTempIndexMap(stateP.indexTypesMap, stateP.kibanaVersion),
        });
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
            bulkOperationBatches: batches.right,
            currentBatch: 0,
            progress,
          };
        } else {
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: fatalReasonDocumentExceedsMaxBatchSizeBytes({
              _id: batches.left.documentId,
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
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      if (stateP.currentBatch + 1 < stateP.bulkOperationBatches.length) {
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
        // UPDATE_TARGET_MAPPINGS_PROPERTIES steps since we might have plugins enabled
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
      } else if (isTypeof(left, 'operation_not_supported')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: `Action failed due to unsupported operation: ${left.operationName}`,
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
        const pitId = res.right.pitId;
        const progress = setProgressTotal(stateP.progress, res.right.totalHits);
        logs = logProgress(stateP.logs, progress);

        return {
          ...stateP,
          pitId,
          controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
          outdatedDocuments: res.right.outdatedDocuments,
          lastHitSortValue: res.right.lastHitSortValue,
          progress,
          logs,
          // We succeeded in reading this batch, so increase the batch size for the next request.
          batchSize: increaseBatchSize(stateP),
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

        // If there are no more results we have transformed all outdated
        // documents and we didn't encounter any corrupt documents or transformation errors
        // and can proceed to the next step
        return {
          ...stateP,
          pitId: res.right.pitId,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
        };
      }
    } else {
      const left = res.left;
      if (isTypeof(left, 'es_response_too_large')) {
        if (stateP.batchSize === 1) {
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: `After reducing the read batch size to a single document, the response content length was ${left.contentLength} bytes which still exceeded migrations.maxReadBatchSizeBytes. Increase migrations.maxReadBatchSizeBytes and try again.`,
          };
        } else {
          const batchSize = Math.max(Math.floor(stateP.batchSize / 2), 1);
          return {
            ...stateP,
            batchSize,
            controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
            logs: [
              ...stateP.logs,
              {
                level: 'warning',
                message: `Read a batch with a response content length of ${left.contentLength} bytes which exceeds migrations.maxReadBatchSizeBytes, retrying by reducing the batch size in half to ${batchSize}.`,
              },
            ],
          };
        }
      } else {
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'OUTDATED_DOCUMENTS_TRANSFORM') {
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
        // we might have some transformation errors from previous iterations, but user has chosen to discard them
        const documents = Either.isRight(res) ? res.right.processedDocs : res.left.processedDocs;

        let corruptDocumentIds = stateP.corruptDocumentIds;
        let transformErrors = stateP.transformErrors;

        if (Either.isLeft(res)) {
          corruptDocumentIds = [...stateP.corruptDocumentIds, ...res.left.corruptDocumentIds];
          transformErrors = [...stateP.transformErrors, ...res.left.transformErrors];
        }

        const batches = createBatches({
          documents,
          corruptDocumentIds,
          transformErrors,
          maxBatchSizeBytes: stateP.maxBatchSizeBytes,
        });
        if (Either.isRight(batches)) {
          return {
            ...stateP,
            controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX',
            bulkOperationBatches: batches.right,
            currentBatch: 0,
            hasTransformedDocs: true,
            progress,
          };
        } else {
          return {
            ...stateP,
            controlState: 'FATAL',
            reason: fatalReasonDocumentExceedsMaxBatchSizeBytes({
              _id: batches.left.documentId,
              docSizeBytes: batches.left.docSizeBytes,
              maxBatchSizeBytes: batches.left.maxBatchSizeBytes,
            }),
          };
        }
      } else {
        // At this point, there are some corrupt documents and/or transformation errors
        // from previous iterations and we're not discarding them.
        // Also, the current batch of SEARCH_READ documents has been transformed successfully
        // so there is no need to append them to the lists of corruptDocumentIds, transformErrors.
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
          progress,
        };
      }
    } else {
      const left = res.left;
      if (isTypeof(left, 'documents_transform_failed')) {
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
        throwBadResponse(stateP, left);
      }
    }
  } else if (stateP.controlState === 'TRANSFORMED_DOCUMENTS_BULK_INDEX') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      if (stateP.currentBatch + 1 < stateP.bulkOperationBatches.length) {
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
      const left = res.left;
      if (isTypeof(left, 'request_entity_too_large_exception')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: FATAL_REASON_REQUEST_ENTITY_TOO_LARGE,
        };
      } else if (
        isTypeof(left, 'target_index_had_write_block') ||
        isTypeof(left, 'index_not_found_exception')
      ) {
        // we fail on these errors since the target index will never get
        // deleted and should only have a write block if a newer version of
        // Kibana started an upgrade
        throwBadResponse(stateP, left as never);
      } else {
        throwBadResponse(stateP, left);
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
      // The types mappings have NOT changed, no need to pick up changes in any documents
      return {
        ...stateP,
        controlState: 'CHECK_VERSION_INDEX_READY_ACTIONS',
        logs: [
          ...stateP.logs,
          {
            level: 'info',
            message:
              'There are no changes in the mappings of any of the SO types, skipping UPDATE_TARGET_MAPPINGS steps.',
          },
        ],
      };
    } else {
      const left = res.left;
      if (isTypeof(left, 'index_mappings_incomplete')) {
        // reindex migration
        // some top-level properties have changed, e.g. 'dynamic' or '_meta' (see checkTargetTypesMappings())
        // we must "pick-up" all documents on the index (by not providing a query)
        return {
          ...stateP,
          controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES',
          updatedTypesQuery: Option.none,
        };
      } else if (isTypeof(left, 'types_changed')) {
        // compatible migration: the mappings of some SO types have been updated
        const updatedTypesQuery = Option.some(buildPickupMappingsQuery(left.updatedTypes));

        return {
          ...stateP,
          controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES',
          // we can "pick-up" only the SO types that have changed
          updatedTypesQuery,
          logs: [
            ...stateP.logs,
            {
              level: 'info',
              message: `Documents of the following SO types will be updated, so that ES can pickup the updated mappings: ${left.updatedTypes}.`,
            },
          ],
        };
      } else if (isTypeof(left, 'types_added')) {
        // compatible migration: ONLY new SO types have been introduced, skip directly to UPDATE_TARGET_MAPPINGS_META
        return {
          ...stateP,
          controlState: 'UPDATE_TARGET_MAPPINGS_META',
        };
      } else {
        throwBadResponse(stateP, res as never);
      }
    }
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS_PROPERTIES') {
    const res = resW as ExcludeRetryableEsError<ResponseType<typeof stateP.controlState>>;
    if (Either.isRight(res)) {
      return {
        ...stateP,
        controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK',
        updateTargetMappingsTaskId: res.right.taskId,
      };
    } else {
      throwBadResponse(stateP, res as never);
    }
  } else if (stateP.controlState === 'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK') {
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
      } else if (isTypeof(left, 'task_completed_with_retriable_error')) {
        return delayRetryState(
          {
            ...stateP,
            controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES',
            skipRetryReset: true,
          },
          left.message,
          stateP.retryAttempts
        );
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
        controlState: stateP.mustRelocateDocuments
          ? 'MARK_VERSION_INDEX_READY_SYNC'
          : 'MARK_VERSION_INDEX_READY',
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
      if (res.right === 'index_already_exists') {
        // We were supposed to be on a "fresh deployment" state (we did not find any aliases)
        // but the target index already exists. Assume it can be from a previous upgrade attempt that:
        // - managed to clone ..._reindex_temp into target
        // - but did NOT finish the process (aka did not get to update the index aliases)
        return {
          ...stateP,
          controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
        };
      }
      return {
        ...stateP,
        controlState: 'CHECK_VERSION_INDEX_READY_ACTIONS',
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
        throwBadResponse(stateP, left);
      }
    } else {
      // If the createIndex action receives an 'resource_already_exists_exception'
      // it will wait until the index status turns green so we don't have any
      // left responses to handle here.
      throwBadResponse(stateP, res);
    }
  } else if (
    stateP.controlState === 'MARK_VERSION_INDEX_READY' ||
    stateP.controlState === 'MARK_VERSION_INDEX_READY_SYNC'
  ) {
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
        if (left.index.endsWith(REINDEX_TEMP_SUFFIX)) {
          // another instance has already completed the migration and deleted
          // the temporary index
          return { ...stateP, controlState: 'MARK_VERSION_INDEX_READY_CONFLICT' };
        } else if (isTypeof(left, 'index_not_found_exception')) {
          // The migration algorithm will never cause a
          // index_not_found_exception for an index other than the temporary
          // index handled above.
          throwBadResponse(stateP, left as never);
        } else {
          throwBadResponse(stateP, left);
        }
      } else if (isTypeof(left, 'remove_index_not_a_concrete_index')) {
        // We don't handle this error as the migration algorithm will never
        // cause it to occur (this error is only relevant to the LEGACY_DELETE
        // step).
        throwBadResponse(stateP, left as never);
      } else if (isTypeof(left, 'synchronization_failed')) {
        return {
          ...stateP,
          controlState: 'FATAL',
          reason: 'An error occurred whilst waiting for other migrators to get to this step.',
          throwDelayMillis: 1000, // another migrator has failed for a reason, let it take Kibana down and log its problem
        };
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
    throwBadControlState(stateP);
  }
};
