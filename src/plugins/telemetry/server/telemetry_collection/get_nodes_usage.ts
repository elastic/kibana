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
import { LegacyAPICaller } from 'kibana/server';
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
  callCluster: LegacyAPICaller
) => Promise<{ nodes: NodeObj[] | Array<{}> }>;
/**
 * Get the nodes usage data from the connected cluster.
 *
 * This is the equivalent to GET /_nodes/usage?timeout=30s.
 *
 * The Nodes usage API was introduced in v6.0.0
 */
export async function fetchNodesUsage(
  callCluster: LegacyAPICaller
): Promise<NodesFeatureUsageResponse> {
  const response = await callCluster('transport.request', {
    method: 'GET',
    path: '/_nodes/usage',
    query: {
      timeout: TIMEOUT,
    },
  });
  return response;
}

/**
 * Get the nodes usage from the connected cluster
 * @param callCluster APICaller
 * @returns Object containing array of modified usage information with the node_id nested within the data for that node.
 */
export const getNodesUsage: NodesUsageGetter = async (callCluster) => {
  const result = await fetchNodesUsage(callCluster);
  const transformedNodes = Object.entries(result?.nodes || {}).map(([key, value]) => ({
    ...(value as NodeObj),
    node_id: key,
  }));
  return { nodes: transformedNodes };
};
