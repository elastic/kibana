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
import { ElasticsearchClientError } from '@elastic/elasticsearch/lib/errors';
import { pipe } from 'fp-ts/lib/pipeable';
import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../../elasticsearch';

export type AllResponses = CloneIndexResponse | SetIndexWriteBlockResponse | FetchIndexResponse;

export type ActionResponse<T = AllResponses> = Either.Either<Error, T>;

const catchEsClientErrors = (e: ElasticsearchClientError) => {
  return e instanceof ElasticsearchClientError ? Either.left(e) : Promise.reject(e);
};

export interface FetchIndexResponse {
  fetchIndices: Record<
    string,
    { aliases: Record<string, unknown>; mappings: unknown; settings: unknown }
  >;
}

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
): TaskEither.TaskEither<ElasticsearchClientError, FetchIndexResponse> => () => {
  return client.indices
    .get(
      {
        index: indicesToFetch,
        ignore_unavailable: true, // Don't return an error for missing indices. Note this *will* include closed indices, the docs are misleading https://github.com/elastic/elasticsearch/issues/63607
      },
      { ignore: [404], maxRetries: 0 }
    )
    .then(({ body }) => {
      return Either.right({
        fetchIndices: body,
      });
    })
    .catch(catchEsClientErrors);
};

export interface SetIndexWriteBlockResponse {
  setIndexWriteBlock: boolean;
}

export const setIndexWriteBlock = (
  client: ElasticsearchClient,
  index: string
): TaskEither.TaskEither<ElasticsearchClientError, SetIndexWriteBlockResponse> => () => {
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
        setIndexWriteBlock: res.body.acknowledged,
      });
    })
    .catch(catchEsClientErrors);
};

export interface CloneIndexResponse {
  cloneIndex: { acknowledged: boolean; shardsAcknowledged: boolean };
}

export const cloneIndex = (
  client: ElasticsearchClient,
  source: string,
  target: string
): TaskEither.TaskEither<ElasticsearchClientError, CloneIndexResponse> => {
  const cloneTask: TaskEither.TaskEither<ElasticsearchClientError, CloneIndexResponse> = () => {
    return client.indices
      .clone(
        {
          index: source,
          target,
          wait_for_active_shards: 'all',
          body: { settings: { 'index.blocks.write': false } },
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
          cloneIndex: {
            acknowledged: res.body.acknowledged,
            shardsAcknowledged: res.body.shards_acknowledged,
          },
        });
      })
      .catch((error) => {
        if (error.meta?.body?.error.type === 'resource_already_exists_exception') {
          /**
           * If the target index already exists it means a previous clone
           * operation had already been started. However, we can't be sure
           * that all shards were started so return shardsAcknowledged: false
           */
          return Either.right({
            cloneIndex: {
              acknowledged: true,
              shardsAcknowledged: false,
            },
          });
        } else {
          return catchEsClientErrors(error);
        }
      });
  };

  const cloneTargetGreen: TaskEither.TaskEither<
    ElasticsearchClientError,
    CloneIndexResponse
  > = () => {
    return client.cluster
      .health({ index: target, wait_for_status: 'green', timeout: '60s' })
      .then(() => {
        /** When the index status is 'green' we know that all shards were started */
        return Either.right({ cloneIndex: { acknowledged: true, shardsAcknowledged: true } });
      })
      .catch((e) => {
        if (e instanceof errors.TimeoutError) {
          return Either.left(
            new Error(
              "Timeout waiting for the Clone Operation to complete. The index status didn't turn green after 60s"
            )
          );
        } else {
          return Promise.reject(e);
        }
      })
      .catch(catchEsClientErrors);
  };

  return pipe(
    cloneTask,
    TaskEither.chain((res) => {
      /**
       * If all shards didn't acknowledge the clone operation, wait until the
       * target index has a 'green' status.
       */
      if (res.cloneIndex.acknowledged && res.cloneIndex.shardsAcknowledged) {
        return TaskEither.right(res);
      } else {
        return cloneTargetGreen;
      }
    })
  );
};

export interface ReindexResponse {
  reindex: {};
}

export const reindex = (
  client: ElasticsearchClient,
  sourceIndex: string,
  targetIndex: string,
  reindexScript?: string
): TaskEither.TaskEither<ElasticsearchClientError, ReindexResponse> => () => {
  return client
    .reindex({
      body: {
        dest: { index: targetIndex },
        source: { index: sourceIndex, size: 100 },
        script:
          reindexScript != null
            ? {
                source: reindexScript,
                lang: 'painless',
              }
            : undefined,
      },
      refresh: true,
      wait_for_completion: false,
    })
    .then(({ body, statusCode }) => {
      return Either.right({
        reindex: { task: body.task },
      });
    })
    .catch(catchEsClientErrors);
};
