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
import { errors as EsErrors } from '@elastic/elasticsearch';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import type { IndexNotFound, AcknowledgeResponse, OperationNotSupported } from '.';
import { type IndexNotGreenTimeout, waitForIndexStatus } from './wait_for_index_status';
import { DEFAULT_TIMEOUT, INDEX_AUTO_EXPAND_REPLICAS, INDEX_NUMBER_OF_SHARDS } from './constants';
import { isClusterShardLimitExceeded } from './es_errors';
import type { ClusterShardLimitExceeded } from './create_index';

export type CloneIndexResponse = AcknowledgeResponse;

/** @internal */
export interface CloneIndexParams {
  client: ElasticsearchClient;
  esCapabilities: ElasticsearchCapabilities;
  source: string;
  target: string;
  /** only used for testing */
  timeout?: string;
}

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
export const cloneIndex = ({
  client,
  esCapabilities,
  source,
  target,
  timeout = DEFAULT_TIMEOUT,
}: CloneIndexParams): TaskEither.TaskEither<
  | RetryableEsClientError
  | IndexNotFound
  | IndexNotGreenTimeout
  | ClusterShardLimitExceeded
  | OperationNotSupported,
  CloneIndexResponse
> => {
  const cloneTask: TaskEither.TaskEither<
    RetryableEsClientError | IndexNotFound | ClusterShardLimitExceeded | OperationNotSupported,
    AcknowledgeResponse
  > = () => {
    // clone is not supported on serverless
    if (esCapabilities.serverless) {
      return Promise.resolve(
        Either.left({
          type: 'operation_not_supported' as const,
          operationName: 'clone',
        })
      );
    }

    return client.indices
      .clone({
        index: source,
        target,
        settings: {
          index: {
            // The source we're cloning from will have a write block set, so
            // we need to remove it to allow writes to our newly cloned index
            'blocks.write': false,
            // Increase the fields limit beyond the default of 1000
            mapping: {
              total_fields: { limit: 1500 },
            },
            // The rest of the index settings should have already been applied
            // to the source index and will be copied to the clone target. But
            // we repeat it here for explicitness.
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
        timeout,
      })
      .then((response) => {
        /**
         * - acknowledged=false, we timed out before the cluster state was
         *   updated with the newly created index, but it probably will be
         *   created sometime soon.
         * - shards_acknowledged=false, we timed out before all shards were
         *   started
         * - acknowledged=true, shards_acknowledged=true, cloning complete
         */
        return Either.right({
          acknowledged: response.acknowledged,
          shardsAcknowledged: response.shards_acknowledged,
        });
      })
      .catch((error: EsErrors.ResponseError) => {
        if (error?.body?.error?.type === 'index_not_found_exception') {
          return Either.left({
            type: 'index_not_found_exception' as const,
            index: error.body.error.index,
          });
        } else if (error?.body?.error?.type === 'resource_already_exists_exception') {
          /**
           * If the target index already exists it means a previous clone
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
    cloneTask,
    TaskEither.chainW((res) => {
      if (res.acknowledged && res.shardsAcknowledged) {
        // If the cluster state was updated and all shards ackd we're done
        return TaskEither.right(res);
      } else {
        // Otherwise, wait until the target index has a 'green' status.
        return pipe(
          waitForIndexStatus({ client, index: target, timeout, status: 'green' }),
          TaskEither.map((value) => {
            /** When the index status is 'green' we know that all shards were started */
            return { acknowledged: true, shardsAcknowledged: true };
          })
        );
      }
    })
  );
};
