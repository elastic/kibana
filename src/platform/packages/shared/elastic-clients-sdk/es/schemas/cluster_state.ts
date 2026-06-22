/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const ClusterStateClusterStateMetric = z.enum(['_all', 'version', 'master_node', 'blocks', 'nodes', 'metadata', 'routing_table', 'routing_nodes', 'customs']).meta({ id: 'ClusterStateClusterStateMetric' })
export type ClusterStateClusterStateMetric = z.infer<typeof ClusterStateClusterStateMetric>

export const ClusterStateClusterStateMetrics = z.union([ClusterStateClusterStateMetric, z.array(ClusterStateClusterStateMetric)]).meta({ id: 'ClusterStateClusterStateMetrics' })
export type ClusterStateClusterStateMetrics = z.infer<typeof ClusterStateClusterStateMetrics>

/**
 * Get the cluster state.
 *
 * Get comprehensive information about the state of the cluster.
 *
 * The cluster state is an internal data structure which keeps track of a variety of information needed by every node, including the identity and attributes of the other nodes in the cluster; cluster-wide settings; index metadata, including the mapping and settings for each index; the location and status of every shard copy in the cluster.
 *
 * The elected master node ensures that every node in the cluster has a copy of the same cluster state.
 * This API lets you retrieve a representation of this internal state for debugging or diagnostic purposes.
 * You may need to consult the Elasticsearch source code to determine the precise meaning of the response.
 *
 * By default the API will route requests to the elected master node since this node is the authoritative source of cluster states.
 * You can also retrieve the cluster state held on the node handling the API request by adding the `?local=true` query parameter.
 *
 * Elasticsearch may need to expend significant effort to compute a response to this API in larger clusters, and the response may comprise a very large quantity of data.
 * If you use this API repeatedly, your cluster may become unstable.
 *
 * WARNING: The response is a representation of an internal data structure.
 * Its format is not subject to the same compatibility guarantees as other more stable APIs and may change from version to version.
 * Do not query this API using external monitoring tools.
 * Instead, obtain the information you require using other more stable cluster APIs.
 */
export const ClusterStateRequest = z.object({
  ...RequestBase.shape,
  metric: ClusterStateClusterStateMetrics.describe('Limit the information returned to the specified metrics.').optional().meta({ found_in: 'path' }),
  index: Indices.describe('A comma-separated list of index names; use `_all` or empty string to perform the operation on all indices').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Whether to expand wildcard expression to concrete indices that are open, closed or both').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('Return settings in flat format').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('Return local information, do not retrieve the state from master node').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Timeout for waiting for new cluster state in case it is blocked').optional().meta({ found_in: 'query' }),
  wait_for_metadata_version: VersionNumber.describe('Wait for the metadata version to be equal or greater than the specified metadata version').optional().meta({ found_in: 'query' }),
  wait_for_timeout: Duration.describe('The maximum time to wait for wait_for_metadata_version before timing out').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterStateRequest' })
export type ClusterStateRequest = z.infer<typeof ClusterStateRequest>

export const ClusterStateResponse = z.any().meta({ id: 'ClusterStateResponse' })
export type ClusterStateResponse = z.infer<typeof ClusterStateResponse>
