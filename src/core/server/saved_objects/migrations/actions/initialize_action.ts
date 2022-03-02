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
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';

import { FetchIndexResponse, fetchIndices } from './fetch_indices';

const routingAllocationEnable = 'cluster.routing.allocation.enable';
export interface ClusterRoutingAllocationEnabled {
  clusterRoutingAllocationEnabled: boolean;
}

export interface InitActionParams {
  client: ElasticsearchClient;
  indices: string[];
}

export interface ClusterAllocationDisabledError {
  type: 'cluster_routing_allocation_disabled';
}

export const checkClusterRoutingAllocationEnabledTask =
  ({
    client,
  }: {
    client: ElasticsearchClient;
  }): TaskEither.TaskEither<RetryableEsClientError | ClusterAllocationDisabledError, {}> =>
  () => {
    return client.cluster
      .getSettings({
        include_defaults: true,
        flat_settings: true,
      })
      .then((settings) => {
        const clusterRoutingAllocations: string[] =
          settings?.transient?.[routingAllocationEnable] ??
          settings?.persistent?.[routingAllocationEnable] ??
          settings?.defaults?.[routingAllocationEnable] ??
          [];

        const clusterRoutingAllocationEnabled =
          clusterRoutingAllocations.length === 0 || !clusterRoutingAllocations.includes('none');

        if (!clusterRoutingAllocationEnabled) {
          return Either.left({ type: 'cluster_routing_allocation_disabled' as const });
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
  RetryableEsClientError | ClusterAllocationDisabledError,
  FetchIndexResponse
> => {
  return pipe(
    checkClusterRoutingAllocationEnabledTask({ client }),
    TaskEither.chainW((value) => {
      return fetchIndices({ client, indices });
    })
  );
};
