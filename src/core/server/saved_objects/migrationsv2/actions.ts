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

import { Either, isRight, left, right } from 'fp-ts/lib/Either';
import { ElasticsearchClient } from '../../elasticsearch';

type AllResponses = CloneIndexResponse | FetchAliasesResponse | SetIndexWriteBlockResponse;

export type ActionResponse<T = AllResponses> = Either<Error, T>;

export type ActionThunk<T = AllResponses> = () => Promise<ActionResponse<T>>;

export interface FetchAliasesResponse {
  fetchAliases: Record<string, string>;
}

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
): ActionThunk<FetchAliasesResponse> => async () => {
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
      // TODO fetch `.kibana` *index* to check for v6 migration
      const aliases = Object.keys(res.body).reduce((acc, index) => {
        Object.keys(res.body[index].aliases || {}).forEach((alias) => {
          acc[alias] = index;
        });
        return acc;
      }, {} as Record<string, string>);
      return right({ fetchAliases: aliases });
    })
    .catch(left);
};

export interface SetIndexWriteBlockResponse {
  setIndexWriteBlock: boolean;
}

export const setIndexWriteBlock = (
  client: ElasticsearchClient,
  index: string
): ActionThunk<SetIndexWriteBlockResponse> => async () => {
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
      return right({
        setIndexWriteBlock: res.body.acknowledged,
      });
    })
    .catch(left);
};

export interface CloneIndexResponse {
  cloneIndex: boolean;
}

export const cloneIndex = (
  client: ElasticsearchClient,
  source: string,
  target: string
): ActionThunk<CloneIndexResponse> => async () => {
  const cloneResult = await client.indices
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
      return right({
        cloneIndex: res.body.acknowledged as boolean,
      });
    })
    .catch((error) => {
      if (error.meta?.body?.error.type === 'resource_already_exists_exception') {
        return right({ cloneIndex: true });
      } else {
        return left(error);
      }
    });

  // If the clone operation succeeded, wait for the index to become green
  if (isRight(cloneResult) && cloneResult.right.cloneIndex) {
    return client.cluster
      .health({ index: target, wait_for_status: 'green', timeout: '60s' })
      .then((res) => {
        return right({ cloneIndex: true });
      })
      .catch(left);
  } else {
    return cloneResult;
  }
};
