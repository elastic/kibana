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
import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../../elasticsearch';

export type AllResponses =
  | CloneIndexResponse
  | FetchAliasesResponse
  | SetIndexWriteBlockResponse
  | FetchIndexResponse;

export type ActionResponse<T = AllResponses> = Either.Either<Error, T>;

export interface FetchAliasesResponse {
  fetchAliases: Record<string, string>;
}

const catchEsClientErrors = (e: ElasticsearchClientError) => {
  return e instanceof ElasticsearchClientError ? Either.left(e) : Promise.reject(e);
};

/**
 * Queries Elasticsearch for the provided `aliasesToFetch` and returns a map
 * of alias to index pairs or an error.
 *
 * @param client
 * @param aliasesToFetch
 */
export const fetchAliases = (
  client: ElasticsearchClient,
  aliasesToFetch: string[]
): TaskEither.TaskEither<ElasticsearchClientError, FetchAliasesResponse> => () => {
  return client.indices
    .getAlias(
      { name: aliasesToFetch },
      { ignore: [404], maxRetries: 0 /** handle retry ourselves for now */ }
    )
    .then((res) => {
      /**
       * `getAlias` responds with a result with the following form:
       *    {'.kibana_1': { aliases: { '.kibana': {} } } }}
       *
       * which we convert to an object of the form:
       *    { '.kibana': '.kibana_1' }
       */
      // TODO handle alias that points to multiple indices (fail?)
      const aliases = Object.keys(res.body).reduce((acc, index) => {
        Object.keys(res.body[index].aliases || {}).forEach((alias) => {
          acc[alias] = index;
        });
        return acc;
      }, {} as Record<string, string>);
      return Either.right({ fetchAliases: aliases });
    })
    .catch(catchEsClientErrors);
};

export type FetchIndexResponse = Option.Option<{ index: string }>;

/**
 * Returns an `Option` wrapping the response of the `indices.get` API. The
 * `Option` is a `Some` if the index exists, and a `None` if the index doesn't
 * exist.
 *
 * Note: will also return a `Some` for closed indices
 *
 * @param client
 * @param indexToFetch
 */
export const fetchIndex = (
  client: ElasticsearchClient,
  indexToFetch: string
): TaskEither.TaskEither<ElasticsearchClientError, FetchIndexResponse> => () => {
  return client.indices
    .get(
      {
        index: indexToFetch,
        ignore_unavailable: false, // Return closed indices
      },
      { ignore: [404], maxRetries: 0 }
    )
    .then(({ body, statusCode }) => {
      if (statusCode === 404) {
        return Either.right(Option.none);
      }

      const [indexName, indexInfo] = Object.entries(body)[0];
      return Either.right(Option.some({ index: indexName, ...indexInfo }));
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
