/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { pipe } from 'fp-ts/lib/pipeable';
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import type { IndexNotFound, AcknowledgeResponse } from '.';
import { waitForIndexStatusYellow } from './wait_for_index_status_yellow';
import {
  DEFAULT_TIMEOUT,
  INDEX_AUTO_EXPAND_REPLICAS,
  INDEX_NUMBER_OF_SHARDS,
  WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
} from './constants';
export type CloneIndexResponse = AcknowledgeResponse;

/** @internal */
export interface CloneIndexParams {
  client: ElasticsearchClient;
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
  source,
  target,
  timeout = DEFAULT_TIMEOUT,
}: CloneIndexParams): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotFound | IndexNotYellowTimeout,
  CloneIndexResponse
> => {
  const cloneTask: TaskEither.TaskEither<
    RetryableEsClientError | IndexNotFound,
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
          timeout,
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      )
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
        // Otherwise, wait until the target index has a 'yellow' status.
        return pipe(
          waitForIndexStatusYellow({ client, index: target, timeout }),
          TaskEither.map((value) => {
            /** When the index status is 'yellow' we know that all shards were started */
            return { acknowledged: true, shardsAcknowledged: true };
          })
        );
      }
    })
  );
};
