/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
export const getLocalStats: StatsGetter<{}, TelemetryLocalStats> = async (
  clustersDetails,
  config,
  context
) => {
  const { callCluster, usageCollection, esClient, soClient, kibanaRequest } = config;

  return await Promise.all(
    clustersDetails.map(async (clustersDetail) => {
      const [clusterInfo, clusterStats, nodesUsage, kibana, dataTelemetry] = await Promise.all([
        getClusterInfo(esClient), // cluster info
        getClusterStats(esClient), // cluster stats (not to be confused with cluster _state_)
        getNodesUsage(esClient), // nodes_usage info
        getKibana(usageCollection, callCluster, esClient, soClient, kibanaRequest),
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
