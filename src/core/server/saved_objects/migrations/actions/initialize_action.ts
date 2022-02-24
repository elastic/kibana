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
import { ClusterGetSettingsResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { DEFAULT_TIMEOUT } from './index';

import { FetchIndexResponse, fetchIndices } from './fetch_indices';

const routingAllocationEnable = 'cluster.routing.allocation.enable';

export const isClusterRoutingAllocationEnabled = (body: ClusterGetSettingsResponse): boolean =>
  !(
    body.transient[routingAllocationEnable] === 'none' ||
    body.persistent[routingAllocationEnable] === 'none' ||
    body.defaults?.[routingAllocationEnable] === 'none'
  );

export interface ClusterRoutingAllocationEnabled {
  clusterRoutingAllocationEnabled: boolean;
}

export interface InitActionParams {
  client: ElasticsearchClient;
  indices: string[];
}

export const initAction = ({
  client,
  indices,
}: InitActionParams): TaskEither.TaskEither<
  RetryableEsClientError,
  { indices: FetchIndexResponse; clusterRoutingAllocationEnabled: boolean }
> => {
  const checkClusterRoutingAllocationEnabledTask: TaskEither.TaskEither<
    RetryableEsClientError,
    { clusterRoutingAllocationEnabled: boolean }
  > = () => {
    return client.cluster
      .getSettings({
        timeout: DEFAULT_TIMEOUT,
        include_defaults: true,
        flat_settings: true,
      })
      .then((body) => {
        return Either.right({
          clusterRoutingAllocationEnabled: isClusterRoutingAllocationEnabled(body),
        });
      })
      .catch(catchRetryableEsClientErrors);
  };

  return pipe(
    checkClusterRoutingAllocationEnabledTask,
    TaskEither.chain((res) => {
      return pipe(
        fetchIndices({ client, indices }),
        TaskEither.map((value) => {
          return {
            indices: value,
            ...res,
          };
        })
      );
    })
  );
};
