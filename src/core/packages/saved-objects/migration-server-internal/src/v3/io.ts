/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import * as Either from 'fp-ts/Either';
import * as TaskEither from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import * as Actions from '../actions';
import type { AliasAction, RetryableEsClientError } from '../actions';
import type { DocumentIdAndType } from '../actions/check_for_unknown_docs';
import type { CleanupNotNeeded, CleanupStarted } from '../actions/cleanup_unknown_and_excluded';
import { deleteByQuery } from '../actions/delete_by_query';
import type { BulkOperation } from '../model/create_batches';
import { waitForUpdateIndexMappingsTask } from '../zdt/actions';
import type { MigrationContext } from './context';
import type { IndexMetaUpdate } from './index_meta';

/** The response of a successful IO operation. */
export interface Success<TValue> {
  readonly type: 'success';
  readonly value: TValue;
}

/** Either a {@link Success}, or one of the typed failures of the underlying action. */
export type Response<TFailure extends { type: string }, TValue> = Success<TValue> | TFailure;

const run = async <TFailure extends { type: string }, TValue>(
  task: TaskEither.TaskEither<TFailure, TValue>
): Promise<Response<TFailure, TValue>> =>
  pipe(
    await task(),
    Either.fold<TFailure, TValue, Response<TFailure, TValue>>(
      (failure) => failure,
      (value) => ({ type: 'success', value })
    )
  );

export interface CleanupResult {
  readonly cleanup: CleanupStarted | CleanupNotNeeded;
  /** A sample of the documents of unknown types found in the index. */
  readonly unknownDocs: DocumentIdAndType[];
}

/**
 * Deletes the excluded documents, the documents of removed types and, if `discardUnknownDocs`, the documents of
 * unknown types. The unknown types come from a single check, so a type is never deleted unless it was found unknown.
 */
const cleanupUnknownAndExcluded = (
  context: MigrationContext,
  index: string,
  discardUnknownDocs: boolean
): TaskEither.TaskEither<RetryableEsClientError, CleanupResult> =>
  pipe(
    Actions.checkForUnknownDocs({
      client: context.elasticsearchClient,
      indexName: index,
      knownTypes: context.types,
      excludeOnUpgradeQuery: context.excludeOnUpgradeQuery,
    }),
    TaskEither.map((found) => ('unknownDocs' in found ? found.unknownDocs : [])),
    TaskEither.chainW((unknownDocs) =>
      pipe(
        Actions.calculateExcludeFilters({
          client: context.elasticsearchClient,
          excludeFromUpgradeFilterHooks: context.excludeFromUpgradeFilterHooks,
        }),
        TaskEither.chainW(({ filterClauses, errorsByType }) => {
          const unknownTypes = discardUnknownDocs ? uniq(unknownDocs.map(({ type }) => type)) : [];
          const should = [
            ...filterClauses,
            ...[...context.deletedTypes, ...unknownTypes].map((type) => ({ term: { type } })),
          ];
          return should.length === 0
            ? TaskEither.right<RetryableEsClientError, CleanupResult>({
                cleanup: { type: 'cleanup_not_needed' },
                unknownDocs,
              })
            : pipe(
                deleteByQuery({
                  client: context.elasticsearchClient,
                  indexName: index,
                  query: { bool: { should } },
                  conflicts: 'proceed',
                }),
                TaskEither.map(
                  ({ taskId }): CleanupResult => ({
                    cleanup: { type: 'cleanup_started', taskId, unknownDocs, errorsByType },
                    unknownDocs,
                  })
                )
              );
        })
      )
    )
  );

/** Reads the current `_meta` of the index, applies `update`, and writes it back. */
const updateIndexMeta = (context: MigrationContext, index: string, update: IndexMetaUpdate) =>
  pipe(
    Actions.fetchIndices({ client: context.elasticsearchClient, indices: [index] }),
    TaskEither.chainEitherKW((indices) => update(indices[index]?.mappings?._meta ?? {})),
    TaskEither.chainW((meta) =>
      Actions.updateMappings({
        client: context.elasticsearchClient,
        index,
        mappings: { properties: {}, _meta: meta },
      })
    )
  );

/** Creates the IO layer of the migration of one index. IO returns facts; decisions belong to the steps. */
export const createIO = (context: MigrationContext) => {
  const client = context.elasticsearchClient;
  return {
    fetchIndices: () =>
      run(
        Actions.fetchIndices({
          client,
          indices: [context.indexPrefix, `${context.indexPrefix}_*`],
        })
      ),
    checkClusterRoutingAllocation: () => run(Actions.checkClusterRoutingAllocationEnabled(client)),
    createIndex: (indexName: string, aliases: string[]) =>
      run(
        Actions.createIndex({
          client,
          indexName,
          aliases,
          mappings: context.indexMappings,
          esCapabilities: context.esCapabilities,
        })
      ),
    waitForYellowIndex: (index: string) =>
      run(Actions.waitForIndexStatus({ client, index, status: 'yellow' })),
    /** Updates the mappings, and starts a task that picks them up in the documents matched by `pickupQuery`, if any. */
    updateMappings: (
      index: string,
      mappings: IndexMapping,
      pickupQuery: QueryDslQueryContainer | undefined
    ) =>
      run(
        pickupQuery
          ? pipe(
              Actions.updateAndPickupMappings({
                client,
                index,
                mappings,
                batchSize: context.batchSize,
                query: pickupQuery,
              }),
              TaskEither.map(({ taskId }): { taskId?: string } => ({ taskId }))
            )
          : pipe(
              Actions.updateMappings({ client, index, mappings }),
              TaskEither.map((): { taskId?: string } => ({}))
            )
      ),
    waitForPickupMappingsTask: (taskId: string) =>
      run(waitForUpdateIndexMappingsTask({ client, taskId, timeout: '60s' })),
    updateIndexMeta: (index: string, update: IndexMetaUpdate) =>
      run(updateIndexMeta(context, index, update)),
    updateAliases: (aliasActions: AliasAction[]) =>
      run(Actions.updateAliases({ client, aliasActions })),
    cleanupUnknownAndExcludedDocs: (index: string, discardUnknownDocs: boolean) =>
      run(cleanupUnknownAndExcluded(context, index, discardUnknownDocs)),
    waitForDeleteByQueryTask: (taskId: string) =>
      run(Actions.waitForDeleteByQueryTask({ client, taskId, timeout: '120s' })),
    refreshIndex: (index: string) => run(Actions.refreshIndex({ client, index })),
    openPit: (index: string) => run(Actions.openPit({ client, index })),
    readWithPit: (pitId: string, searchAfter: number[] | undefined, batchSize: number) =>
      run(
        Actions.readWithPit({
          client,
          pitId,
          searchAfter,
          batchSize,
          query: context.outdatedDocumentsQuery,
          seqNoPrimaryTerm: true,
          maxResponseSizeBytes: context.maxReadBatchSizeBytes,
        })
      ),
    transformDocs: (outdatedDocuments: SavedObjectsRawDoc[]) =>
      run(Actions.transformDocs({ outdatedDocuments, transformRawDocs: context.transformRawDocs })),
    bulkIndex: (index: string, operations: BulkOperation[], fetchAllocationExplain: boolean) =>
      run(
        Actions.bulkOverwriteTransformedDocuments({
          client,
          index,
          operations,
          refresh: false,
          fetchAllocationExplain,
        })
      ),
    closePit: (pitId: string) => run(Actions.closePit({ client, pitId })),
    noop: () => run(TaskEither.right('noop' as const)),
  };
};

export type IO = ReturnType<typeof createIO>;

/** The response type of the given IO operation. */
export type IOResponse<TOperation extends keyof IO> = Awaited<ReturnType<IO[TOperation]>>;
