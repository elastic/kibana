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

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { ElasticsearchClientError } from '@elastic/elasticsearch/lib/errors';
import { pipe } from 'fp-ts/lib/pipeable';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { flow } from 'fp-ts/lib/function';
import { ElasticsearchClient } from '../../elasticsearch';
import { IndexMapping } from '../mappings';
import { SavedObjectsRawDoc } from '../serialization';

const retryResponseStatuses = [
  503, // ServiceUnavailable
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
];

export interface RetryableEsClientError {
  type: 'retryable_es_client_error';
  message: string;
  error?: Error;
}

export const catchRetryableEsClientErrors = (
  e: EsErrors.ElasticsearchClientError
): Either.Either<RetryableEsClientError, never> => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      (retryResponseStatuses.includes(e.statusCode) ||
        e.body?.error?.type === 'snapshot_in_progress_exception'))
  ) {
    return Either.left({
      type: 'retryable_es_client_error' as const,
      message: e.message,
      error: e,
    });
  } else {
    throw e;
  }
};

export type FetchIndexResponse = Record<
  string,
  { aliases: Record<string, unknown>; mappings: IndexMapping; settings: unknown }
>;

/**
 * Fetches information about the given indices including aliases, mappings and
 * settings.
 *
 * @param client
 * @param indexToFetch
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

export interface SetIndexWriteBlockResponse {
  acknowledged: boolean;
  shards_acknowledged: boolean;
}

/**
 * Sets a write block in place for the given index. If the response includes
 * `acknowledged: true` all in-progress writes have drained and no further
 * writes to this index will be possible.
 *
 * The first time the write block is added to an index the response will
 * include `shards_acknowledged: true` but once the block is in place,
 * subsequent calls return `shards_acknowledged: false`
 *
 * @param client
 * @param index
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

const waitForStatus = (
  client: ElasticsearchClient,
  index: string,
  status: 'green' | 'yellow' | 'red'
): TaskEither.TaskEither<RetryableEsClientError, {}> => () => {
  return client.cluster
    .health({ index, wait_for_status: status, timeout: '30s' })
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
 *
 * @param client
 * @param source
 * @param target
 */
export const cloneIndex = (
  client: ElasticsearchClient,
  source: string,
  target: string
): TaskEither.TaskEither<RetryableEsClientError, CloneIndexResponse> => {
  const cloneTask: TaskEither.TaskEither<RetryableEsClientError, AcknowledgeResponse> = () => {
    return client.indices
      .clone(
        {
          index: source,
          target,
          wait_for_active_shards: 'all',
          body: {
            settings: {
              // The source we're cloning from will have a write block set, so
              // we need to remove it to allow writes to our newly cloned index
              'index.blocks.write': false,
              // ES rule of thumb: shards should be several GB to 10's of GB, so
              // Kibana is unlikely to cross that limit.
              number_of_shards: 1,
              // Allocate 1 replica if there are enough data nodes
              auto_expand_replicas: '0-1',
              // Set an explicit refresh interval so that we don't inherit the
              // value from incorrectly configured index templates (not required
              // after we adopt system indices)
              refresh_interval: '1s',
              // Bump priority so that recovery happens before newer indices
              'index.priority': 10,
            },
          },
          timeout: '60s',
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
        if (error.message === 'resource_already_exists_exception') {
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
          waitForStatus(client, target, 'green'),
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
 *
 * @param client
 * @param taskId
 * @param timeout
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
 * to run this in parralel.
 *
 * @param client
 * @param index
 * @param targetIndex
 * @param script
 */
export const pickupUpdatedMappings = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<RetryableEsClientError, UpdateByQueryResponse> => () => {
  return client
    .updateByQuery({
      // Ignore version conflicts that can occur from parralel update by query operations
      conflicts: 'proceed',
      // Return an error when targeting missing or closed indices
      allow_no_indices: false,
      index,
      // Update documents in batches of 100 documents at a time
      // TODO: profile performance to see how much difference `scroll_size` makes
      scroll_size: 100,
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
 * this in parralel. By using `op_type: 'create', conflicts: 'proceed'` there
 * will be only one write per reindexed document.
 *
 * @param client
 * @param sourceIndex
 * @param targetIndex
 * @param reindexScript
 */
export const reindex = (
  client: ElasticsearchClient,
  sourceIndex: string,
  targetIndex: string,
  reindexScript: Option.Option<string>
): TaskEither.TaskEither<RetryableEsClientError, ReindexResponse> => () => {
  return client
    .reindex({
      // Require targetIndex to be an alias. Prevents a new index from being
      // created if targetIndex doesn't exist.
      body: {
        // Ignore version conflicts from existing documents
        conflicts: 'proceed',
        source: {
          index: sourceIndex,
          // Set batch size to 100
          size: 100,
        },
        dest: {
          index: targetIndex,
          // Don't override existing documents, only create if missing
          op_type: 'create',
        },
        script: Option.fold(
          () => undefined,
          () => ({
            source: reindexScript,
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

export const waitForReindexTask = flow(
  waitForTask,
  TaskEither.chain(
    (
      res
    ): TaskEither.TaskEither<
      | { type: 'index_not_found_exception'; index: string }
      | { type: 'target_index_had_write_block' }
      | RetryableEsClientError,
      'reindex_succeeded'
    > => {
      const failureIsAWriteBlock = ({
        cause: { type, reason },
      }: {
        cause: { type: string; reason: string };
      }) =>
        type === 'cluster_block_exception' &&
        reason.match(/index \[.+] blocked by: \[FORBIDDEN\/8\/index write \(api\)\]/);

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
 *
 * @param client
 * @param aliasActions
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
    .updateAliases({
      body: {
        actions: aliasActions,
      },
    })
    .then(() => {
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
          err.body.error.type === 'resource_not_found_exception' &&
          err.body.error.reason.match(/required alias \[.+\] does not exist/)
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
 * @param client
 * @param indexName
 * @param mappings
 */
export const createIndex = (
  client: ElasticsearchClient,
  indexName: string,
  mappings: IndexMapping
): TaskEither.TaskEither<RetryableEsClientError, 'create_index_succeeded'> => {
  const createIndexTask: TaskEither.TaskEither<
    RetryableEsClientError,
    AcknowledgeResponse
  > = () => {
    return client.indices
      .create(
        {
          index: indexName,
          // wait until all shards are available before creating the index
          // (since number_of_shards=1 this does not have any effect atm)
          wait_for_active_shards: 'all',
          // Wait up to 60s for the cluster state to update and all shards to be
          // started
          timeout: '60s',
          body: {
            mappings,
            settings: {
              // ES rule of thumb: shards should be several GB to 10's of GB, so
              // Kibana is unlikely to cross that limit.
              number_of_shards: 1,
              // Allocate 1 replica if there are enough data nodes
              auto_expand_replicas: '0-1',
              // Set an explicit refresh interval so that we don't inherit the
              // value from incorrectly configured index templates (not required
              // after we adopt system indices)
              refresh_interval: '1s',
              // Bump priority so that recovery happens before newer indices
              'index.priority': 10,
            },
          },
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
         * - acknowledged=true, shards_acknowledged=true, index creation complete
         */
        return Either.right({
          acknowledged: res.body.acknowledged,
          shardsAcknowledged: res.body.shards_acknowledged,
        });
      })
      .catch((error) => {
        if (error.message === 'resource_already_exists_exception') {
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
          waitForStatus(client, indexName, 'green'),
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
 *
 * @param client
 * @param index
 * @param mappings
 */
export const updateAndPickupMappings = (
  client: ElasticsearchClient,
  index: string,
  mappings: IndexMapping
): TaskEither.TaskEither<RetryableEsClientError, UpdateAndPickupMappingsResponse> => {
  const putMappingTask: TaskEither.TaskEither<
    RetryableEsClientError,
    { acknowledged: boolean }
  > = () => {
    return client.indices
      .putMapping<Record<string, any>, IndexMapping>({
        index,
        timeout: '60s',
        body: mappings,
      })
      .then((res) => {
        // TODO do we need to check res.body.acknowledged?
        return Either.right({ acknowledged: res.body.acknowledged });
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
      // Return batches of 100 documents. Smaller batches reduce the memory
      // pressure on Elasticsearch and Kibana so are less likely to cause
      // failures.
      // TODO (profile/tune): How much smaller can we make this number before
      // it starts impacting how long migrations take to perform?
      size: 100,
      body: {
        query,
      },
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

export const bulkIndex = (
  client: ElasticsearchClient,
  index: string,
  docs: SavedObjectsRawDoc[]
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
      wait_for_active_shards: 'all',
      refresh: 'wait_for',
      filter_path: ['items.*.error'],
      body: docs.flatMap((doc) => {
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
      // TODO follow-up with es-distrib team: update operations can cause
      // version conflicts even when no seq_no is specified, can we be sure
      // that a bulk index version conflict can _only_ be caused because
      // another Kibana has already successfully migrated this document?
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
