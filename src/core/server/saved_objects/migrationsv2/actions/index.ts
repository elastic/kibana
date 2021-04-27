/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import type { estypes } from '@elastic/elasticsearch';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClientError, ResponseError } from '@elastic/elasticsearch/lib/errors';
import { pipe } from 'fp-ts/lib/pipeable';
import { flow } from 'fp-ts/lib/function';
import { ElasticsearchClient } from '../../../elasticsearch';
import { IndexMapping } from '../../mappings';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '../../serialization';
import type { TransformRawDocs } from '../types';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
export type { RetryableEsClientError };

/**
 * Batch size for updateByQuery and reindex operations.
 * Uses the default value of 1000 for Elasticsearch reindex operation.
 */
const BATCH_SIZE = 1_000;
const DEFAULT_TIMEOUT = '60s';
/** Allocate 1 replica if there are enough data nodes, otherwise continue with 0 */
const INDEX_AUTO_EXPAND_REPLICAS = '0-1';
/** ES rule of thumb: shards should be several GB to 10's of GB, so Kibana is unlikely to cross that limit */
const INDEX_NUMBER_OF_SHARDS = 1;
/** Wait for all shards to be active before starting an operation */
const WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE = 'all';

// Map of left response 'type' string -> response interface
export interface ActionErrorTypeMap {
  wait_for_task_completion_timeout: WaitForTaskCompletionTimeout;
  retryable_es_client_error: RetryableEsClientError;
  index_not_found_exception: IndexNotFound;
  target_index_had_write_block: TargetIndexHadWriteBlock;
  incompatible_mapping_exception: IncompatibleMappingException;
  alias_not_found_exception: AliasNotFound;
  remove_index_not_a_concrete_index: RemoveIndexNotAConcreteIndex;
}

/**
 * Type guard for narrowing the type of a left
 */
export function isLeftTypeof<T extends keyof ActionErrorTypeMap>(
  res: any,
  typeString: T
): res is ActionErrorTypeMap[T] {
  return res.type === typeString;
}

export type FetchIndexResponse = Record<
  string,
  { aliases: Record<string, unknown>; mappings: IndexMapping; settings: unknown }
>;

/**
 * Fetches information about the given indices including aliases, mappings and
 * settings.
 */
export const fetchIndices = (
  client: ElasticsearchClient,
  indicesToFetch: string[]
): TaskEither.TaskEither<RetryableEsClientError, FetchIndexResponse> =>
  // @ts-expect-error @elastic/elasticsearch IndexState.alias and IndexState.mappings should be required
  () => {
    return client.indices
      .get(
        {
          index: indicesToFetch,
          ignore_unavailable: true, // Don't return an error for missing indices. Note this *will* include closed indices, the docs are misleading https://github.com/elastic/elasticsearch/issues/63607
        },
        { ignore: [404], maxRetries: 0 }
      )
      .then(({ body }) => {
        return Either.right(body);
      })
      .catch(catchRetryableEsClientErrors);
  };

export interface IndexNotFound {
  type: 'index_not_found_exception';
  index: string;
}
/**
 * Sets a write block in place for the given index. If the response includes
 * `acknowledged: true` all in-progress writes have drained and no further
 * writes to this index will be possible.
 *
 * The first time the write block is added to an index the response will
 * include `shards_acknowledged: true` but once the block is in place,
 * subsequent calls return `shards_acknowledged: false`
 */
export const setWriteBlock = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<
  IndexNotFound | RetryableEsClientError,
  'set_write_block_succeeded'
> => () => {
  return client.indices
    .addBlock<{
      acknowledged: boolean;
      shards_acknowledged: boolean;
    }>(
      {
        index,
        block: 'write',
      },
      { maxRetries: 0 /** handle retry ourselves for now */ }
    )
    .then((res: any) => {
      return res.body.acknowledged === true
        ? Either.right('set_write_block_succeeded' as const)
        : Either.left({
            type: 'retryable_es_client_error' as const,
            message: 'set_write_block_failed',
          });
    })
    .catch((e: ElasticsearchClientError) => {
      if (e instanceof EsErrors.ResponseError) {
        if (e.message === 'index_not_found_exception') {
          return Either.left({ type: 'index_not_found_exception' as const, index });
        }
      }
      throw e;
    })
    .catch(catchRetryableEsClientErrors);
};

/**
 * Removes a write block from an index
 */
export const removeWriteBlock = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<RetryableEsClientError, 'remove_write_block_succeeded'> => () => {
  return client.indices
    .putSettings<{
      acknowledged: boolean;
      shards_acknowledged: boolean;
    }>(
      {
        index,
        // Don't change any existing settings
        preserve_existing: true,
        body: {
          index: {
            blocks: {
              write: false,
            },
          },
        },
      },
      { maxRetries: 0 /** handle retry ourselves for now */ }
    )
    .then((res) => {
      return res.body.acknowledged === true
        ? Either.right('remove_write_block_succeeded' as const)
        : Either.left({
            type: 'retryable_es_client_error' as const,
            message: 'remove_write_block_failed',
          });
    })
    .catch(catchRetryableEsClientErrors);
};

/**
 * A yellow index status means the index's primary shard is allocated and the
 * index is ready for searching/indexing documents, but ES wasn't able to
 * allocate the replicas. When migrations proceed with a yellow index it means
 * we don't have as much data-redundancy as we could have, but waiting for
 * replicas would mean that v2 migrations fail where v1 migrations would have
 * succeeded. It doesn't feel like it's Kibana's job to force users to keep
 * their clusters green and even if it's green when we migrate it can turn
 * yellow at any point in the future. So ultimately data-redundancy is up to
 * users to maintain.
 */
export const waitForIndexStatusYellow = (
  client: ElasticsearchClient,
  index: string,
  timeout = DEFAULT_TIMEOUT
): TaskEither.TaskEither<RetryableEsClientError, {}> => () => {
  return client.cluster
    .health({ index, wait_for_status: 'yellow', timeout })
    .then(() => {
      return Either.right({});
    })
    .catch(catchRetryableEsClientErrors);
};

export type CloneIndexResponse = AcknowledgeResponse;

/**
 * Makes a clone of the source index into the target.
 *
 * @remarks
 * This method adds some additional logic to the ES clone index API:
 *  - it is idempotent, if it gets called multiple times subsequent calls will
 *    wait for the first clone operation to complete (up to 60s)
 *  - the first call will wait up to 120s for the cluster state and all shards
 *    to be updated.
 */
export const cloneIndex = (
  client: ElasticsearchClient,
  source: string,
  target: string,
  /** only used for testing */
  timeout = DEFAULT_TIMEOUT
): TaskEither.TaskEither<RetryableEsClientError | IndexNotFound, CloneIndexResponse> => {
  const cloneTask: TaskEither.TaskEither<
    RetryableEsClientError | IndexNotFound,
    AcknowledgeResponse
  > = () => {
    return client.indices
      .clone(
        {
          index: source,
          target,
          wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
          body: {
            settings: {
              index: {
                // The source we're cloning from will have a write block set, so
                // we need to remove it to allow writes to our newly cloned index
                'blocks.write': false,
                number_of_shards: INDEX_NUMBER_OF_SHARDS,
                auto_expand_replicas: INDEX_AUTO_EXPAND_REPLICAS,
                // Set an explicit refresh interval so that we don't inherit the
                // value from incorrectly configured index templates (not required
                // after we adopt system indices)
                refresh_interval: '1s',
                // Bump priority so that recovery happens before newer indices
                priority: 10,
              },
            },
          },
          timeout,
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      )
      .then((res) => {
        /**
         * - acknowledged=false, we timed out before the cluster state was
         *   updated with the newly created index, but it probably will be
         *   created sometime soon.
         * - shards_acknowledged=false, we timed out before all shards were
         *   started
         * - acknowledged=true, shards_acknowledged=true, cloning complete
         */
        return Either.right({
          acknowledged: res.body.acknowledged,
          shardsAcknowledged: res.body.shards_acknowledged,
        });
      })
      .catch((error: EsErrors.ResponseError) => {
        if (error.body.error.type === 'index_not_found_exception') {
          return Either.left({
            type: 'index_not_found_exception' as const,
            index: error.body.error.index,
          });
        } else if (error.body.error.type === 'resource_already_exists_exception') {
          /**
           * If the target index already exists it means a previous clone
           * operation had already been started. However, we can't be sure
           * that all shards were started so return shardsAcknowledged: false
           */
          return Either.right({
            acknowledged: true,
            shardsAcknowledged: false,
          });
        } else {
          throw error;
        }
      })
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    cloneTask,
    TaskEither.chain((res) => {
      if (res.acknowledged && res.shardsAcknowledged) {
        // If the cluster state was updated and all shards ackd we're done
        return TaskEither.right(res);
      } else {
        // Otherwise, wait until the target index has a 'green' status.
        return pipe(
          waitForIndexStatusYellow(client, target, timeout),
          TaskEither.map((value) => {
            /** When the index status is 'green' we know that all shards were started */
            return { acknowledged: true, shardsAcknowledged: true };
          })
        );
      }
    })
  );
};

interface WaitForTaskResponse {
  error: Option.Option<{ type: string; reason: string; index: string }>;
  completed: boolean;
  failures: Option.Option<any[]>;
  description?: string;
}

/**
 * After waiting for the specificed timeout, the task has not yet completed.
 *
 * When querying the tasks API we use `wait_for_completion=true` to block the
 * request until the task completes. If after the `timeout`, the task still has
 * not completed we return this error. This does not mean that the task itelf
 * has reached a timeout, Elasticsearch will continue to run the task.
 */
export interface WaitForTaskCompletionTimeout {
  /** After waiting for the specificed timeout, the task has not yet completed. */
  readonly type: 'wait_for_task_completion_timeout';
  readonly message: string;
  readonly error?: Error;
}

const catchWaitForTaskCompletionTimeout = (
  e: ResponseError
): Either.Either<WaitForTaskCompletionTimeout, never> => {
  if (
    e.body?.error?.type === 'timeout_exception' ||
    e.body?.error?.type === 'receive_timeout_transport_exception'
  ) {
    return Either.left({
      type: 'wait_for_task_completion_timeout' as const,
      message: `[${e.body.error.type}] ${e.body.error.reason}`,
      error: e,
    });
  } else {
    throw e;
  }
};

/**
 * Blocks for up to 60s or until a task completes.
 *
 * TODO: delete completed tasks
 */
const waitForTask = (
  client: ElasticsearchClient,
  taskId: string,
  timeout: string
): TaskEither.TaskEither<
  RetryableEsClientError | WaitForTaskCompletionTimeout,
  WaitForTaskResponse
> => () => {
  return client.tasks
    .get({
      task_id: taskId,
      wait_for_completion: true,
      timeout,
    })
    .then((res) => {
      const body = res.body;
      const failures = body.response?.failures ?? [];
      return Either.right({
        completed: body.completed,
        // @ts-expect-error @elastic/elasticsearch GetTaskResponse doesn't declare `error` property
        error: Option.fromNullable(body.error),
        failures: failures.length > 0 ? Option.some(failures) : Option.none,
        description: body.task.description,
      });
    })
    .catch(catchWaitForTaskCompletionTimeout)
    .catch(catchRetryableEsClientErrors);
};

export interface UpdateByQueryResponse {
  taskId: string;
}

/**
 * Pickup updated mappings by performing an update by query operation on all
 * documents in the index. Returns a task ID which can be
 * tracked for progress.
 *
 * @remarks When mappings are updated to add a field which previously wasn't
 * mapped Elasticsearch won't automatically add existing documents to it's
 * internal search indices. So search results on this field won't return any
 * existing documents. By running an update by query we essentially refresh
 * these the internal search indices for all existing documents.
 * This action uses `conflicts: 'proceed'` allowing several Kibana instances
 * to run this in parallel.
 */
export const pickupUpdatedMappings = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<RetryableEsClientError, UpdateByQueryResponse> => () => {
  return client
    .updateByQuery({
      // Ignore version conflicts that can occur from parallel update by query operations
      conflicts: 'proceed',
      // Return an error when targeting missing or closed indices
      allow_no_indices: false,
      index,
      // How many documents to update per batch
      scroll_size: BATCH_SIZE,
      // force a refresh so that we can query the updated index immediately
      // after the operation completes
      refresh: true,
      // Create a task and return task id instead of blocking until complete
      wait_for_completion: false,
    })
    .then(({ body: { task: taskId } }) => {
      return Either.right({ taskId: String(taskId!) });
    })
    .catch(catchRetryableEsClientErrors);
};

/** @internal */
export interface OpenPitResponse {
  pitId: string;
}

// how long ES should keep PIT alive
const pitKeepAlive = '10m';
/*
 * Creates a lightweight view of data when the request has been initiated.
 * See https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
 * */
export const openPit = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<RetryableEsClientError, OpenPitResponse> => () => {
  return client
    .openPointInTime({
      index,
      keep_alive: pitKeepAlive,
    })
    .then((response) => Either.right({ pitId: response.body.id }))
    .catch(catchRetryableEsClientErrors);
};

/** @internal */
export interface ReadWithPit {
  outdatedDocuments: SavedObjectsRawDoc[];
  readonly lastHitSortValue: number[] | undefined;
}

/*
 * Requests documents from the index using PIT mechanism.
 * Filter unusedTypesToExclude documents out to exclude them from being migrated.
 * */
export const readWithPit = (
  client: ElasticsearchClient,
  pitId: string,
  /* When reading we use a source query to exclude saved objects types which
   * are no longer used. These saved objects will still be kept in the outdated
   * index for backup purposes, but won't be available in the upgraded index.
   */
  unusedTypesQuery: Option.Option<estypes.QueryContainer>,
  batchSize: number,
  searchAfter?: number[]
): TaskEither.TaskEither<RetryableEsClientError, ReadWithPit> => () => {
  return client
    .search<SavedObjectsRawDoc>({
      body: {
        // Sort fields are required to use searchAfter
        sort: {
          // the most efficient option as order is not important for the migration
          _shard_doc: { order: 'asc' },
        },
        pit: { id: pitId, keep_alive: pitKeepAlive },
        size: batchSize,
        search_after: searchAfter,
        // Improve performance by not calculating the total number of hits
        // matching the query.
        track_total_hits: false,
        // Exclude saved object types
        query: Option.isSome(unusedTypesQuery) ? unusedTypesQuery.value : undefined,
      },
    })
    .then((response) => {
      const hits = response.body.hits.hits;

      if (hits.length > 0) {
        return Either.right({
          // @ts-expect-error @elastic/elasticsearch _source is optional
          outdatedDocuments: hits as SavedObjectsRawDoc[],
          lastHitSortValue: hits[hits.length - 1].sort as number[],
        });
      }

      return Either.right({
        outdatedDocuments: [],
        lastHitSortValue: undefined,
      });
    })
    .catch(catchRetryableEsClientErrors);
};

/*
 * Closes PIT.
 * See https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
 * */
export const closePit = (
  client: ElasticsearchClient,
  pitId: string
): TaskEither.TaskEither<RetryableEsClientError, {}> => () => {
  return client
    .closePointInTime({
      body: { id: pitId },
    })
    .then((response) => {
      if (!response.body.succeeded) {
        throw new Error(`Failed to close PointInTime with id: ${pitId}`);
      }
      return Either.right({});
    })
    .catch(catchRetryableEsClientErrors);
};

/*
 * Transform outdated docs and write them to the index.
 * */
export const transformDocs = (
  client: ElasticsearchClient,
  transformRawDocs: TransformRawDocs,
  outdatedDocuments: SavedObjectsRawDoc[],
  index: string,
  refresh: estypes.Refresh
): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotFound | TargetIndexHadWriteBlock,
  'bulk_index_succeeded'
> =>
  pipe(
    TaskEither.tryCatch(
      () => transformRawDocs(outdatedDocuments),
      (e) => {
        throw e;
      }
    ),
    TaskEither.chain((docs) => bulkOverwriteTransformedDocuments(client, index, docs, refresh))
  );

/** @internal */
export interface ReindexResponse {
  taskId: string;
}

/**
 * Reindex documents from the `sourceIndex` into the `targetIndex`. Returns a
 * task ID which can be tracked for progress.
 *
 * @remarks This action is idempotent allowing several Kibana instances to run
 * this in parallel. By using `op_type: 'create', conflicts: 'proceed'` there
 * will be only one write per reindexed document.
 */
export const reindex = (
  client: ElasticsearchClient,
  sourceIndex: string,
  targetIndex: string,
  reindexScript: Option.Option<string>,
  requireAlias: boolean,
  /* When reindexing we use a source query to exclude saved objects types which
   * are no longer used. These saved objects will still be kept in the outdated
   * index for backup purposes, but won't be available in the upgraded index.
   */
  unusedTypesQuery: Option.Option<estypes.QueryContainer>
): TaskEither.TaskEither<RetryableEsClientError, ReindexResponse> => () => {
  return client
    .reindex({
      // Require targetIndex to be an alias. Prevents a new index from being
      // created if targetIndex doesn't exist.
      require_alias: requireAlias,
      body: {
        // Ignore version conflicts from existing documents
        conflicts: 'proceed',
        source: {
          index: sourceIndex,
          // Set reindex batch size
          size: BATCH_SIZE,
          // Exclude saved object types
          query: Option.fold<estypes.QueryContainer, estypes.QueryContainer | undefined>(
            () => undefined,
            (query) => query
          )(unusedTypesQuery),
        },
        dest: {
          index: targetIndex,
          // Don't override existing documents, only create if missing
          op_type: 'create',
        },
        script: Option.fold<string, undefined | { source: string; lang: 'painless' }>(
          () => undefined,
          (script) => ({
            source: script,
            lang: 'painless',
          })
        )(reindexScript),
      },
      // force a refresh so that we can query the target index
      refresh: true,
      // Create a task and return task id instead of blocking until complete
      wait_for_completion: false,
    })
    .then(({ body: { task: taskId } }) => {
      return Either.right({ taskId: String(taskId) });
    })
    .catch(catchRetryableEsClientErrors);
};

interface WaitForReindexTaskFailure {
  readonly cause: { type: string; reason: string };
}

/** @internal */
export interface TargetIndexHadWriteBlock {
  type: 'target_index_had_write_block';
}

/** @internal */
export interface IncompatibleMappingException {
  type: 'incompatible_mapping_exception';
}

export const waitForReindexTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      | IndexNotFound
      | TargetIndexHadWriteBlock
      | IncompatibleMappingException
      | RetryableEsClientError
      | WaitForTaskCompletionTimeout,
      'reindex_succeeded'
    > => {
      const failureIsAWriteBlock = ({ cause: { type, reason } }: WaitForReindexTaskFailure) =>
        type === 'cluster_block_exception' &&
        reason.match(/index \[.+] blocked by: \[FORBIDDEN\/8\/index write \(api\)\]/);

      const failureIsIncompatibleMappingException = ({
        cause: { type, reason },
      }: WaitForReindexTaskFailure) =>
        type === 'strict_dynamic_mapping_exception' || type === 'mapper_parsing_exception';

      if (Option.isSome(res.error)) {
        if (res.error.value.type === 'index_not_found_exception') {
          return TaskEither.left({
            type: 'index_not_found_exception' as const,
            index: res.error.value.index,
          });
        } else {
          throw new Error('Reindex failed with the following error:\n' + JSON.stringify(res.error));
        }
      } else if (Option.isSome(res.failures)) {
        if (res.failures.value.every(failureIsAWriteBlock)) {
          return TaskEither.left({ type: 'target_index_had_write_block' as const });
        } else if (res.failures.value.every(failureIsIncompatibleMappingException)) {
          return TaskEither.left({ type: 'incompatible_mapping_exception' as const });
        } else {
          throw new Error(
            'Reindex failed with the following failures:\n' + JSON.stringify(res.failures.value)
          );
        }
      } else {
        return TaskEither.right('reindex_succeeded' as const);
      }
    }
  )
);

export const verifyReindex = (
  client: ElasticsearchClient,
  sourceIndex: string,
  targetIndex: string
): TaskEither.TaskEither<
  RetryableEsClientError | { type: 'verify_reindex_failed' },
  'verify_reindex_succeeded'
> => () => {
  const count = (index: string) =>
    client
      .count<{ count: number }>({
        index,
        // Return an error when targeting missing or closed indices
        allow_no_indices: false,
      })
      .then((res) => {
        return res.body.count;
      });

  return Promise.all([count(sourceIndex), count(targetIndex)])
    .then(([sourceCount, targetCount]) => {
      if (targetCount >= sourceCount) {
        return Either.right('verify_reindex_succeeded' as const);
      } else {
        return Either.left({ type: 'verify_reindex_failed' as const });
      }
    })
    .catch(catchRetryableEsClientErrors);
};

export const waitForPickupUpdatedMappingsTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      RetryableEsClientError | WaitForTaskCompletionTimeout,
      'pickup_updated_mappings_succeeded'
    > => {
      // We don't catch or type failures/errors because they should never
      // occur in our migration algorithm and we don't have any business logic
      // for dealing with it. If something happens we'll just crash and try
      // again.
      if (Option.isSome(res.failures)) {
        throw new Error(
          'pickupUpdatedMappings task failed with the following failures:\n' +
            JSON.stringify(res.failures.value)
        );
      } else if (Option.isSome(res.error)) {
        throw new Error(
          'pickupUpdatedMappings task failed with the following error:\n' +
            JSON.stringify(res.error.value)
        );
      } else {
        return TaskEither.right('pickup_updated_mappings_succeeded' as const);
      }
    }
  )
);

/** @internal */
export interface AliasNotFound {
  type: 'alias_not_found_exception';
}

/** @internal */
export interface RemoveIndexNotAConcreteIndex {
  type: 'remove_index_not_a_concrete_index';
}

/** @internal */
export type AliasAction =
  | { remove_index: { index: string } }
  | { remove: { index: string; alias: string; must_exist: boolean } }
  | { add: { index: string; alias: string } };

/**
 * Calls the Update index alias API `_alias` with the provided alias actions.
 */
export const updateAliases = (
  client: ElasticsearchClient,
  aliasActions: AliasAction[]
): TaskEither.TaskEither<
  IndexNotFound | AliasNotFound | RemoveIndexNotAConcreteIndex | RetryableEsClientError,
  'update_aliases_succeeded'
> => () => {
  return client.indices
    .updateAliases(
      {
        body: {
          actions: aliasActions,
        },
      },
      { maxRetries: 0 }
    )
    .then(() => {
      // Ignore `acknowledged: false`. When the coordinating node accepts
      // the new cluster state update but not all nodes have applied the
      // update within the timeout `acknowledged` will be false. However,
      // retrying this update will always immediately result in `acknowledged:
      // true` even if there are still nodes which are falling behind with
      // cluster state updates.
      // The only impact for using `updateAliases` to mark the version index
      // as ready is that it could take longer for other Kibana instances to
      // see that the version index is ready so they are more likely to
      // perform unecessary duplicate work.
      return Either.right('update_aliases_succeeded' as const);
    })
    .catch((err: EsErrors.ElasticsearchClientError) => {
      if (err instanceof EsErrors.ResponseError) {
        if (err.body.error.type === 'index_not_found_exception') {
          return Either.left({
            type: 'index_not_found_exception' as const,
            index: err.body.error.index,
          });
        } else if (
          err.body.error.type === 'illegal_argument_exception' &&
          err.body.error.reason.match(
            /The provided expression \[.+\] matches an alias, specify the corresponding concrete indices instead./
          )
        ) {
          return Either.left({ type: 'remove_index_not_a_concrete_index' as const });
        } else if (
          err.body.error.type === 'aliases_not_found_exception' ||
          (err.body.error.type === 'resource_not_found_exception' &&
            err.body.error.reason.match(/required alias \[.+\] does not exist/))
        ) {
          return Either.left({
            type: 'alias_not_found_exception' as const,
          });
        }
      }
      throw err;
    })
    .catch(catchRetryableEsClientErrors);
};

/** @internal */
export interface AcknowledgeResponse {
  acknowledged: boolean;
  shardsAcknowledged: boolean;
}

function aliasArrayToRecord(aliases: string[]): Record<string, estypes.Alias> {
  const result: Record<string, estypes.Alias> = {};
  for (const alias of aliases) {
    result[alias] = {};
  }
  return result;
}
/**
 * Creates an index with the given mappings
 *
 * @remarks
 * This method adds some additional logic to the ES create index API:
 *  - it is idempotent, if it gets called multiple times subsequent calls will
 *    wait for the first create operation to complete (up to 60s)
 *  - the first call will wait up to 120s for the cluster state and all shards
 *    to be updated.
 */
export const createIndex = (
  client: ElasticsearchClient,
  indexName: string,
  mappings: IndexMapping,
  aliases: string[] = []
): TaskEither.TaskEither<RetryableEsClientError, 'create_index_succeeded'> => {
  const createIndexTask: TaskEither.TaskEither<
    RetryableEsClientError,
    AcknowledgeResponse
  > = () => {
    const aliasesObject = aliasArrayToRecord(aliases);

    return client.indices
      .create(
        {
          index: indexName,
          // wait until all shards are available before creating the index
          // (since number_of_shards=1 this does not have any effect atm)
          wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
          // Wait up to 60s for the cluster state to update and all shards to be
          // started
          timeout: DEFAULT_TIMEOUT,
          body: {
            mappings,
            aliases: aliasesObject,
            settings: {
              index: {
                // ES rule of thumb: shards should be several GB to 10's of GB, so
                // Kibana is unlikely to cross that limit.
                number_of_shards: 1,
                auto_expand_replicas: INDEX_AUTO_EXPAND_REPLICAS,
                // Set an explicit refresh interval so that we don't inherit the
                // value from incorrectly configured index templates (not required
                // after we adopt system indices)
                refresh_interval: '1s',
                // Bump priority so that recovery happens before newer indices
                priority: 10,
              },
            },
          },
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      )
      .then((res) => {
        /**
         * - acknowledged=false, we timed out before the cluster state was
         *   updated on all nodes with the newly created index, but it
         *   probably will be created sometime soon.
         * - shards_acknowledged=false, we timed out before all shards were
         *   started
         * - acknowledged=true, shards_acknowledged=true, index creation complete
         */
        return Either.right({
          acknowledged: res.body.acknowledged,
          shardsAcknowledged: res.body.shards_acknowledged,
        });
      })
      .catch((error) => {
        if (error.body.error.type === 'resource_already_exists_exception') {
          /**
           * If the target index already exists it means a previous create
           * operation had already been started. However, we can't be sure
           * that all shards were started so return shardsAcknowledged: false
           */
          return Either.right({
            acknowledged: true,
            shardsAcknowledged: false,
          });
        } else {
          throw error;
        }
      })
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    createIndexTask,
    TaskEither.chain((res) => {
      if (res.acknowledged && res.shardsAcknowledged) {
        // If the cluster state was updated and all shards ackd we're done
        return TaskEither.right('create_index_succeeded');
      } else {
        // Otherwise, wait until the target index has a 'yellow' status.
        return pipe(
          waitForIndexStatusYellow(client, indexName, DEFAULT_TIMEOUT),
          TaskEither.map(() => {
            /** When the index status is 'yellow' we know that all shards were started */
            return 'create_index_succeeded';
          })
        );
      }
    })
  );
};

/** @internal */
export interface UpdateAndPickupMappingsResponse {
  taskId: string;
}

/**
 * Updates an index's mappings and runs an pickupUpdatedMappings task so that the mapping
 * changes are "picked up". Returns a taskId to track progress.
 */
export const updateAndPickupMappings = (
  client: ElasticsearchClient,
  index: string,
  mappings: IndexMapping
): TaskEither.TaskEither<RetryableEsClientError, UpdateAndPickupMappingsResponse> => {
  const putMappingTask: TaskEither.TaskEither<
    RetryableEsClientError,
    'update_mappings_succeeded'
  > = () => {
    return client.indices
      .putMapping({
        index,
        timeout: DEFAULT_TIMEOUT,
        body: mappings,
      })
      .then((res) => {
        // Ignore `acknowledged: false`. When the coordinating node accepts
        // the new cluster state update but not all nodes have applied the
        // update within the timeout `acknowledged` will be false. However,
        // retrying this update will always immediately result in `acknowledged:
        // true` even if there are still nodes which are falling behind with
        // cluster state updates.
        // For updateAndPickupMappings this means that there is the potential
        // that some existing document's fields won't be picked up if the node
        // on which the Kibana shard is running has fallen behind with cluster
        // state updates and the mapping update wasn't applied before we run
        // `pickupUpdatedMappings`. ES tries to limit this risk by blocking
        // index operations (including update_by_query used by
        // updateAndPickupMappings) if there are pending mappings changes. But
        // not all mapping changes will prevent this.
        return Either.right('update_mappings_succeeded' as const);
      })
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    putMappingTask,
    TaskEither.chain((res) => {
      return pickupUpdatedMappings(client, index);
    })
  );
};

/** @internal */
export interface SearchResponse {
  outdatedDocuments: SavedObjectsRawDoc[];
}

interface SearchForOutdatedDocumentsOptions {
  batchSize: number;
  targetIndex: string;
  outdatedDocumentsQuery?: estypes.QueryContainer;
}

/**
 * Search for outdated saved object documents with the provided query. Will
 * return one batch of documents. Searching should be repeated until no more
 * outdated documents can be found.
 */
export const searchForOutdatedDocuments = (
  client: ElasticsearchClient,
  options: SearchForOutdatedDocumentsOptions
): TaskEither.TaskEither<RetryableEsClientError, SearchResponse> => () => {
  return client
    .search<SavedObjectsRawDocSource>({
      index: options.targetIndex,
      // Return the _seq_no and _primary_term so we can use optimistic
      // concurrency control for updates
      seq_no_primary_term: true,
      size: options.batchSize,
      body: {
        query: options.outdatedDocumentsQuery,
        // Optimize search performance by sorting by the "natural" index order
        sort: ['_doc'],
      },
      // Return an error when targeting missing or closed indices
      allow_no_indices: false,
      // Don't return partial results if timeouts or shard failures are
      // encountered. This is important because 0 search hits is interpreted as
      // there being no more outdated documents left that require
      // transformation. Although the default is `false`, we set this
      // explicitly to avoid users overriding the
      // search.default_allow_partial_results cluster setting to true.
      allow_partial_search_results: false,
      // Improve performance by not calculating the total number of hits
      // matching the query.
      track_total_hits: false,
      // Reduce the response payload size by only returning the data we care about
      filter_path: [
        'hits.hits._id',
        'hits.hits._source',
        'hits.hits._seq_no',
        'hits.hits._primary_term',
      ],
    })
    .then((res) =>
      Either.right({ outdatedDocuments: (res.body.hits?.hits as SavedObjectsRawDoc[]) ?? [] })
    )
    .catch(catchRetryableEsClientErrors);
};

/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export const bulkOverwriteTransformedDocuments = (
  client: ElasticsearchClient,
  index: string,
  transformedDocs: SavedObjectsRawDoc[],
  refresh: estypes.Refresh
): TaskEither.TaskEither<RetryableEsClientError, 'bulk_index_succeeded'> => () => {
  return client
    .bulk({
      // Because we only add aliases in the MARK_VERSION_INDEX_READY step we
      // can't bulkIndex to an alias with require_alias=true. This means if
      // users tamper during this operation (delete indices or restore a
      // snapshot), we could end up auto-creating an index without the correct
      // mappings. Such tampering could lead to many other problems and is
      // probably unlikely so for now we'll accept this risk and wait till
      // system indices puts in place a hard control.
      require_alias: false,
      wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
      refresh,
      filter_path: ['items.*.error'],
      body: transformedDocs.flatMap((doc) => {
        return [
          {
            index: {
              _index: index,
              _id: doc._id,
              // overwrite existing documents
              op_type: 'index',
              // use optimistic concurrency control to ensure that outdated
              // documents are only overwritten once with the latest version
              if_seq_no: doc._seq_no,
              if_primary_term: doc._primary_term,
            },
          },
          doc._source,
        ];
      }),
    })
    .then((res) => {
      // Filter out version_conflict_engine_exception since these just mean
      // that another instance already updated these documents
      const errors = (res.body.items ?? []).filter(
        (item) => item.index?.error?.type !== 'version_conflict_engine_exception'
      );
      if (errors.length === 0) {
        return Either.right('bulk_index_succeeded' as const);
      } else {
        throw new Error(JSON.stringify(errors));
      }
    })
    .catch(catchRetryableEsClientErrors);
};
