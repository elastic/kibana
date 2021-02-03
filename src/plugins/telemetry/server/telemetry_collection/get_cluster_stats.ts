/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ClusterDetailsGetter } from 'src/plugins/telemetry_collection_manager/server';
import { ElasticsearchClient } from 'src/core/server';
import { TIMEOUT } from './constants';
/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent to GET /_cluster/stats?timeout=30s.
 */
export async function getClusterStats(esClient: ElasticsearchClient) {
  const { body } = await esClient.cluster.stats({ timeout: TIMEOUT });
  return body;
}

/**
 * Get the cluster uuids from the connected cluster.
 */
export const getClusterUuids: ClusterDetailsGetter = async ({ esClient }) => {
  const { body } = await esClient.cluster.stats({ timeout: TIMEOUT });

  return [{ clusterUuid: body.cluster_uuid }];
};
