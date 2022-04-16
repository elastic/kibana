/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TIMEOUT } from './constants';

/**
 * Data returned by GET /_nodes/usage, but flattened as an array of {@link estypes.NodeUsageInformation}
 * with the node ID set in the field `node_id`.
 */
export interface NodeUsage extends estypes.NodesUsageNodeUsage {
  /**
   * The Node ID as reported by ES
   */
  node_id: string;
}

export type NodesUsageGetter = (esClient: ElasticsearchClient) => Promise<{ nodes: NodeUsage[] }>;
/**
 * Get the nodes usage data from the connected cluster.
 *
 * This is the equivalent to GET /_nodes/usage?timeout=30s.
 *
 * The Nodes usage API was introduced in v6.0.0
 */
export async function fetchNodesUsage(
  esClient: ElasticsearchClient
): Promise<estypes.NodesUsageResponse> {
  return await esClient.nodes.usage({
    timeout: TIMEOUT,
  });
}

/**
 * Get the nodes usage from the connected cluster
 * @param callCluster APICaller
 * @returns Object containing array of modified usage information with the node_id nested within the data for that node.
 */
export const getNodesUsage: NodesUsageGetter = async (esClient) => {
  const result = await fetchNodesUsage(esClient);
  const transformedNodes = Object.entries(result?.nodes || {}).map(([key, value]) => ({
    ...value,
    node_id: key,
  }));
  return { nodes: transformedNodes };
};
