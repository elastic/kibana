/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/pipeable';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { AcknowledgeResponse } from '.';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import {
  DEFAULT_TIMEOUT,
  INDEX_AUTO_EXPAND_REPLICAS,
  WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
} from './constants';
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
  aliases?: string[];
  timeout?: string;
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
export const createIndex = ({
  client,
  indexName,
  mappings,
  aliases = [],
  timeout = DEFAULT_TIMEOUT,
}: CreateIndexParams): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotGreenTimeout | ClusterShardLimitExceeded,
  'create_index_succeeded'
> => {
  const createIndexTask: TaskEither.TaskEither<
    RetryableEsClientError | ClusterShardLimitExceeded,
    AcknowledgeResponse
  > = () => {
    const aliasesObject = aliasArrayToRecord(aliases);

    return client.indices
      .create({
        index: indexName,
        // wait up to timeout until the following shards are available before
        // creating the index: primary, replica (only on multi node clusters)
        wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
        // Timeout for the cluster state to update and all shards to become
        // available. If the request doesn't complete within timeout,
        // acknowledged or shards_acknowledged would be false.
        timeout,
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
            // Increase the fields limit beyond the default of 1000
            mapping: {
              total_fields: { limit: 1500 },
            },
          },
        },
      })
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
          acknowledged: Boolean(res.acknowledged),
          shardsAcknowledged: res.shards_acknowledged,
        });
      })
      .catch((error) => {
        if (error?.body?.error?.type === 'resource_already_exists_exception') {
          /**
           * If the target index already exists it means a previous create
           * operation had already been started. However, we can't be sure
           * that all shards were started so return shardsAcknowledged: false
           */
          return Either.right({
            acknowledged: true,
            shardsAcknowledged: false,
          });
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
      AcknowledgeResponse,
      'create_index_succeeded'
    >((res) => {
      if (res.acknowledged && res.shardsAcknowledged) {
        // If the cluster state was updated and all shards started we're done
        return TaskEither.right('create_index_succeeded');
      } else {
        // Otherwise, wait until the target index has a 'green' status meaning
        // the primary (and on multi node clusters) the replica has been started
        return pipe(
          waitForIndexStatus({
            client,
            index: indexName,
            timeout: DEFAULT_TIMEOUT,
            status: 'green',
          }),
          TaskEither.map(() => {
            /** When the index status is 'green' we know that all shards were started */
            return 'create_index_succeeded';
          })
        );
      }
    })
  );
};
