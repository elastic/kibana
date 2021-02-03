/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ElasticsearchClient } from 'src/core/server';
import { TIMEOUT } from './constants';

export interface NodeAggregation {
  [key: string]: number;
}

// we set aggregations as an optional type because it was only added in v7.8.0
export interface NodeObj {
  node_id?: string;
  timestamp: number;
  since: number;
  rest_actions: {
    [key: string]: number;
  };
  aggregations?: {
    [key: string]: NodeAggregation;
  };
}

export interface NodesFeatureUsageResponse {
  cluster_name: string;
  nodes: {
    [key: string]: NodeObj;
  };
}

export type NodesUsageGetter = (
  esClient: ElasticsearchClient
) => Promise<{ nodes: NodeObj[] | Array<{}> }>;
/**
 * Get the nodes usage data from the connected cluster.
 *
 * This is the equivalent to GET /_nodes/usage?timeout=30s.
 *
 * The Nodes usage API was introduced in v6.0.0
 */
export async function fetchNodesUsage(
  esClient: ElasticsearchClient
): Promise<NodesFeatureUsageResponse> {
  const { body } = await esClient.nodes.usage<NodesFeatureUsageResponse>({
    timeout: TIMEOUT,
  });
  return body;
}

/**
 * Get the nodes usage from the connected cluster
 * @param callCluster APICaller
 * @returns Object containing array of modified usage information with the node_id nested within the data for that node.
 */
export const getNodesUsage: NodesUsageGetter = async (esClient) => {
  const result = await fetchNodesUsage(esClient);
  const transformedNodes = Object.entries(result?.nodes || {}).map(([key, value]) => ({
    ...(value as NodeObj),
    node_id: key,
  }));
  return { nodes: transformedNodes };
};
