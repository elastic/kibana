/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';

import { type FetchIndexResponse, fetchIndices } from './fetch_indices';

const routingAllocationEnable = 'cluster.routing.allocation.enable';
export interface ClusterRoutingAllocationEnabled {
  clusterRoutingAllocationEnabled: boolean;
}

export interface InitActionParams {
  client: ElasticsearchClient;
  indices: string[];
}

export interface IncompatibleClusterRoutingAllocation {
  type: 'incompatible_cluster_routing_allocation';
}

export const checkClusterRoutingAllocationEnabledTask =
  ({
    client,
  }: {
    client: ElasticsearchClient;
  }): TaskEither.TaskEither<RetryableEsClientError | IncompatibleClusterRoutingAllocation, {}> =>
  () => {
    return client.cluster
      .getSettings({
        flat_settings: true,
      })
      .then((settings) => {
        // transient settings take preference over persistent settings
        const clusterRoutingAllocation =
          settings?.transient?.[routingAllocationEnable] ??
          settings?.persistent?.[routingAllocationEnable];

        const clusterRoutingAllocationEnabledIsAll =
          clusterRoutingAllocation === undefined || clusterRoutingAllocation === 'all';

        if (!clusterRoutingAllocationEnabledIsAll) {
          return Either.left({
            type: 'incompatible_cluster_routing_allocation' as const,
          });
        } else {
          return Either.right({});
        }
      })
      .catch(catchRetryableEsClientErrors);
  };

export const initAction = ({
  client,
  indices,
}: InitActionParams): TaskEither.TaskEither<
  RetryableEsClientError | IncompatibleClusterRoutingAllocation,
  FetchIndexResponse
> => {
  return pipe(
    checkClusterRoutingAllocationEnabledTask({ client }),
    TaskEither.chainW((value) => {
      return fetchIndices({ client, indices });
    })
  );
};
