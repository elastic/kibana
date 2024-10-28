/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ClusterDetailsGetter } from '@kbn/telemetry-collection-manager-plugin/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { CLUSTER_STAT_TIMEOUT } from './constants';

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent to GET /_cluster/stats?timeout=60s&include_remotes=true
 */
export async function getClusterStats(esClient: ElasticsearchClient) {
  return await esClient.cluster.stats(
    {
      timeout: CLUSTER_STAT_TIMEOUT,

      // @ts-expect-error
      include_remotes: true,
    },
    {
      requestTimeout: CLUSTER_STAT_TIMEOUT, // enforce that Kibana would wait at least as long for ES to complete.
    }
  );
}

/**
 * Get the cluster uuids from the connected cluster.
 * @internal only used externally by the X-Pack Telemetry extension
 * @param esClient Scoped Elasticsearch client
 */
export const getClusterUuids: ClusterDetailsGetter = async ({ esClient }) => {
  const body = await esClient.info({ filter_path: 'cluster_uuid' });
  return [{ clusterUuid: body.cluster_uuid }];
};
