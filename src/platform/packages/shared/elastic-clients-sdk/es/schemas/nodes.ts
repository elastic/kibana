/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ByteSize, CommonStatsFlags, DateTime, Duration, DurationValue, EpochTime, ErrorCause, Field, Fields, Host, Id, Ip, Name, NodeIds, NodeRoles, NodeStatistics, NodeStatsLevel, Password, PluginStats, RequestBase, ThreadType, TransportAddress, VersionNumber, VersionString, double, float, integer, long } from './_types'
import { IndicesIndexRouting, IndicesStatsShardStats } from './indices'

export const NodesClient = z.object({
  id: long.describe('Unique ID for the HTTP client.').optional(),
  agent: z.string().describe('Reported agent for the HTTP client. If unavailable, this property is not included in the response.').optional(),
  local_address: z.string().describe('Local address for the HTTP connection.').optional(),
  remote_address: z.string().describe('Remote address for the HTTP connection.').optional(),
  last_uri: z.string().describe('The URI of the client’s most recent request.').optional(),
  opened_time_millis: long.describe('Time at which the client opened the connection.').optional(),
  closed_time_millis: long.describe('Time at which the client closed the connection if the connection is closed.').optional(),
  last_request_time_millis: long.describe('Time of the most recent request from this client.').optional(),
  request_count: long.describe('Number of requests from this client.').optional(),
  request_size_bytes: long.describe('Cumulative size in bytes of all requests from this client.').optional(),
  x_opaque_id: z.string().describe('Value from the client’s `x-opaque-id` HTTP header. If unavailable, this property is not included in the response.').optional()
}).meta({ id: 'NodesClient' })
export type NodesClient = z.infer<typeof NodesClient>

export const NodesSizeHttpHistogram = z.object({
  count: long,
  ge_bytes: long.optional(),
  lt_bytes: long.optional()
}).meta({ id: 'NodesSizeHttpHistogram' })
export type NodesSizeHttpHistogram = z.infer<typeof NodesSizeHttpHistogram>

export const NodesHttpRouteRequests = z.object({
  count: long,
  total_size_in_bytes: long,
  size_histogram: z.array(NodesSizeHttpHistogram)
}).meta({ id: 'NodesHttpRouteRequests' })
export type NodesHttpRouteRequests = z.infer<typeof NodesHttpRouteRequests>

export const NodesTimeHttpHistogram = z.object({
  count: long,
  ge_millis: long.optional(),
  lt_millis: long.optional()
}).meta({ id: 'NodesTimeHttpHistogram' })
export type NodesTimeHttpHistogram = z.infer<typeof NodesTimeHttpHistogram>

export const NodesHttpRouteResponses = z.object({
  count: long,
  total_size_in_bytes: long,
  handling_time_histogram: z.array(NodesTimeHttpHistogram),
  size_histogram: z.array(NodesSizeHttpHistogram)
}).meta({ id: 'NodesHttpRouteResponses' })
export type NodesHttpRouteResponses = z.infer<typeof NodesHttpRouteResponses>

export const NodesHttpRoute = z.object({
  requests: NodesHttpRouteRequests,
  responses: NodesHttpRouteResponses
}).meta({ id: 'NodesHttpRoute' })
export type NodesHttpRoute = z.infer<typeof NodesHttpRoute>

export const NodesHttp = z.object({
  current_open: integer.describe('Current number of open HTTP connections for the node.').optional(),
  total_opened: long.describe('Total number of HTTP connections opened for the node.').optional(),
  clients: z.array(NodesClient).describe('Information on current and recently-closed HTTP client connections. Clients that have been closed longer than the `http.client_stats.closed_channels.max_age` setting will not be represented here.').optional()
}).meta({ id: 'NodesHttp' })
export type NodesHttp = z.infer<typeof NodesHttp>

export const NodesProcessor = z.object({
  count: long.describe('Number of documents transformed by the processor.').optional(),
  current: long.describe('Number of documents currently being transformed by the processor.').optional(),
  failed: long.describe('Number of failed operations for the processor.').optional(),
  time_in_millis: DurationValue.describe('Time, in milliseconds, spent by the processor transforming documents.').optional()
}).meta({ id: 'NodesProcessor' })
export type NodesProcessor = z.infer<typeof NodesProcessor>

export const NodesKeyedProcessor = z.object({
  stats: NodesProcessor.optional(),
  type: z.string().optional()
}).meta({ id: 'NodesKeyedProcessor' })
export type NodesKeyedProcessor = z.infer<typeof NodesKeyedProcessor>

export const NodesIngestStats = z.object({
  count: long.describe('Total number of documents ingested during the lifetime of this node.'),
  current: long.describe('Total number of documents currently being ingested.'),
  failed: long.describe('Total number of failed ingest operations during the lifetime of this node.'),
  processors: z.array(z.record(z.string(), NodesKeyedProcessor)).describe('Total number of ingest processors.'),
  time_in_millis: DurationValue.describe('Total time, in milliseconds, spent preprocessing ingest documents during the lifetime of this node.'),
  ingested_as_first_pipeline_in_bytes: long.describe('Total number of bytes of all documents ingested by the pipeline. This field is only present on pipelines which are the first to process a document. Thus, it is not present on pipelines which only serve as a final pipeline after a default pipeline, a pipeline run after a reroute processor, or pipelines in pipeline processors.'),
  produced_as_first_pipeline_in_bytes: long.describe('Total number of bytes of all documents produced by the pipeline. This field is only present on pipelines which are the first to process a document. Thus, it is not present on pipelines which only serve as a final pipeline after a default pipeline, a pipeline run after a reroute processor, or pipelines in pipeline processors. In situations where there are subsequent pipelines, the value represents the size of the document after all pipelines have run.')
}).meta({ id: 'NodesIngestStats' })
export type NodesIngestStats = z.infer<typeof NodesIngestStats>

export const NodesIngestTotal = z.object({
  count: long.describe('Total number of documents ingested during the lifetime of this node.'),
  current: long.describe('Total number of documents currently being ingested.'),
  failed: long.describe('Total number of failed ingest operations during the lifetime of this node.'),
  time_in_millis: DurationValue.describe('Total time, in milliseconds, spent preprocessing ingest documents during the lifetime of this node.')
}).meta({ id: 'NodesIngestTotal' })
export type NodesIngestTotal = z.infer<typeof NodesIngestTotal>

export const NodesIngest = z.object({
  pipelines: z.record(z.string(), NodesIngestStats).describe('Contains statistics about ingest pipelines for the node.').optional(),
  total: NodesIngestTotal.describe('Contains statistics about ingest operations for the node.').optional()
}).meta({ id: 'NodesIngest' })
export type NodesIngest = z.infer<typeof NodesIngest>

export const NodesThreadCount = z.object({
  active: long.describe('Number of active threads in the thread pool.').optional(),
  completed: long.describe('Number of tasks completed by the thread pool executor.').optional(),
  largest: long.describe('Highest number of active threads in the thread pool.').optional(),
  queue: long.describe('Number of tasks in queue for the thread pool.').optional(),
  rejected: long.describe('Number of tasks rejected by the thread pool executor.').optional(),
  threads: long.describe('Number of threads in the thread pool.').optional()
}).meta({ id: 'NodesThreadCount' })
export type NodesThreadCount = z.infer<typeof NodesThreadCount>

export const NodesContext = z.object({
  context: z.string().optional(),
  compilations: long.optional(),
  cache_evictions: long.optional(),
  compilation_limit_triggered: long.optional()
}).meta({ id: 'NodesContext' })
export type NodesContext = z.infer<typeof NodesContext>

export const NodesScripting = z.object({
  cache_evictions: long.describe('Total number of times the script cache has evicted old data.').optional(),
  compilations: long.describe('Total number of inline script compilations performed by the node.').optional(),
  compilations_history: z.record(z.string(), long).describe('Contains this recent history of script compilations.').optional(),
  compilation_limit_triggered: long.describe('Total number of times the script compilation circuit breaker has limited inline script compilations.').optional(),
  contexts: z.array(NodesContext).optional()
}).meta({ id: 'NodesScripting' })
export type NodesScripting = z.infer<typeof NodesScripting>

export const NodesPressureMemory = z.object({
  all: ByteSize.describe('Memory consumed by indexing requests in the coordinating, primary, or replica stage.').optional(),
  all_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the coordinating, primary, or replica stage.').optional(),
  combined_coordinating_and_primary: ByteSize.describe('Memory consumed by indexing requests in the coordinating or primary stage. This value is not the sum of coordinating and primary as a node can reuse the coordinating memory if the primary stage is executed locally.').optional(),
  combined_coordinating_and_primary_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the coordinating or primary stage. This value is not the sum of coordinating and primary as a node can reuse the coordinating memory if the primary stage is executed locally.').optional(),
  coordinating: ByteSize.describe('Memory consumed by indexing requests in the coordinating stage.').optional(),
  coordinating_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the coordinating stage.').optional(),
  primary: ByteSize.describe('Memory consumed by indexing requests in the primary stage.').optional(),
  primary_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the primary stage.').optional(),
  replica: ByteSize.describe('Memory consumed by indexing requests in the replica stage.').optional(),
  replica_in_bytes: long.describe('Memory consumed, in bytes, by indexing requests in the replica stage.').optional(),
  coordinating_rejections: long.describe('Number of indexing requests rejected in the coordinating stage.').optional(),
  primary_rejections: long.describe('Number of indexing requests rejected in the primary stage.').optional(),
  replica_rejections: long.describe('Number of indexing requests rejected in the replica stage.').optional(),
  primary_document_rejections: long.optional(),
  large_operation_rejections: long.optional()
}).meta({ id: 'NodesPressureMemory' })
export type NodesPressureMemory = z.infer<typeof NodesPressureMemory>

export const NodesIndexingPressureMemory = z.object({
  limit: ByteSize.describe('Configured memory limit for the indexing requests. Replica requests have an automatic limit that is 1.5x this value.').optional(),
  limit_in_bytes: long.describe('Configured memory limit, in bytes, for the indexing requests. Replica requests have an automatic limit that is 1.5x this value.').optional(),
  current: NodesPressureMemory.describe('Contains statistics for current indexing load.').optional(),
  total: NodesPressureMemory.describe('Contains statistics for the cumulative indexing load since the node started.').optional()
}).meta({ id: 'NodesIndexingPressureMemory' })
export type NodesIndexingPressureMemory = z.infer<typeof NodesIndexingPressureMemory>

export const NodesNodesResponseBase = z.object({
  node_stats: NodeStatistics.describe('Contains statistics about the number of nodes selected by the request’s node filters.').optional()
}).meta({ id: 'NodesNodesResponseBase' })
export type NodesNodesResponseBase = z.infer<typeof NodesNodesResponseBase>

export const NodesAdaptiveSelection = z.object({
  avg_queue_size: long.describe('The exponentially weighted moving average queue size of search requests on the keyed node.').optional(),
  avg_response_time: Duration.describe('The exponentially weighted moving average response time of search requests on the keyed node.').optional(),
  avg_response_time_ns: long.describe('The exponentially weighted moving average response time, in nanoseconds, of search requests on the keyed node.').optional(),
  avg_service_time: Duration.describe('The exponentially weighted moving average service time of search requests on the keyed node.').optional(),
  avg_service_time_ns: long.describe('The exponentially weighted moving average service time, in nanoseconds, of search requests on the keyed node.').optional(),
  outgoing_searches: long.describe('The number of outstanding search requests to the keyed node from the node these stats are for.').optional(),
  rank: z.string().describe('The rank of this node; used for shard selection when routing search requests.').optional()
}).meta({ id: 'NodesAdaptiveSelection' })
export type NodesAdaptiveSelection = z.infer<typeof NodesAdaptiveSelection>

export const NodesBreaker = z.object({
  estimated_size: z.string().describe('Estimated memory used for the operation.').optional(),
  estimated_size_in_bytes: long.describe('Estimated memory used, in bytes, for the operation.').optional(),
  limit_size: z.string().describe('Memory limit for the circuit breaker.').optional(),
  limit_size_in_bytes: long.describe('Memory limit, in bytes, for the circuit breaker.').optional(),
  overhead: float.describe('A constant that all estimates for the circuit breaker are multiplied with to calculate a final estimate.').optional(),
  tripped: float.describe('Total number of times the circuit breaker has been triggered and prevented an out of memory error.').optional()
}).meta({ id: 'NodesBreaker' })
export type NodesBreaker = z.infer<typeof NodesBreaker>

export const NodesCpuAcct = z.object({
  control_group: z.string().describe('The `cpuacct` control group to which the Elasticsearch process belongs.').optional(),
  usage_nanos: DurationValue.describe('The total CPU time, in nanoseconds, consumed by all tasks in the same cgroup as the Elasticsearch process.').optional()
}).meta({ id: 'NodesCpuAcct' })
export type NodesCpuAcct = z.infer<typeof NodesCpuAcct>

export const NodesCgroupCpuStat = z.object({
  number_of_elapsed_periods: long.describe('The number of reporting periods (as specified by `cfs_period_micros`) that have elapsed.').optional(),
  number_of_times_throttled: long.describe('The number of times all tasks in the same cgroup as the Elasticsearch process have been throttled.').optional(),
  time_throttled_nanos: DurationValue.describe('The total amount of time, in nanoseconds, for which all tasks in the same cgroup as the Elasticsearch process have been throttled.').optional()
}).meta({ id: 'NodesCgroupCpuStat' })
export type NodesCgroupCpuStat = z.infer<typeof NodesCgroupCpuStat>

export const NodesCgroupCpu = z.object({
  control_group: z.string().describe('The `cpu` control group to which the Elasticsearch process belongs.').optional(),
  cfs_period_micros: integer.describe('The period of time, in microseconds, for how regularly all tasks in the same cgroup as the Elasticsearch process should have their access to CPU resources reallocated.').optional(),
  cfs_quota_micros: integer.describe('The total amount of time, in microseconds, for which all tasks in the same cgroup as the Elasticsearch process can run during one period `cfs_period_micros`.').optional(),
  stat: NodesCgroupCpuStat.describe('Contains CPU statistics for the node.').optional()
}).meta({ id: 'NodesCgroupCpu' })
export type NodesCgroupCpu = z.infer<typeof NodesCgroupCpu>

export const NodesCgroupMemory = z.object({
  control_group: z.string().describe('The `memory` control group to which the Elasticsearch process belongs.').optional(),
  limit_in_bytes: z.string().describe('The maximum amount of user memory (including file cache) allowed for all tasks in the same cgroup as the Elasticsearch process. This value can be too big to store in a `long`, so is returned as a string so that the value returned can exactly match what the underlying operating system interface returns. Any value that is too large to parse into a `long` almost certainly means no limit has been set for the cgroup.').optional(),
  usage_in_bytes: z.string().describe('The total current memory usage by processes in the cgroup, in bytes, by all tasks in the same cgroup as the Elasticsearch process. This value is stored as a string for consistency with `limit_in_bytes`.').optional()
}).meta({ id: 'NodesCgroupMemory' })
export type NodesCgroupMemory = z.infer<typeof NodesCgroupMemory>

export const NodesCgroup = z.object({
  cpuacct: NodesCpuAcct.describe('Contains statistics about `cpuacct` control group for the node.').optional(),
  cpu: NodesCgroupCpu.describe('Contains statistics about `cpu` control group for the node.').optional(),
  memory: NodesCgroupMemory.describe('Contains statistics about the memory control group for the node.').optional()
}).meta({ id: 'NodesCgroup' })
export type NodesCgroup = z.infer<typeof NodesCgroup>

export const NodesRecording = z.object({
  name: z.string().optional(),
  cumulative_execution_count: long.optional(),
  cumulative_execution_time: Duration.optional(),
  cumulative_execution_time_millis: DurationValue.optional()
}).meta({ id: 'NodesRecording' })
export type NodesRecording = z.infer<typeof NodesRecording>

export const NodesClusterAppliedStats = z.object({
  recordings: z.array(NodesRecording).optional()
}).meta({ id: 'NodesClusterAppliedStats' })
export type NodesClusterAppliedStats = z.infer<typeof NodesClusterAppliedStats>

export const NodesClusterStateQueue = z.object({
  total: long.describe('Total number of cluster states in queue.').optional(),
  pending: long.describe('Number of pending cluster states in queue.').optional(),
  committed: long.describe('Number of committed cluster states in queue.').optional()
}).meta({ id: 'NodesClusterStateQueue' })
export type NodesClusterStateQueue = z.infer<typeof NodesClusterStateQueue>

export const NodesClusterStateUpdate = z.object({
  count: long.describe('The number of cluster state update attempts that did not change the cluster state since the node started.'),
  computation_time: Duration.describe('The cumulative amount of time spent computing no-op cluster state updates since the node started.').optional(),
  computation_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent computing no-op cluster state updates since the node started.').optional(),
  publication_time: Duration.describe('The cumulative amount of time spent publishing cluster state updates which ultimately succeeded, which includes everything from the start of the publication (just after the computation of the new cluster state) until the publication has finished and the master node is ready to start processing the next state update. This includes the time measured by `context_construction_time`, `commit_time`, `completion_time` and `master_apply_time`.').optional(),
  publication_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent publishing cluster state updates which ultimately succeeded, which includes everything from the start of the publication (just after the computation of the new cluster state) until the publication has finished and the master node is ready to start processing the next state update. This includes the time measured by `context_construction_time`, `commit_time`, `completion_time` and `master_apply_time`.').optional(),
  context_construction_time: Duration.describe('The cumulative amount of time spent constructing a publication context since the node started for publications that ultimately succeeded. This statistic includes the time spent computing the difference between the current and new cluster state preparing a serialized representation of this difference.').optional(),
  context_construction_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent constructing a publication context since the node started for publications that ultimately succeeded. This statistic includes the time spent computing the difference between the current and new cluster state preparing a serialized representation of this difference.').optional(),
  commit_time: Duration.describe('The cumulative amount of time spent waiting for a successful cluster state update to commit, which measures the time from the start of each publication until a majority of the master-eligible nodes have written the state to disk and confirmed the write to the elected master.').optional(),
  commit_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent waiting for a successful cluster state update to commit, which measures the time from the start of each publication until a majority of the master-eligible nodes have written the state to disk and confirmed the write to the elected master.').optional(),
  completion_time: Duration.describe('The cumulative amount of time spent waiting for a successful cluster state update to complete, which measures the time from the start of each publication until all the other nodes have notified the elected master that they have applied the cluster state.').optional(),
  completion_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds,  spent waiting for a successful cluster state update to complete, which measures the time from the start of each publication until all the other nodes have notified the elected master that they have applied the cluster state.').optional(),
  master_apply_time: Duration.describe('The cumulative amount of time spent successfully applying cluster state updates on the elected master since the node started.').optional(),
  master_apply_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent successfully applying cluster state updates on the elected master since the node started.').optional(),
  notification_time: Duration.describe('The cumulative amount of time spent notifying listeners of a no-op cluster state update since the node started.').optional(),
  notification_time_millis: DurationValue.describe('The cumulative amount of time, in milliseconds, spent notifying listeners of a no-op cluster state update since the node started.').optional()
}).meta({ id: 'NodesClusterStateUpdate' })
export type NodesClusterStateUpdate = z.infer<typeof NodesClusterStateUpdate>

export const NodesCpu = z.object({
  percent: integer.optional(),
  sys: Duration.optional(),
  sys_in_millis: DurationValue.optional(),
  total: Duration.optional(),
  total_in_millis: DurationValue.optional(),
  user: Duration.optional(),
  user_in_millis: DurationValue.optional(),
  load_average: z.record(z.string(), double).optional()
}).meta({ id: 'NodesCpu' })
export type NodesCpu = z.infer<typeof NodesCpu>

export const NodesDataPathStats = z.object({
  available: z.string().describe('Total amount of disk space available to this Java virtual machine on this file store.').optional(),
  available_in_bytes: long.describe('Total number of bytes available to this Java virtual machine on this file store.').optional(),
  disk_queue: z.string().optional(),
  disk_reads: long.optional(),
  disk_read_size: z.string().optional(),
  disk_read_size_in_bytes: long.optional(),
  disk_writes: long.optional(),
  disk_write_size: z.string().optional(),
  disk_write_size_in_bytes: long.optional(),
  free: z.string().describe('Total amount of unallocated disk space in the file store.').optional(),
  free_in_bytes: long.describe('Total number of unallocated bytes in the file store.').optional(),
  mount: z.string().describe('Mount point of the file store (for example: `/dev/sda2`).').optional(),
  path: z.string().describe('Path to the file store.').optional(),
  total: z.string().describe('Total size of the file store.').optional(),
  total_in_bytes: long.describe('Total size of the file store in bytes.').optional(),
  type: z.string().describe('Type of the file store (ex: ext4).').optional()
}).meta({ id: 'NodesDataPathStats' })
export type NodesDataPathStats = z.infer<typeof NodesDataPathStats>

export const NodesPublishedClusterStates = z.object({
  full_states: long.describe('Number of published cluster states.').optional(),
  incompatible_diffs: long.describe('Number of incompatible differences between published cluster states.').optional(),
  compatible_diffs: long.describe('Number of compatible differences between published cluster states.').optional()
}).meta({ id: 'NodesPublishedClusterStates' })
export type NodesPublishedClusterStates = z.infer<typeof NodesPublishedClusterStates>

export const NodesSerializedClusterStateDetail = z.object({
  count: long.optional(),
  uncompressed_size: z.string().optional(),
  uncompressed_size_in_bytes: long.optional(),
  compressed_size: z.string().optional(),
  compressed_size_in_bytes: long.optional()
}).meta({ id: 'NodesSerializedClusterStateDetail' })
export type NodesSerializedClusterStateDetail = z.infer<typeof NodesSerializedClusterStateDetail>

export const NodesSerializedClusterState = z.object({
  full_states: NodesSerializedClusterStateDetail.describe('Number of published cluster states.').optional(),
  diffs: NodesSerializedClusterStateDetail.optional()
}).meta({ id: 'NodesSerializedClusterState' })
export type NodesSerializedClusterState = z.infer<typeof NodesSerializedClusterState>

export const NodesDiscovery = z.object({
  cluster_state_queue: NodesClusterStateQueue.describe('Contains statistics for the cluster state queue of the node.').optional(),
  published_cluster_states: NodesPublishedClusterStates.describe('Contains statistics for the published cluster states of the node.').optional(),
  cluster_state_update: z.record(z.string(), NodesClusterStateUpdate).describe('Contains low-level statistics about how long various activities took during cluster state updates while the node was the elected master. Omitted if the node is not master-eligible. Every field whose name ends in `_time` within this object is also represented as a raw number of milliseconds in a field whose name ends in `_time_millis`. The human-readable fields with a `_time` suffix are only returned if requested with the `?human=true` query parameter.').optional(),
  serialized_cluster_states: NodesSerializedClusterState.optional(),
  cluster_applier_stats: NodesClusterAppliedStats.optional()
}).meta({ id: 'NodesDiscovery' })
export type NodesDiscovery = z.infer<typeof NodesDiscovery>

export const NodesMemoryStats = z.object({
  adjusted_total_in_bytes: long.describe('If the amount of physical memory has been overridden using the `es`.`total_memory_bytes` system property then this reports the overridden value in bytes. Otherwise it reports the same value as `total_in_bytes`.').optional(),
  resident: z.string().optional(),
  resident_in_bytes: long.optional(),
  share: z.string().optional(),
  share_in_bytes: long.optional(),
  total_virtual: z.string().optional(),
  total_virtual_in_bytes: long.optional(),
  total_in_bytes: long.describe('Total amount of physical memory in bytes.').optional(),
  free_in_bytes: long.describe('Amount of free physical memory in bytes.').optional(),
  used_in_bytes: long.describe('Amount of used physical memory in bytes.').optional()
}).meta({ id: 'NodesMemoryStats' })
export type NodesMemoryStats = z.infer<typeof NodesMemoryStats>

export const NodesExtendedMemoryStats = z.object({
  ...NodesMemoryStats.shape,
  free_percent: integer.describe('Percentage of free memory.').optional(),
  used_percent: integer.describe('Percentage of used memory.').optional()
}).meta({ id: 'NodesExtendedMemoryStats' })
export type NodesExtendedMemoryStats = z.infer<typeof NodesExtendedMemoryStats>

export const NodesFileSystemTotal = z.object({
  available: z.string().describe('Total disk space available to this Java virtual machine on all file stores. Depending on OS or process level restrictions, this might appear less than `free`. This is the actual amount of free disk space the Elasticsearch node can utilise.').optional(),
  available_in_bytes: long.describe('Total number of bytes available to this Java virtual machine on all file stores. Depending on OS or process level restrictions, this might appear less than `free_in_bytes`. This is the actual amount of free disk space the Elasticsearch node can utilise.').optional(),
  free: z.string().describe('Total unallocated disk space in all file stores.').optional(),
  free_in_bytes: long.describe('Total number of unallocated bytes in all file stores.').optional(),
  total: z.string().describe('Total size of all file stores.').optional(),
  total_in_bytes: long.describe('Total size of all file stores in bytes.').optional()
}).meta({ id: 'NodesFileSystemTotal' })
export type NodesFileSystemTotal = z.infer<typeof NodesFileSystemTotal>

export const NodesIoStatDevice = z.object({
  device_name: z.string().describe('The Linux device name.').optional(),
  operations: long.describe('The total number of read and write operations for the device completed since starting Elasticsearch.').optional(),
  read_kilobytes: long.describe('The total number of kilobytes read for the device since starting Elasticsearch.').optional(),
  read_operations: long.describe('The total number of read operations for the device completed since starting Elasticsearch.').optional(),
  write_kilobytes: long.describe('The total number of kilobytes written for the device since starting Elasticsearch.').optional(),
  write_operations: long.describe('The total number of write operations for the device completed since starting Elasticsearch.').optional()
}).meta({ id: 'NodesIoStatDevice' })
export type NodesIoStatDevice = z.infer<typeof NodesIoStatDevice>

export const NodesIoStats = z.object({
  devices: z.array(NodesIoStatDevice).describe('Array of disk metrics for each device that is backing an Elasticsearch data path. These disk metrics are probed periodically and averages between the last probe and the current probe are computed.').optional(),
  total: NodesIoStatDevice.describe('The sum of the disk metrics for all devices that back an Elasticsearch data path.').optional()
}).meta({ id: 'NodesIoStats' })
export type NodesIoStats = z.infer<typeof NodesIoStats>

export const NodesFileSystem = z.object({
  data: z.array(NodesDataPathStats).describe('List of all file stores.').optional(),
  timestamp: long.describe('Last time the file stores statistics were refreshed. Recorded in milliseconds since the Unix Epoch.').optional(),
  total: NodesFileSystemTotal.describe('Contains statistics for all file stores of the node.').optional(),
  io_stats: NodesIoStats.describe('Contains I/O statistics for the node.').optional()
}).meta({ id: 'NodesFileSystem' })
export type NodesFileSystem = z.infer<typeof NodesFileSystem>

export const NodesGarbageCollectorTotal = z.object({
  collection_count: long.describe('Total number of JVM garbage collectors that collect objects.').optional(),
  collection_time: z.string().describe('Total time spent by JVM collecting objects.').optional(),
  collection_time_in_millis: long.describe('Total time, in milliseconds, spent by JVM collecting objects.').optional()
}).meta({ id: 'NodesGarbageCollectorTotal' })
export type NodesGarbageCollectorTotal = z.infer<typeof NodesGarbageCollectorTotal>

export const NodesGarbageCollector = z.object({
  collectors: z.record(z.string(), NodesGarbageCollectorTotal).describe('Contains statistics about JVM garbage collectors for the node.').optional()
}).meta({ id: 'NodesGarbageCollector' })
export type NodesGarbageCollector = z.infer<typeof NodesGarbageCollector>

export const NodesIndexingPressure = z.object({
  memory: NodesIndexingPressureMemory.describe('Contains statistics for memory consumption from indexing load.').optional()
}).meta({ id: 'NodesIndexingPressure' })
export type NodesIndexingPressure = z.infer<typeof NodesIndexingPressure>

export const NodesNodeBufferPool = z.object({
  count: long.describe('Number of buffer pools.').optional(),
  total_capacity: z.string().describe('Total capacity of buffer pools.').optional(),
  total_capacity_in_bytes: long.describe('Total capacity of buffer pools in bytes.').optional(),
  used: z.string().describe('Size of buffer pools.').optional(),
  used_in_bytes: long.describe('Size of buffer pools in bytes.').optional()
}).meta({ id: 'NodesNodeBufferPool' })
export type NodesNodeBufferPool = z.infer<typeof NodesNodeBufferPool>

export const NodesJvmClasses = z.object({
  current_loaded_count: long.describe('Number of classes currently loaded by JVM.').optional(),
  total_loaded_count: long.describe('Total number of classes loaded since the JVM started.').optional(),
  total_unloaded_count: long.describe('Total number of classes unloaded since the JVM started.').optional()
}).meta({ id: 'NodesJvmClasses' })
export type NodesJvmClasses = z.infer<typeof NodesJvmClasses>

export const NodesPool = z.object({
  used_in_bytes: long.describe('Memory, in bytes, used by the heap.').optional(),
  max_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap.').optional(),
  peak_used_in_bytes: long.describe('Largest amount of memory, in bytes, historically used by the heap.').optional(),
  peak_max_in_bytes: long.describe('Largest amount of memory, in bytes, historically used by the heap.').optional()
}).meta({ id: 'NodesPool' })
export type NodesPool = z.infer<typeof NodesPool>

export const NodesJvmMemoryStats = z.object({
  heap_used_in_bytes: long.describe('Memory, in bytes, currently in use by the heap.').optional(),
  heap_used_percent: long.describe('Percentage of memory currently in use by the heap.').optional(),
  heap_committed_in_bytes: long.describe('Amount of memory, in bytes, available for use by the heap.').optional(),
  heap_max_in_bytes: long.describe('Maximum amount of memory, in bytes, available for use by the heap.').optional(),
  heap_max: ByteSize.describe('Maximum amount of memory, available for use by the heap.').optional(),
  non_heap_used_in_bytes: long.describe('Non-heap memory used, in bytes.').optional(),
  non_heap_committed_in_bytes: long.describe('Amount of non-heap memory available, in bytes.').optional(),
  pools: z.record(z.string(), NodesPool).describe('Contains statistics about heap memory usage for the node.').optional()
}).meta({ id: 'NodesJvmMemoryStats' })
export type NodesJvmMemoryStats = z.infer<typeof NodesJvmMemoryStats>

export const NodesJvmThreads = z.object({
  count: long.describe('Number of active threads in use by JVM.').optional(),
  peak_count: long.describe('Highest number of threads used by JVM.').optional()
}).meta({ id: 'NodesJvmThreads' })
export type NodesJvmThreads = z.infer<typeof NodesJvmThreads>

export const NodesJvm = z.object({
  buffer_pools: z.record(z.string(), NodesNodeBufferPool).describe('Contains statistics about JVM buffer pools for the node.').optional(),
  classes: NodesJvmClasses.describe('Contains statistics about classes loaded by JVM for the node.').optional(),
  gc: NodesGarbageCollector.describe('Contains statistics about JVM garbage collectors for the node.').optional(),
  mem: NodesJvmMemoryStats.describe('Contains JVM memory usage statistics for the node.').optional(),
  threads: NodesJvmThreads.describe('Contains statistics about JVM thread usage for the node.').optional(),
  timestamp: long.describe('Last time JVM statistics were refreshed.').optional(),
  uptime: z.string().describe('Human-readable JVM uptime. Only returned if the `human` query parameter is `true`.').optional(),
  uptime_in_millis: long.describe('JVM uptime in milliseconds.').optional()
}).meta({ id: 'NodesJvm' })
export type NodesJvm = z.infer<typeof NodesJvm>

export const NodesNodeReloadResult = z.object({
  name: Name,
  reload_exception: z.lazy(() => ErrorCause).optional(),
  secure_setting_names: z.array(z.string()).describe('The names of the secure settings that were reloaded.').optional(),
  keystore_path: z.string().describe('The path to the keystore file.').optional(),
  keystore_digest: z.string().describe('A SHA-256 hash of the keystore file contents.').optional(),
  keystore_last_modified_time: DateTime.describe('The last modification time of the keystore file.').optional()
}).meta({ id: 'NodesNodeReloadResult' })
export type NodesNodeReloadResult = z.infer<typeof NodesNodeReloadResult>

export const NodesOperatingSystem = z.object({
  cpu: NodesCpu.optional(),
  mem: NodesExtendedMemoryStats.optional(),
  swap: NodesMemoryStats.optional(),
  cgroup: NodesCgroup.optional(),
  timestamp: long.optional()
}).meta({ id: 'NodesOperatingSystem' })
export type NodesOperatingSystem = z.infer<typeof NodesOperatingSystem>

export const NodesProcess = z.object({
  cpu: NodesCpu.describe('Contains CPU statistics for the node.').optional(),
  mem: NodesMemoryStats.describe('Contains virtual memory statistics for the node.').optional(),
  open_file_descriptors: integer.describe('Number of opened file descriptors associated with the current or `-1` if not supported.').optional(),
  max_file_descriptors: integer.describe('Maximum number of file descriptors allowed on the system, or `-1` if not supported.').optional(),
  timestamp: long.describe('Last time the statistics were refreshed. Recorded in milliseconds since the Unix Epoch.').optional()
}).meta({ id: 'NodesProcess' })
export type NodesProcess = z.infer<typeof NodesProcess>

export const NodesRepositoryLocation = z.object({
  base_path: z.string(),
  container: z.string().describe('Container name (Azure)').optional(),
  bucket: z.string().describe('Bucket name (GCP, S3)').optional()
}).meta({ id: 'NodesRepositoryLocation' })
export type NodesRepositoryLocation = z.infer<typeof NodesRepositoryLocation>

export const NodesRequestCounts = z.object({
  GetBlobProperties: long.describe('Number of Get Blob Properties requests (Azure)').optional(),
  GetBlob: long.describe('Number of Get Blob requests (Azure)').optional(),
  ListBlobs: long.describe('Number of List Blobs requests (Azure)').optional(),
  PutBlob: long.describe('Number of Put Blob requests (Azure)').optional(),
  PutBlock: long.describe('Number of Put Block (Azure)').optional(),
  PutBlockList: long.describe('Number of Put Block List requests').optional(),
  GetObject: long.describe('Number of get object requests (GCP, S3)').optional(),
  ListObjects: long.describe('Number of list objects requests (GCP, S3)').optional(),
  InsertObject: long.describe('Number of insert object requests, including simple, multipart and resumable uploads. Resumable uploads can perform multiple http requests to insert a single object but they are considered as a single request since they are billed as an individual operation. (GCP)').optional(),
  PutObject: long.describe('Number of PutObject requests (S3)').optional(),
  PutMultipartObject: long.describe('Number of Multipart requests, including CreateMultipartUpload, UploadPart and CompleteMultipartUpload requests (S3)').optional()
}).meta({ id: 'NodesRequestCounts' })
export type NodesRequestCounts = z.infer<typeof NodesRequestCounts>

export const NodesRepositoryMeteringInformation = z.object({
  repository_name: Name.describe('Repository name.'),
  repository_type: z.string().describe('Repository type.'),
  repository_location: NodesRepositoryLocation.describe('Represents an unique location within the repository.'),
  repository_ephemeral_id: Id.describe('An identifier that changes every time the repository is updated.'),
  repository_started_at: EpochTime.describe('Time the repository was created or updated. Recorded in milliseconds since the Unix Epoch.'),
  repository_stopped_at: EpochTime.describe('Time the repository was deleted or updated. Recorded in milliseconds since the Unix Epoch.').optional(),
  archived: z.boolean().describe('A flag that tells whether or not this object has been archived. When a repository is closed or updated the repository metering information is archived and kept for a certain period of time. This allows retrieving the repository metering information of previous repository instantiations.'),
  cluster_version: VersionNumber.describe('The cluster state version when this object was archived, this field can be used as a logical timestamp to delete all the archived metrics up to an observed version. This field is only present for archived repository metering information objects. The main purpose of this field is to avoid possible race conditions during repository metering information deletions, i.e. deleting archived repositories metering information that we haven’t observed yet.').optional(),
  request_counts: NodesRequestCounts.describe('An object with the number of request performed against the repository grouped by request type.')
}).meta({ id: 'NodesRepositoryMeteringInformation' })
export type NodesRepositoryMeteringInformation = z.infer<typeof NodesRepositoryMeteringInformation>

export const NodesScriptCache = z.object({
  cache_evictions: long.describe('Total number of times the script cache has evicted old data.').optional(),
  compilation_limit_triggered: long.describe('Total number of times the script compilation circuit breaker has limited inline script compilations.').optional(),
  compilations: long.describe('Total number of inline script compilations performed by the node.').optional(),
  context: z.string().optional()
}).meta({ id: 'NodesScriptCache' })
export type NodesScriptCache = z.infer<typeof NodesScriptCache>

export const NodesTransportHistogram = z.object({
  count: long.describe('The number of times a transport thread took a period of time within the bounds of this bucket to handle an inbound message.').optional(),
  lt_millis: long.describe('The exclusive upper bound of the bucket in milliseconds. May be omitted on the last bucket if this bucket has no upper bound.').optional(),
  ge_millis: long.describe('The inclusive lower bound of the bucket in milliseconds. May be omitted on the first bucket if this bucket has no lower bound.').optional()
}).meta({ id: 'NodesTransportHistogram' })
export type NodesTransportHistogram = z.infer<typeof NodesTransportHistogram>

export const NodesTransport = z.object({
  inbound_handling_time_histogram: z.array(NodesTransportHistogram).describe('The distribution of the time spent handling each inbound message on a transport thread, represented as a histogram.').optional(),
  outbound_handling_time_histogram: z.array(NodesTransportHistogram).describe('The distribution of the time spent sending each outbound transport message on a transport thread, represented as a histogram.').optional(),
  rx_count: long.describe('Total number of RX (receive) packets received by the node during internal cluster communication.').optional(),
  rx_size: z.string().describe('Size of RX packets received by the node during internal cluster communication.').optional(),
  rx_size_in_bytes: long.describe('Size, in bytes, of RX packets received by the node during internal cluster communication.').optional(),
  server_open: integer.describe('Current number of inbound TCP connections used for internal communication between nodes.').optional(),
  tx_count: long.describe('Total number of TX (transmit) packets sent by the node during internal cluster communication.').optional(),
  tx_size: z.string().describe('Size of TX packets sent by the node during internal cluster communication.').optional(),
  tx_size_in_bytes: long.describe('Size, in bytes, of TX packets sent by the node during internal cluster communication.').optional(),
  total_outbound_connections: long.describe('The cumulative number of outbound transport connections that this node has opened since it started. Each transport connection may comprise multiple TCP connections but is only counted once in this statistic. Transport connections are typically long-lived so this statistic should remain constant in a stable cluster.').optional()
}).meta({ id: 'NodesTransport' })
export type NodesTransport = z.infer<typeof NodesTransport>

export const NodesStats = z.object({
  adaptive_selection: z.record(z.string(), NodesAdaptiveSelection).describe('Statistics about adaptive replica selection.').optional(),
  breakers: z.record(z.string(), NodesBreaker).describe('Statistics about the field data circuit breaker.').optional(),
  fs: NodesFileSystem.describe('File system information, data path, free disk space, read/write stats.').optional(),
  host: Host.describe('Network host for the node, based on the network host setting.').optional(),
  http: NodesHttp.describe('HTTP connection information.').optional(),
  ingest: NodesIngest.describe('Statistics about ingest preprocessing.').optional(),
  ip: z.union([Ip, z.array(Ip)]).describe('IP address and port for the node.').optional(),
  jvm: NodesJvm.describe('JVM stats, memory pool information, garbage collection, buffer pools, number of loaded/unloaded classes.').optional(),
  name: Name.describe('Human-readable identifier for the node. Based on the node name setting.').optional(),
  os: NodesOperatingSystem.describe('Operating system stats, load average, mem, swap.').optional(),
  process: NodesProcess.describe('Process statistics, memory consumption, cpu usage, open file descriptors.').optional(),
  roles: NodeRoles.describe('Roles assigned to the node.').optional(),
  script: NodesScripting.describe('Contains script statistics for the node.').optional(),
  script_cache: z.record(z.string(), z.union([NodesScriptCache, z.array(NodesScriptCache)])).optional(),
  thread_pool: z.record(z.string(), NodesThreadCount).describe('Statistics about each thread pool, including current size, queue and rejected tasks.').optional(),
  timestamp: long.optional(),
  transport: NodesTransport.describe('Transport statistics about sent and received bytes in cluster communication.').optional(),
  transport_address: TransportAddress.describe('Host and port for the transport layer, used for internal communication between nodes in a cluster.').optional(),
  attributes: z.record(Field, z.string()).describe('Contains a list of attributes for the node.').optional(),
  discovery: NodesDiscovery.describe('Contains node discovery statistics for the node.').optional(),
  indexing_pressure: NodesIndexingPressure.describe('Contains indexing pressure statistics for the node.').optional(),
  indices: z.lazy(() => IndicesStatsShardStats).describe('Indices stats about size, document count, indexing and deletion times, search times, field cache size, merges and flushes.').optional()
}).meta({ id: 'NodesStats' })
export type NodesStats = z.infer<typeof NodesStats>

/**
 * Clear the archived repositories metering.
 *
 * Clear the archived repositories metering information in the cluster.
 */
export const NodesClearRepositoriesMeteringArchiveRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node IDs or names used to limit returned information.').meta({ found_in: 'path' }),
  max_archive_version: long.describe('Specifies the maximum `archive_version` to be cleared from the archive.').meta({ found_in: 'path' })
}).meta({ id: 'NodesClearRepositoriesMeteringArchiveRequest' })
export type NodesClearRepositoriesMeteringArchiveRequest = z.infer<typeof NodesClearRepositoriesMeteringArchiveRequest>

export const NodesClearRepositoriesMeteringArchiveResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.describe('Name of the cluster. Based on the `cluster.name` setting.'),
  nodes: z.record(z.string(), NodesRepositoryMeteringInformation).describe('Contains repositories metering information for the nodes selected by the request.')
}).meta({ id: 'NodesClearRepositoriesMeteringArchiveResponseBase' })
export type NodesClearRepositoriesMeteringArchiveResponseBase = z.infer<typeof NodesClearRepositoriesMeteringArchiveResponseBase>

export const NodesClearRepositoriesMeteringArchiveResponse = NodesClearRepositoriesMeteringArchiveResponseBase.meta({ id: 'NodesClearRepositoriesMeteringArchiveResponse' })
export type NodesClearRepositoriesMeteringArchiveResponse = z.infer<typeof NodesClearRepositoriesMeteringArchiveResponse>

/**
 * Get cluster repositories metering.
 *
 * Get repositories metering information for a cluster.
 * This API exposes monotonically non-decreasing counters and it is expected that clients would durably store the information needed to compute aggregations over a period of time.
 * Additionally, the information exposed by this API is volatile, meaning that it will not be present after node restarts.
 */
export const NodesGetRepositoriesMeteringInfoRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node IDs or names used to limit returned information.').meta({ found_in: 'path' })
}).meta({ id: 'NodesGetRepositoriesMeteringInfoRequest' })
export type NodesGetRepositoriesMeteringInfoRequest = z.infer<typeof NodesGetRepositoriesMeteringInfoRequest>

export const NodesGetRepositoriesMeteringInfoResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.describe('Name of the cluster. Based on the `cluster.name` setting.'),
  nodes: z.record(z.string(), NodesRepositoryMeteringInformation).describe('Contains repositories metering information for the nodes selected by the request.')
}).meta({ id: 'NodesGetRepositoriesMeteringInfoResponseBase' })
export type NodesGetRepositoriesMeteringInfoResponseBase = z.infer<typeof NodesGetRepositoriesMeteringInfoResponseBase>

export const NodesGetRepositoriesMeteringInfoResponse = NodesGetRepositoriesMeteringInfoResponseBase.meta({ id: 'NodesGetRepositoriesMeteringInfoResponse' })
export type NodesGetRepositoriesMeteringInfoResponse = z.infer<typeof NodesGetRepositoriesMeteringInfoResponse>

/**
 * Get the hot threads for nodes.
 *
 * Get a breakdown of the hot threads on each selected node in the cluster.
 * The output is plain text with a breakdown of the top hot threads for each node.
 */
export const NodesHotThreadsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('List of node IDs or names used to limit returned information.').optional().meta({ found_in: 'path' }),
  ignore_idle_threads: z.boolean().describe('If true, known idle threads (e.g. waiting in a socket select, or to get a task from an empty queue) are filtered out.').optional().meta({ found_in: 'query' }),
  interval: Duration.describe('The interval to do the second sampling of threads.').optional().meta({ found_in: 'query' }),
  snapshots: long.describe('Number of samples of thread stacktrace.').optional().meta({ found_in: 'query' }),
  threads: long.describe('Specifies the number of hot threads to provide information for.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  type: ThreadType.describe('The type to sample.').optional().meta({ found_in: 'query' }),
  sort: ThreadType.describe('The sort order for \'cpu\' type').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesHotThreadsRequest' })
export type NodesHotThreadsRequest = z.infer<typeof NodesHotThreadsRequest>

export const NodesHotThreadsResponse = z.object({
}).meta({ id: 'NodesHotThreadsResponse' })
export type NodesHotThreadsResponse = z.infer<typeof NodesHotThreadsResponse>

export const NodesInfoDeprecationIndexing = z.object({
  enabled: z.union([z.boolean(), z.string()])
}).meta({ id: 'NodesInfoDeprecationIndexing' })
export type NodesInfoDeprecationIndexing = z.infer<typeof NodesInfoDeprecationIndexing>

export const NodesInfoNodeInfoHttp = z.object({
  bound_address: z.array(z.string()),
  max_content_length: ByteSize.optional(),
  max_content_length_in_bytes: long,
  publish_address: z.string()
}).meta({ id: 'NodesInfoNodeInfoHttp' })
export type NodesInfoNodeInfoHttp = z.infer<typeof NodesInfoNodeInfoHttp>

export const NodesInfoNodeInfoJvmMemory = z.object({
  direct_max: ByteSize.optional(),
  direct_max_in_bytes: long,
  heap_init: ByteSize.optional(),
  heap_init_in_bytes: long,
  heap_max: ByteSize.optional(),
  heap_max_in_bytes: long,
  non_heap_init: ByteSize.optional(),
  non_heap_init_in_bytes: long,
  non_heap_max: ByteSize.optional(),
  non_heap_max_in_bytes: long
}).meta({ id: 'NodesInfoNodeInfoJvmMemory' })
export type NodesInfoNodeInfoJvmMemory = z.infer<typeof NodesInfoNodeInfoJvmMemory>

export const NodesInfoNodeJvmInfo = z.object({
  gc_collectors: z.array(z.string()),
  mem: NodesInfoNodeInfoJvmMemory,
  memory_pools: z.array(z.string()),
  pid: integer,
  start_time_in_millis: EpochTime,
  version: VersionString,
  vm_name: Name,
  vm_vendor: z.string(),
  vm_version: VersionString,
  using_bundled_jdk: z.boolean(),
  using_compressed_ordinary_object_pointers: z.union([z.boolean(), z.string()]).optional(),
  input_arguments: z.array(z.string())
}).meta({ id: 'NodesInfoNodeJvmInfo' })
export type NodesInfoNodeJvmInfo = z.infer<typeof NodesInfoNodeJvmInfo>

export const NodesInfoNodeInfoOSCPU = z.object({
  cache_size: z.string(),
  cache_size_in_bytes: integer,
  cores_per_socket: integer,
  mhz: integer,
  model: z.string(),
  total_cores: integer,
  total_sockets: integer,
  vendor: z.string()
}).meta({ id: 'NodesInfoNodeInfoOSCPU' })
export type NodesInfoNodeInfoOSCPU = z.infer<typeof NodesInfoNodeInfoOSCPU>

export const NodesInfoNodeInfoMemory = z.object({
  total: z.string(),
  total_in_bytes: long
}).meta({ id: 'NodesInfoNodeInfoMemory' })
export type NodesInfoNodeInfoMemory = z.infer<typeof NodesInfoNodeInfoMemory>

export const NodesInfoNodeOperatingSystemInfo = z.object({
  arch: z.string().describe('Name of the JVM architecture (ex: amd64, x86)'),
  available_processors: integer.describe('Number of processors available to the Java virtual machine'),
  allocated_processors: integer.describe('The number of processors actually used to calculate thread pool size. This number can be set with the node.processors setting of a node and defaults to the number of processors reported by the OS.').optional(),
  name: Name.describe('Name of the operating system (ex: Linux, Windows, Mac OS X)'),
  pretty_name: Name,
  refresh_interval_in_millis: DurationValue.describe('Refresh interval for the OS statistics'),
  version: VersionString.describe('Version of the operating system'),
  cpu: NodesInfoNodeInfoOSCPU.optional(),
  mem: NodesInfoNodeInfoMemory.optional(),
  swap: NodesInfoNodeInfoMemory.optional()
}).meta({ id: 'NodesInfoNodeOperatingSystemInfo' })
export type NodesInfoNodeOperatingSystemInfo = z.infer<typeof NodesInfoNodeOperatingSystemInfo>

export const NodesInfoNodeProcessInfo = z.object({
  id: long.describe('Process identifier (PID)'),
  mlockall: z.boolean().describe('Indicates if the process address space has been successfully locked in memory'),
  refresh_interval_in_millis: DurationValue.describe('Refresh interval for the process statistics')
}).meta({ id: 'NodesInfoNodeProcessInfo' })
export type NodesInfoNodeProcessInfo = z.infer<typeof NodesInfoNodeProcessInfo>

export const NodesInfoNodeInfoSettingsClusterElection = z.object({
  strategy: Name
}).meta({ id: 'NodesInfoNodeInfoSettingsClusterElection' })
export type NodesInfoNodeInfoSettingsClusterElection = z.infer<typeof NodesInfoNodeInfoSettingsClusterElection>

export const NodesInfoNodeInfoSettingsCluster = z.object({
  name: Name,
  routing: IndicesIndexRouting.optional(),
  election: NodesInfoNodeInfoSettingsClusterElection,
  initial_master_nodes: z.union([z.array(z.string()), z.string()]).optional(),
  deprecation_indexing: NodesInfoDeprecationIndexing.optional()
}).meta({ id: 'NodesInfoNodeInfoSettingsCluster' })
export type NodesInfoNodeInfoSettingsCluster = z.infer<typeof NodesInfoNodeInfoSettingsCluster>

export const NodesInfoNodeInfoSettingsNode = z.object({
  name: Name,
  attr: z.record(z.string(), z.any()),
  max_local_storage_nodes: z.string().optional()
}).meta({ id: 'NodesInfoNodeInfoSettingsNode' })
export type NodesInfoNodeInfoSettingsNode = z.infer<typeof NodesInfoNodeInfoSettingsNode>

export const NodesInfoNodeInfoPath = z.object({
  logs: z.string().optional(),
  home: z.string().optional(),
  repo: z.array(z.string()).optional(),
  data: z.union([z.string(), z.array(z.string())]).optional()
}).meta({ id: 'NodesInfoNodeInfoPath' })
export type NodesInfoNodeInfoPath = z.infer<typeof NodesInfoNodeInfoPath>

export const NodesInfoNodeInfoRepositoriesUrl = z.object({
  allowed_urls: z.string()
}).meta({ id: 'NodesInfoNodeInfoRepositoriesUrl' })
export type NodesInfoNodeInfoRepositoriesUrl = z.infer<typeof NodesInfoNodeInfoRepositoriesUrl>

export const NodesInfoNodeInfoRepositories = z.object({
  url: NodesInfoNodeInfoRepositoriesUrl
}).meta({ id: 'NodesInfoNodeInfoRepositories' })
export type NodesInfoNodeInfoRepositories = z.infer<typeof NodesInfoNodeInfoRepositories>

export const NodesInfoNodeInfoDiscover = z.object({
  seed_hosts: z.union([z.array(z.string()), z.string()]).optional(),
  type: z.string().optional(),
  seed_providers: z.array(z.string()).optional()
}).catchall(z.any()).meta({ id: 'NodesInfoNodeInfoDiscover' })
export type NodesInfoNodeInfoDiscover = z.infer<typeof NodesInfoNodeInfoDiscover>

export const NodesInfoNodeInfoAction = z.object({
  destructive_requires_name: z.string()
}).meta({ id: 'NodesInfoNodeInfoAction' })
export type NodesInfoNodeInfoAction = z.infer<typeof NodesInfoNodeInfoAction>

export const NodesInfoNodeInfoClient = z.object({
  type: z.string()
}).meta({ id: 'NodesInfoNodeInfoClient' })
export type NodesInfoNodeInfoClient = z.infer<typeof NodesInfoNodeInfoClient>

export const NodesInfoNodeInfoSettingsHttpType = z.object({
  default: z.string()
}).meta({ id: 'NodesInfoNodeInfoSettingsHttpType' })
export type NodesInfoNodeInfoSettingsHttpType = z.infer<typeof NodesInfoNodeInfoSettingsHttpType>

export const NodesInfoNodeInfoSettingsHttp = z.object({
  type: NodesInfoNodeInfoSettingsHttpType,
  'type.default': z.string().optional(),
  compression: z.union([z.boolean(), z.string()]).optional(),
  port: z.union([integer, z.string()]).optional()
}).meta({ id: 'NodesInfoNodeInfoSettingsHttp' })
export type NodesInfoNodeInfoSettingsHttp = z.infer<typeof NodesInfoNodeInfoSettingsHttp>

export const NodesInfoNodeInfoBootstrap = z.object({
  memory_lock: z.string()
}).meta({ id: 'NodesInfoNodeInfoBootstrap' })
export type NodesInfoNodeInfoBootstrap = z.infer<typeof NodesInfoNodeInfoBootstrap>

export const NodesInfoNodeInfoSettingsTransportType = z.object({
  default: z.string()
}).meta({ id: 'NodesInfoNodeInfoSettingsTransportType' })
export type NodesInfoNodeInfoSettingsTransportType = z.infer<typeof NodesInfoNodeInfoSettingsTransportType>

export const NodesInfoNodeInfoSettingsTransportFeatures = z.object({
  'x-pack': z.string()
}).meta({ id: 'NodesInfoNodeInfoSettingsTransportFeatures' })
export type NodesInfoNodeInfoSettingsTransportFeatures = z.infer<typeof NodesInfoNodeInfoSettingsTransportFeatures>

export const NodesInfoNodeInfoSettingsTransport = z.object({
  type: NodesInfoNodeInfoSettingsTransportType,
  'type.default': z.string().optional(),
  features: NodesInfoNodeInfoSettingsTransportFeatures.optional()
}).meta({ id: 'NodesInfoNodeInfoSettingsTransport' })
export type NodesInfoNodeInfoSettingsTransport = z.infer<typeof NodesInfoNodeInfoSettingsTransport>

export const NodesInfoNodeInfoSettingsNetwork = z.object({
  host: z.union([Host, z.array(Host)]).optional()
}).meta({ id: 'NodesInfoNodeInfoSettingsNetwork' })
export type NodesInfoNodeInfoSettingsNetwork = z.infer<typeof NodesInfoNodeInfoSettingsNetwork>

export const NodesInfoNodeInfoXpackLicenseType = z.object({
  type: z.string()
}).meta({ id: 'NodesInfoNodeInfoXpackLicenseType' })
export type NodesInfoNodeInfoXpackLicenseType = z.infer<typeof NodesInfoNodeInfoXpackLicenseType>

export const NodesInfoNodeInfoXpackLicense = z.object({
  self_generated: NodesInfoNodeInfoXpackLicenseType
}).meta({ id: 'NodesInfoNodeInfoXpackLicense' })
export type NodesInfoNodeInfoXpackLicense = z.infer<typeof NodesInfoNodeInfoXpackLicense>

export const NodesInfoNodeInfoXpackSecuritySsl = z.object({
  ssl: z.record(z.string(), z.string())
}).meta({ id: 'NodesInfoNodeInfoXpackSecuritySsl' })
export type NodesInfoNodeInfoXpackSecuritySsl = z.infer<typeof NodesInfoNodeInfoXpackSecuritySsl>

export const NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus = z.object({
  enabled: z.string().optional(),
  order: z.string()
}).meta({ id: 'NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus' })
export type NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus = z.infer<typeof NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus>

export const NodesInfoNodeInfoXpackSecurityAuthcRealms = z.object({
  file: z.record(z.string(), NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus).optional(),
  native: z.record(z.string(), NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus).optional(),
  pki: z.record(z.string(), NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus).optional()
}).meta({ id: 'NodesInfoNodeInfoXpackSecurityAuthcRealms' })
export type NodesInfoNodeInfoXpackSecurityAuthcRealms = z.infer<typeof NodesInfoNodeInfoXpackSecurityAuthcRealms>

export const NodesInfoNodeInfoXpackSecurityAuthcToken = z.object({
  enabled: z.string()
}).meta({ id: 'NodesInfoNodeInfoXpackSecurityAuthcToken' })
export type NodesInfoNodeInfoXpackSecurityAuthcToken = z.infer<typeof NodesInfoNodeInfoXpackSecurityAuthcToken>

export const NodesInfoNodeInfoXpackSecurityAuthc = z.object({
  realms: NodesInfoNodeInfoXpackSecurityAuthcRealms.optional(),
  token: NodesInfoNodeInfoXpackSecurityAuthcToken.optional()
}).meta({ id: 'NodesInfoNodeInfoXpackSecurityAuthc' })
export type NodesInfoNodeInfoXpackSecurityAuthc = z.infer<typeof NodesInfoNodeInfoXpackSecurityAuthc>

export const NodesInfoNodeInfoXpackSecurity = z.object({
  http: NodesInfoNodeInfoXpackSecuritySsl.optional(),
  enabled: z.string(),
  transport: NodesInfoNodeInfoXpackSecuritySsl.optional(),
  authc: NodesInfoNodeInfoXpackSecurityAuthc.optional()
}).meta({ id: 'NodesInfoNodeInfoXpackSecurity' })
export type NodesInfoNodeInfoXpackSecurity = z.infer<typeof NodesInfoNodeInfoXpackSecurity>

export const NodesInfoNodeInfoXpackMl = z.object({
  use_auto_machine_memory_percent: z.boolean().optional()
}).meta({ id: 'NodesInfoNodeInfoXpackMl' })
export type NodesInfoNodeInfoXpackMl = z.infer<typeof NodesInfoNodeInfoXpackMl>

export const NodesInfoNodeInfoXpack = z.object({
  license: NodesInfoNodeInfoXpackLicense.optional(),
  security: NodesInfoNodeInfoXpackSecurity,
  notification: z.record(z.string(), z.any()).optional(),
  ml: NodesInfoNodeInfoXpackMl.optional()
}).meta({ id: 'NodesInfoNodeInfoXpack' })
export type NodesInfoNodeInfoXpack = z.infer<typeof NodesInfoNodeInfoXpack>

export const NodesInfoNodeInfoScript = z.object({
  allowed_types: z.string(),
  disable_max_compilations_rate: z.string().optional()
}).meta({ id: 'NodesInfoNodeInfoScript' })
export type NodesInfoNodeInfoScript = z.infer<typeof NodesInfoNodeInfoScript>

export const NodesInfoNodeInfoSearchRemote = z.object({
  connect: z.string()
}).meta({ id: 'NodesInfoNodeInfoSearchRemote' })
export type NodesInfoNodeInfoSearchRemote = z.infer<typeof NodesInfoNodeInfoSearchRemote>

export const NodesInfoNodeInfoSearch = z.object({
  remote: NodesInfoNodeInfoSearchRemote
}).meta({ id: 'NodesInfoNodeInfoSearch' })
export type NodesInfoNodeInfoSearch = z.infer<typeof NodesInfoNodeInfoSearch>

export const NodesInfoNodeInfoIngestDownloader = z.object({
  enabled: z.string()
}).meta({ id: 'NodesInfoNodeInfoIngestDownloader' })
export type NodesInfoNodeInfoIngestDownloader = z.infer<typeof NodesInfoNodeInfoIngestDownloader>

export const NodesInfoNodeInfoIngestInfo = z.object({
  downloader: NodesInfoNodeInfoIngestDownloader
}).meta({ id: 'NodesInfoNodeInfoIngestInfo' })
export type NodesInfoNodeInfoIngestInfo = z.infer<typeof NodesInfoNodeInfoIngestInfo>

export const NodesInfoNodeInfoSettingsIngest = z.object({
  attachment: NodesInfoNodeInfoIngestInfo.optional(),
  append: NodesInfoNodeInfoIngestInfo.optional(),
  csv: NodesInfoNodeInfoIngestInfo.optional(),
  convert: NodesInfoNodeInfoIngestInfo.optional(),
  date: NodesInfoNodeInfoIngestInfo.optional(),
  date_index_name: NodesInfoNodeInfoIngestInfo.optional(),
  dot_expander: NodesInfoNodeInfoIngestInfo.optional(),
  enrich: NodesInfoNodeInfoIngestInfo.optional(),
  fail: NodesInfoNodeInfoIngestInfo.optional(),
  foreach: NodesInfoNodeInfoIngestInfo.optional(),
  json: NodesInfoNodeInfoIngestInfo.optional(),
  user_agent: NodesInfoNodeInfoIngestInfo.optional(),
  kv: NodesInfoNodeInfoIngestInfo.optional(),
  geoip: NodesInfoNodeInfoIngestInfo.optional(),
  grok: NodesInfoNodeInfoIngestInfo.optional(),
  gsub: NodesInfoNodeInfoIngestInfo.optional(),
  join: NodesInfoNodeInfoIngestInfo.optional(),
  lowercase: NodesInfoNodeInfoIngestInfo.optional(),
  remove: NodesInfoNodeInfoIngestInfo.optional(),
  rename: NodesInfoNodeInfoIngestInfo.optional(),
  script: NodesInfoNodeInfoIngestInfo.optional(),
  set: NodesInfoNodeInfoIngestInfo.optional(),
  sort: NodesInfoNodeInfoIngestInfo.optional(),
  split: NodesInfoNodeInfoIngestInfo.optional(),
  trim: NodesInfoNodeInfoIngestInfo.optional(),
  uppercase: NodesInfoNodeInfoIngestInfo.optional(),
  urldecode: NodesInfoNodeInfoIngestInfo.optional(),
  bytes: NodesInfoNodeInfoIngestInfo.optional(),
  dissect: NodesInfoNodeInfoIngestInfo.optional(),
  set_security_user: NodesInfoNodeInfoIngestInfo.optional(),
  pipeline: NodesInfoNodeInfoIngestInfo.optional(),
  drop: NodesInfoNodeInfoIngestInfo.optional(),
  circle: NodesInfoNodeInfoIngestInfo.optional(),
  inference: NodesInfoNodeInfoIngestInfo.optional()
}).meta({ id: 'NodesInfoNodeInfoSettingsIngest' })
export type NodesInfoNodeInfoSettingsIngest = z.infer<typeof NodesInfoNodeInfoSettingsIngest>

export const NodesInfoNodeInfoSettings = z.object({
  cluster: NodesInfoNodeInfoSettingsCluster,
  node: NodesInfoNodeInfoSettingsNode,
  path: NodesInfoNodeInfoPath.optional(),
  repositories: NodesInfoNodeInfoRepositories.optional(),
  discovery: NodesInfoNodeInfoDiscover.optional(),
  action: NodesInfoNodeInfoAction.optional(),
  client: NodesInfoNodeInfoClient.optional(),
  http: NodesInfoNodeInfoSettingsHttp,
  bootstrap: NodesInfoNodeInfoBootstrap.optional(),
  transport: NodesInfoNodeInfoSettingsTransport,
  network: NodesInfoNodeInfoSettingsNetwork.optional(),
  xpack: NodesInfoNodeInfoXpack.optional(),
  script: NodesInfoNodeInfoScript.optional(),
  search: NodesInfoNodeInfoSearch.optional(),
  ingest: NodesInfoNodeInfoSettingsIngest.optional()
}).meta({ id: 'NodesInfoNodeInfoSettings' })
export type NodesInfoNodeInfoSettings = z.infer<typeof NodesInfoNodeInfoSettings>

export const NodesInfoNodeThreadPoolInfo = z.object({
  core: integer.optional(),
  keep_alive: Duration.optional(),
  max: integer.optional(),
  queue_size: integer,
  size: integer.optional(),
  type: z.string()
}).meta({ id: 'NodesInfoNodeThreadPoolInfo' })
export type NodesInfoNodeThreadPoolInfo = z.infer<typeof NodesInfoNodeThreadPoolInfo>

export const NodesInfoNodeInfoTransport = z.object({
  bound_address: z.array(z.string()),
  publish_address: z.string(),
  profiles: z.record(z.string(), z.string())
}).meta({ id: 'NodesInfoNodeInfoTransport' })
export type NodesInfoNodeInfoTransport = z.infer<typeof NodesInfoNodeInfoTransport>

export const NodesInfoNodeInfoIngestProcessor = z.object({
  type: z.string()
}).meta({ id: 'NodesInfoNodeInfoIngestProcessor' })
export type NodesInfoNodeInfoIngestProcessor = z.infer<typeof NodesInfoNodeInfoIngestProcessor>

export const NodesInfoNodeInfoIngest = z.object({
  processors: z.array(NodesInfoNodeInfoIngestProcessor)
}).meta({ id: 'NodesInfoNodeInfoIngest' })
export type NodesInfoNodeInfoIngest = z.infer<typeof NodesInfoNodeInfoIngest>

export const NodesInfoNodeInfoAggregation = z.object({
  types: z.array(z.string())
}).meta({ id: 'NodesInfoNodeInfoAggregation' })
export type NodesInfoNodeInfoAggregation = z.infer<typeof NodesInfoNodeInfoAggregation>

export const NodesInfoRemoveClusterServer = z.object({
  bound_address: z.array(TransportAddress),
  publish_address: TransportAddress
}).meta({ id: 'NodesInfoRemoveClusterServer' })
export type NodesInfoRemoveClusterServer = z.infer<typeof NodesInfoRemoveClusterServer>

export const NodesInfoNodeInfo = z.object({
  attributes: z.record(z.string(), z.string()),
  build_flavor: z.string(),
  build_hash: z.string().describe('Short hash of the last git commit in this release.'),
  build_type: z.string(),
  component_versions: z.record(Name, integer),
  host: Host.describe('The node’s host name.'),
  http: NodesInfoNodeInfoHttp.optional(),
  index_version: VersionNumber,
  ip: Ip.describe('The node’s IP address.'),
  jvm: NodesInfoNodeJvmInfo.optional(),
  name: Name.describe('The node\'s name'),
  os: NodesInfoNodeOperatingSystemInfo.optional(),
  plugins: z.array(PluginStats).optional(),
  process: NodesInfoNodeProcessInfo.optional(),
  roles: NodeRoles,
  settings: NodesInfoNodeInfoSettings.optional(),
  thread_pool: z.record(z.string(), NodesInfoNodeThreadPoolInfo).optional(),
  total_indexing_buffer: long.describe('Total heap allowed to be used to hold recently indexed documents before they must be written to disk. This size is a shared pool across all shards on this node, and is controlled by Indexing Buffer settings.').optional(),
  total_indexing_buffer_in_bytes: ByteSize.describe('Same as total_indexing_buffer, but expressed in bytes.').optional(),
  transport: NodesInfoNodeInfoTransport.optional(),
  transport_address: TransportAddress.describe('Host and port where transport HTTP connections are accepted.'),
  transport_version: VersionNumber,
  version: VersionString.describe('Elasticsearch version running on this node.'),
  modules: z.array(PluginStats).optional(),
  ingest: NodesInfoNodeInfoIngest.optional(),
  aggregations: z.record(z.string(), NodesInfoNodeInfoAggregation).optional(),
  remote_cluster_server: NodesInfoRemoveClusterServer.optional()
}).meta({ id: 'NodesInfoNodeInfo' })
export type NodesInfoNodeInfo = z.infer<typeof NodesInfoNodeInfo>

export const NodesInfoNodesInfoMetric = z.enum(['_all', '_none', 'settings', 'os', 'process', 'jvm', 'thread_pool', 'transport', 'http', 'remote_cluster_server', 'plugins', 'ingest', 'aggregations', 'indices']).meta({ id: 'NodesInfoNodesInfoMetric' })
export type NodesInfoNodesInfoMetric = z.infer<typeof NodesInfoNodesInfoMetric>

export const NodesInfoNodesInfoMetrics = z.union([NodesInfoNodesInfoMetric, z.array(NodesInfoNodesInfoMetric)]).meta({ id: 'NodesInfoNodesInfoMetrics' })
export type NodesInfoNodesInfoMetrics = z.infer<typeof NodesInfoNodesInfoMetrics>

/**
 * Get node information.
 *
 * By default, the API returns all attributes and core settings for cluster nodes.
 */
export const NodesInfoRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node IDs or names used to limit returned information.').optional().meta({ found_in: 'path' }),
  metric: NodesInfoNodesInfoMetrics.describe('Limits the information returned to the specific metrics. Supports a comma-separated list, such as http,ingest.').optional().meta({ found_in: 'path' }),
  flat_settings: z.boolean().describe('If true, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesInfoRequest' })
export type NodesInfoRequest = z.infer<typeof NodesInfoRequest>

export const NodesInfoResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name,
  nodes: z.record(z.string(), NodesInfoNodeInfo)
}).meta({ id: 'NodesInfoResponseBase' })
export type NodesInfoResponseBase = z.infer<typeof NodesInfoResponseBase>

export const NodesInfoResponse = NodesInfoResponseBase.meta({ id: 'NodesInfoResponse' })
export type NodesInfoResponse = z.infer<typeof NodesInfoResponse>

/**
 * Reload the keystore on nodes in the cluster.
 *
 * Secure settings are stored in an on-disk keystore. Certain of these settings are reloadable.
 * That is, you can change them on disk and reload them without restarting any nodes in the cluster.
 * When you have updated reloadable secure settings in your keystore, you can use this API to reload those settings on each node.
 *
 * When the Elasticsearch keystore is password protected and not simply obfuscated, you must provide the password for the keystore when you reload the secure settings.
 * Reloading the settings for the whole cluster assumes that the keystores for all nodes are protected with the same password; this method is allowed only when inter-node communications are encrypted.
 * Alternatively, you can reload the secure settings on each node by locally accessing the API and passing the node-specific Elasticsearch keystore password.
 */
export const NodesReloadSecureSettingsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('The names of particular nodes in the cluster to target.').optional().meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  secure_settings_password: Password.describe('The password for the Elasticsearch keystore.').optional().meta({ found_in: 'body' })
}).meta({ id: 'NodesReloadSecureSettingsRequest' })
export type NodesReloadSecureSettingsRequest = z.infer<typeof NodesReloadSecureSettingsRequest>

export const NodesReloadSecureSettingsResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name,
  nodes: z.record(z.string(), NodesNodeReloadResult)
}).meta({ id: 'NodesReloadSecureSettingsResponseBase' })
export type NodesReloadSecureSettingsResponseBase = z.infer<typeof NodesReloadSecureSettingsResponseBase>

export const NodesReloadSecureSettingsResponse = NodesReloadSecureSettingsResponseBase.meta({ id: 'NodesReloadSecureSettingsResponse' })
export type NodesReloadSecureSettingsResponse = z.infer<typeof NodesReloadSecureSettingsResponse>

export const NodesStatsNodeStatsMetric = z.enum(['_all', '_none', 'indices', 'os', 'process', 'jvm', 'thread_pool', 'fs', 'transport', 'http', 'breaker', 'script', 'discovery', 'ingest', 'adaptive_selection', 'script_cache', 'indexing_pressure', 'repositories', 'allocations']).meta({ id: 'NodesStatsNodeStatsMetric' })
export type NodesStatsNodeStatsMetric = z.infer<typeof NodesStatsNodeStatsMetric>

export const NodesStatsNodeStatsMetrics = z.union([NodesStatsNodeStatsMetric, z.array(NodesStatsNodeStatsMetric)]).meta({ id: 'NodesStatsNodeStatsMetrics' })
export type NodesStatsNodeStatsMetrics = z.infer<typeof NodesStatsNodeStatsMetrics>

/**
 * Get node statistics.
 *
 * Get statistics for nodes in a cluster.
 * By default, all stats are returned. You can limit the returned information by using metrics.
 */
export const NodesStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('Comma-separated list of node IDs or names used to limit returned information.').optional().meta({ found_in: 'path' }),
  metric: NodesStatsNodeStatsMetrics.describe('Limits the information returned to the specific metrics.').optional().meta({ found_in: 'path' }),
  index_metric: CommonStatsFlags.describe('Limit the information returned for indices metric to the specific index metrics. It can be used only if indices (or all) metric is specified.').optional().meta({ found_in: 'path' }),
  completion_fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in fielddata and suggest statistics.').optional().meta({ found_in: 'query' }),
  fielddata_fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in fielddata statistics.').optional().meta({ found_in: 'query' }),
  fields: Fields.describe('Comma-separated list or wildcard expressions of fields to include in the statistics.').optional().meta({ found_in: 'query' }),
  groups: z.boolean().describe('Comma-separated list of search groups to include in the search statistics.').optional().meta({ found_in: 'query' }),
  include_segment_file_sizes: z.boolean().describe('If true, the call reports the aggregated disk usage of each one of the Lucene index files (only applies if segment stats are requested).').optional().meta({ found_in: 'query' }),
  level: NodeStatsLevel.describe('Indicates whether statistics are aggregated at the node, indices, or shards level.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  types: z.array(z.string()).describe('A comma-separated list of document types for the indexing index metric.').optional().meta({ found_in: 'query' }),
  include_unloaded_segments: z.boolean().describe('If `true`, the response includes information from segments that are not loaded into memory.').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesStatsRequest' })
export type NodesStatsRequest = z.infer<typeof NodesStatsRequest>

export const NodesStatsResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name.optional(),
  nodes: z.record(z.string(), NodesStats)
}).meta({ id: 'NodesStatsResponseBase' })
export type NodesStatsResponseBase = z.infer<typeof NodesStatsResponseBase>

export const NodesStatsResponse = NodesStatsResponseBase.meta({ id: 'NodesStatsResponse' })
export type NodesStatsResponse = z.infer<typeof NodesStatsResponse>

export const NodesUsageNodeUsage = z.object({
  rest_actions: z.record(z.string(), integer).describe('The total number of times each REST endpoint has been called on this node since the last restart.  Note that the REST endpoint names are not considered stable.'),
  since: EpochTime.describe('The timestamp for when the collection of these statistics started.'),
  timestamp: EpochTime.describe('The timestamp for when these statistics were collected.'),
  aggregations: z.record(z.string(), z.any()).describe('The total number of times search aggregations have been called on this node since the last restart.')
}).meta({ id: 'NodesUsageNodeUsage' })
export type NodesUsageNodeUsage = z.infer<typeof NodesUsageNodeUsage>

export const NodesUsageNodesUsageMetric = z.enum(['_all', 'rest_actions', 'aggregations']).meta({ id: 'NodesUsageNodesUsageMetric' })
export type NodesUsageNodesUsageMetric = z.infer<typeof NodesUsageNodesUsageMetric>

export const NodesUsageNodesUsageMetrics = z.union([NodesUsageNodesUsageMetric, z.array(NodesUsageNodesUsageMetric)]).meta({ id: 'NodesUsageNodesUsageMetrics' })
export type NodesUsageNodesUsageMetrics = z.infer<typeof NodesUsageNodesUsageMetrics>

/** Get feature usage information. */
export const NodesUsageRequest = z.object({
  ...RequestBase.shape,
  node_id: NodeIds.describe('A comma-separated list of node IDs or names to limit the returned information. Use `_local` to return information from the node you\'re connecting to, leave empty to get information from all nodes.').optional().meta({ found_in: 'path' }),
  metric: NodesUsageNodesUsageMetrics.describe('Limits the information returned to the specific metrics. A comma-separated list of the following options: `_all`, `rest_actions`, `aggregations`.').optional().meta({ found_in: 'path' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'NodesUsageRequest' })
export type NodesUsageRequest = z.infer<typeof NodesUsageRequest>

export const NodesUsageResponseBase = z.object({
  ...NodesNodesResponseBase.shape,
  cluster_name: Name,
  nodes: z.record(z.string(), NodesUsageNodeUsage)
}).meta({ id: 'NodesUsageResponseBase' })
export type NodesUsageResponseBase = z.infer<typeof NodesUsageResponseBase>

export const NodesUsageResponse = NodesUsageResponseBase.meta({ id: 'NodesUsageResponse' })
export type NodesUsageResponse = z.infer<typeof NodesUsageResponse>
