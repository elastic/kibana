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
import { ElasticsearchClient } from '../../../elasticsearch';
import { IndexMapping } from '../../mappings';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { pickupUpdatedMappings } from './pickup_updated_mappings';
import { DEFAULT_TIMEOUT } from './constants';

/** @internal */
export interface UpdateAndPickupMappingsResponse {
  taskId: string;
}

/** @internal */
export interface UpdateAndPickupMappingsParams {
  client: ElasticsearchClient;
  index: string;
  mappings: IndexMapping;
}
/**
 * Updates an index's mappings and runs an pickupUpdatedMappings task so that the mapping
 * changes are "picked up". Returns a taskId to track progress.
 */
export const updateAndPickupMappings = ({
  client,
  index,
  mappings,
}: UpdateAndPickupMappingsParams): TaskEither.TaskEither<
  RetryableEsClientError,
  UpdateAndPickupMappingsResponse
> => {
  const putMappingTask: TaskEither.TaskEither<
    RetryableEsClientError,
    'update_mappings_succeeded'
  > = () => {
    return client.indices
      .putMapping({
        index,
        timeout: DEFAULT_TIMEOUT,
        body: mappings,
      })
      .then(() => {
        // Ignore `acknowledged: false`. When the coordinating node accepts
        // the new cluster state update but not all nodes have applied the
        // update within the timeout `acknowledged` will be false. However,
        // retrying this update will always immediately result in `acknowledged:
        // true` even if there are still nodes which are falling behind with
        // cluster state updates.
        // For updateAndPickupMappings this means that there is the potential
        // that some existing document's fields won't be picked up if the node
        // on which the Kibana shard is running has fallen behind with cluster
        // state updates and the mapping update wasn't applied before we run
        // `pickupUpdatedMappings`. ES tries to limit this risk by blocking
        // index operations (including update_by_query used by
        // updateAndPickupMappings) if there are pending mappings changes. But
        // not all mapping changes will prevent this.
        return Either.right('update_mappings_succeeded' as const);
      })
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    putMappingTask,
    TaskEither.chain((res) => {
      return pickupUpdatedMappings(client, index);
    })
  );
};
