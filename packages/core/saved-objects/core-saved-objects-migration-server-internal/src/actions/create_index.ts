/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { DEFAULT_TIMEOUT, INDEX_AUTO_EXPAND_REPLICAS, INDEX_NUMBER_OF_SHARDS } from './constants';
import { type IndexNotGreenTimeout, waitForIndexStatus } from './wait_for_index_status';
import { isClusterShardLimitExceeded } from './es_errors';

function aliasArrayToRecord(aliases: string[]): Record<string, estypes.IndicesAlias> {
  const result: Record<string, estypes.IndicesAlias> = {};
  for (const alias of aliases) {
    result[alias] = {};
  }
  return result;
}

/** @internal */
export interface ClusterShardLimitExceeded {
  type: 'cluster_shard_limit_exceeded';
}

/** @internal */
export interface CreateIndexParams {
  client: ElasticsearchClient;
  indexName: string;
  mappings: IndexMapping;
  esCapabilities: ElasticsearchCapabilities;
  aliases?: string[];
  timeout?: string;
  waitForIndexStatusTimeout?: string;
}

export type CreateIndexSuccessResponse = 'create_index_succeeded' | 'index_already_exists';

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
export const createIndex = ({
  client,
  indexName,
  mappings,
  esCapabilities,
  aliases = [],
  timeout = DEFAULT_TIMEOUT,
  waitForIndexStatusTimeout = DEFAULT_TIMEOUT,
}: CreateIndexParams): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotGreenTimeout | ClusterShardLimitExceeded,
  CreateIndexSuccessResponse
> => {
  const createIndexTask: TaskEither.TaskEither<
    RetryableEsClientError | ClusterShardLimitExceeded,
    CreateIndexSuccessResponse
  > = () => {
    const aliasesObject = aliasArrayToRecord(aliases);

    const indexSettings = {
      // settings not being supported on serverless ES
      ...(esCapabilities.serverless
        ? {}
        : {
            // ES rule of thumb: shards should be several GB to 10's of GB, so
            // Kibana is unlikely to cross that limit.
            number_of_shards: INDEX_NUMBER_OF_SHARDS,
            auto_expand_replicas: INDEX_AUTO_EXPAND_REPLICAS,
            // Set an explicit refresh interval so that we don't inherit the
            // value from incorrectly configured index templates (not required
            // after we adopt system indices)
            refresh_interval: '1s',
            // Bump priority so that recovery happens before newer indices
            priority: 10,
          }),
      // Increase the fields limit beyond the default of 1000
      mapping: {
        total_fields: { limit: 1500 },
      },
    };

    return client.indices
      .create({
        index: indexName,
        // Timeout for the cluster state to update and all shards to become
        // available. If the request doesn't complete within timeout,
        // acknowledged or shards_acknowledged would be false.
        timeout,
        mappings,
        aliases: aliasesObject,
        settings: {
          index: indexSettings,
        },
      })
      .then(() => {
        return Either.right('create_index_succeeded' as const);
      })
      .catch((error) => {
        if (error?.body?.error?.type === 'resource_already_exists_exception') {
          return Either.right('index_already_exists' as const);
        } else if (isClusterShardLimitExceeded(error?.body?.error)) {
          return Either.left({
            type: 'cluster_shard_limit_exceeded' as const,
          });
        } else {
          throw error;
        }
      })
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    createIndexTask,
    TaskEither.chain<
      RetryableEsClientError | IndexNotGreenTimeout | ClusterShardLimitExceeded,
      CreateIndexSuccessResponse,
      CreateIndexSuccessResponse
    >((res) => {
      // Systematicaly wait until the target index has a 'green' status meaning
      // the primary (and on multi node clusters) the replica has been started
      // When the index status is 'green' we know that all shards were started
      // see https://github.com/elastic/kibana/issues/157968
      return pipe(
        waitForIndexStatus({
          client,
          index: indexName,
          timeout: waitForIndexStatusTimeout,
          status: 'green',
        }),
        TaskEither.map(() => res)
      );
    })
  );
};
