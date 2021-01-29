/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { ElasticsearchClientError } from '@elastic/elasticsearch/lib/errors';
import { pipe } from 'fp-ts/lib/pipeable';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { flow } from 'fp-ts/lib/function';
import { ElasticsearchClient } from '../../../elasticsearch';
import { IndexMapping } from '../../mappings';
import { SavedObjectsRawDoc } from '../../serialization';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
export { RetryableEsClientError };

export const isRetryableEsClientResponse = (
  res: Either.Either<any, unknown>
): res is Either.Left<RetryableEsClientError> => {
  return Either.isLeft(res) && res.left.type === 'retryable_es_client_error';
};

/**
 * Batch size for updateByQuery, reindex & search operations. Smaller batches
 * reduce the memory pressure on Elasticsearch and Kibana so are less likely
 * to cause failures.
 * TODO (profile/tune): How much smaller can we make this number before it
 * starts impacting how long migrations take to perform?
 */
const BATCH_SIZE = 1000;
const DEFAULT_TIMEOUT = '60s';
/** Allocate 1 replica if there are enough data nodes, otherwise continue with 0 */
const INDEX_AUTO_EXPAND_REPLICAS = '0-1';
/** ES rule of thumb: shards should be several GB to 10's of GB, so Kibana is unlikely to cross that limit */
const INDEX_NUMBER_OF_SHARDS = 1;
/** Wait for all shards to be active before starting an operation */
const WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE = 'all';

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
): TaskEither.TaskEither<RetryableEsClientError, FetchIndexResponse> => () => {
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
  { type: 'index_not_found_exception' } | RetryableEsClientError,
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
    .then((res) => {
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
          return Either.left({ type: 'index_not_found_exception' as const });
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
          'index.blocks.write': false,
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

const waitForIndexStatusGreen = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<RetryableEsClientError, {}> => () => {
  return client.cluster
    .health({ index, wait_for_status: 'green', timeout: '30s' })
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
 *  - the first call will wait up to 90s for the cluster state and all shards
 *    to be updated.
 */
export const cloneIndex = (
  client: ElasticsearchClient,
  source: string,
  target: string
): TaskEither.TaskEither<
  RetryableEsClientError | { type: 'index_not_found_exception'; index: string },
  CloneIndexResponse
> => {
  const cloneTask: TaskEither.TaskEither<
    RetryableEsClientError | { type: 'index_not_found_exception'; index: string },
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
          timeout: DEFAULT_TIMEOUT,
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
          waitForIndexStatusGreen(client, target),
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
  description: string;
}

/**
 * Blocks for up to 60s or until a task completes.
 *
 * TODO: delete completed tasks
 */
const waitForTask = (
  client: ElasticsearchClient,
  taskId: string,
  timeout: string
): TaskEither.TaskEither<RetryableEsClientError, WaitForTaskResponse> => () => {
  return client.tasks
    .get<{
      completed: boolean;
      response: { failures: any[] };
      task: { description: string };
      error: { type: string; reason: string; index: string };
    }>({
      task_id: taskId,
      wait_for_completion: true,
      timeout,
    })
    .then((res) => {
      const body = res.body;
      const failures = body.response?.failures ?? [];
      return Either.right({
        completed: body.completed,
        error: Option.fromNullable(body.error),
        failures: failures.length > 0 ? Option.some(failures) : Option.none,
        description: body.task.description,
      });
    })
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
      return Either.right({ taskId });
    })
    .catch(catchRetryableEsClientErrors);
};

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
  requireAlias: boolean
): TaskEither.TaskEither<RetryableEsClientError, ReindexResponse> => () => {
  return client
    .reindex({
      // Require targetIndex to be an alias. Prevents a new index from being
      // created if targetIndex doesn't exist.
      // @ts-expect-error This API isn't documented
      require_alias: requireAlias,
      body: {
        // Ignore version conflicts from existing documents
        conflicts: 'proceed',
        source: {
          index: sourceIndex,
          // Set reindex batch size
          size: BATCH_SIZE,
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
      return Either.right({ taskId });
    })
    .catch(catchRetryableEsClientErrors);
};

interface WaitForReindexTaskFailure {
  cause: { type: string; reason: string };
}

export const waitForReindexTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      | { type: 'index_not_found_exception'; index: string }
      | { type: 'target_index_had_write_block' }
      | { type: 'incompatible_mapping_exception' }
      | RetryableEsClientError,
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
    (res): TaskEither.TaskEither<RetryableEsClientError, 'pickup_updated_mappings_succeeded'> => {
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
  | { type: 'index_not_found_exception'; index: string }
  | { type: 'alias_not_found_exception' }
  | { type: 'remove_index_not_a_concrete_index' }
  | RetryableEsClientError,
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

export interface AcknowledgeResponse {
  acknowledged: boolean;
  shardsAcknowledged: boolean;
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
  aliases?: string[]
): TaskEither.TaskEither<RetryableEsClientError, 'create_index_succeeded'> => {
  const createIndexTask: TaskEither.TaskEither<
    RetryableEsClientError,
    AcknowledgeResponse
  > = () => {
    const aliasesObject = (aliases ?? []).reduce((acc, alias) => {
      acc[alias] = {};
      return acc;
    }, {} as Record<string, {}>);

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
        // Otherwise, wait until the target index has a 'green' status.
        return pipe(
          waitForIndexStatusGreen(client, indexName),
          TaskEither.map(() => {
            /** When the index status is 'green' we know that all shards were started */
            return 'create_index_succeeded';
          })
        );
      }
    })
  );
};

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
      .putMapping<Record<string, any>, IndexMapping>({
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
export interface SearchResponse {
  outdatedDocuments: SavedObjectsRawDoc[];
}

/**
 * Search for outdated saved object documents with the provided query. Will
 * return one batch of documents. Searching should be repeated until no more
 * outdated documents can be found.
 */
export const searchForOutdatedDocuments = (
  client: ElasticsearchClient,
  index: string,
  query: Record<string, unknown>
): TaskEither.TaskEither<RetryableEsClientError, SearchResponse> => () => {
  return client
    .search<{
      // when `filter_path` is specified, ES doesn't return empty arrays, so if
      // there are no search results res.body.hits will be undefined.
      hits?: {
        hits?: SavedObjectsRawDoc[];
      };
    }>({
      index,
      // Optimize search performance by sorting by the "natural" index order
      sort: ['_doc'],
      // Return the _seq_no and _primary_term so we can use optimistic
      // concurrency control for updates
      seq_no_primary_term: true,
      size: BATCH_SIZE,
      body: {
        query,
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
    .then((res) => Either.right({ outdatedDocuments: res.body.hits?.hits ?? [] }))
    .catch(catchRetryableEsClientErrors);
};

/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export const bulkOverwriteTransformedDocuments = (
  client: ElasticsearchClient,
  index: string,
  transformedDocs: SavedObjectsRawDoc[]
): TaskEither.TaskEither<RetryableEsClientError, 'bulk_index_succeeded'> => () => {
  return client
    .bulk<{
      took: number;
      errors: boolean;
      items: [
        {
          index: {
            _id: string;
            status: number;
            // the filter_path ensures that only items with errors are returned
            error: { type: string; reason: string };
          };
        }
      ];
    }>({
      // Because we only add aliases in the MARK_VERSION_INDEX_READY step we
      // can't bulkIndex to an alias with require_alias=true. This means if
      // users tamper during this operation (delete indices or restore a
      // snapshot), we could end up auto-creating an index without the correct
      // mappings. Such tampering could lead to many other problems and is
      // probably unlikely so for now we'll accept this risk and wait till
      // system indices puts in place a hard control.
      require_alias: false,
      wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
      // Wait for a refresh to happen before returning. This ensures that when
      // this Kibana instance searches for outdated documents, it won't find
      // documents that were already transformed by itself or another Kibna
      // instance. However, this causes each OUTDATED_DOCUMENTS_SEARCH ->
      // OUTDATED_DOCUMENTS_TRANSFORM cycle to take 1s so when batches are
      // small performance will become a lot worse.
      // The alternative is to use a search_after with either a tie_breaker
      // field or using a Point In Time as a cursor to go through all documents.
      refresh: 'wait_for',
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
        (item) => item.index.error.type !== 'version_conflict_engine_exception'
      );
      if (errors.length === 0) {
        return Either.right('bulk_index_succeeded' as const);
      } else {
        throw new Error(JSON.stringify(errors));
      }
    })
    .catch(catchRetryableEsClientErrors);
};
