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
import {
  getAliases,
  indexBelongsToLaterVersion,
  indexVersion,
  type Aliases,
  type MultipleIndicesPerAlias,
} from '../model/helpers';

const routingAllocationEnable = 'cluster.routing.allocation.enable';
export interface ClusterRoutingAllocationEnabled {
  clusterRoutingAllocationEnabled: boolean;
}

/** @internal */
export interface InitActionParams {
  client: ElasticsearchClient;
  currentAlias: string;
  kibanaVersion: string;
  versionAlias: string;
}

/** @internal */
export interface InitActionResult {
  aliases: Aliases;
  indices: FetchIndexResponse;
  /**
   * The source index .kibana is pointing to. E.g: ".kibana_8.7.0_001"
   */
  source?: string;
}

/** @internal */
export interface IncompatibleClusterRoutingAllocation {
  type: 'incompatible_cluster_routing_allocation';
}

/** @internal */
export interface IndexBelongsToLaterVersion {
  type: 'index_belongs_to_later_version';
  alias: string;
  version: string;
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
  currentAlias,
  kibanaVersion,
  versionAlias,
}: InitActionParams): TaskEither.TaskEither<
  | RetryableEsClientError
  | IncompatibleClusterRoutingAllocation
  | MultipleIndicesPerAlias
  | IndexBelongsToLaterVersion,
  InitActionResult
> => {
  return pipe(
    checkClusterRoutingAllocationEnabledTask({ client }),
    TaskEither.bindW('indices', () =>
      fetchIndices({ client, indices: [currentAlias, versionAlias] })
    ),
    TaskEither.bindW('aliases', ({ indices }) => TaskEither.fromEither(getAliases(indices))),
    TaskEither.bindW('source', ({ aliases }) => TaskEither.right(aliases[currentAlias])),
    TaskEither.chainFirstW(
      TaskEither.fromPredicate(
        // `.kibana` is pointing to an index that belongs to a later
        // version of Kibana .e.g. a 7.11.0 instance found the `.kibana` alias
        // pointing to `.kibana_7.12.0_001`
        ({ source }) => !indexBelongsToLaterVersion(kibanaVersion, source),
        ({ source }) =>
          ({
            type: 'index_belongs_to_later_version',
            alias: currentAlias,
            version: indexVersion(source),
          } as IndexBelongsToLaterVersion)
      )
    )
  );
};
