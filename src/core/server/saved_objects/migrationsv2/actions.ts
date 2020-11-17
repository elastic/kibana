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
import { ElasticsearchClient, ShardsResponse } from '../../elasticsearch';
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

const catchRetryableEsClientErrors = (e: ElasticsearchClientError) => {
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
    return Promise.reject(e);
  }
};

export type FetchIndexResponse = Record<
  string,
  { aliases: Record<string, unknown>; mappings: IndexMapping; settings: unknown }
>;

/**
 * Returns an `Option` wrapping the response of the `indices.get` API. The
 * `Option` is a `Some` if the index exists, and a `None` if the index doesn't
 * exist.
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
    .catch(catchRetryableEsClientErrors);
};

export interface SetIndexWriteBlockResponse {
  acknowledged: boolean;
}

export const setIndexWriteBlock = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<ExpectedErrors, SetIndexWriteBlockResponse> => () => {
  return client.indices
    .addBlock(
      {
        index,
        block: 'write',
      },
      { maxRetries: 0 /** handle retry ourselves for now */ }
    )
    .then((res) => {
      // Note: initial conversations with Yannick gave me the impression we
      // need to check for `shards_acknowledged=true` here too. But if the
      // lock is already in place `shards_acknowledged` is always false.
      // Follow-up with ES-team, do we need to check index status >= yellow?
      return Either.right({
        acknowledged: res.body.acknowledged,
      });
    })
    .catch(catchRetryableEsClientErrors);
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
          return catchRetryableEsClientErrors(error);
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
    .get<{ completed: boolean; response: { failures: any[] }; task: { description: string } }>({
      task_id: taskId,
      wait_for_completion: true,
      timeout,
    })
    .then(({ body }) => {
      return Either.right({
        completed: body.completed,
        failures:
          body.response.failures.length > 0 ? Option.some(body.response.failures) : Option.none,
        description: body.task.description,
      });
    })
    .catch(catchRetryableEsClientErrors);
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
    .catch(catchRetryableEsClientErrors);
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
    .catch(catchRetryableEsClientErrors);
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
  reindexScript?: string
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
        script:
          reindexScript != null
            ? {
                source: reindexScript,
                lang: 'painless',
              }
            : undefined,
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UpdateAliasesResponse {}

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
): TaskEither.TaskEither<ExpectedErrors, UpdateAliasesResponse> => () => {
  console.log(JSON.stringify(aliasActions));
  return client.indices
    .updateAliases({
      body: {
        actions: aliasActions,
      },
    })
    .then((res) => {
      console.log(res);
      return Either.right({});
    })
    .catch((err) => {
      console.log(err.meta.body);
      throw err;
    })
    .catch(catchRetryableEsClientErrors);
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
          return catchRetryableEsClientErrors(error);
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
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    putMappingTask,
    TaskEither.chain((res) => {
      return updateByQuery(client, index);
    })
  );
};

interface ElasticSearchResponse {
  took: number;
  timed_out: boolean;
  _scroll_id: string;
  _shards: ShardsResponse;
  hits: {
    total: number;
    // when `filter_path` is specified, ES doesn't return empty arrays, so if
    // there are no search results res.hits.hits will be undefined.
    hits?: SavedObjectsRawDoc[];
  };
}

export interface SearchResponse {
  scrollId: string;
  docs: SavedObjectsRawDoc[];
}

export const search = (
  client: ElasticsearchClient,
  index: string,
  query: Record<string, unknown>
): TaskEither.TaskEither<ExpectedErrors | Error, SearchResponse> => () => {
  return client
    .search<ElasticSearchResponse>({
      index,
      // How long to keep the scroll context alive. This only needs to be long
      // enough to process a single batch since every new scroll request will
      // reset this scroll's expiry.
      // Because we transform and write each batch before reading the next
      // batch this needs to be long enough to complete the bulk update and
      // potentially retry transient failures.
      // TODO (profile/tune this parameter):
      //  - Can we make it smaller? How do migrations behave when the scroll expires
      //  - Is it too large? How do migrations behave when we go into a bootloop and
      // continuously open new scroll requests?
      scroll: '5m',
      // Scroll searches have optimizations that make them faster when the
      // sort order is _doc (the "natural" index order).
      sort: ['_doc'],
      // Return the _seq_no and _primary_term so we can use optimistic
      // concurrency control for updates
      seq_no_primary_term: true,
      // Return batches of 100 documents
      // TODO (profile/tune): Although smaller batches might be less efficient
      // it reduces the time to process a single batch thus reducing the
      // likelihood that our scroll expires.
      size: 100,
      body: {
        query,
      },
      // Reduce the response payload size by only returning the data we care about
      filter_path: [
        '_scroll_id',
        '_shards',
        'hits.total',
        'hits.hits._id',
        'hits.hits._source',
        'hits.hits._seq_no',
        'hits.hits._primary_term',
      ],
    })
    .then((res) => {
      console.log(res.body.hits.hits);
      // Check that all shards successfully executed the query
      // Kibana uses a single shard by default but users can override this
      if (res.body._shards.successful < res.body._shards.total) {
        return Either.left(new Error('Search request did not successfully execute on all shards'));
      }
      if (res.body.timed_out) {
        return Either.left(new Error('Search request timeout'));
      }
      return Either.right({ scrollId: res.body._scroll_id, docs: res.body.hits.hits ?? [] });
    })
    .catch(catchRetryableEsClientErrors);
};

export const scroll = (
  client: ElasticsearchClient,
  scrollId: string
): TaskEither.TaskEither<ExpectedErrors | Error, SearchResponse> => () => {
  return client
    .scroll<ElasticSearchResponse>({
      // How long to keep the scroll context alive. This only needs to be long
      // enough to process a single batch since every new scroll request will
      // reset this scroll's expiry.
      // Because we transform and write each batch before reading the next
      // batch this needs to be long enough to complete the bulk update and
      // potentially retry transient failures.
      // TODO (profile/tune this parameter):
      //  - Can we make it smaller? How do migrations behave when the scroll expires
      //  - Is it too large? How do migrations behave when we go into a bootloop and
      // continuously open new scroll requests?
      scroll: '5m',
      scroll_id: scrollId,
    })
    .then((res) => {
      console.log(res);
      // Check that all shards successfully executed the query
      // Kibana uses a single shard by default but users can override this
      if (res.body._shards.successful < res.body._shards.total) {
        return Either.left(new Error('Search request did not successfully execute on all shards'));
      }
      if (res.body.timed_out) {
        return Either.left(new Error('Search request timeout'));
      }
      return Either.right({ scrollId: res.body._scroll_id, docs: res.body.hits.hits ?? [] });
    })
    .catch(catchRetryableEsClientErrors);
};

export const clearScroll = (
  client: ElasticsearchClient,
  scrollId: string
): TaskEither.TaskEither<ExpectedErrors | Error, { succeeded: boolean }> => () => {
  return client
    .clearScroll<{ succeeded: boolean; freed: number }>({
      scroll_id: scrollId,
    })
    .then((res) => {
      if (res.body.succeeded) {
        return Either.right({ succeeded: true });
      } else {
        return Either.left(new Error('Unable to free search scroll'));
      }
    })
    .catch(catchRetryableEsClientErrors);
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
      console.log(res.body.errors, res.body?.items?.[0]);
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
    .catch(catchRetryableEsClientErrors);
};

/**
 * Performs the following steps on a legacy index to prepare the legacy index
 * for a saved object migration:
 *  1. Create a new target index
 *  2. Reindex from legacy to target index
 *  3. Delete the legacy index
 *
 * @remarks
 * This method should be idempotent. Although it will cause some duplicate
 * work, it should safe to call it several times, or from several Kibana
 * instances in parallel.
 * TODO ask es-distrib team: what happens if we reindex `.kibana` into
 * `.kibana_1` and one of the processes deletes `.kibana` and adds a `.kibana`
 * alias?
 *
 * @internalRemarks
 * - Unlike v1 migrations, we don't create an alias that points to the
 *   reindexed target. So after migrating a v6 `.kibana` we'll have
 *   `.kibana_pre6.5_001` but there will be no `.kibana` alias or index. This
 *   is because we have no way to ensure that we don't accidently reindex from
 *   a `.kibana` _alias_ instead of an index.
 * - We apply an reindex script for the task manager index. Because we delete
 *   the original task manager index there is no way to rollback a failed task
 *   manager migration without a snapshot. This is an existing limitation in
 *   our v1 migrations.
 *
 * @param client
 * @param legacyIndex
 * @param targetIndex
 * @param targetAlias
 */
export const prepareLegacyIndex = (
  client: ElasticsearchClient,
  legacyIndex: string,
  targetIndex: string,
  preMigrationScript?: string
) => () => {
  return pipe(
    // Clone legacy index into a new target index, will ignore index exists error
    cloneIndex(client, legacyIndex, targetIndex),
    TaskEither.orElse((error) => {
      // Ignore if legacy index doesn't exist, this probably means another
      // Kibana instance already completed the clone and deleted it
      if (error.message === 'index_not_found_exception') {
        return TaskEither.right({});
      } else {
        return TaskEither.left(error);
      }
    }),
    // Reindex from legacy to target index, will ignore conflict errors, will
    // wait for reindex to complete
    TaskEither.chain(() => reindex(client, legacyIndex, targetIndex, preMigrationScript)),
    TaskEither.orElse((error) => {
      // Ignore if legacy index doesn't exist, this probably means another
      // Kibana instance already deleted it
      if (error.message === 'index_not_found_exception') {
        return TaskEither.right({});
      } else {
        return TaskEither.left(error);
      }
    }),
    // Delete the legacy index, will ignore index not found errors
    TaskEither.chain(() => deleteIndex(client, legacyIndex))
  );
};
