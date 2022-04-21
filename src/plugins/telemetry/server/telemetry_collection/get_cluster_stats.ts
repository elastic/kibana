/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ClusterDetailsGetter } from '@kbn/telemetry-collection-manager-plugin/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { TIMEOUT } from './constants';

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent to GET /_cluster/stats?timeout=30s.
 */
export async function getClusterStats(esClient: ElasticsearchClient) {
  return await esClient.cluster.stats({ timeout: TIMEOUT });
}

/**
 * Get the cluster uuids from the connected cluster.
 * @internal only used externally by the X-Pack Telemetry extension
 * @param esClient Scoped Elasticsearch client
 */
export const getClusterUuids: ClusterDetailsGetter = async ({ esClient }) => {
  const body = await esClient.cluster.stats({ timeout: TIMEOUT });
  return [{ clusterUuid: body.cluster_uuid }];
};
