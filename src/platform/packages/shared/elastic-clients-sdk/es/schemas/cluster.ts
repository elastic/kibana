/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, ByteSize, ClusterInfoTargets, CompletionStats, DateFormat, DateTime, DocStats, Duration, DurationValue, EpochTime, ExpandWildcards, FielddataStats, HealthStatus, Id, Ids, IndexName, Indices, Level, Metadata, Name, Names, NodeId, NodeIds, NodeName, NodeRoles, PluginStats, QueryCacheStats, RelocationFailureInfo, RequestBase, StoreStats, TransportAddress, UnitMillis, Uuid, VersionNumber, VersionString, WaitForActiveShards, WaitForEvents, double, integer, long } from './_types'
import { MappingTypeMapping } from './_types.mapping'
import { IndicesAliasDefinition, IndicesDataStreamLifecycle, IndicesDataStreamLifecycleWithRollover, IndicesDataStreamOptions, IndicesIndexSettings, IndicesPutIndexTemplateIndexTemplateMapping, IndicesStatsShardRoutingState, SegmentsStats } from './indices'
import { NodesHttp, NodesIndexingPressureMemory, NodesIngest, NodesNodesResponseBase, NodesScripting, NodesThreadCount } from './nodes'

export const ClusterAllocationExplainUnassignedInformationReason = z.enum(['INDEX_CREATED', 'CLUSTER_RECOVERED', 'INDEX_REOPENED', 'DANGLING_INDEX_IMPORTED', 'NEW_INDEX_RESTORED', 'EXISTING_INDEX_RESTORED', 'REPLICA_ADDED', 'ALLOCATION_FAILED', 'NODE_LEFT', 'REROUTE_CANCELLED', 'REINITIALIZED', 'REALLOCATED_REPLICA', 'PRIMARY_FAILED', 'FORCED_EMPTY_PRIMARY', 'MANUAL_ALLOCATION']).meta({ id: 'ClusterAllocationExplainUnassignedInformationReason' })
export type ClusterAllocationExplainUnassignedInformationReason = z.infer<typeof ClusterAllocationExplainUnassignedInformationReason>

export const ClusterAllocationExplainUnassignedInformation = z.object({
  at: DateTime,
  last_allocation_status: z.string().optional(),
  reason: ClusterAllocationExplainUnassignedInformationReason,
  details: z.string().optional(),
  failed_allocation_attempts: integer.optional(),
  delayed: z.boolean().optional(),
  allocation_status: z.string().optional()
}).meta({ id: 'ClusterAllocationExplainUnassignedInformation' })
export type ClusterAllocationExplainUnassignedInformation = z.infer<typeof ClusterAllocationExplainUnassignedInformation>

export const NodeShard = z.object({
  state: IndicesStatsShardRoutingState,
  primary: z.boolean(),
  node: NodeName.optional(),
  shard: integer,
  index: IndexName,
  allocation_id: z.record(z.string(), Id).optional(),
  recovery_source: z.record(z.string(), Id).optional(),
  unassigned_info: ClusterAllocationExplainUnassignedInformation.optional(),
  relocating_node: z.union([NodeId, z.null()]).optional(),
  relocation_failure_info: RelocationFailureInfo.optional()
}).meta({ id: 'NodeShard' })
export type NodeShard = z.infer<typeof NodeShard>

export const ClusterComponentTemplateSummaryRes = z.object({
  lifecycle: IndicesDataStreamLifecycleWithRollover.optional(),
  _meta: Metadata.optional(),
  version: VersionNumber.optional(),
  settings: z.record(IndexName, z.lazy(() => IndicesIndexSettings)).optional(),
  mappings: z.lazy(() => MappingTypeMapping).optional(),
  aliases: z.record(z.string(), IndicesAliasDefinition).optional(),
  data_stream_options: IndicesDataStreamOptions.optional()
}).meta({ id: 'ClusterComponentTemplateSummaryRes' })
export type ClusterComponentTemplateSummaryRes = z.infer<typeof ClusterComponentTemplateSummaryRes>

export const ClusterComponentTemplateNodeWithRollover = z.object({
  template: ClusterComponentTemplateSummaryRes,
  version: VersionNumber.optional(),
  _meta: Metadata.optional(),
  deprecated: z.boolean().optional(),
  created_date: DateTime.describe('Date and time when the component template was created. Only returned if the `human` query parameter is `true`.').optional(),
  created_date_millis: EpochTime.describe('Date and time when the component template was created, in milliseconds since the epoch.').optional(),
  modified_date: DateTime.describe('Date and time when the component template was last modified. Only returned if the `human` query parameter is `true`.').optional(),
  modified_date_millis: EpochTime.describe('Date and time when the component template was last modified, in milliseconds since the epoch.').optional()
}).meta({ id: 'ClusterComponentTemplateNodeWithRollover' })
export type ClusterComponentTemplateNodeWithRollover = z.infer<typeof ClusterComponentTemplateNodeWithRollover>

export const ClusterComponentTemplate = z.object({
  name: Name,
  component_template: ClusterComponentTemplateNodeWithRollover
}).meta({ id: 'ClusterComponentTemplate' })
export type ClusterComponentTemplate = z.infer<typeof ClusterComponentTemplate>

export const ClusterComponentTemplateSummary = z.object({
  _meta: Metadata.optional(),
  version: VersionNumber.optional(),
  settings: z.record(IndexName, z.lazy(() => IndicesIndexSettings)).optional(),
  mappings: z.lazy(() => MappingTypeMapping).optional(),
  aliases: z.record(z.string(), IndicesAliasDefinition).optional(),
  lifecycle: IndicesDataStreamLifecycle.optional(),
  data_stream_options: IndicesDataStreamOptions.optional()
}).meta({ id: 'ClusterComponentTemplateSummary' })
export type ClusterComponentTemplateSummary = z.infer<typeof ClusterComponentTemplateSummary>

export const ClusterComponentTemplateNode = z.object({
  template: ClusterComponentTemplateSummary,
  version: VersionNumber.optional(),
  _meta: Metadata.optional(),
  deprecated: z.boolean().optional(),
  created_date: DateTime.describe('Date and time when the component template was created. Only returned if the `human` query parameter is `true`.').optional(),
  created_date_millis: EpochTime.describe('Date and time when the component template was created, in milliseconds since the epoch.').optional(),
  modified_date: DateTime.describe('Date and time when the component template was last modified. Only returned if the `human` query parameter is `true`.').optional(),
  modified_date_millis: EpochTime.describe('Date and time when the component template was last modified, in milliseconds since the epoch.').optional()
}).meta({ id: 'ClusterComponentTemplateNode' })
export type ClusterComponentTemplateNode = z.infer<typeof ClusterComponentTemplateNode>

export const ClusterAllocationExplainAllocationExplainDecision = z.enum(['NO', 'YES', 'THROTTLE', 'ALWAYS']).meta({ id: 'ClusterAllocationExplainAllocationExplainDecision' })
export type ClusterAllocationExplainAllocationExplainDecision = z.infer<typeof ClusterAllocationExplainAllocationExplainDecision>

export const ClusterAllocationExplainAllocationDecision = z.object({
  decider: z.string(),
  decision: ClusterAllocationExplainAllocationExplainDecision,
  explanation: z.string()
}).meta({ id: 'ClusterAllocationExplainAllocationDecision' })
export type ClusterAllocationExplainAllocationDecision = z.infer<typeof ClusterAllocationExplainAllocationDecision>

export const ClusterAllocationExplainAllocationStore = z.object({
  allocation_id: z.string(),
  found: z.boolean(),
  in_sync: z.boolean(),
  matching_size_in_bytes: long,
  matching_sync_id: z.boolean(),
  store_exception: z.string()
}).meta({ id: 'ClusterAllocationExplainAllocationStore' })
export type ClusterAllocationExplainAllocationStore = z.infer<typeof ClusterAllocationExplainAllocationStore>

export const ClusterAllocationExplainDiskUsage = z.object({
  path: z.string(),
  total_bytes: long,
  used_bytes: long,
  free_bytes: long,
  free_disk_percent: double,
  used_disk_percent: double
}).meta({ id: 'ClusterAllocationExplainDiskUsage' })
export type ClusterAllocationExplainDiskUsage = z.infer<typeof ClusterAllocationExplainDiskUsage>

export const ClusterAllocationExplainNodeDiskUsage = z.object({
  node_name: Name,
  least_available: ClusterAllocationExplainDiskUsage,
  most_available: ClusterAllocationExplainDiskUsage
}).meta({ id: 'ClusterAllocationExplainNodeDiskUsage' })
export type ClusterAllocationExplainNodeDiskUsage = z.infer<typeof ClusterAllocationExplainNodeDiskUsage>

export const ClusterAllocationExplainReservedSize = z.object({
  node_id: Id,
  path: z.string(),
  total: long,
  shards: z.array(z.string())
}).meta({ id: 'ClusterAllocationExplainReservedSize' })
export type ClusterAllocationExplainReservedSize = z.infer<typeof ClusterAllocationExplainReservedSize>

export const ClusterAllocationExplainClusterInfo = z.object({
  nodes: z.record(z.string(), ClusterAllocationExplainNodeDiskUsage),
  shard_sizes: z.record(z.string(), long),
  shard_data_set_sizes: z.record(z.string(), z.string()).optional(),
  shard_paths: z.record(z.string(), z.string()),
  reserved_sizes: z.array(ClusterAllocationExplainReservedSize)
}).meta({ id: 'ClusterAllocationExplainClusterInfo' })
export type ClusterAllocationExplainClusterInfo = z.infer<typeof ClusterAllocationExplainClusterInfo>

export const ClusterAllocationExplainCurrentNode = z.object({
  id: Id,
  name: Name,
  roles: NodeRoles,
  attributes: z.record(z.string(), z.string()),
  transport_address: TransportAddress,
  weight_ranking: integer
}).meta({ id: 'ClusterAllocationExplainCurrentNode' })
export type ClusterAllocationExplainCurrentNode = z.infer<typeof ClusterAllocationExplainCurrentNode>

export const ClusterAllocationExplainDecision = z.enum(['yes', 'no', 'worse_balance', 'throttled', 'awaiting_info', 'allocation_delayed', 'no_valid_shard_copy', 'no_attempt']).meta({ id: 'ClusterAllocationExplainDecision' })
export type ClusterAllocationExplainDecision = z.infer<typeof ClusterAllocationExplainDecision>

export const ClusterAllocationExplainNodeAllocationExplanation = z.object({
  deciders: z.array(ClusterAllocationExplainAllocationDecision).optional(),
  node_attributes: z.record(z.string(), z.string()),
  node_decision: ClusterAllocationExplainDecision,
  node_id: Id,
  node_name: Name,
  roles: NodeRoles,
  store: ClusterAllocationExplainAllocationStore.optional(),
  transport_address: TransportAddress,
  weight_ranking: integer.optional()
}).meta({ id: 'ClusterAllocationExplainNodeAllocationExplanation' })
export type ClusterAllocationExplainNodeAllocationExplanation = z.infer<typeof ClusterAllocationExplainNodeAllocationExplanation>

/**
 * Explain the shard allocations.
 *
 * Get explanations for shard allocations in the cluster.
 * This API accepts the current_node, index, primary and shard parameters in the request body or in query parameters, but not in both at the same time.
 * For unassigned shards, it provides an explanation for why the shard is unassigned.
 * For assigned shards, it provides an explanation for why the shard is remaining on its current node and has not moved or rebalanced to another node.
 * This API can be very useful when attempting to diagnose why a shard is unassigned or why a shard continues to remain on its current node when you might expect otherwise.
 * Refer to the linked documentation for examples of how to troubleshoot allocation issues using this API.
 */
export const ClusterAllocationExplainRequest = z.object({
  ...RequestBase.shape,
  include_disk_info: z.boolean().describe('If true, returns information about disk usage and shard sizes.').optional().meta({ found_in: 'query' }),
  include_yes_decisions: z.boolean().describe('If true, returns YES decisions in explanation.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  index: IndexName.describe('The name of the index that you would like an explanation for.').optional().meta({ found_in: 'body' }),
  shard: integer.describe('An identifier for the shard that you would like an explanation for.').optional().meta({ found_in: 'body' }),
  primary: z.boolean().describe('If true, returns an explanation for the primary shard for the specified shard ID.').optional().meta({ found_in: 'body' }),
  current_node: NodeId.describe('Explain a shard only if it is currently located on the specified node name or node ID.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterAllocationExplainRequest' })
export type ClusterAllocationExplainRequest = z.infer<typeof ClusterAllocationExplainRequest>

export const ClusterAllocationExplainResponse = z.object({
  allocate_explanation: z.string().optional(),
  allocation_delay: Duration.optional(),
  allocation_delay_in_millis: DurationValue.optional(),
  can_allocate: ClusterAllocationExplainDecision.optional(),
  can_move_to_other_node: ClusterAllocationExplainDecision.optional(),
  can_rebalance_cluster: ClusterAllocationExplainDecision.optional(),
  can_rebalance_cluster_decisions: z.array(ClusterAllocationExplainAllocationDecision).optional(),
  can_rebalance_to_other_node: ClusterAllocationExplainDecision.optional(),
  can_remain_decisions: z.array(ClusterAllocationExplainAllocationDecision).optional(),
  can_remain_on_current_node: ClusterAllocationExplainDecision.optional(),
  cluster_info: ClusterAllocationExplainClusterInfo.optional(),
  configured_delay: Duration.optional(),
  configured_delay_in_millis: DurationValue.optional(),
  current_node: ClusterAllocationExplainCurrentNode.optional(),
  current_state: z.string(),
  index: IndexName,
  move_explanation: z.string().optional(),
  node_allocation_decisions: z.array(ClusterAllocationExplainNodeAllocationExplanation).optional(),
  primary: z.boolean(),
  rebalance_explanation: z.string().optional(),
  remaining_delay: Duration.optional(),
  remaining_delay_in_millis: DurationValue.optional(),
  shard: integer,
  unassigned_info: ClusterAllocationExplainUnassignedInformation.optional(),
  note: z.string().optional()
}).meta({ id: 'ClusterAllocationExplainResponse' })
export type ClusterAllocationExplainResponse = z.infer<typeof ClusterAllocationExplainResponse>

/**
 * Delete component templates.
 *
 * Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.
 */
export const ClusterDeleteComponentTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list or wildcard expression of component template names used to limit the request.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterDeleteComponentTemplateRequest' })
export type ClusterDeleteComponentTemplateRequest = z.infer<typeof ClusterDeleteComponentTemplateRequest>

export const ClusterDeleteComponentTemplateResponse = AcknowledgedResponseBase.meta({ id: 'ClusterDeleteComponentTemplateResponse' })
export type ClusterDeleteComponentTemplateResponse = z.infer<typeof ClusterDeleteComponentTemplateResponse>

/**
 * Clear cluster voting config exclusions.
 *
 * Remove master-eligible nodes from the voting configuration exclusion list.
 */
export const ClusterDeleteVotingConfigExclusionsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  wait_for_removal: z.boolean().describe('Specifies whether to wait for all excluded nodes to be removed from the cluster before clearing the voting configuration exclusions list. Defaults to true, meaning that all excluded nodes must be removed from the cluster before this API takes any action. If set to false then the voting configuration exclusions list is cleared even if some excluded nodes are still in the cluster.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterDeleteVotingConfigExclusionsRequest' })
export type ClusterDeleteVotingConfigExclusionsRequest = z.infer<typeof ClusterDeleteVotingConfigExclusionsRequest>

export const ClusterDeleteVotingConfigExclusionsResponse = z.boolean().meta({ id: 'ClusterDeleteVotingConfigExclusionsResponse' })
export type ClusterDeleteVotingConfigExclusionsResponse = z.infer<typeof ClusterDeleteVotingConfigExclusionsResponse>

/**
 * Check component templates.
 *
 * Returns information about whether a particular component template exists.
 */
export const ClusterExistsComponentTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of component template names used to limit the request. Wildcard (*) expressions are supported.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If true, the request retrieves information from the local node only. Defaults to false, which means information is retrieved from the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterExistsComponentTemplateRequest' })
export type ClusterExistsComponentTemplateRequest = z.infer<typeof ClusterExistsComponentTemplateRequest>

export const ClusterExistsComponentTemplateResponse = z.boolean().meta({ id: 'ClusterExistsComponentTemplateResponse' })
export type ClusterExistsComponentTemplateResponse = z.infer<typeof ClusterExistsComponentTemplateResponse>

/**
 * Get component templates.
 *
 * Get information about component templates.
 */
export const ClusterGetComponentTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of component template to retrieve. Wildcard (`*`) expressions are supported.').optional().meta({ found_in: 'path' }),
  flat_settings: z.boolean().describe('If `true`, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  settings_filter: z.union([z.string(), z.array(z.string())]).describe('Filter out results, for example to filter out sensitive information. Supports wildcards or full settings keys').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('Return all default configurations for the component template').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only. If `false`, information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterGetComponentTemplateRequest' })
export type ClusterGetComponentTemplateRequest = z.infer<typeof ClusterGetComponentTemplateRequest>

export const ClusterGetComponentTemplateResponse = z.object({
  component_templates: z.array(ClusterComponentTemplate)
}).meta({ id: 'ClusterGetComponentTemplateResponse' })
export type ClusterGetComponentTemplateResponse = z.infer<typeof ClusterGetComponentTemplateResponse>

/**
 * Get cluster-wide settings.
 *
 * By default, it returns only settings that have been explicitly defined.
 */
export const ClusterGetSettingsRequest = z.object({
  ...RequestBase.shape,
  flat_settings: z.boolean().describe('If `true`, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If `true`, also returns the values of all other cluster settings set in the `elasticsearch.yml` file on one of the nodes in your cluster, together with the default values of all other cluster settings on that node. The default value of each setting may depend on the values of other settings on that node. If the nodes in your cluster do not all have the same configuration then the values returned by this API may vary from invocation to invocation and may not reflect the values that Elasticsearch uses in all situations. Use the `GET _nodes/settings` API to fetch the settings for each individual node in your cluster.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterGetSettingsRequest' })
export type ClusterGetSettingsRequest = z.infer<typeof ClusterGetSettingsRequest>

export const ClusterGetSettingsResponse = z.object({
  persistent: z.record(z.string(), z.any()).describe('The settings that persist after the cluster restarts.'),
  transient: z.record(z.string(), z.any()).describe('The settings that do not persist after the cluster restarts.'),
  defaults: z.record(z.string(), z.any()).describe('The default setting values.').optional()
}).meta({ id: 'ClusterGetSettingsResponse' })
export type ClusterGetSettingsResponse = z.infer<typeof ClusterGetSettingsResponse>

export const ClusterHealthShardHealthStats = z.object({
  active_shards: integer,
  initializing_shards: integer,
  primary_active: z.boolean(),
  relocating_shards: integer,
  status: HealthStatus,
  unassigned_shards: integer,
  unassigned_primary_shards: integer
}).meta({ id: 'ClusterHealthShardHealthStats' })
export type ClusterHealthShardHealthStats = z.infer<typeof ClusterHealthShardHealthStats>

export const ClusterHealthIndexHealthStats = z.object({
  active_primary_shards: integer,
  active_shards: integer,
  initializing_shards: integer,
  number_of_replicas: integer,
  number_of_shards: integer,
  relocating_shards: integer,
  shards: z.record(z.string(), ClusterHealthShardHealthStats).optional(),
  status: HealthStatus,
  unassigned_shards: integer,
  unassigned_primary_shards: integer
}).meta({ id: 'ClusterHealthIndexHealthStats' })
export type ClusterHealthIndexHealthStats = z.infer<typeof ClusterHealthIndexHealthStats>

export const ClusterHealthHealthResponseBody = z.object({
  active_primary_shards: integer.describe('The number of active primary shards.'),
  active_shards: integer.describe('The total number of active primary and replica shards.'),
  active_shards_percent: z.string().describe('The ratio of active shards in the cluster expressed as a string formatted percentage.').optional(),
  active_shards_percent_as_number: double.describe('The ratio of active shards in the cluster expressed as a percentage.'),
  cluster_name: Name.describe('The name of the cluster.'),
  delayed_unassigned_shards: integer.describe('The number of shards whose allocation has been delayed by the timeout settings.'),
  indices: z.record(IndexName, ClusterHealthIndexHealthStats).optional(),
  initializing_shards: integer.describe('The number of shards that are under initialization.'),
  number_of_data_nodes: integer.describe('The number of nodes that are dedicated data nodes.'),
  number_of_in_flight_fetch: integer.describe('The number of unfinished fetches.'),
  number_of_nodes: integer.describe('The number of nodes within the cluster.'),
  number_of_pending_tasks: integer.describe('The number of cluster-level changes that have not yet been executed.'),
  relocating_shards: integer.describe('The number of shards that are under relocation.'),
  status: HealthStatus,
  task_max_waiting_in_queue: Duration.describe('The time since the earliest initiated task is waiting for being performed.').optional(),
  task_max_waiting_in_queue_millis: DurationValue.describe('The time expressed in milliseconds since the earliest initiated task is waiting for being performed.'),
  timed_out: z.boolean().describe('If false the response returned within the period of time that is specified by the timeout parameter (30s by default)'),
  unassigned_primary_shards: integer.describe('The number of primary shards that are not allocated.'),
  unassigned_shards: integer.describe('The number of shards that are not allocated.')
}).meta({ id: 'ClusterHealthHealthResponseBody' })
export type ClusterHealthHealthResponseBody = z.infer<typeof ClusterHealthHealthResponseBody>

export const ClusterHealthWaitForNodes = z.union([z.string(), integer]).meta({ id: 'ClusterHealthWaitForNodes' })
export type ClusterHealthWaitForNodes = z.infer<typeof ClusterHealthWaitForNodes>

/**
 * Get the cluster health status.
 *
 * You can also use the API to get the health status of only specified data streams and indices.
 * For data streams, the API retrieves the health status of the stream’s backing indices.
 *
 * The cluster health status is: green, yellow or red.
 * On the shard level, a red status indicates that the specific shard is not allocated in the cluster. Yellow means that the primary shard is allocated but replicas are not. Green means that all shards are allocated.
 * The index level status is controlled by the worst shard status.
 *
 * One of the main benefits of the API is the ability to wait until the cluster reaches a certain high watermark health level.
 * The cluster status is controlled by the worst index status.
 */
export const ClusterHealthRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and index aliases that limit the request. Wildcard expressions (`*`) are supported. To target all data streams and indices in a cluster, omit this parameter or use _all or `*`.').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Expand wildcard expression to concrete indices that are open, closed or both.').optional().meta({ found_in: 'query' }),
  level: Level.describe('Return health information at a specific level of detail.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If true, retrieve information from the local node only. If false, retrieve information from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('Wait for the specified number of active shards. Use `all` to wait for all shards in the cluster to be active. Use `0` to not wait.').optional().meta({ found_in: 'query' }),
  wait_for_events: WaitForEvents.describe('Wait until all currently queued events with the given priority are processed.').optional().meta({ found_in: 'query' }),
  wait_for_nodes: ClusterHealthWaitForNodes.describe('Wait until the specified number (N) of nodes is available. It also accepts `>=N`, `<=N`, `>N` and `<N`. Alternatively, use the notations `ge(N)`, `le(N)`, `gt(N)`, and `lt(N)`.').optional().meta({ found_in: 'query' }),
  wait_for_no_initializing_shards: z.boolean().describe('Wait (until the timeout expires) for the cluster to have no shard initializations. If false, the request does not wait for initializing shards.').optional().meta({ found_in: 'query' }),
  wait_for_no_relocating_shards: z.boolean().describe('Wait (until the timeout expires) for the cluster to have no shard relocations. If false, the request not wait for relocating shards.').optional().meta({ found_in: 'query' }),
  wait_for_status: HealthStatus.describe('Wait (until the timeout expires) for the cluster to reach a specific health status (or a better status). A green status is better than yellow and yellow is better than red. By default, the request does not wait for a particular status.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterHealthRequest' })
export type ClusterHealthRequest = z.infer<typeof ClusterHealthRequest>

export const ClusterHealthResponse = ClusterHealthHealthResponseBody.meta({ id: 'ClusterHealthResponse' })
export type ClusterHealthResponse = z.infer<typeof ClusterHealthResponse>

/**
 * Get cluster info.
 *
 * Returns basic information about the cluster.
 */
export const ClusterInfoRequest = z.object({
  ...RequestBase.shape,
  target: ClusterInfoTargets.describe('Limits the information returned to the specific target. Supports a comma-separated list, such as http,ingest.').meta({ found_in: 'path' })
}).meta({ id: 'ClusterInfoRequest' })
export type ClusterInfoRequest = z.infer<typeof ClusterInfoRequest>

export const ClusterInfoResponse = z.object({
  cluster_name: Name,
  http: NodesHttp.optional(),
  ingest: NodesIngest.optional(),
  thread_pool: z.record(z.string(), NodesThreadCount).optional(),
  script: NodesScripting.optional()
}).meta({ id: 'ClusterInfoResponse' })
export type ClusterInfoResponse = z.infer<typeof ClusterInfoResponse>

export const ClusterPendingTasksPendingTask = z.object({
  executing: z.boolean().describe('Indicates whether the pending tasks are currently executing or not.'),
  insert_order: integer.describe('The number that represents when the task has been inserted into the task queue.'),
  priority: z.string().describe('The priority of the pending task. The valid priorities in descending priority order are: `IMMEDIATE` > `URGENT` > `HIGH` > `NORMAL` > `LOW` > `LANGUID`.'),
  source: z.string().describe('A general description of the cluster task that may include a reason and origin.'),
  time_in_queue: Duration.describe('The time since the task is waiting for being performed.').optional(),
  time_in_queue_millis: DurationValue.describe('The time expressed in milliseconds since the task is waiting for being performed.')
}).meta({ id: 'ClusterPendingTasksPendingTask' })
export type ClusterPendingTasksPendingTask = z.infer<typeof ClusterPendingTasksPendingTask>

/**
 * Get the pending cluster tasks.
 *
 * Get information about cluster-level changes (such as create index, update mapping, allocate or fail shard) that have not yet taken effect.
 *
 * NOTE: This API returns a list of any pending updates to the cluster state.
 * These are distinct from the tasks reported by the task management API which include periodic tasks and tasks initiated by the user, such as node stats, search queries, or create index requests.
 * However, if a user-initiated task such as a create index command causes a cluster state update, the activity of this task might be reported by both task api and pending cluster tasks API.
 */
export const ClusterPendingTasksRequest = z.object({
  ...RequestBase.shape,
  local: z.boolean().describe('If `true`, the request retrieves information from the local node only. If `false`, information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterPendingTasksRequest' })
export type ClusterPendingTasksRequest = z.infer<typeof ClusterPendingTasksRequest>

export const ClusterPendingTasksResponse = z.object({
  tasks: z.array(ClusterPendingTasksPendingTask)
}).meta({ id: 'ClusterPendingTasksResponse' })
export type ClusterPendingTasksResponse = z.infer<typeof ClusterPendingTasksResponse>

/**
 * Update voting configuration exclusions.
 *
 * Update the cluster voting config exclusions by node IDs or node names.
 * By default, if there are more than three master-eligible nodes in the cluster and you remove fewer than half of the master-eligible nodes in the cluster at once, the voting configuration automatically shrinks.
 * If you want to shrink the voting configuration to contain fewer than three nodes or to remove half or more of the master-eligible nodes in the cluster at once, use this API to remove departing nodes from the voting configuration manually.
 * The API adds an entry for each specified node to the cluster’s voting configuration exclusions list.
 * It then waits until the cluster has reconfigured its voting configuration to exclude the specified nodes.
 *
 * Clusters should have no voting configuration exclusions in normal operation.
 * Once the excluded nodes have stopped, clear the voting configuration exclusions with `DELETE /_cluster/voting_config_exclusions`.
 * This API waits for the nodes to be fully removed from the cluster before it returns.
 * If your cluster has voting configuration exclusions for nodes that you no longer intend to remove, use `DELETE /_cluster/voting_config_exclusions?wait_for_removal=false` to clear the voting configuration exclusions without waiting for the nodes to leave the cluster.
 *
 * A response to `POST /_cluster/voting_config_exclusions` with an HTTP status code of 200 OK guarantees that the node has been removed from the voting configuration and will not be reinstated until the voting configuration exclusions are cleared by calling `DELETE /_cluster/voting_config_exclusions`.
 * If the call to `POST /_cluster/voting_config_exclusions` fails or returns a response with an HTTP status code other than 200 OK then the node may not have been removed from the voting configuration.
 * In that case, you may safely retry the call.
 *
 * NOTE: Voting exclusions are required only when you remove at least half of the master-eligible nodes from a cluster in a short time period.
 * They are not required when removing master-ineligible nodes or when removing fewer than half of the master-eligible nodes.
 */
export const ClusterPostVotingConfigExclusionsRequest = z.object({
  ...RequestBase.shape,
  node_names: Names.describe('A comma-separated list of the names of the nodes to exclude from the voting configuration. If specified, you may not also specify node_ids.').optional().meta({ found_in: 'query' }),
  node_ids: Ids.describe('A comma-separated list of the persistent ids of the nodes to exclude from the voting configuration. If specified, you may not also specify node_names.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('When adding a voting configuration exclusion, the API waits for the specified nodes to be excluded from the voting configuration before returning. If the timeout expires before the appropriate condition is satisfied, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterPostVotingConfigExclusionsRequest' })
export type ClusterPostVotingConfigExclusionsRequest = z.infer<typeof ClusterPostVotingConfigExclusionsRequest>

export const ClusterPostVotingConfigExclusionsResponse = z.boolean().meta({ id: 'ClusterPostVotingConfigExclusionsResponse' })
export type ClusterPostVotingConfigExclusionsResponse = z.infer<typeof ClusterPostVotingConfigExclusionsResponse>

/**
 * Create or update a component template.
 *
 * Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.
 *
 * An index template can be composed of multiple component templates.
 * To use a component template, specify it in an index template’s `composed_of` list.
 * Component templates are only applied to new data streams and indices as part of a matching index template.
 *
 * Settings and mappings specified directly in the index template or the create index request override any settings or mappings specified in a component template.
 *
 * Component templates are only used during index creation.
 * For data streams, this includes data stream creation and the creation of a stream’s backing indices.
 * Changes to component templates do not affect existing indices, including a stream’s backing indices.
 *
 * You can use C-style `/* *\/` block comments in component templates.
 * You can include comments anywhere in the request body except before the opening curly bracket.
 *
 * **Applying component templates**
 *
 * You cannot directly apply a component template to a data stream or index.
 * To be applied, a component template must be included in an index template's `composed_of` list.
 */
export const ClusterPutComponentTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Name of the component template to create. Elasticsearch includes the following built-in component templates: `logs-mappings`; `logs-settings`; `metrics-mappings`; `metrics-settings`;`synthetics-mapping`; `synthetics-settings`. Elastic Agent uses these templates to configure backing indices for its data streams. If you use Elastic Agent and want to overwrite one of these templates, set the `version` for your replacement template higher than the current version. If you don’t use Elastic Agent and want to disable all built-in component and index templates, set `stack.templates.enabled` to `false` using the cluster update settings API.').meta({ found_in: 'path' }),
  create: z.boolean().describe('If `true`, this request cannot replace or update existing component templates.').optional().meta({ found_in: 'query' }),
  cause: z.string().describe('User defined reason for create the component template.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  template: IndicesPutIndexTemplateIndexTemplateMapping.describe('The template to be applied which includes mappings, settings, or aliases configuration.').meta({ found_in: 'body' }),
  version: VersionNumber.describe('Version number used to manage component templates externally. This number isn\'t automatically generated or incremented by Elasticsearch. To unset a version, replace the template without specifying a version.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.describe('Optional user metadata about the component template. It may have any contents. This map is not automatically generated by Elasticsearch. This information is stored in the cluster state, so keeping it short is preferable. To unset `_meta`, replace the template without specifying this information.').optional().meta({ found_in: 'body' }),
  deprecated: z.boolean().describe('Marks this index template as deprecated. When creating or updating a non-deprecated index template that uses deprecated components, Elasticsearch will emit a deprecation warning.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterPutComponentTemplateRequest' })
export type ClusterPutComponentTemplateRequest = z.infer<typeof ClusterPutComponentTemplateRequest>

export const ClusterPutComponentTemplateResponse = AcknowledgedResponseBase.meta({ id: 'ClusterPutComponentTemplateResponse' })
export type ClusterPutComponentTemplateResponse = z.infer<typeof ClusterPutComponentTemplateResponse>

/**
 * Update the cluster settings.
 *
 * Configure and update dynamic settings on a running cluster.
 * You can also configure dynamic settings locally on an unstarted or shut down node in `elasticsearch.yml`.
 *
 * Updates made with this API can be persistent, which apply across cluster restarts, or transient, which reset after a cluster restart.
 * You can also reset transient or persistent settings by assigning them a null value.
 *
 * If you configure the same setting using multiple methods, Elasticsearch applies the settings in following order of precedence: 1) Transient setting; 2) Persistent setting; 3) `elasticsearch.yml` setting; 4) Default setting value.
 * For example, you can apply a transient setting to override a persistent setting or `elasticsearch.yml` setting.
 * However, a change to an `elasticsearch.yml` setting will not override a defined transient or persistent setting.
 *
 * TIP: In Elastic Cloud, use the user settings feature to configure all cluster settings. This method automatically rejects unsafe settings that could break your cluster.
 * If you run Elasticsearch on your own hardware, use this API to configure dynamic cluster settings.
 * Only use `elasticsearch.yml` for static cluster settings and node settings.
 * The API doesn’t require a restart and ensures a setting’s value is the same on all nodes.
 *
 * WARNING: Transient cluster settings are no longer recommended. Use persistent cluster settings instead.
 * If a cluster becomes unstable, transient settings can clear unexpectedly, resulting in a potentially undesired cluster configuration.
 */
export const ClusterPutSettingsRequest = z.object({
  ...RequestBase.shape,
  flat_settings: z.boolean().describe('Return settings in flat format').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response.').optional().meta({ found_in: 'query' }),
  persistent: z.record(z.string(), z.any()).describe('The settings that persist after the cluster restarts.').optional().meta({ found_in: 'body' }),
  transient: z.record(z.string(), z.any()).describe('The settings that do not persist after the cluster restarts.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterPutSettingsRequest' })
export type ClusterPutSettingsRequest = z.infer<typeof ClusterPutSettingsRequest>

export const ClusterPutSettingsResponse = z.object({
  acknowledged: z.boolean(),
  persistent: z.record(z.string(), z.any()),
  transient: z.record(z.string(), z.any())
}).meta({ id: 'ClusterPutSettingsResponse' })
export type ClusterPutSettingsResponse = z.infer<typeof ClusterPutSettingsResponse>

export const ClusterRemoteInfoClusterRemoteSniffInfo = z.object({
  mode: z.literal('sniff').describe('The connection mode for the remote cluster.'),
  connected: z.boolean().describe('If it is `true`, there is at least one open connection to the remote cluster. If it is `false`, it means that the cluster no longer has an open connection to the remote cluster. It does not necessarily mean that the remote cluster is down or unavailable, just that at some point a connection was lost.'),
  max_connections_per_cluster: integer.describe('The maximum number of connections maintained for the remote cluster when sniff mode is configured.'),
  num_nodes_connected: long.describe('The number of connected nodes in the remote cluster when sniff mode is configured.'),
  initial_connect_timeout: Duration.describe('The initial connect timeout for remote cluster connections.'),
  skip_unavailable: z.boolean().describe('If `true`, cross-cluster search skips the remote cluster when its nodes are unavailable during the search and ignores errors returned by the remote cluster.'),
  seeds: z.array(z.string()).describe('The initial seed transport addresses of the remote cluster when sniff mode is configured.')
}).meta({ id: 'ClusterRemoteInfoClusterRemoteSniffInfo' })
export type ClusterRemoteInfoClusterRemoteSniffInfo = z.infer<typeof ClusterRemoteInfoClusterRemoteSniffInfo>

export const ClusterRemoteInfoClusterRemoteProxyInfo = z.object({
  mode: z.literal('proxy').describe('The connection mode for the remote cluster.'),
  connected: z.boolean().describe('If it is `true`, there is at least one open connection to the remote cluster. If it is `false`, it means that the cluster no longer has an open connection to the remote cluster. It does not necessarily mean that the remote cluster is down or unavailable, just that at some point a connection was lost.'),
  initial_connect_timeout: Duration.describe('The initial connect timeout for remote cluster connections.'),
  skip_unavailable: z.boolean().describe('If `true`, cross-cluster search skips the remote cluster when its nodes are unavailable during the search and ignores errors returned by the remote cluster.'),
  proxy_address: z.string().describe('The address for remote connections when proxy mode is configured.'),
  server_name: z.string(),
  num_proxy_sockets_connected: integer.describe('The number of open socket connections to the remote cluster when proxy mode is configured.'),
  max_proxy_socket_connections: integer.describe('The maximum number of socket connections to the remote cluster when proxy mode is configured.'),
  cluster_credentials: z.string().describe('This field is present and has a value of `::es_redacted::` only when the remote cluster is configured with the API key based model. Otherwise, the field is not present.').optional()
}).meta({ id: 'ClusterRemoteInfoClusterRemoteProxyInfo' })
export type ClusterRemoteInfoClusterRemoteProxyInfo = z.infer<typeof ClusterRemoteInfoClusterRemoteProxyInfo>

export const ClusterRemoteInfoClusterRemoteInfo = z.union([ClusterRemoteInfoClusterRemoteSniffInfo, ClusterRemoteInfoClusterRemoteProxyInfo]).meta({ id: 'ClusterRemoteInfoClusterRemoteInfo' })
export type ClusterRemoteInfoClusterRemoteInfo = z.infer<typeof ClusterRemoteInfoClusterRemoteInfo>

/**
 * Get remote cluster information.
 *
 * Get information about configured remote clusters.
 * The API returns connection and endpoint information keyed by the configured remote cluster alias.
 *
 * > info
 * > This API returns information that reflects current state on the local cluster.
 * > The `connected` field does not necessarily reflect whether a remote cluster is down or unavailable, only whether there is currently an open connection to it.
 * > Elasticsearch does not spontaneously try to reconnect to a disconnected remote cluster.
 * > To trigger a reconnection, attempt a cross-cluster search, ES|QL cross-cluster search, or try the [resolve cluster endpoint](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-cluster).
 */
export const ClusterRemoteInfoRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'ClusterRemoteInfoRequest' })
export type ClusterRemoteInfoRequest = z.infer<typeof ClusterRemoteInfoRequest>

export const ClusterRemoteInfoResponse = z.record(z.string(), ClusterRemoteInfoClusterRemoteInfo).meta({ id: 'ClusterRemoteInfoResponse' })
export type ClusterRemoteInfoResponse = z.infer<typeof ClusterRemoteInfoResponse>

export const ClusterRerouteCommandCancelAction = z.object({
  index: IndexName,
  shard: integer,
  node: z.string(),
  allow_primary: z.boolean().optional()
}).meta({ id: 'ClusterRerouteCommandCancelAction' })
export type ClusterRerouteCommandCancelAction = z.infer<typeof ClusterRerouteCommandCancelAction>

export const ClusterRerouteCommandMoveAction = z.object({
  index: IndexName,
  shard: integer,
  from_node: z.string().describe('The node to move the shard from'),
  to_node: z.string().describe('The node to move the shard to')
}).meta({ id: 'ClusterRerouteCommandMoveAction' })
export type ClusterRerouteCommandMoveAction = z.infer<typeof ClusterRerouteCommandMoveAction>

export const ClusterRerouteCommandAllocateReplicaAction = z.object({
  index: IndexName,
  shard: integer,
  node: z.string()
}).meta({ id: 'ClusterRerouteCommandAllocateReplicaAction' })
export type ClusterRerouteCommandAllocateReplicaAction = z.infer<typeof ClusterRerouteCommandAllocateReplicaAction>

export const ClusterRerouteCommandAllocatePrimaryAction = z.object({
  index: IndexName,
  shard: integer,
  node: z.string(),
  accept_data_loss: z.boolean().describe('If a node which has a copy of the data rejoins the cluster later on, that data will be deleted. To ensure that these implications are well-understood, this command requires the flag accept_data_loss to be explicitly set to true')
}).meta({ id: 'ClusterRerouteCommandAllocatePrimaryAction' })
export type ClusterRerouteCommandAllocatePrimaryAction = z.infer<typeof ClusterRerouteCommandAllocatePrimaryAction>

export const ClusterRerouteCommand = z.object({
  cancel: ClusterRerouteCommandCancelAction.describe('Cancel allocation of a shard (or recovery). Accepts index and shard for index name and shard number, and node for the node to cancel the shard allocation on. This can be used to force resynchronization of existing replicas from the primary shard by cancelling them and allowing them to be reinitialized through the standard recovery process. By default only replica shard allocations can be cancelled. If it is necessary to cancel the allocation of a primary shard then the allow_primary flag must also be included in the request.').optional(),
  move: ClusterRerouteCommandMoveAction.describe('Move a started shard from one node to another node. Accepts index and shard for index name and shard number, from_node for the node to move the shard from, and to_node for the node to move the shard to.').optional(),
  allocate_replica: ClusterRerouteCommandAllocateReplicaAction.describe('Allocate an unassigned replica shard to a node. Accepts index and shard for index name and shard number, and node to allocate the shard to. Takes allocation deciders into account.').optional(),
  allocate_stale_primary: ClusterRerouteCommandAllocatePrimaryAction.describe('Allocate a primary shard to a node that holds a stale copy. Accepts the index and shard for index name and shard number, and node to allocate the shard to. Using this command may lead to data loss for the provided shard id. If a node which has the good copy of the data rejoins the cluster later on, that data will be deleted or overwritten with the data of the stale copy that was forcefully allocated with this command. To ensure that these implications are well-understood, this command requires the flag accept_data_loss to be explicitly set to true.').optional(),
  allocate_empty_primary: ClusterRerouteCommandAllocatePrimaryAction.describe('Allocate an empty primary shard to a node. Accepts the index and shard for index name and shard number, and node to allocate the shard to. Using this command leads to a complete loss of all data that was indexed into this shard, if it was previously started. If a node which has a copy of the data rejoins the cluster later on, that data will be deleted. To ensure that these implications are well-understood, this command requires the flag accept_data_loss to be explicitly set to true.').optional()
}).meta({ id: 'ClusterRerouteCommand' })
export type ClusterRerouteCommand = z.infer<typeof ClusterRerouteCommand>

/**
 * Reroute the cluster.
 *
 * Manually change the allocation of individual shards in the cluster.
 * For example, a shard can be moved from one node to another explicitly, an allocation can be canceled, and an unassigned shard can be explicitly allocated to a specific node.
 *
 * It is important to note that after processing any reroute commands Elasticsearch will perform rebalancing as normal (respecting the values of settings such as `cluster.routing.rebalance.enable`) in order to remain in a balanced state.
 * For example, if the requested allocation includes moving a shard from node1 to node2 then this may cause a shard to be moved from node2 back to node1 to even things out.
 *
 * The cluster can be set to disable allocations using the `cluster.routing.allocation.enable` setting.
 * If allocations are disabled then the only allocations that will be performed are explicit ones given using the reroute command, and consequent allocations due to rebalancing.
 *
 * The cluster will attempt to allocate a shard a maximum of `index.allocation.max_retries` times in a row (defaults to `5`), before giving up and leaving the shard unallocated.
 * This scenario can be caused by structural problems such as having an analyzer which refers to a stopwords file which doesn’t exist on all nodes.
 *
 * Once the problem has been corrected, allocation can be manually retried by calling the reroute API with the `?retry_failed` URI query parameter, which will attempt a single retry round for these shards.
 */
export const ClusterRerouteRequest = z.object({
  ...RequestBase.shape,
  dry_run: z.boolean().describe('If true, then the request simulates the operation. It will calculate the result of applying the commands to the current cluster state and return the resulting cluster state after the commands (and rebalancing) have been applied; it will not actually perform the requested changes.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If true, then the response contains an explanation of why the commands can or cannot run.').optional().meta({ found_in: 'query' }),
  metric: z.union([z.string(), z.array(z.string())]).describe('Limits the information returned to the specified metrics.').optional().meta({ found_in: 'query' }),
  retry_failed: z.boolean().describe('If true, then retries allocation of shards that are blocked due to too many subsequent allocation failures.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  commands: z.array(ClusterRerouteCommand).describe('Defines the commands to perform.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClusterRerouteRequest' })
export type ClusterRerouteRequest = z.infer<typeof ClusterRerouteRequest>

export const ClusterRerouteRerouteDecision = z.object({
  decider: z.string(),
  decision: z.string(),
  explanation: z.string()
}).meta({ id: 'ClusterRerouteRerouteDecision' })
export type ClusterRerouteRerouteDecision = z.infer<typeof ClusterRerouteRerouteDecision>

export const ClusterRerouteRerouteParameters = z.object({
  allow_primary: z.boolean(),
  index: IndexName,
  node: NodeName,
  shard: integer,
  from_node: NodeName.optional(),
  to_node: NodeName.optional()
}).meta({ id: 'ClusterRerouteRerouteParameters' })
export type ClusterRerouteRerouteParameters = z.infer<typeof ClusterRerouteRerouteParameters>

export const ClusterRerouteRerouteExplanation = z.object({
  command: z.string(),
  decisions: z.array(ClusterRerouteRerouteDecision),
  parameters: ClusterRerouteRerouteParameters
}).meta({ id: 'ClusterRerouteRerouteExplanation' })
export type ClusterRerouteRerouteExplanation = z.infer<typeof ClusterRerouteRerouteExplanation>

export const ClusterRerouteResponse = z.object({
  acknowledged: z.boolean(),
  explanations: z.array(ClusterRerouteRerouteExplanation).optional(),
  state: z.any().describe('There aren\'t any guarantees on the output/structure of the raw cluster state. Here you will find the internal representation of the cluster, which can differ from the external representation.').optional()
}).meta({ id: 'ClusterRerouteResponse' })
export type ClusterRerouteResponse = z.infer<typeof ClusterRerouteResponse>

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

export const ClusterStatsRemoteClusterInfo = z.object({
  cluster_uuid: z.string().describe('The UUID of the remote cluster.'),
  mode: z.string().describe('The connection mode used to communicate with the remote cluster.'),
  skip_unavailable: z.boolean().describe('The `skip_unavailable` setting used for this remote cluster.'),
  'transport.compress': z.string().describe('Transport compression setting used for this remote cluster.'),
  status: HealthStatus.describe('Health status of the cluster, based on the state of its primary and replica shards.'),
  version: z.array(VersionString).describe('The list of Elasticsearch versions used by the nodes on the remote cluster.'),
  nodes_count: integer.describe('The total count of nodes in the remote cluster.'),
  shards_count: integer.describe('The total number of shards in the remote cluster.'),
  indices_count: integer.describe('The total number of indices in the remote cluster.'),
  indices_total_size_in_bytes: long.describe('Total data set size, in bytes, of all shards assigned to selected nodes.'),
  indices_total_size: z.string().describe('Total data set size of all shards assigned to selected nodes, as a human-readable string.').optional(),
  max_heap_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap across the nodes of the remote cluster.'),
  max_heap: z.string().describe('Maximum amount of memory available for use by the heap across the nodes of the remote cluster, as a human-readable string.').optional(),
  mem_total_in_bytes: long.describe('Total amount, in bytes, of physical memory across the nodes of the remote cluster.'),
  mem_total: z.string().describe('Total amount of physical memory across the nodes of the remote cluster, as a human-readable string.').optional()
}).meta({ id: 'ClusterStatsRemoteClusterInfo' })
export type ClusterStatsRemoteClusterInfo = z.infer<typeof ClusterStatsRemoteClusterInfo>

export const ClusterStatsCCSUsageTimeValue = z.object({
  max: DurationValue.describe('The maximum time taken to execute a request, in milliseconds.'),
  avg: DurationValue.describe('The average time taken to execute a request, in milliseconds.'),
  p90: DurationValue.describe('The 90th percentile of the time taken to execute requests, in milliseconds.')
}).meta({ id: 'ClusterStatsCCSUsageTimeValue' })
export type ClusterStatsCCSUsageTimeValue = z.infer<typeof ClusterStatsCCSUsageTimeValue>

export const ClusterStatsCCSUsageClusterStats = z.object({
  total: integer.describe('The total number of successful (not skipped) cross-cluster search requests that were executed against this cluster. This may include requests where partial results were returned, but not requests in which the cluster has been skipped entirely.'),
  skipped: integer.describe('The total number of cross-cluster search requests for which this cluster was skipped.'),
  took: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute requests against this cluster.')
}).meta({ id: 'ClusterStatsCCSUsageClusterStats' })
export type ClusterStatsCCSUsageClusterStats = z.infer<typeof ClusterStatsCCSUsageClusterStats>

export const ClusterStatsCCSUsageStats = z.object({
  total: integer.describe('The total number of cross-cluster search requests that have been executed by the cluster.'),
  success: integer.describe('The total number of cross-cluster search requests that have been successfully executed by the cluster.'),
  skipped: integer.describe('The total number of cross-cluster search requests (successful or failed) that had at least one remote cluster skipped.'),
  took: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute cross-cluster search requests.'),
  took_mrt_true: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute cross-cluster search requests for which the `ccs_minimize_roundtrips` setting was set to `true`.').optional(),
  took_mrt_false: ClusterStatsCCSUsageTimeValue.describe('Statistics about the time taken to execute cross-cluster search requests for which the `ccs_minimize_roundtrips` setting was set to `false`.').optional(),
  remotes_per_search_max: integer.describe('The maximum number of remote clusters that were queried in a single cross-cluster search request.'),
  remotes_per_search_avg: double.describe('The average number of remote clusters that were queried in a single cross-cluster search request.'),
  failure_reasons: z.record(z.string(), integer).describe('Statistics about the reasons for cross-cluster search request failures. The keys are the failure reason names and the values are the number of requests that failed for that reason.'),
  features: z.record(z.string(), integer).describe('The keys are the names of the search feature, and the values are the number of requests that used that feature. Single request can use more than one feature (e.g. both `async` and `wildcard`).'),
  clients: z.record(z.string(), integer).describe('Statistics about the clients that executed cross-cluster search requests. The keys are the names of the clients, and the values are the number of requests that were executed by that client. Only known clients (such as `kibana` or `elasticsearch`) are counted.'),
  clusters: z.record(z.string(), ClusterStatsCCSUsageClusterStats).describe('Statistics about the clusters that were queried in cross-cluster search requests. The keys are cluster names, and the values are per-cluster telemetry data. This also includes the local cluster itself, which uses the name `(local)`.')
}).meta({ id: 'ClusterStatsCCSUsageStats' })
export type ClusterStatsCCSUsageStats = z.infer<typeof ClusterStatsCCSUsageStats>

export const ClusterStatsCCSStats = z.object({
  clusters: z.record(z.string(), ClusterStatsRemoteClusterInfo).describe('Contains remote cluster settings and metrics collected from them. The keys are cluster names, and the values are per-cluster data. Only present if `include_remotes` option is set to true.').optional(),
  _search: ClusterStatsCCSUsageStats.describe('Information about cross-cluster search usage.'),
  _esql: ClusterStatsCCSUsageStats.describe('Information about ES|QL cross-cluster query usage.').optional()
}).meta({ id: 'ClusterStatsCCSStats' })
export type ClusterStatsCCSStats = z.infer<typeof ClusterStatsCCSStats>

export const ClusterStatsFieldTypes = z.object({
  name: Name.describe('The name for the field type in selected nodes.'),
  count: integer.describe('The number of occurrences of the field type in selected nodes.'),
  index_count: integer.describe('The number of indices containing the field type in selected nodes.'),
  indexed_vector_count: integer.describe('For dense_vector field types, number of indexed vector types in selected nodes.').optional(),
  indexed_vector_dim_max: integer.describe('For dense_vector field types, the maximum dimension of all indexed vector types in selected nodes.').optional(),
  indexed_vector_dim_min: integer.describe('For dense_vector field types, the minimum dimension of all indexed vector types in selected nodes.').optional(),
  script_count: integer.describe('The number of fields that declare a script.').optional(),
  vector_index_type_count: z.record(Name, integer).describe('For dense_vector field types, count of mappings by index type').optional(),
  vector_similarity_type_count: z.record(Name, integer).describe('For dense_vector field types, count of mappings by similarity').optional(),
  vector_element_type_count: z.record(Name, integer).describe('For dense_vector field types, count of mappings by element type').optional()
}).meta({ id: 'ClusterStatsFieldTypes' })
export type ClusterStatsFieldTypes = z.infer<typeof ClusterStatsFieldTypes>

export const ClusterStatsSynonymsStats = z.object({
  count: integer,
  index_count: integer
}).meta({ id: 'ClusterStatsSynonymsStats' })
export type ClusterStatsSynonymsStats = z.infer<typeof ClusterStatsSynonymsStats>

export const ClusterStatsCharFilterTypes = z.object({
  analyzer_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about analyzer types used in selected nodes.'),
  built_in_analyzers: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in analyzers used in selected nodes.'),
  built_in_char_filters: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in character filters used in selected nodes.'),
  built_in_filters: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in token filters used in selected nodes.'),
  built_in_tokenizers: z.array(ClusterStatsFieldTypes).describe('Contains statistics about built-in tokenizers used in selected nodes.'),
  char_filter_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about character filter types used in selected nodes.'),
  filter_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about token filter types used in selected nodes.'),
  tokenizer_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about tokenizer types used in selected nodes.'),
  synonyms: z.record(Name, ClusterStatsSynonymsStats).describe('Contains statistics about synonyms types used in selected nodes.')
}).meta({ id: 'ClusterStatsCharFilterTypes' })
export type ClusterStatsCharFilterTypes = z.infer<typeof ClusterStatsCharFilterTypes>

export const ClusterStatsClusterFileSystem = z.object({
  path: z.string().optional(),
  mount: z.string().optional(),
  type: z.string().optional(),
  available_in_bytes: long.describe('Total number of bytes available to JVM in file stores across all selected nodes. Depending on operating system or process-level restrictions, this number may be less than `nodes.fs.free_in_byes`. This is the actual amount of free disk space the selected Elasticsearch nodes can use.').optional(),
  available: ByteSize.describe('Total number of bytes available to JVM in file stores across all selected nodes. Depending on operating system or process-level restrictions, this number may be less than `nodes.fs.free_in_byes`. This is the actual amount of free disk space the selected Elasticsearch nodes can use.').optional(),
  free_in_bytes: long.describe('Total number, in bytes, of unallocated bytes in file stores across all selected nodes.').optional(),
  free: ByteSize.describe('Total number of unallocated bytes in file stores across all selected nodes.').optional(),
  total_in_bytes: long.describe('Total size, in bytes, of all file stores across all selected nodes.').optional(),
  total: ByteSize.describe('Total size of all file stores across all selected nodes.').optional(),
  low_watermark_free_space: ByteSize.optional(),
  low_watermark_free_space_in_bytes: long.optional(),
  high_watermark_free_space: ByteSize.optional(),
  high_watermark_free_space_in_bytes: long.optional(),
  flood_stage_free_space: ByteSize.optional(),
  flood_stage_free_space_in_bytes: long.optional(),
  frozen_flood_stage_free_space: ByteSize.optional(),
  frozen_flood_stage_free_space_in_bytes: long.optional()
}).meta({ id: 'ClusterStatsClusterFileSystem' })
export type ClusterStatsClusterFileSystem = z.infer<typeof ClusterStatsClusterFileSystem>

export const ClusterStatsExtendedTextSimilarityRetrieverUsage = z.object({
  chunk_rescorer: long.optional()
}).meta({ id: 'ClusterStatsExtendedTextSimilarityRetrieverUsage' })
export type ClusterStatsExtendedTextSimilarityRetrieverUsage = z.infer<typeof ClusterStatsExtendedTextSimilarityRetrieverUsage>

export const ClusterStatsExtendedRetrieversSearchUsage = z.object({
  text_similarity_reranker: ClusterStatsExtendedTextSimilarityRetrieverUsage.optional()
}).meta({ id: 'ClusterStatsExtendedRetrieversSearchUsage' })
export type ClusterStatsExtendedRetrieversSearchUsage = z.infer<typeof ClusterStatsExtendedRetrieversSearchUsage>

export const ClusterStatsSortType = z.enum(['_doc', '_geo_distance', '_score', '_script', 'field_sort']).meta({ id: 'ClusterStatsSortType' })
export type ClusterStatsSortType = z.infer<typeof ClusterStatsSortType>

export const ClusterStatsExtendedSectionSearchUsage = z.object({
  sort: z.record(ClusterStatsSortType, long).optional()
}).meta({ id: 'ClusterStatsExtendedSectionSearchUsage' })
export type ClusterStatsExtendedSectionSearchUsage = z.infer<typeof ClusterStatsExtendedSectionSearchUsage>

export const ClusterStatsExtendedSearchUsage = z.object({
  retrievers: ClusterStatsExtendedRetrieversSearchUsage.optional(),
  section: ClusterStatsExtendedSectionSearchUsage.optional()
}).meta({ id: 'ClusterStatsExtendedSearchUsage' })
export type ClusterStatsExtendedSearchUsage = z.infer<typeof ClusterStatsExtendedSearchUsage>

export const ClusterStatsSearchUsageStats = z.object({
  total: long,
  queries: z.record(Name, long),
  rescorers: z.record(Name, long),
  sections: z.record(Name, long),
  retrievers: z.record(Name, long),
  extended: ClusterStatsExtendedSearchUsage
}).meta({ id: 'ClusterStatsSearchUsageStats' })
export type ClusterStatsSearchUsageStats = z.infer<typeof ClusterStatsSearchUsageStats>

export const ClusterStatsClusterShardMetrics = z.object({
  avg: double.describe('Mean number of shards in an index, counting only shards assigned to selected nodes.'),
  max: double.describe('Maximum number of shards in an index, counting only shards assigned to selected nodes.'),
  min: double.describe('Minimum number of shards in an index, counting only shards assigned to selected nodes.')
}).meta({ id: 'ClusterStatsClusterShardMetrics' })
export type ClusterStatsClusterShardMetrics = z.infer<typeof ClusterStatsClusterShardMetrics>

export const ClusterStatsClusterIndicesShardsIndex = z.object({
  primaries: ClusterStatsClusterShardMetrics.describe('Contains statistics about the number of primary shards assigned to selected nodes.'),
  replication: ClusterStatsClusterShardMetrics.describe('Contains statistics about the number of replication shards assigned to selected nodes.'),
  shards: ClusterStatsClusterShardMetrics.describe('Contains statistics about the number of shards assigned to selected nodes.')
}).meta({ id: 'ClusterStatsClusterIndicesShardsIndex' })
export type ClusterStatsClusterIndicesShardsIndex = z.infer<typeof ClusterStatsClusterIndicesShardsIndex>

/** Contains statistics about shards assigned to selected nodes. */
export const ClusterStatsClusterIndicesShards = z.object({
  index: ClusterStatsClusterIndicesShardsIndex.describe('Contains statistics about shards assigned to selected nodes.').optional(),
  primaries: double.describe('Number of primary shards assigned to selected nodes.').optional(),
  replication: double.describe('Ratio of replica shards to primary shards across all selected nodes.').optional(),
  total: double.describe('Total number of shards assigned to selected nodes.').optional()
}).meta({ id: 'ClusterStatsClusterIndicesShards' })
export type ClusterStatsClusterIndicesShards = z.infer<typeof ClusterStatsClusterIndicesShards>

export const ClusterStatsRuntimeFieldTypes = z.object({
  chars_max: integer.describe('Maximum number of characters for a single runtime field script.'),
  chars_total: integer.describe('Total number of characters for the scripts that define the current runtime field data type.'),
  count: integer.describe('Number of runtime fields mapped to the field data type in selected nodes.'),
  doc_max: integer.describe('Maximum number of accesses to doc_values for a single runtime field script'),
  doc_total: integer.describe('Total number of accesses to doc_values for the scripts that define the current runtime field data type.'),
  index_count: integer.describe('Number of indices containing a mapping of the runtime field data type in selected nodes.'),
  lang: z.array(z.string()).describe('Script languages used for the runtime fields scripts.'),
  lines_max: integer.describe('Maximum number of lines for a single runtime field script.'),
  lines_total: integer.describe('Total number of lines for the scripts that define the current runtime field data type.'),
  name: Name.describe('Field data type used in selected nodes.'),
  scriptless_count: integer.describe('Number of runtime fields that don’t declare a script.'),
  shadowed_count: integer.describe('Number of runtime fields that shadow an indexed field.'),
  source_max: integer.describe('Maximum number of accesses to _source for a single runtime field script.'),
  source_total: integer.describe('Total number of accesses to _source for the scripts that define the current runtime field data type.')
}).meta({ id: 'ClusterStatsRuntimeFieldTypes' })
export type ClusterStatsRuntimeFieldTypes = z.infer<typeof ClusterStatsRuntimeFieldTypes>

export const ClusterStatsFieldTypesMappings = z.object({
  field_types: z.array(ClusterStatsFieldTypes).describe('Contains statistics about field data types used in selected nodes.'),
  runtime_field_types: z.array(ClusterStatsRuntimeFieldTypes).describe('Contains statistics about runtime field data types used in selected nodes.'),
  total_field_count: long.describe('Total number of fields in all non-system indices.').optional(),
  total_deduplicated_field_count: long.describe('Total number of fields in all non-system indices, accounting for mapping deduplication.').optional(),
  total_deduplicated_mapping_size: ByteSize.describe('Total size of all mappings after deduplication and compression.').optional(),
  total_deduplicated_mapping_size_in_bytes: long.describe('Total size of all mappings, in bytes, after deduplication and compression.').optional(),
  source_modes: z.record(Name, integer).describe('Source mode usage count.')
}).meta({ id: 'ClusterStatsFieldTypesMappings' })
export type ClusterStatsFieldTypesMappings = z.infer<typeof ClusterStatsFieldTypesMappings>

export const ClusterStatsIndicesVersions = z.object({
  index_count: integer,
  primary_shard_count: integer,
  total_primary_bytes: long,
  total_primary_size: ByteSize.optional(),
  version: VersionString
}).meta({ id: 'ClusterStatsIndicesVersions' })
export type ClusterStatsIndicesVersions = z.infer<typeof ClusterStatsIndicesVersions>

export const ClusterStatsDenseVectorOffHeapStats = z.object({
  total_size_bytes: long,
  total_size: ByteSize.optional(),
  total_veb_size_bytes: long,
  total_veb_size: ByteSize.optional(),
  total_vec_size_bytes: long,
  total_vec_size: ByteSize.optional(),
  total_veq_size_bytes: long,
  total_veq_size: ByteSize.optional(),
  total_vex_size_bytes: long,
  total_vex_size: ByteSize.optional(),
  total_cenif_size_bytes: long,
  total_cenif_size: ByteSize.optional(),
  total_clivf_size_bytes: long,
  total_clivf_size: ByteSize.optional(),
  fielddata: z.record(z.string(), z.record(z.string(), long)).optional()
}).meta({ id: 'ClusterStatsDenseVectorOffHeapStats' })
export type ClusterStatsDenseVectorOffHeapStats = z.infer<typeof ClusterStatsDenseVectorOffHeapStats>

export const ClusterStatsDenseVectorStats = z.object({
  value_count: long,
  off_heap: ClusterStatsDenseVectorOffHeapStats.optional()
}).meta({ id: 'ClusterStatsDenseVectorStats' })
export type ClusterStatsDenseVectorStats = z.infer<typeof ClusterStatsDenseVectorStats>

export const ClusterStatsSparseVectorStats = z.object({
  value_count: long
}).meta({ id: 'ClusterStatsSparseVectorStats' })
export type ClusterStatsSparseVectorStats = z.infer<typeof ClusterStatsSparseVectorStats>

export const ClusterStatsClusterIndices = z.object({
  analysis: ClusterStatsCharFilterTypes.describe('Contains statistics about analyzers and analyzer components used in selected nodes.').optional(),
  completion: CompletionStats.describe('Contains statistics about memory used for completion in selected nodes.'),
  count: long.describe('Total number of indices with shards assigned to selected nodes.'),
  docs: DocStats.describe('Contains counts for documents in selected nodes.'),
  fielddata: FielddataStats.describe('Contains statistics about the field data cache of selected nodes.'),
  query_cache: QueryCacheStats.describe('Contains statistics about the query cache of selected nodes.'),
  search: ClusterStatsSearchUsageStats.describe('Holds a snapshot of the search usage statistics. Used to hold the stats for a single node that\'s part of a ClusterStatsNodeResponse, as well as to accumulate stats for the entire cluster and return them as part of the ClusterStatsResponse.'),
  segments: SegmentsStats.describe('Contains statistics about segments in selected nodes.'),
  shards: ClusterStatsClusterIndicesShards.describe('Contains statistics about indices with shards assigned to selected nodes.'),
  store: StoreStats.describe('Contains statistics about the size of shards assigned to selected nodes.'),
  mappings: ClusterStatsFieldTypesMappings.describe('Contains statistics about field mappings in selected nodes.').optional(),
  versions: z.array(ClusterStatsIndicesVersions).describe('Contains statistics about analyzers and analyzer components used in selected nodes.').optional(),
  dense_vector: ClusterStatsDenseVectorStats.describe('Contains statistics about indexed dense vector'),
  sparse_vector: ClusterStatsSparseVectorStats.describe('Contains statistics about indexed sparse vector')
}).meta({ id: 'ClusterStatsClusterIndices' })
export type ClusterStatsClusterIndices = z.infer<typeof ClusterStatsClusterIndices>

export const ClusterStatsClusterProcessor = z.object({
  count: long,
  current: long,
  failed: long,
  time: Duration.optional(),
  time_in_millis: DurationValue
}).meta({ id: 'ClusterStatsClusterProcessor' })
export type ClusterStatsClusterProcessor = z.infer<typeof ClusterStatsClusterProcessor>

export const ClusterStatsClusterIngest = z.object({
  number_of_pipelines: integer,
  processor_stats: z.record(z.string(), ClusterStatsClusterProcessor)
}).meta({ id: 'ClusterStatsClusterIngest' })
export type ClusterStatsClusterIngest = z.infer<typeof ClusterStatsClusterIngest>

export const ClusterStatsClusterJvmMemory = z.object({
  heap_max_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap across all selected nodes.'),
  heap_max: ByteSize.describe('Maximum amount of memory available for use by the heap across all selected nodes.').optional(),
  heap_used_in_bytes: long.describe('Memory, in bytes, currently in use by the heap across all selected nodes.'),
  heap_used: ByteSize.describe('Memory currently in use by the heap across all selected nodes.').optional()
}).meta({ id: 'ClusterStatsClusterJvmMemory' })
export type ClusterStatsClusterJvmMemory = z.infer<typeof ClusterStatsClusterJvmMemory>

export const ClusterStatsClusterJvmVersion = z.object({
  bundled_jdk: z.boolean().describe('Always `true`. All distributions come with a bundled Java Development Kit (JDK).'),
  count: integer.describe('Total number of selected nodes using JVM.'),
  using_bundled_jdk: z.boolean().describe('If `true`, a bundled JDK is in use by JVM.'),
  version: VersionString.describe('Version of JVM used by one or more selected nodes.'),
  vm_name: z.string().describe('Name of the JVM.'),
  vm_vendor: z.string().describe('Vendor of the JVM.'),
  vm_version: VersionString.describe('Full version number of JVM. The full version number includes a plus sign (+) followed by the build number.')
}).meta({ id: 'ClusterStatsClusterJvmVersion' })
export type ClusterStatsClusterJvmVersion = z.infer<typeof ClusterStatsClusterJvmVersion>

export const ClusterStatsClusterJvm = z.object({
  max_uptime_in_millis: DurationValue.describe('Uptime duration, in milliseconds, since JVM last started.'),
  max_uptime: Duration.describe('Uptime duration since JVM last started.').optional(),
  mem: ClusterStatsClusterJvmMemory.describe('Contains statistics about memory used by selected nodes.'),
  threads: long.describe('Number of active threads in use by JVM across all selected nodes.'),
  versions: z.array(ClusterStatsClusterJvmVersion).describe('Contains statistics about the JVM versions used by selected nodes.')
}).meta({ id: 'ClusterStatsClusterJvm' })
export type ClusterStatsClusterJvm = z.infer<typeof ClusterStatsClusterJvm>

export const ClusterStatsClusterNetworkTypes = z.object({
  http_types: z.record(z.string(), integer).describe('Contains statistics about the HTTP network types used by selected nodes.'),
  transport_types: z.record(z.string(), integer).describe('Contains statistics about the transport network types used by selected nodes.')
}).meta({ id: 'ClusterStatsClusterNetworkTypes' })
export type ClusterStatsClusterNetworkTypes = z.infer<typeof ClusterStatsClusterNetworkTypes>

export const ClusterStatsClusterNodeCount = z.object({
  total: integer,
  coordinating_only: integer.optional(),
  data: integer.optional(),
  data_cold: integer.optional(),
  data_content: integer.optional(),
  data_frozen: integer.optional(),
  data_hot: integer.optional(),
  data_warm: integer.optional(),
  index: integer.optional(),
  ingest: integer.optional(),
  master: integer.optional(),
  ml: integer.optional(),
  remote_cluster_client: integer.optional(),
  search: integer.optional(),
  transform: integer.optional(),
  voting_only: integer.optional()
}).meta({ id: 'ClusterStatsClusterNodeCount' })
export type ClusterStatsClusterNodeCount = z.infer<typeof ClusterStatsClusterNodeCount>

export const ClusterStatsIndexingPressure = z.object({
  memory: NodesIndexingPressureMemory
}).meta({ id: 'ClusterStatsIndexingPressure' })
export type ClusterStatsIndexingPressure = z.infer<typeof ClusterStatsIndexingPressure>

export const ClusterStatsClusterOperatingSystemArchitecture = z.object({
  arch: z.string().describe('Name of an architecture used by one or more selected nodes.'),
  count: integer.describe('Number of selected nodes using the architecture.')
}).meta({ id: 'ClusterStatsClusterOperatingSystemArchitecture' })
export type ClusterStatsClusterOperatingSystemArchitecture = z.infer<typeof ClusterStatsClusterOperatingSystemArchitecture>

export const ClusterStatsOperatingSystemMemoryInfo = z.object({
  adjusted_total_in_bytes: long.describe('Total amount, in bytes, of memory across all selected nodes, but using the value specified using the `es.total_memory_bytes` system property instead of measured total memory for those nodes where that system property was set.').optional(),
  adjusted_total: ByteSize.describe('Total amount of memory across all selected nodes, but using the value specified using the `es.total_memory_bytes` system property instead of measured total memory for those nodes where that system property was set.').optional(),
  free_in_bytes: long.describe('Amount, in bytes, of free physical memory across all selected nodes.'),
  free: ByteSize.describe('Amount of free physical memory across all selected nodes.').optional(),
  free_percent: integer.describe('Percentage of free physical memory across all selected nodes.'),
  total_in_bytes: long.describe('Total amount, in bytes, of physical memory across all selected nodes.'),
  total: ByteSize.describe('Total amount of physical memory across all selected nodes.').optional(),
  used_in_bytes: long.describe('Amount, in bytes, of physical memory in use across all selected nodes.'),
  used: ByteSize.describe('Amount of physical memory in use across all selected nodes.').optional(),
  used_percent: integer.describe('Percentage of physical memory in use across all selected nodes.')
}).meta({ id: 'ClusterStatsOperatingSystemMemoryInfo' })
export type ClusterStatsOperatingSystemMemoryInfo = z.infer<typeof ClusterStatsOperatingSystemMemoryInfo>

export const ClusterStatsClusterOperatingSystemName = z.object({
  count: integer.describe('Number of selected nodes using the operating system.'),
  name: Name.describe('Name of an operating system used by one or more selected nodes.')
}).meta({ id: 'ClusterStatsClusterOperatingSystemName' })
export type ClusterStatsClusterOperatingSystemName = z.infer<typeof ClusterStatsClusterOperatingSystemName>

export const ClusterStatsClusterOperatingSystemPrettyName = z.object({
  count: integer.describe('Number of selected nodes using the operating system.'),
  pretty_name: Name.describe('Human-readable name of an operating system used by one or more selected nodes.')
}).meta({ id: 'ClusterStatsClusterOperatingSystemPrettyName' })
export type ClusterStatsClusterOperatingSystemPrettyName = z.infer<typeof ClusterStatsClusterOperatingSystemPrettyName>

export const ClusterStatsClusterOperatingSystem = z.object({
  allocated_processors: integer.describe('Number of processors used to calculate thread pool size across all selected nodes. This number can be set with the processors setting of a node and defaults to the number of processors reported by the operating system. In both cases, this number will never be larger than 32.'),
  architectures: z.array(ClusterStatsClusterOperatingSystemArchitecture).describe('Contains statistics about processor architectures (for example, x86_64 or aarch64) used by selected nodes.').optional(),
  available_processors: integer.describe('Number of processors available to JVM across all selected nodes.'),
  mem: ClusterStatsOperatingSystemMemoryInfo.describe('Contains statistics about memory used by selected nodes.'),
  names: z.array(ClusterStatsClusterOperatingSystemName).describe('Contains statistics about operating systems used by selected nodes.'),
  pretty_names: z.array(ClusterStatsClusterOperatingSystemPrettyName).describe('Contains statistics about operating systems used by selected nodes.')
}).meta({ id: 'ClusterStatsClusterOperatingSystem' })
export type ClusterStatsClusterOperatingSystem = z.infer<typeof ClusterStatsClusterOperatingSystem>

export const ClusterStatsNodePackagingType = z.object({
  count: integer.describe('Number of selected nodes using the distribution flavor and file type.'),
  flavor: z.string().describe('Type of Elasticsearch distribution. This is always `default`.'),
  type: z.string().describe('File type (such as `tar` or `zip`) used for the distribution package.')
}).meta({ id: 'ClusterStatsNodePackagingType' })
export type ClusterStatsNodePackagingType = z.infer<typeof ClusterStatsNodePackagingType>

export const ClusterStatsClusterProcessCpu = z.object({
  percent: integer.describe('Percentage of CPU used across all selected nodes. Returns `-1` if not supported.')
}).meta({ id: 'ClusterStatsClusterProcessCpu' })
export type ClusterStatsClusterProcessCpu = z.infer<typeof ClusterStatsClusterProcessCpu>

export const ClusterStatsClusterProcessOpenFileDescriptors = z.object({
  avg: long.describe('Average number of concurrently open file descriptors. Returns `-1` if not supported.'),
  max: long.describe('Maximum number of concurrently open file descriptors allowed across all selected nodes. Returns `-1` if not supported.'),
  min: long.describe('Minimum number of concurrently open file descriptors across all selected nodes. Returns -1 if not supported.')
}).meta({ id: 'ClusterStatsClusterProcessOpenFileDescriptors' })
export type ClusterStatsClusterProcessOpenFileDescriptors = z.infer<typeof ClusterStatsClusterProcessOpenFileDescriptors>

export const ClusterStatsClusterProcess = z.object({
  cpu: ClusterStatsClusterProcessCpu.describe('Contains statistics about CPU used by selected nodes.'),
  open_file_descriptors: ClusterStatsClusterProcessOpenFileDescriptors.describe('Contains statistics about open file descriptors in selected nodes.')
}).meta({ id: 'ClusterStatsClusterProcess' })
export type ClusterStatsClusterProcess = z.infer<typeof ClusterStatsClusterProcess>

export const ClusterStatsClusterNodes = z.object({
  count: ClusterStatsClusterNodeCount.describe('Contains counts for nodes selected by the request’s node filters.'),
  discovery_types: z.record(z.string(), integer).describe('Contains statistics about the discovery types used by selected nodes.'),
  fs: ClusterStatsClusterFileSystem.describe('Contains statistics about file stores by selected nodes.'),
  indexing_pressure: ClusterStatsIndexingPressure,
  ingest: ClusterStatsClusterIngest,
  jvm: ClusterStatsClusterJvm.describe('Contains statistics about the Java Virtual Machines (JVMs) used by selected nodes.'),
  network_types: ClusterStatsClusterNetworkTypes.describe('Contains statistics about the transport and HTTP networks used by selected nodes.'),
  os: ClusterStatsClusterOperatingSystem.describe('Contains statistics about the operating systems used by selected nodes.'),
  packaging_types: z.array(ClusterStatsNodePackagingType).describe('Contains statistics about Elasticsearch distributions installed on selected nodes.'),
  plugins: z.array(PluginStats).describe('Contains statistics about installed plugins and modules by selected nodes. If no plugins or modules are installed, this array is empty.'),
  process: ClusterStatsClusterProcess.describe('Contains statistics about processes used by selected nodes.'),
  versions: z.array(VersionString).describe('Array of Elasticsearch versions used on selected nodes.')
}).meta({ id: 'ClusterStatsClusterNodes' })
export type ClusterStatsClusterNodes = z.infer<typeof ClusterStatsClusterNodes>

export const ClusterStatsSnapshotCurrentCounts = z.object({
  snapshots: integer.describe('Snapshots currently in progress'),
  shard_snapshots: integer.describe('Incomplete shard snapshots'),
  snapshot_deletions: integer.describe('Snapshots deletions in progress'),
  concurrent_operations: integer.describe('Sum of snapshots and snapshot_deletions'),
  cleanups: integer.describe('Cleanups in progress, not counted in concurrent_operations as they are not concurrent')
}).meta({ id: 'ClusterStatsSnapshotCurrentCounts' })
export type ClusterStatsSnapshotCurrentCounts = z.infer<typeof ClusterStatsSnapshotCurrentCounts>

export const ClusterStatsShardState = z.enum(['INIT', 'SUCCESS', 'FAILED', 'ABORTED', 'MISSING', 'WAITING', 'QUEUED', 'PAUSED_FOR_NODE_REMOVAL']).meta({ id: 'ClusterStatsShardState' })
export type ClusterStatsShardState = z.infer<typeof ClusterStatsShardState>

export const ClusterStatsRepositoryStatsShards = z.object({
  total: integer,
  complete: integer,
  incomplete: integer,
  states: z.record(ClusterStatsShardState, integer)
}).meta({ id: 'ClusterStatsRepositoryStatsShards' })
export type ClusterStatsRepositoryStatsShards = z.infer<typeof ClusterStatsRepositoryStatsShards>

export const ClusterStatsRepositoryStatsCurrentCounts = z.object({
  snapshots: integer,
  clones: integer,
  finalizations: integer,
  deletions: integer,
  snapshot_deletions: integer,
  active_deletions: integer,
  shards: ClusterStatsRepositoryStatsShards
}).meta({ id: 'ClusterStatsRepositoryStatsCurrentCounts' })
export type ClusterStatsRepositoryStatsCurrentCounts = z.infer<typeof ClusterStatsRepositoryStatsCurrentCounts>

export const ClusterStatsPerRepositoryStats = z.object({
  type: z.string(),
  oldest_start_time_millis: UnitMillis,
  oldest_start_time: DateFormat.optional(),
  current_counts: ClusterStatsRepositoryStatsCurrentCounts
}).meta({ id: 'ClusterStatsPerRepositoryStats' })
export type ClusterStatsPerRepositoryStats = z.infer<typeof ClusterStatsPerRepositoryStats>

export const ClusterStatsClusterSnapshotStats = z.object({
  current_counts: ClusterStatsSnapshotCurrentCounts,
  repositories: z.record(Name, ClusterStatsPerRepositoryStats)
}).meta({ id: 'ClusterStatsClusterSnapshotStats' })
export type ClusterStatsClusterSnapshotStats = z.infer<typeof ClusterStatsClusterSnapshotStats>

/**
 * Get cluster statistics.
 *
 * Get basic index metrics (shard numbers, store size, memory usage) and information about the current nodes that form the cluster (number, roles, os, jvm versions, memory usage, cpu and installed plugins).
 */
export const ClusterStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node filters used to limit returned information. Defaults to all nodes in the cluster.').optional().meta({ found_in: 'path' }),
  include_remotes: z.boolean().describe('Include remote cluster data into the response').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for each node to respond. If a node does not respond before its timeout expires, the response does not include its stats. However, timed out nodes are included in the response’s `_nodes.failed` property. Defaults to no timeout.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ClusterStatsRequest' })
export type ClusterStatsRequest = z.infer<typeof ClusterStatsRequest>

export const ClusterStatsStatsResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.describe('Name of the cluster, based on the cluster name setting.'),
  cluster_uuid: Uuid.describe('Unique identifier for the cluster.'),
  indices: ClusterStatsClusterIndices.describe('Contains statistics about indices with shards assigned to selected nodes.'),
  nodes: ClusterStatsClusterNodes.describe('Contains statistics about nodes selected by the request’s node filters.'),
  repositories: z.record(Name, z.record(Name, long)).describe('Contains stats on repository feature usage exposed in cluster stats for telemetry.'),
  snapshots: ClusterStatsClusterSnapshotStats.describe('Contains stats cluster snapshots.'),
  status: HealthStatus.describe('Health status of the cluster, based on the state of its primary and replica shards.').optional(),
  timestamp: long.describe('Unix timestamp, in milliseconds, for the last time the cluster statistics were refreshed.'),
  ccs: ClusterStatsCCSStats.describe('Cross-cluster stats')
}).meta({ id: 'ClusterStatsStatsResponseBase' })
export type ClusterStatsStatsResponseBase = z.infer<typeof ClusterStatsStatsResponseBase>

export const ClusterStatsResponse = ClusterStatsStatsResponseBase.meta({ id: 'ClusterStatsResponse' })
export type ClusterStatsResponse = z.infer<typeof ClusterStatsResponse>
