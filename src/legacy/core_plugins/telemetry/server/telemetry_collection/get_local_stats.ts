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

import { get, omit } from 'lodash';
// @ts-ignore
import { getClusterInfo } from './get_cluster_info';
import { getClusterStats } from './get_cluster_stats';
// @ts-ignore
import { getKibana, handleKibanaStats } from './get_kibana';
import { StatsGetter } from '../collection_manager';

/**
 * Handle the separate local calls by combining them into a single object response that looks like the
 * "cluster_stats" document from X-Pack monitoring.
 *
 * @param {Object} clusterInfo Cluster info (GET /)
 * @param {Object} clusterStats Cluster stats (GET /_cluster/stats)
 * @return {Object} A combined object containing the different responses.
 */
export function handleLocalStats(server: any, clusterInfo: any, clusterStats: any, kibana: any) {
  return {
    timestamp: new Date().toISOString(),
    cluster_uuid: get(clusterInfo, 'cluster_uuid'),
    cluster_name: get(clusterInfo, 'cluster_name'),
    version: get(clusterInfo, 'version.number'),
    cluster_stats: omit(clusterStats, '_nodes', 'cluster_name'),
    collection: 'local',
    stack_stats: {
      kibana: handleKibanaStats(server, kibana),
    },
  };
}

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 *
 * @param {Object} server The Kibana server instance used to call ES as the internal user
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise} The object containing the current Elasticsearch cluster's telemetry.
 */
export const getLocalStats: StatsGetter = async (clustersDetails, config) => {
  const { server, callCluster, usageCollection } = config;

  return await Promise.all(
    clustersDetails.map(async clustersDetail => {
      const [clusterInfo, clusterStats, kibana] = await Promise.all([
        getClusterInfo(callCluster), // cluster info
        getClusterStats(callCluster), // cluster stats (not to be confused with cluster _state_)
        getKibana(usageCollection, callCluster),
      ]);
      return handleLocalStats(server, clusterInfo, clusterStats, kibana);
    })
  );
};
