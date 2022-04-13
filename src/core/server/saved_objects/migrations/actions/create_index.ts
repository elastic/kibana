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
import { AcknowledgeResponse } from './index';
import { ElasticsearchClient } from '../../../elasticsearch';
import { IndexMapping } from '../../mappings';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import {
  DEFAULT_TIMEOUT,
  INDEX_AUTO_EXPAND_REPLICAS,
  WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
} from './constants';
import { IndexNotYellowTimeout, waitForIndexStatusYellow } from './wait_for_index_status_yellow';

function aliasArrayToRecord(aliases: string[]): Record<string, estypes.IndicesAlias> {
  const result: Record<string, estypes.IndicesAlias> = {};
  for (const alias of aliases) {
    result[alias] = {};
  }
  return result;
}

/** @internal */
export interface CreateIndexParams {
  client: ElasticsearchClient;
  indexName: string;
  mappings: IndexMapping;
  aliases?: string[];
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
}: CreateIndexParams): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotYellowTimeout,
  'create_index_succeeded'
> => {
  const createIndexTask: TaskEither.TaskEither<
    RetryableEsClientError,
    AcknowledgeResponse
  > = () => {
    const aliasesObject = aliasArrayToRecord(aliases);

    return client.indices
      .create(
        {
          index: indexName,
          // wait until all shards are available before creating the index
          // (since number_of_shards=1 this does not have any effect atm)
          wait_for_active_shards: WAIT_FOR_ALL_SHARDS_TO_BE_ACTIVE,
          // Wait up to 60s for the cluster state to update and all shards to be
          // started
          timeout: DEFAULT_TIMEOUT,
          body: {
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
              },
            },
          },
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      )
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
        // Otherwise, wait until the target index has a 'yellow' status.
        return pipe(
          waitForIndexStatusYellow({ client, index: indexName, timeout: DEFAULT_TIMEOUT }),
          TaskEither.map(() => {
            /** When the index status is 'yellow' we know that all shards were started */
            return 'create_index_succeeded';
          })
        );
      }
    })
  );
};
