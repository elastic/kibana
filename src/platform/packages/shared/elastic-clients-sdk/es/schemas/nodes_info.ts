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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const NodeRole = z.enum(['master', 'data', 'data_cold', 'data_content', 'data_frozen', 'data_hot', 'data_warm', 'client', 'ingest', 'ml', 'voting_only', 'transform', 'remote_cluster_client', 'coordinating_only']).meta({ id: 'NodeRole' })
export type NodeRole = z.infer<typeof NodeRole>

export const NodeRoles = z.array(NodeRole).meta({ id: 'NodeRoles' })
export type NodeRoles = z.infer<typeof NodeRoles>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Contains statistics about the number of nodes selected by the request. */
export const NodeStatistics = z.object({
  failures: z.array(z.lazy(() => ErrorCause)).optional(),
  total: integer.describe('Total number of nodes selected by the request.'),
  successful: integer.describe('Number of nodes that responded successfully to the request.'),
  failed: integer.describe('Number of nodes that rejected the request or failed to respond. If this value is not 0, a reason for the rejection or failure is included in the response.')
}).meta({ id: 'NodeStatistics' })
export type NodeStatistics = z.infer<typeof NodeStatistics>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const PluginStats = z.object({
  classname: z.string(),
  description: z.string(),
  elasticsearch_version: VersionString,
  extended_plugins: z.array(z.string()),
  has_native_controller: z.boolean(),
  java_version: VersionString,
  name: Name,
  version: VersionString,
  licensed: z.boolean()
}).meta({ id: 'PluginStats' })
export type PluginStats = z.infer<typeof PluginStats>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const IndicesIndexRoutingAllocationOptions = z.enum(['all', 'primaries', 'new_primaries', 'none']).meta({ id: 'IndicesIndexRoutingAllocationOptions' })
export type IndicesIndexRoutingAllocationOptions = z.infer<typeof IndicesIndexRoutingAllocationOptions>

export const IndicesIndexRoutingAllocationInclude = z.object({
  _tier_preference: z.string().optional(),
  _id: Id.optional()
}).meta({ id: 'IndicesIndexRoutingAllocationInclude' })
export type IndicesIndexRoutingAllocationInclude = z.infer<typeof IndicesIndexRoutingAllocationInclude>

export const IndicesIndexRoutingAllocationInitialRecovery = z.object({
  _id: Id.optional()
}).meta({ id: 'IndicesIndexRoutingAllocationInitialRecovery' })
export type IndicesIndexRoutingAllocationInitialRecovery = z.infer<typeof IndicesIndexRoutingAllocationInitialRecovery>

export const IndicesIndexRoutingAllocationDisk = z.object({
  threshold_enabled: z.union([z.boolean(), z.string()]).optional()
}).meta({ id: 'IndicesIndexRoutingAllocationDisk' })
export type IndicesIndexRoutingAllocationDisk = z.infer<typeof IndicesIndexRoutingAllocationDisk>

export const IndicesIndexRoutingAllocation = z.object({
  enable: IndicesIndexRoutingAllocationOptions.optional(),
  include: IndicesIndexRoutingAllocationInclude.optional(),
  initial_recovery: IndicesIndexRoutingAllocationInitialRecovery.optional(),
  disk: IndicesIndexRoutingAllocationDisk.optional()
}).meta({ id: 'IndicesIndexRoutingAllocation' })
export type IndicesIndexRoutingAllocation = z.infer<typeof IndicesIndexRoutingAllocation>

export const IndicesIndexRoutingRebalanceOptions = z.enum(['all', 'primaries', 'replicas', 'none']).meta({ id: 'IndicesIndexRoutingRebalanceOptions' })
export type IndicesIndexRoutingRebalanceOptions = z.infer<typeof IndicesIndexRoutingRebalanceOptions>

export const IndicesIndexRoutingRebalance = z.object({
  enable: IndicesIndexRoutingRebalanceOptions
}).meta({ id: 'IndicesIndexRoutingRebalance' })
export type IndicesIndexRoutingRebalance = z.infer<typeof IndicesIndexRoutingRebalance>

export const IndicesIndexRouting = z.object({
  allocation: IndicesIndexRoutingAllocation.optional(),
  rebalance: IndicesIndexRoutingRebalance.optional()
}).meta({ id: 'IndicesIndexRouting' })
export type IndicesIndexRouting = z.infer<typeof IndicesIndexRouting>

export const NodesNodesResponseBase = z.object({
  node_stats: NodeStatistics.describe('Contains statistics about the number of nodes selected by the request’s node filters.').optional()
}).meta({ id: 'NodesNodesResponseBase' })
export type NodesNodesResponseBase = z.infer<typeof NodesNodesResponseBase>

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
