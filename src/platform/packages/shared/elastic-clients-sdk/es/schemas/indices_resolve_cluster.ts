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

export const ClusterAlias = z.string().meta({ id: 'ClusterAlias' })
export type ClusterAlias = z.infer<typeof ClusterAlias>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

/** Reduced (minimal) info ElasticsearchVersion */
export const ElasticsearchVersionMinInfo = z.object({
  build_flavor: z.string(),
  minimum_index_compatibility_version: VersionString,
  minimum_wire_compatibility_version: VersionString,
  number: z.string()
}).meta({ id: 'ElasticsearchVersionMinInfo' })
export type ElasticsearchVersionMinInfo = z.infer<typeof ElasticsearchVersionMinInfo>

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Resolve the cluster.
 *
 * Resolve the specified index expressions to return information about each cluster, including the local "querying" cluster, if included.
 * If no index expression is provided, the API will return information about all the remote clusters that are configured on the querying cluster.
 *
 * This endpoint is useful before doing a cross-cluster search in order to determine which remote clusters should be included in a search.
 *
 * You use the same index expression with this endpoint as you would for cross-cluster search.
 * Index and cluster exclusions are also supported with this endpoint.
 *
 * For each cluster in the index expression, information is returned about:
 *
 * * Whether the querying ("local") cluster is currently connected to each remote cluster specified in the index expression. Note that this endpoint actively attempts to contact the remote clusters, unlike the `remote/info` endpoint.
 * * Whether each remote cluster is configured with `skip_unavailable` as `true` or `false`.
 * * Whether there are any indices, aliases, or data streams on that cluster that match the index expression.
 * * Whether the search is likely to have errors returned when you do the cross-cluster search (including any authorization errors if you do not have permission to query the index).
 * * Cluster version information, including the Elasticsearch server version.
 *
 * For example, `GET /_resolve/cluster/my-index-*,cluster*:my-index-*` returns information about the local cluster and all remotely configured clusters that start with the alias `cluster*`.
 * Each cluster returns information about whether it has any indices, aliases or data streams that match `my-index-*`.
 *
 * ## Note on backwards compatibility
 * The ability to query without an index expression was added in version 8.18, so when
 * querying remote clusters older than that, the local cluster will send the index
 * expression `dummy*` to those remote clusters. Thus, if an errors occur, you may see a reference
 * to that index expression even though you didn't request it. If it causes a problem, you can
 * instead include an index expression like `*:*` to bypass the issue.
 *
 * ## Advantages of using this endpoint before a cross-cluster search
 *
 * You may want to exclude a cluster or index from a search when:
 *
 * * A remote cluster is not currently connected and is configured with `skip_unavailable=false`. Running a cross-cluster search under those conditions will cause the entire search to fail.
 * * A cluster has no matching indices, aliases or data streams for the index expression (or your user does not have permissions to search them). For example, suppose your index expression is `logs*,remote1:logs*` and the remote1 cluster has no indices, aliases or data streams that match `logs*`. In that case, that cluster will return no results from that cluster if you include it in a cross-cluster search.
 * * The index expression (combined with any query parameters you specify) will likely cause an exception to be thrown when you do the search. In these cases, the "error" field in the `_resolve/cluster` response will be present. (This is also where security/permission errors will be shown.)
 * * A remote cluster is an older version that does not support the feature you want to use in your search.
 *
 * ## Test availability of remote clusters
 *
 * The `remote/info` endpoint is commonly used to test whether the "local" cluster (the cluster being queried) is connected to its remote clusters, but it does not necessarily reflect whether the remote cluster is available or not.
 * The remote cluster may be available, while the local cluster is not currently connected to it.
 *
 * You can use the `_resolve/cluster` API to attempt to reconnect to remote clusters.
 * For example with `GET _resolve/cluster` or `GET _resolve/cluster/*:*`.
 * The `connected` field in the response will indicate whether it was successful.
 * If a connection was (re-)established, this will also cause the `remote/info` endpoint to now indicate a connected status.
 */
export const IndicesResolveClusterRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('A comma-separated list of names or index patterns for the indices, aliases, and data streams to resolve. Resources on remote clusters can be specified using the `<cluster>`:`<name>` syntax. Index and cluster exclusions (e.g., `-cluster1:*`) are also supported. If no index expression is specified, information about all remote clusters configured on the local cluster is returned without doing any index matching').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded, or aliased indices are ignored when frozen. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored. NOTE: This option is only supported when specifying an index expression. You will get an error if you specify index options to the `_resolve/cluster` API endpoint that takes no index expression.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The maximum time to wait for remote clusters to respond. If a remote cluster does not respond within this timeout period, the API response will show the cluster as not connected and include an error message that the request timed out. The default timeout is unset and the query can take as long as the networking layer is configured to wait for remote clusters that are not responding (typically 30 seconds).').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesResolveClusterRequest' })
export type IndicesResolveClusterRequest = z.infer<typeof IndicesResolveClusterRequest>

/** Provides information about each cluster request relevant to doing a cross-cluster search. */
export const IndicesResolveClusterResolveClusterInfo = z.object({
  connected: z.boolean().describe('Whether the remote cluster is connected to the local (querying) cluster.'),
  skip_unavailable: z.boolean().describe('The `skip_unavailable` setting for a remote cluster.'),
  matching_indices: z.boolean().describe('Whether the index expression provided in the request matches any indices, aliases or data streams on the cluster.').optional(),
  error: z.string().describe('Provides error messages that are likely to occur if you do a search with this index expression on the specified cluster (for example, lack of security privileges to query an index).').optional(),
  version: ElasticsearchVersionMinInfo.describe('Provides version information about the cluster.').optional()
}).meta({ id: 'IndicesResolveClusterResolveClusterInfo' })
export type IndicesResolveClusterResolveClusterInfo = z.infer<typeof IndicesResolveClusterResolveClusterInfo>

export const IndicesResolveClusterResponse = z.record(ClusterAlias, IndicesResolveClusterResolveClusterInfo).meta({ id: 'IndicesResolveClusterResponse' })
export type IndicesResolveClusterResponse = z.infer<typeof IndicesResolveClusterResponse>
