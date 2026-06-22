/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, ExpandWildcards, Id, IndexName, Indices, Name, NodeId, NodeName, NodeRoles, RequestBase, Routing, TransportAddress, VersionString, integer } from './_types'
import { QueryDslQueryContainer } from './_types.query_dsl'
import { NodeShard } from './cluster'

/**
 * Get the search shards.
 *
 * Get the indices and shards that a search request would be run against.
 * This information can be useful for working out issues or planning optimizations with routing and shard preferences.
 * When filtered aliases are used, the filter is returned as part of the `indices` section.
 *
 * If the Elasticsearch security features are enabled, you must have the `view_index_metadata` or `manage` index privilege for the target data stream, index, or alias.
 */
export const SearchShardsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases to search. It supports wildcards (`*`). To search all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. IT can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  preference: z.string().describe('The node or shard the operation should be performed on. It is random by default.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SearchShardsRequest' })
export type SearchShardsRequest = z.infer<typeof SearchShardsRequest>

export const SearchShardsSearchShardsNodeAttributes = z.object({
  name: NodeName.describe('The human-readable identifier of the node.'),
  ephemeral_id: Id.describe('The ephemeral ID of the node.'),
  transport_address: TransportAddress.describe('The host and port where transport HTTP connections are accepted.'),
  external_id: z.string(),
  attributes: z.record(z.string(), z.string()).describe('Lists node attributes.'),
  roles: NodeRoles,
  version: VersionString,
  min_index_version: integer,
  max_index_version: integer
}).meta({ id: 'SearchShardsSearchShardsNodeAttributes' })
export type SearchShardsSearchShardsNodeAttributes = z.infer<typeof SearchShardsSearchShardsNodeAttributes>

export const SearchShardsShardStoreIndex = z.object({
  aliases: z.array(Name).optional(),
  filter: z.lazy(() => QueryDslQueryContainer).optional()
}).meta({ id: 'SearchShardsShardStoreIndex' })
export type SearchShardsShardStoreIndex = z.infer<typeof SearchShardsShardStoreIndex>

export const SearchShardsResponse = z.object({
  nodes: z.record(NodeId, SearchShardsSearchShardsNodeAttributes),
  shards: z.array(z.array(NodeShard)),
  indices: z.record(IndexName, SearchShardsShardStoreIndex)
}).meta({ id: 'SearchShardsResponse' })
export type SearchShardsResponse = z.infer<typeof SearchShardsResponse>
