/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  StatsGetter,
  StatsCollectionContext,
} from 'src/plugins/telemetry_collection_manager/server';
import { getClusterInfo, ESClusterInfo } from './get_cluster_info';
import { getClusterStats } from './get_cluster_stats';
import { getKibana, handleKibanaStats, KibanaUsageStats } from './get_kibana';
import { getNodesUsage } from './get_nodes_usage';
import { getDataTelemetry, DATA_TELEMETRY_ID, DataTelemetryPayload } from './get_data_telemetry';

/**
 * Handle the separate local calls by combining them into a single object response that looks like the
 * "cluster_stats" document from X-Pack monitoring.
 *
 * @param {Object} server ??
 * @param {Object} clusterInfo Cluster info (GET /)
 * @param {Object} clusterStats Cluster stats (GET /_cluster/stats)
 * @param {Object} kibana The Kibana Usage stats
 */
export function handleLocalStats(
  // eslint-disable-next-line @typescript-eslint/naming-convention
  { cluster_name, cluster_uuid, version }: ESClusterInfo,
  { _nodes, cluster_name: clusterName, ...clusterStats }: any,
  kibana: KibanaUsageStats | undefined,
  dataTelemetry: DataTelemetryPayload | undefined,
  context: StatsCollectionContext
) {
  return {
    timestamp: new Date().toISOString(),
    cluster_uuid,
    cluster_name,
    version: version.number,
    cluster_stats: clusterStats,
    collection: 'local',
    stack_stats: {
      [DATA_TELEMETRY_ID]: dataTelemetry,
      kibana: handleKibanaStats(context, kibana),
    },
  };
}

export type TelemetryLocalStats = ReturnType<typeof handleLocalStats>;

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 * @param {Array} cluster uuids array of cluster uuid's
 * @param {Object} config contains the usageCollection, callCluster (deprecated), the esClient and Saved Objects client scoped to the request or the internal repository, and the kibana request
 * @param {Object} StatsCollectionContext contains logger and version (string)
 */
export const getLocalStats: StatsGetter<TelemetryLocalStats> = async (
  clustersDetails,
  config,
  context
) => {
  const { usageCollection, esClient, soClient, kibanaRequest } = config;

  return await Promise.all(
    clustersDetails.map(async (clustersDetail) => {
      const [clusterInfo, clusterStats, nodesUsage, kibana, dataTelemetry] = await Promise.all([
        getClusterInfo(esClient), // cluster info
        getClusterStats(esClient), // cluster stats (not to be confused with cluster _state_)
        getNodesUsage(esClient), // nodes_usage info
        getKibana(usageCollection, esClient, soClient, kibanaRequest),
        getDataTelemetry(esClient),
      ]);
      return handleLocalStats(
        clusterInfo,
        {
          ...clusterStats,
          nodes: { ...clusterStats.nodes, usage: nodesUsage },
        },
        kibana,
        dataTelemetry,
        context
      );
    })
  );
};
