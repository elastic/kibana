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
import { ElasticsearchClient } from '../../elasticsearch';
import { IndexMapping } from '../mappings';
import { SavedObjectsRawDoc } from '../serialization';

export type AllResponses =
  | CloneIndexResponse
  | SetIndexWriteBlockResponse
  | FetchIndexResponse
  | ReindexResponse
  | WaitForTaskResponse
  | DeleteIndexResponse
  | UpdateByQueryResponse
  | UpdateAndPickupMappingsResponse;

export type ExpectedErrors =
  | EsErrors.NoLivingConnectionsError
  | EsErrors.ConnectionError
  | EsErrors.TimeoutError
  | EsErrors.ResponseError;

const retryResponseStatuses = [
  503, // ServiceUnavailable
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
];

const catchEsClientErrors = (e: ElasticsearchClientError) => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      (retryResponseStatuses.includes(e.statusCode) ||
        e.body?.error?.type === 'snapshot_in_progress_exception'))
  ) {
    return Either.left(e);
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
): TaskEither.TaskEither<ExpectedErrors, FetchIndexResponse> => () => {
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
    .catch(catchEsClientErrors);
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
): TaskEither.TaskEither<ExpectedErrors, SetIndexWriteBlockResponse> => () => {
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
      return Either.right(res.body);
    })
    .catch(catchEsClientErrors);
};

export const setWriteBlock2 = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<
  'set_write_block_failed' | 'index_not_found_exception',
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
        : Either.left('set_write_block_failed' as const);
    })
    .catch((e: ElasticsearchClientError) => {
      if (e instanceof EsErrors.ResponseError) {
        if (e.message === 'index_not_found_exception') {
          return Either.left(e.message);
        }
      }
      throw e;
    });
};

const waitForStatus = (
  client: ElasticsearchClient,
  index: string,
  status: 'green' | 'yellow' | 'red'
): TaskEither.TaskEither<ExpectedErrors, {}> => () => {
  return client.cluster
    .health({ index, wait_for_status: status, timeout: '30s' })
    .then(() => {
      return Either.right({});
    })
    .catch(catchEsClientErrors);
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
): TaskEither.TaskEither<ExpectedErrors, CloneIndexResponse> => {
  const cloneTask: TaskEither.TaskEither<ExpectedErrors, AcknowledgeResponse> = () => {
    return client.indices
      .clone(
        {
          index: source,
          target,
          wait_for_active_shards: 'all',
          body: {
            settings: {
              auto_expand_replicas: '0-1',
              'index.blocks.write': false,
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
          return catchEsClientErrors(error);
        }
      });
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

export interface WaitForTaskResponse {
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
export const waitForTask = (
  client: ElasticsearchClient,
  taskId: string,
  timeout: string
): TaskEither.TaskEither<ExpectedErrors, WaitForTaskResponse> => () => {
  return client.tasks
    .get<{
      completed: boolean;
      response: { failures: any[] };
      task: { description: string };
      error: { type: string; reason: string };
    }>({
      task_id: taskId,
      wait_for_completion: true,
      timeout,
    })
    .then((res) => {
      const body = res.body;
      if (res.body.error ?? false) {
        return Either.left(new EsErrors.ResponseError(res));
      }
      return Either.right({
        completed: body.completed,
        failures:
          body.response.failures.length > 0 ? Option.some(body.response.failures) : Option.none,
        description: body.task.description,
      });
    })
    .catch(catchEsClientErrors);
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeleteIndexResponse {}

export const deleteIndex = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<ExpectedErrors, DeleteIndexResponse> => () => {
  return client.indices
    .delete({ index, timeout: '60s' })
    .then(() => {
      return Either.right({});
    })
    .catch(catchEsClientErrors);
};

export interface UpdateByQueryResponse {
  taskId: string;
}

/**
 * Perform an update by query operation. Returns a task ID which can be
 * tracked for progress.
 *
 * @remarks This action uses `conflicts: 'proceed'` allowing several Kibana
 * instances to run this in parralel. To reduce unecessary writes, scripts
 * should set `ctx.op = "noop"` when a document is read that was already
 * updated.
 *
 * @param client
 * @param index
 * @param targetIndex
 * @param script
 */
export const updateByQuery = (
  client: ElasticsearchClient,
  index: string,
  script?: string
): TaskEither.TaskEither<ExpectedErrors, UpdateByQueryResponse> => () => {
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
      body: {
        script:
          script != null
            ? {
                source: script,
                lang: 'painless',
              }
            : undefined,
      },
      // force a refresh so that we can query the updated index after the
      // operation completes
      refresh: true,
      // Create a task and return task id instead of blocking until complete
      wait_for_completion: false,
    })
    .then(({ body: { task: taskId } }) => {
      return Either.right({ taskId });
    })
    .catch(catchEsClientErrors);
};

export interface ReindexResponse {
  taskId: string;
}

/**
 * Reindex documents from the `sourceIndex` into the `targetIndex` and wait up
 * to 60 seconds for the operation to complete. Returns a task ID which can be
 * tracked for progress.
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
): TaskEither.TaskEither<ExpectedErrors, ReindexResponse> => () => {
  return client
    .reindex({
      body: {
        // Ignore version conflicts from existing documents
        conflicts: 'proceed',
        source: {
          index: sourceIndex,
          // Set batch size to 100, not sure if it's necessary to make this
          // smaller than the default of 1000?
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
    .catch(catchEsClientErrors);
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UpdateAliasesResponse {}

export type AliasAction =
  | { remove_index: { index: string } }
  | { remove: { index: string; alias: string /* must_exist: boolean*/ } }
  | { add: { index: string; alias: string } };

/**
 *
 * @param client
 * @param aliasActions
 */
export const updateAliases = (
  client: ElasticsearchClient,
  aliasActions: AliasAction[]
): TaskEither.TaskEither<ExpectedErrors, UpdateAliasesResponse> => () => {
  return client.indices
    .updateAliases({
      body: {
        actions: aliasActions,
      },
    })
    .then((res) => {
      return Either.right({});
    })
    .catch((err) => {
      console.log(err.meta.body);
      throw err;
    })
    .catch(catchEsClientErrors);
};

export interface AcknowledgeResponse {
  acknowledged: boolean;
  shardsAcknowledged: boolean;
}

export type CreateIndexResponse = AcknowledgeResponse;

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
): TaskEither.TaskEither<ExpectedErrors, CreateIndexResponse> => {
  const createIndexTask: TaskEither.TaskEither<ExpectedErrors, AcknowledgeResponse> = () => {
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
          return catchEsClientErrors(error);
        }
      });
  };

  return pipe(
    createIndexTask,
    TaskEither.chain((res) => {
      if (res.acknowledged && res.shardsAcknowledged) {
        // If the cluster state was updated and all shards ackd we're done
        return TaskEither.right(res);
      } else {
        // Otherwise, wait until the target index has a 'green' status.
        return pipe(
          waitForStatus(client, indexName, 'green'),
          TaskEither.map(() => {
            /** When the index status is 'green' we know that all shards were started */
            return { acknowledged: true, shardsAcknowledged: true };
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
 * Updates an index's mappings and runs an update_by_query so that the mapping
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
): TaskEither.TaskEither<ExpectedErrors, UpdateAndPickupMappingsResponse> => {
  const putMappingTask: TaskEither.TaskEither<ExpectedErrors, { acknowledged: boolean }> = () => {
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
      .catch(catchEsClientErrors);
  };

  return pipe(
    putMappingTask,
    TaskEither.chain((res) => {
      return updateByQuery(client, index);
    })
  );
};
export interface SearchResponse {
  hits: SavedObjectsRawDoc[];
}

export const search = (
  client: ElasticsearchClient,
  index: string,
  query: Record<string, unknown>
): TaskEither.TaskEither<ExpectedErrors | Error, SearchResponse> => () => {
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
      // encountered. Set explicitly to avoid users overriding the
      // search.default_allow_partial_results cluster setting to false.
      allow_partial_search_results: true,
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
    .then((res) => Either.right({ hits: res.body.hits?.hits ?? [] }))
    .catch(catchEsClientErrors);
};

export const bulkIndex = (
  client: ElasticsearchClient,
  index: string,
  docs: SavedObjectsRawDoc[]
): TaskEither.TaskEither<ExpectedErrors | Error, { succeeded: boolean }> => () => {
  return client
    .bulk<{
      took: number;
      errors: boolean;
      items: [
        {
          index: { _id: string; status: number } & {
            // | { result: string; _shards: ShardsResponse } |
            error: { type: string; reason: string }; // the filter_path should restrict responses
          };
        }
      ];
    }>({
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
      // that a bulk index version conflict can _only_ be caused by another
      // Kibana writing to the index?
      const errors = (res.body.items ?? []).filter(
        (item) => item.index.error.type !== 'version_conflict_engine_exception'
      );
      if (errors.length === 0) {
        return Either.right({ succeeded: true });
      } else {
        return Either.left(new Error(JSON.stringify(errors)));
      }
    })
    .catch(catchEsClientErrors);
};
