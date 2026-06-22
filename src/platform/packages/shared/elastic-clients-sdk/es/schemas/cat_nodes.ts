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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const Percentage = z.union([z.string(), float]).meta({ id: 'Percentage' })
export type Percentage = z.infer<typeof Percentage>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const CatCatNodeColumn = z.union([z.enum(['build', 'b', 'completion.size', 'cs', 'completionSize', 'cpu', 'disk.avail', 'd', 'disk', 'diskAvail', 'disk.total', 'dt', 'diskTotal', 'disk.used', 'du', 'diskUsed', 'disk.used_percent', 'dup', 'diskUsedPercent', 'fielddata.evictions', 'fe', 'fielddataEvictions', 'fielddata.memory_size', 'fm', 'fielddataMemory', 'file_desc.current', 'fdc', 'fileDescriptorCurrent', 'file_desc.max', 'fdm', 'fileDescriptorMax', 'file_desc.percent', 'fdp', 'fileDescriptorPercent', 'flush.total', 'ft', 'flushTotal', 'flush.total_time', 'ftt', 'flushTotalTime', 'get.current', 'gc', 'getCurrent', 'get.exists_time', 'geti', 'getExistsTime', 'get.exists_total', 'geto', 'getExistsTotal', 'get.missing_time', 'gmti', 'getMissingTime', 'get.missing_total', 'gmto', 'getMissingTotal', 'get.time', 'gti', 'getTime', 'get.total', 'gto', 'getTotal', 'heap.current', 'hc', 'heapCurrent', 'heap.max', 'hm', 'heapMax', 'heap.percent', 'hp', 'heapPercent', 'http_address', 'http', 'id', 'nodeId', 'indexing.delete_current', 'idc', 'indexingDeleteCurrent', 'indexing.delete_time', 'idti', 'indexingDeleteTime', 'indexing.delete_total', 'idto', 'indexingDeleteTotal', 'indexing.index_current', 'iic', 'indexingIndexCurrent', 'indexing.index_failed', 'iif', 'indexingIndexFailed', 'indexing.index_failed_due_to_version_conflict', 'iifvc', 'indexingIndexFailedDueToVersionConflict', 'indexing.index_time', 'iiti', 'indexingIndexTime', 'indexing.index_total', 'iito', 'indexingIndexTotal', 'ip', 'i', 'jdk', 'j', 'load_1m', 'l', 'load_5m', 'l', 'load_15m', 'l', 'available_processors', 'ap', 'mappings.total_count', 'mtc', 'mappingsTotalCount', 'mappings.total_estimated_overhead_in_bytes', 'mteo', 'mappingsTotalEstimatedOverheadInBytes', 'master', 'm', 'merges.current', 'mc', 'mergesCurrent', 'merges.current_docs', 'mcd', 'mergesCurrentDocs', 'merges.current_size', 'mcs', 'mergesCurrentSize', 'merges.total', 'mt', 'mergesTotal', 'merges.total_docs', 'mtd', 'mergesTotalDocs', 'merges.total_size', 'mts', 'mergesTotalSize', 'merges.total_time', 'mtt', 'mergesTotalTime', 'name', 'n', 'node.role', 'r', 'role', 'nodeRole', 'pid', 'p', 'port', 'po', 'query_cache.memory_size', 'qcm', 'queryCacheMemory', 'query_cache.evictions', 'qce', 'queryCacheEvictions', 'query_cache.hit_count', 'qchc', 'queryCacheHitCount', 'query_cache.miss_count', 'qcmc', 'queryCacheMissCount', 'ram.current', 'rc', 'ramCurrent', 'ram.max', 'rm', 'ramMax', 'ram.percent', 'rp', 'ramPercent', 'refresh.total', 'rto', 'refreshTotal', 'refresh.time', 'rti', 'refreshTime', 'request_cache.memory_size', 'rcm', 'requestCacheMemory', 'request_cache.evictions', 'rce', 'requestCacheEvictions', 'request_cache.hit_count', 'rchc', 'requestCacheHitCount', 'request_cache.miss_count', 'rcmc', 'requestCacheMissCount', 'script.compilations', 'scrcc', 'scriptCompilations', 'script.cache_evictions', 'scrce', 'scriptCacheEvictions', 'search.fetch_current', 'sfc', 'searchFetchCurrent', 'search.fetch_time', 'sfti', 'searchFetchTime', 'search.fetch_total', 'sfto', 'searchFetchTotal', 'search.open_contexts', 'so', 'searchOpenContexts', 'search.query_current', 'sqc', 'searchQueryCurrent', 'search.query_time', 'sqti', 'searchQueryTime', 'search.query_total', 'sqto', 'searchQueryTotal', 'search.scroll_current', 'scc', 'searchScrollCurrent', 'search.scroll_time', 'scti', 'searchScrollTime', 'search.scroll_total', 'scto', 'searchScrollTotal', 'segments.count', 'sc', 'segmentsCount', 'segments.fixed_bitset_memory', 'sfbm', 'fixedBitsetMemory', 'segments.index_writer_memory', 'siwm', 'segmentsIndexWriterMemory', 'segments.memory', 'sm', 'segmentsMemory', 'segments.version_map_memory', 'svmm', 'segmentsVersionMapMemory', 'shard_stats.total_count', 'sstc', 'shards', 'shardStatsTotalCount', 'suggest.current', 'suc', 'suggestCurrent', 'suggest.time', 'suti', 'suggestTime', 'suggest.total', 'suto', 'suggestTotal', 'uptime', 'u', 'version', 'v']), z.string()]).meta({ id: 'CatCatNodeColumn' })
export type CatCatNodeColumn = z.infer<typeof CatCatNodeColumn>

export const CatCatNodeColumns = z.union([CatCatNodeColumn, z.array(CatCatNodeColumn)]).meta({ id: 'CatCatNodeColumns' })
export type CatCatNodeColumns = z.infer<typeof CatCatNodeColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatNodesNodesRecord = z.object({
  id: Id.describe('The unique node identifier.').optional(),
  nodeId: Id.describe('The unique node identifier.').optional(),
  pid: z.string().describe('The process identifier.').optional(),
  p: z.string().describe('The process identifier.').optional(),
  ip: z.string().describe('The IP address.').optional(),
  i: z.string().describe('The IP address.').optional(),
  port: z.string().describe('The bound transport port.').optional(),
  po: z.string().describe('The bound transport port.').optional(),
  http_address: z.string().describe('The bound HTTP address.').optional(),
  http: z.string().describe('The bound HTTP address.').optional(),
  version: VersionString.describe('The Elasticsearch version.').optional(),
  v: VersionString.describe('The Elasticsearch version.').optional(),
  flavor: z.string().describe('The Elasticsearch distribution flavor.').optional(),
  f: z.string().describe('The Elasticsearch distribution flavor.').optional(),
  type: z.string().describe('The Elasticsearch distribution type.').optional(),
  t: z.string().describe('The Elasticsearch distribution type.').optional(),
  build: z.string().describe('The Elasticsearch build hash.').optional(),
  b: z.string().describe('The Elasticsearch build hash.').optional(),
  jdk: z.string().describe('The Java version.').optional(),
  j: z.string().describe('The Java version.').optional(),
  'disk.total': ByteSize.describe('The total disk space.').optional(),
  dt: ByteSize.describe('The total disk space.').optional(),
  diskTotal: ByteSize.describe('The total disk space.').optional(),
  'disk.used': ByteSize.describe('The used disk space.').optional(),
  du: ByteSize.describe('The used disk space.').optional(),
  diskUsed: ByteSize.describe('The used disk space.').optional(),
  'disk.avail': ByteSize.describe('The available disk space.').optional(),
  d: ByteSize.describe('The available disk space.').optional(),
  da: ByteSize.describe('The available disk space.').optional(),
  disk: ByteSize.describe('The available disk space.').optional(),
  diskAvail: ByteSize.describe('The available disk space.').optional(),
  'disk.used_percent': Percentage.describe('The used disk space percentage.').optional(),
  dup: Percentage.describe('The used disk space percentage.').optional(),
  diskUsedPercent: Percentage.describe('The used disk space percentage.').optional(),
  'heap.current': z.string().describe('The used heap.').optional(),
  hc: z.string().describe('The used heap.').optional(),
  heapCurrent: z.string().describe('The used heap.').optional(),
  'heap.percent': Percentage.describe('The used heap ratio.').optional(),
  hp: Percentage.describe('The used heap ratio.').optional(),
  heapPercent: Percentage.describe('The used heap ratio.').optional(),
  'heap.max': z.string().describe('The maximum configured heap.').optional(),
  hm: z.string().describe('The maximum configured heap.').optional(),
  heapMax: z.string().describe('The maximum configured heap.').optional(),
  'ram.current': z.string().describe('The used machine memory.').optional(),
  rc: z.string().describe('The used machine memory.').optional(),
  ramCurrent: z.string().describe('The used machine memory.').optional(),
  'ram.percent': Percentage.describe('The used machine memory ratio.').optional(),
  rp: Percentage.describe('The used machine memory ratio.').optional(),
  ramPercent: Percentage.describe('The used machine memory ratio.').optional(),
  'ram.max': z.string().describe('The total machine memory.').optional(),
  rn: z.string().describe('The total machine memory.').optional(),
  ramMax: z.string().describe('The total machine memory.').optional(),
  'file_desc.current': z.string().describe('The used file descriptors.').optional(),
  fdc: z.string().describe('The used file descriptors.').optional(),
  fileDescriptorCurrent: z.string().describe('The used file descriptors.').optional(),
  'file_desc.percent': Percentage.describe('The used file descriptor ratio.').optional(),
  fdp: Percentage.describe('The used file descriptor ratio.').optional(),
  fileDescriptorPercent: Percentage.describe('The used file descriptor ratio.').optional(),
  'file_desc.max': z.string().describe('The maximum number of file descriptors.').optional(),
  fdm: z.string().describe('The maximum number of file descriptors.').optional(),
  fileDescriptorMax: z.string().describe('The maximum number of file descriptors.').optional(),
  cpu: z.string().describe('The recent system CPU usage as a percentage.').optional(),
  load_1m: z.string().describe('The load average for the most recent minute.').optional(),
  load_5m: z.string().describe('The load average for the last five minutes.').optional(),
  load_15m: z.string().describe('The load average for the last fifteen minutes.').optional(),
  l: z.string().describe('The load average for the last fifteen minutes.').optional(),
  available_processors: z.string().describe('The number of available processors (logical CPU cores available to the JVM).').optional(),
  ap: z.string().describe('The number of available processors (logical CPU cores available to the JVM).').optional(),
  uptime: z.string().describe('The node uptime.').optional(),
  u: z.string().describe('The node uptime.').optional(),
  'node.role': z.string().describe('The roles of the node. Returned values include `c`(cold node), `d`(data node), `f`(frozen node), `h`(hot node), `i`(ingest node), `l`(machine learning node), `m` (master eligible node), `r`(remote cluster client node), `s`(content node), `t`(transform node), `v`(voting-only node), `w`(warm node),and `-`(coordinating node only).').optional(),
  r: z.string().describe('The roles of the node. Returned values include `c`(cold node), `d`(data node), `f`(frozen node), `h`(hot node), `i`(ingest node), `l`(machine learning node), `m` (master eligible node), `r`(remote cluster client node), `s`(content node), `t`(transform node), `v`(voting-only node), `w`(warm node),and `-`(coordinating node only).').optional(),
  role: z.string().describe('The roles of the node. Returned values include `c`(cold node), `d`(data node), `f`(frozen node), `h`(hot node), `i`(ingest node), `l`(machine learning node), `m` (master eligible node), `r`(remote cluster client node), `s`(content node), `t`(transform node), `v`(voting-only node), `w`(warm node),and `-`(coordinating node only).').optional(),
  nodeRole: z.string().describe('The roles of the node. Returned values include `c`(cold node), `d`(data node), `f`(frozen node), `h`(hot node), `i`(ingest node), `l`(machine learning node), `m` (master eligible node), `r`(remote cluster client node), `s`(content node), `t`(transform node), `v`(voting-only node), `w`(warm node),and `-`(coordinating node only).').optional(),
  master: z.string().describe('Indicates whether the node is the elected master node. Returned values include `*`(elected master) and `-`(not elected master).').optional(),
  m: z.string().describe('Indicates whether the node is the elected master node. Returned values include `*`(elected master) and `-`(not elected master).').optional(),
  name: Name.describe('The node name.').optional(),
  n: Name.describe('The node name.').optional(),
  'completion.size': z.string().describe('The size of completion.').optional(),
  cs: z.string().describe('The size of completion.').optional(),
  completionSize: z.string().describe('The size of completion.').optional(),
  'fielddata.memory_size': z.string().describe('The used fielddata cache.').optional(),
  fm: z.string().describe('The used fielddata cache.').optional(),
  fielddataMemory: z.string().describe('The used fielddata cache.').optional(),
  'fielddata.evictions': z.string().describe('The fielddata evictions.').optional(),
  fe: z.string().describe('The fielddata evictions.').optional(),
  fielddataEvictions: z.string().describe('The fielddata evictions.').optional(),
  'query_cache.memory_size': z.string().describe('The used query cache.').optional(),
  qcm: z.string().describe('The used query cache.').optional(),
  queryCacheMemory: z.string().describe('The used query cache.').optional(),
  'query_cache.evictions': z.string().describe('The query cache evictions.').optional(),
  qce: z.string().describe('The query cache evictions.').optional(),
  queryCacheEvictions: z.string().describe('The query cache evictions.').optional(),
  'query_cache.hit_count': z.string().describe('The query cache hit counts.').optional(),
  qchc: z.string().describe('The query cache hit counts.').optional(),
  queryCacheHitCount: z.string().describe('The query cache hit counts.').optional(),
  'query_cache.miss_count': z.string().describe('The query cache miss counts.').optional(),
  qcmc: z.string().describe('The query cache miss counts.').optional(),
  queryCacheMissCount: z.string().describe('The query cache miss counts.').optional(),
  'request_cache.memory_size': z.string().describe('The used request cache.').optional(),
  rcm: z.string().describe('The used request cache.').optional(),
  requestCacheMemory: z.string().describe('The used request cache.').optional(),
  'request_cache.evictions': z.string().describe('The request cache evictions.').optional(),
  rce: z.string().describe('The request cache evictions.').optional(),
  requestCacheEvictions: z.string().describe('The request cache evictions.').optional(),
  'request_cache.hit_count': z.string().describe('The request cache hit counts.').optional(),
  rchc: z.string().describe('The request cache hit counts.').optional(),
  requestCacheHitCount: z.string().describe('The request cache hit counts.').optional(),
  'request_cache.miss_count': z.string().describe('The request cache miss counts.').optional(),
  rcmc: z.string().describe('The request cache miss counts.').optional(),
  requestCacheMissCount: z.string().describe('The request cache miss counts.').optional(),
  'flush.total': z.string().describe('The number of flushes.').optional(),
  ft: z.string().describe('The number of flushes.').optional(),
  flushTotal: z.string().describe('The number of flushes.').optional(),
  'flush.total_time': z.string().describe('The time spent in flush.').optional(),
  ftt: z.string().describe('The time spent in flush.').optional(),
  flushTotalTime: z.string().describe('The time spent in flush.').optional(),
  'get.current': z.string().describe('The number of current get ops.').optional(),
  gc: z.string().describe('The number of current get ops.').optional(),
  getCurrent: z.string().describe('The number of current get ops.').optional(),
  'get.time': z.string().describe('The time spent in get.').optional(),
  gti: z.string().describe('The time spent in get.').optional(),
  getTime: z.string().describe('The time spent in get.').optional(),
  'get.total': z.string().describe('The number of get ops.').optional(),
  gto: z.string().describe('The number of get ops.').optional(),
  getTotal: z.string().describe('The number of get ops.').optional(),
  'get.exists_time': z.string().describe('The time spent in successful gets.').optional(),
  geti: z.string().describe('The time spent in successful gets.').optional(),
  getExistsTime: z.string().describe('The time spent in successful gets.').optional(),
  'get.exists_total': z.string().describe('The number of successful get operations.').optional(),
  geto: z.string().describe('The number of successful get operations.').optional(),
  getExistsTotal: z.string().describe('The number of successful get operations.').optional(),
  'get.missing_time': z.string().describe('The time spent in failed gets.').optional(),
  gmti: z.string().describe('The time spent in failed gets.').optional(),
  getMissingTime: z.string().describe('The time spent in failed gets.').optional(),
  'get.missing_total': z.string().describe('The number of failed gets.').optional(),
  gmto: z.string().describe('The number of failed gets.').optional(),
  getMissingTotal: z.string().describe('The number of failed gets.').optional(),
  'indexing.delete_current': z.string().describe('The number of current deletions.').optional(),
  idc: z.string().describe('The number of current deletions.').optional(),
  indexingDeleteCurrent: z.string().describe('The number of current deletions.').optional(),
  'indexing.delete_time': z.string().describe('The time spent in deletions.').optional(),
  idti: z.string().describe('The time spent in deletions.').optional(),
  indexingDeleteTime: z.string().describe('The time spent in deletions.').optional(),
  'indexing.delete_total': z.string().describe('The number of delete operations.').optional(),
  idto: z.string().describe('The number of delete operations.').optional(),
  indexingDeleteTotal: z.string().describe('The number of delete operations.').optional(),
  'indexing.index_current': z.string().describe('The number of current indexing operations.').optional(),
  iic: z.string().describe('The number of current indexing operations.').optional(),
  indexingIndexCurrent: z.string().describe('The number of current indexing operations.').optional(),
  'indexing.index_time': z.string().describe('The time spent in indexing.').optional(),
  iiti: z.string().describe('The time spent in indexing.').optional(),
  indexingIndexTime: z.string().describe('The time spent in indexing.').optional(),
  'indexing.index_total': z.string().describe('The number of indexing operations.').optional(),
  iito: z.string().describe('The number of indexing operations.').optional(),
  indexingIndexTotal: z.string().describe('The number of indexing operations.').optional(),
  'indexing.index_failed': z.string().describe('The number of failed indexing operations.').optional(),
  iif: z.string().describe('The number of failed indexing operations.').optional(),
  indexingIndexFailed: z.string().describe('The number of failed indexing operations.').optional(),
  'merges.current': z.string().describe('The number of current merges.').optional(),
  mc: z.string().describe('The number of current merges.').optional(),
  mergesCurrent: z.string().describe('The number of current merges.').optional(),
  'merges.current_docs': z.string().describe('The number of current merging docs.').optional(),
  mcd: z.string().describe('The number of current merging docs.').optional(),
  mergesCurrentDocs: z.string().describe('The number of current merging docs.').optional(),
  'merges.current_size': z.string().describe('The size of current merges.').optional(),
  mcs: z.string().describe('The size of current merges.').optional(),
  mergesCurrentSize: z.string().describe('The size of current merges.').optional(),
  'merges.total': z.string().describe('The number of completed merge operations.').optional(),
  mt: z.string().describe('The number of completed merge operations.').optional(),
  mergesTotal: z.string().describe('The number of completed merge operations.').optional(),
  'merges.total_docs': z.string().describe('The docs merged.').optional(),
  mtd: z.string().describe('The docs merged.').optional(),
  mergesTotalDocs: z.string().describe('The docs merged.').optional(),
  'merges.total_size': z.string().describe('The size merged.').optional(),
  mts: z.string().describe('The size merged.').optional(),
  mergesTotalSize: z.string().describe('The size merged.').optional(),
  'merges.total_time': z.string().describe('The time spent in merges.').optional(),
  mtt: z.string().describe('The time spent in merges.').optional(),
  mergesTotalTime: z.string().describe('The time spent in merges.').optional(),
  'refresh.total': z.string().describe('The total refreshes.').optional(),
  'refresh.time': z.string().describe('The time spent in refreshes.').optional(),
  'refresh.external_total': z.string().describe('The total external refreshes.').optional(),
  rto: z.string().describe('The total external refreshes.').optional(),
  refreshTotal: z.string().describe('The total external refreshes.').optional(),
  'refresh.external_time': z.string().describe('The time spent in external refreshes.').optional(),
  rti: z.string().describe('The time spent in external refreshes.').optional(),
  refreshTime: z.string().describe('The time spent in external refreshes.').optional(),
  'refresh.listeners': z.string().describe('The number of pending refresh listeners.').optional(),
  rli: z.string().describe('The number of pending refresh listeners.').optional(),
  refreshListeners: z.string().describe('The number of pending refresh listeners.').optional(),
  'script.compilations': z.string().describe('The total script compilations.').optional(),
  scrcc: z.string().describe('The total script compilations.').optional(),
  scriptCompilations: z.string().describe('The total script compilations.').optional(),
  'script.cache_evictions': z.string().describe('The total compiled scripts evicted from the cache.').optional(),
  scrce: z.string().describe('The total compiled scripts evicted from the cache.').optional(),
  scriptCacheEvictions: z.string().describe('The total compiled scripts evicted from the cache.').optional(),
  'script.compilation_limit_triggered': z.string().describe('The script cache compilation limit triggered.').optional(),
  scrclt: z.string().describe('The script cache compilation limit triggered.').optional(),
  scriptCacheCompilationLimitTriggered: z.string().describe('The script cache compilation limit triggered.').optional(),
  'search.fetch_current': z.string().describe('The current fetch phase operations.').optional(),
  sfc: z.string().describe('The current fetch phase operations.').optional(),
  searchFetchCurrent: z.string().describe('The current fetch phase operations.').optional(),
  'search.fetch_time': z.string().describe('The time spent in fetch phase.').optional(),
  sfti: z.string().describe('The time spent in fetch phase.').optional(),
  searchFetchTime: z.string().describe('The time spent in fetch phase.').optional(),
  'search.fetch_total': z.string().describe('The total fetch operations.').optional(),
  sfto: z.string().describe('The total fetch operations.').optional(),
  searchFetchTotal: z.string().describe('The total fetch operations.').optional(),
  'search.open_contexts': z.string().describe('The open search contexts.').optional(),
  so: z.string().describe('The open search contexts.').optional(),
  searchOpenContexts: z.string().describe('The open search contexts.').optional(),
  'search.query_current': z.string().describe('The current query phase operations.').optional(),
  sqc: z.string().describe('The current query phase operations.').optional(),
  searchQueryCurrent: z.string().describe('The current query phase operations.').optional(),
  'search.query_time': z.string().describe('The time spent in query phase.').optional(),
  sqti: z.string().describe('The time spent in query phase.').optional(),
  searchQueryTime: z.string().describe('The time spent in query phase.').optional(),
  'search.query_total': z.string().describe('The total query phase operations.').optional(),
  sqto: z.string().describe('The total query phase operations.').optional(),
  searchQueryTotal: z.string().describe('The total query phase operations.').optional(),
  'search.scroll_current': z.string().describe('The open scroll contexts.').optional(),
  scc: z.string().describe('The open scroll contexts.').optional(),
  searchScrollCurrent: z.string().describe('The open scroll contexts.').optional(),
  'search.scroll_time': z.string().describe('The time scroll contexts held open.').optional(),
  scti: z.string().describe('The time scroll contexts held open.').optional(),
  searchScrollTime: z.string().describe('The time scroll contexts held open.').optional(),
  'search.scroll_total': z.string().describe('The completed scroll contexts.').optional(),
  scto: z.string().describe('The completed scroll contexts.').optional(),
  searchScrollTotal: z.string().describe('The completed scroll contexts.').optional(),
  'segments.count': z.string().describe('The number of segments.').optional(),
  sc: z.string().describe('The number of segments.').optional(),
  segmentsCount: z.string().describe('The number of segments.').optional(),
  'segments.memory': z.string().describe('The memory used by segments.').optional(),
  sm: z.string().describe('The memory used by segments.').optional(),
  segmentsMemory: z.string().describe('The memory used by segments.').optional(),
  'segments.index_writer_memory': z.string().describe('The memory used by the index writer.').optional(),
  siwm: z.string().describe('The memory used by the index writer.').optional(),
  segmentsIndexWriterMemory: z.string().describe('The memory used by the index writer.').optional(),
  'segments.version_map_memory': z.string().describe('The memory used by the version map.').optional(),
  svmm: z.string().describe('The memory used by the version map.').optional(),
  segmentsVersionMapMemory: z.string().describe('The memory used by the version map.').optional(),
  'segments.fixed_bitset_memory': z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields.').optional(),
  sfbm: z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields.').optional(),
  fixedBitsetMemory: z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields.').optional(),
  'suggest.current': z.string().describe('The number of current suggest operations.').optional(),
  suc: z.string().describe('The number of current suggest operations.').optional(),
  suggestCurrent: z.string().describe('The number of current suggest operations.').optional(),
  'suggest.time': z.string().describe('The time spend in suggest.').optional(),
  suti: z.string().describe('The time spend in suggest.').optional(),
  suggestTime: z.string().describe('The time spend in suggest.').optional(),
  'suggest.total': z.string().describe('The number of suggest operations.').optional(),
  suto: z.string().describe('The number of suggest operations.').optional(),
  suggestTotal: z.string().describe('The number of suggest operations.').optional(),
  'bulk.total_operations': z.string().describe('The number of bulk shard operations.').optional(),
  bto: z.string().describe('The number of bulk shard operations.').optional(),
  bulkTotalOperations: z.string().describe('The number of bulk shard operations.').optional(),
  'bulk.total_time': z.string().describe('The time spend in shard bulk.').optional(),
  btti: z.string().describe('The time spend in shard bulk.').optional(),
  bulkTotalTime: z.string().describe('The time spend in shard bulk.').optional(),
  'bulk.total_size_in_bytes': z.string().describe('The total size in bytes of shard bulk.').optional(),
  btsi: z.string().describe('The total size in bytes of shard bulk.').optional(),
  bulkTotalSizeInBytes: z.string().describe('The total size in bytes of shard bulk.').optional(),
  'bulk.avg_time': z.string().describe('The average time spend in shard bulk.').optional(),
  bati: z.string().describe('The average time spend in shard bulk.').optional(),
  bulkAvgTime: z.string().describe('The average time spend in shard bulk.').optional(),
  'bulk.avg_size_in_bytes': z.string().describe('The average size in bytes of shard bulk.').optional(),
  basi: z.string().describe('The average size in bytes of shard bulk.').optional(),
  bulkAvgSizeInBytes: z.string().describe('The average size in bytes of shard bulk.').optional()
}).meta({ id: 'CatNodesNodesRecord' })
export type CatNodesNodesRecord = z.infer<typeof CatNodesNodesRecord>

/**
 * Get node information.
 *
 * Get information about the nodes in a cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatNodesRequest = z.object({
  ...CatCatRequestBase.shape,
  full_id: z.boolean().describe('If `true`, return the full node ID. If `false`, return the shortened node ID.').optional().meta({ found_in: 'query' }),
  include_unloaded_segments: z.boolean().describe('If true, the response includes information from segments that are not loaded into memory.').optional().meta({ found_in: 'query' }),
  h: CatCatNodeColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatNodesRequest' })
export type CatNodesRequest = z.infer<typeof CatNodesRequest>

export const CatNodesResponse = z.array(CatNodesNodesRecord).meta({ id: 'CatNodesResponse' })
export type CatNodesResponse = z.infer<typeof CatNodesResponse>
