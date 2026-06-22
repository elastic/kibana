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

export const HealthStatus = z.enum(['green', 'GREEN', 'yellow', 'YELLOW', 'red', 'RED', 'unknown', 'unavailable']).meta({ id: 'HealthStatus' })
export type HealthStatus = z.infer<typeof HealthStatus>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatIndicesColumn = z.union([z.enum(['health', 'h', 'status', 's', 'index', 'i', 'idx', 'uuid', 'id', 'uuid', 'pri', 'p', 'shards.primary', 'shardsPrimary', 'rep', 'r', 'shards.replica', 'shardsReplica', 'docs.count', 'dc', 'docsCount', 'docs.deleted', 'dd', 'docsDeleted', 'creation.date', 'cd', 'creation.date.string', 'cds', 'store.size', 'ss', 'storeSize', 'pri.store.size', 'dataset.size', 'completion.size', 'cs', 'completionSize', 'pri.completion.size', 'fielddata.memory_size', 'fm', 'fielddataMemory', 'pri.fielddata.memory_size', 'fielddata.evictions', 'fe', 'fielddataEvictions', 'pri.fielddata.evictions', 'query_cache.memory_size', 'qcm', 'queryCacheMemory', 'pri.query_cache.memory_size', 'query_cache.evictions', 'qce', 'queryCacheEvictions', 'pri.query_cache.evictions', 'request_cache.memory_size', 'rcm', 'requestCacheMemory', 'pri.request_cache.memory_size', 'request_cache.evictions', 'rce', 'requestCacheEvictions', 'pri.request_cache.evictions', 'request_cache.hit_count', 'rchc', 'requestCacheHitCount', 'pri.request_cache.hit_count', 'request_cache.miss_count', 'rcmc', 'requestCacheMissCount', 'pri.request_cache.miss_count', 'flush.total', 'ft', 'flushTotal', 'pri.flush.total', 'flush.total_time', 'ftt', 'flushTotalTime', 'pri.flush.total_time', 'get.current', 'gc', 'getCurrent', 'pri.get.current', 'get.time', 'gti', 'getTime', 'pri.get.time', 'get.total', 'gto', 'getTotal', 'pri.get.total', 'get.exists_time', 'geti', 'getExistsTime', 'pri.get.exists_time', 'get.exists_total', 'geto', 'getExistsTotal', 'pri.get.exists_total', 'get.missing_time', 'gmti', 'getMissingTime', 'pri.get.missing_time', 'get.missing_total', 'gmto', 'getMissingTotal', 'pri.get.missing_total', 'indexing.delete_current', 'idc', 'indexingDeleteCurrent', 'pri.indexing.delete_current', 'indexing.delete_time', 'idti', 'indexingDeleteTime', 'pri.indexing.delete_time', 'indexing.delete_total', 'idto', 'indexingDeleteTotal', 'pri.indexing.delete_total', 'indexing.index_current', 'iic', 'indexingIndexCurrent', 'pri.indexing.index_current', 'indexing.index_time', 'iiti', 'indexingIndexTime', 'pri.indexing.index_time', 'indexing.index_total', 'iito', 'indexingIndexTotal', 'pri.indexing.index_total', 'indexing.index_failed', 'iif', 'indexingIndexFailed', 'pri.indexing.index_failed', 'indexing.index_failed_due_to_version_conflict', 'iifvc', 'indexingIndexFailedDueToVersionConflict', 'pri.indexing.index_failed_due_to_version_conflict', 'merges.current', 'mc', 'mergesCurrent', 'pri.merges.current', 'merges.current_docs', 'mcd', 'mergesCurrentDocs', 'pri.merges.current_docs', 'merges.current_size', 'mcs', 'mergesCurrentSize', 'pri.merges.current_size', 'merges.total', 'mt', 'mergesTotal', 'pri.merges.total', 'merges.total_docs', 'mtd', 'mergesTotalDocs', 'pri.merges.total_docs', 'merges.total_size', 'mts', 'mergesTotalSize', 'pri.merges.total_size', 'merges.total_time', 'mtt', 'mergesTotalTime', 'pri.merges.total_time', 'refresh.total', 'rto', 'refreshTotal', 'pri.refresh.total', 'refresh.time', 'rti', 'refreshTime', 'pri.refresh.time', 'refresh.external_total', 'rto', 'refreshTotal', 'pri.refresh.external_total', 'refresh.external_time', 'rti', 'refreshTime', 'pri.refresh.external_time', 'refresh.listeners', 'rli', 'refreshListeners', 'pri.refresh.listeners', 'search.fetch_current', 'sfc', 'searchFetchCurrent', 'pri.search.fetch_current', 'search.fetch_time', 'sfti', 'searchFetchTime', 'pri.search.fetch_time', 'search.fetch_total', 'sfto', 'searchFetchTotal', 'pri.search.fetch_total', 'search.open_contexts', 'so', 'searchOpenContexts', 'pri.search.open_contexts', 'search.query_current', 'sqc', 'searchQueryCurrent', 'pri.search.query_current', 'search.query_time', 'sqti', 'searchQueryTime', 'pri.search.query_time', 'search.query_total', 'sqto', 'searchQueryTotal', 'pri.search.query_total', 'search.scroll_current', 'scc', 'searchScrollCurrent', 'pri.search.scroll_current', 'search.scroll_time', 'scti', 'searchScrollTime', 'pri.search.scroll_time', 'search.scroll_total', 'scto', 'searchScrollTotal', 'pri.search.scroll_total', 'segments.count', 'sc', 'segmentsCount', 'pri.segments.count', 'segments.memory', 'sm', 'segmentsMemory', 'pri.segments.memory', 'segments.index_writer_memory', 'siwm', 'segmentsIndexWriterMemory', 'pri.segments.index_writer_memory', 'segments.version_map_memory', 'svmm', 'segmentsVersionMapMemory', 'pri.segments.version_map_memory', 'segments.fixed_bitset_memory', 'sfbm', 'fixedBitsetMemory', 'pri.segments.fixed_bitset_memory', 'warmer.current', 'wc', 'warmerCurrent', 'pri.warmer.current', 'warmer.total', 'wto', 'warmerTotal', 'pri.warmer.total', 'warmer.total_time', 'wtt', 'warmerTotalTime', 'pri.warmer.total_time', 'suggest.current', 'suc', 'suggestCurrent', 'pri.suggest.current', 'suggest.time', 'suti', 'suggestTime', 'pri.suggest.time', 'suggest.total', 'suto', 'suggestTotal', 'pri.suggest.total', 'memory.total', 'tm', 'memoryTotal', 'pri.memory.total', 'bulk.total_operations', 'bto', 'bulkTotalOperation', 'pri.bulk.total_operations', 'bulk.total_time', 'btti', 'bulkTotalTime', 'pri.bulk.total_time', 'bulk.total_size_in_bytes', 'btsi', 'bulkTotalSizeInBytes', 'pri.bulk.total_size_in_bytes', 'bulk.avg_time', 'bati', 'bulkAvgTime', 'pri.bulk.avg_time', 'bulk.avg_size_in_bytes', 'basi', 'bulkAvgSizeInBytes', 'pri.bulk.avg_size_in_bytes', 'dense_vector.value_count', 'dvc', 'denseVectorCount', 'pri.dense_vector.value_count', 'sparse_vector.value_count', 'svc', 'sparseVectorCount', 'pri.sparse_vector.value_count']), z.string()]).meta({ id: 'CatCatIndicesColumn' })
export type CatCatIndicesColumn = z.infer<typeof CatCatIndicesColumn>

export const CatCatIndicesColumns = z.union([CatCatIndicesColumn, z.array(CatCatIndicesColumn)]).meta({ id: 'CatCatIndicesColumns' })
export type CatCatIndicesColumns = z.infer<typeof CatCatIndicesColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatIndicesIndicesRecord = z.object({
  health: z.string().describe('current health status').optional(),
  h: z.string().describe('current health status').optional(),
  status: z.string().describe('open/close status').optional(),
  s: z.string().describe('open/close status').optional(),
  index: z.string().describe('index name').optional(),
  i: z.string().describe('index name').optional(),
  idx: z.string().describe('index name').optional(),
  uuid: z.string().describe('index uuid').optional(),
  id: z.string().describe('index uuid').optional(),
  pri: z.string().describe('number of primary shards').optional(),
  p: z.string().describe('number of primary shards').optional(),
  'shards.primary': z.string().describe('number of primary shards').optional(),
  shardsPrimary: z.string().describe('number of primary shards').optional(),
  rep: z.string().describe('number of replica shards').optional(),
  r: z.string().describe('number of replica shards').optional(),
  'shards.replica': z.string().describe('number of replica shards').optional(),
  shardsReplica: z.string().describe('number of replica shards').optional(),
  'docs.count': z.union([z.string(), z.null()]).describe('The number of documents in the index, including hidden nested documents. For indices with `semantic_text` fields or other nested field types, this count includes the internal nested documents. To get the logical document count (excluding nested documents), use the `_count` API or `_cat/count` API instead.').optional(),
  dc: z.union([z.string(), z.null()]).describe('The number of documents in the index, including hidden nested documents. For indices with `semantic_text` fields or other nested field types, this count includes the internal nested documents. To get the logical document count (excluding nested documents), use the `_count` API or `_cat/count` API instead.').optional(),
  docsCount: z.union([z.string(), z.null()]).describe('The number of documents in the index, including hidden nested documents. For indices with `semantic_text` fields or other nested field types, this count includes the internal nested documents. To get the logical document count (excluding nested documents), use the `_count` API or `_cat/count` API instead.').optional(),
  'docs.deleted': z.union([z.string(), z.null()]).describe('deleted docs').optional(),
  dd: z.union([z.string(), z.null()]).describe('deleted docs').optional(),
  docsDeleted: z.union([z.string(), z.null()]).describe('deleted docs').optional(),
  'creation.date': z.string().describe('index creation date (millisecond value)').optional(),
  cd: z.string().describe('index creation date (millisecond value)').optional(),
  'creation.date.string': z.string().describe('index creation date (as string)').optional(),
  cds: z.string().describe('index creation date (as string)').optional(),
  'store.size': z.union([z.string(), z.null()]).describe('store size of primaries & replicas').optional(),
  ss: z.union([z.string(), z.null()]).describe('store size of primaries & replicas').optional(),
  storeSize: z.union([z.string(), z.null()]).describe('store size of primaries & replicas').optional(),
  'pri.store.size': z.union([z.string(), z.null()]).describe('store size of primaries').optional(),
  'dataset.size': z.union([z.string(), z.null()]).describe('total size of dataset (including the cache for partially mounted indices)').optional(),
  'completion.size': z.string().describe('size of completion').optional(),
  cs: z.string().describe('size of completion').optional(),
  completionSize: z.string().describe('size of completion').optional(),
  'pri.completion.size': z.string().describe('size of completion').optional(),
  'fielddata.memory_size': z.string().describe('used fielddata cache').optional(),
  fm: z.string().describe('used fielddata cache').optional(),
  fielddataMemory: z.string().describe('used fielddata cache').optional(),
  'pri.fielddata.memory_size': z.string().describe('used fielddata cache').optional(),
  'fielddata.evictions': z.string().describe('fielddata evictions').optional(),
  fe: z.string().describe('fielddata evictions').optional(),
  fielddataEvictions: z.string().describe('fielddata evictions').optional(),
  'pri.fielddata.evictions': z.string().describe('fielddata evictions').optional(),
  'query_cache.memory_size': z.string().describe('used query cache').optional(),
  qcm: z.string().describe('used query cache').optional(),
  queryCacheMemory: z.string().describe('used query cache').optional(),
  'pri.query_cache.memory_size': z.string().describe('used query cache').optional(),
  'query_cache.evictions': z.string().describe('query cache evictions').optional(),
  qce: z.string().describe('query cache evictions').optional(),
  queryCacheEvictions: z.string().describe('query cache evictions').optional(),
  'pri.query_cache.evictions': z.string().describe('query cache evictions').optional(),
  'request_cache.memory_size': z.string().describe('used request cache').optional(),
  rcm: z.string().describe('used request cache').optional(),
  requestCacheMemory: z.string().describe('used request cache').optional(),
  'pri.request_cache.memory_size': z.string().describe('used request cache').optional(),
  'request_cache.evictions': z.string().describe('request cache evictions').optional(),
  rce: z.string().describe('request cache evictions').optional(),
  requestCacheEvictions: z.string().describe('request cache evictions').optional(),
  'pri.request_cache.evictions': z.string().describe('request cache evictions').optional(),
  'request_cache.hit_count': z.string().describe('request cache hit count').optional(),
  rchc: z.string().describe('request cache hit count').optional(),
  requestCacheHitCount: z.string().describe('request cache hit count').optional(),
  'pri.request_cache.hit_count': z.string().describe('request cache hit count').optional(),
  'request_cache.miss_count': z.string().describe('request cache miss count').optional(),
  rcmc: z.string().describe('request cache miss count').optional(),
  requestCacheMissCount: z.string().describe('request cache miss count').optional(),
  'pri.request_cache.miss_count': z.string().describe('request cache miss count').optional(),
  'flush.total': z.string().describe('number of flushes').optional(),
  ft: z.string().describe('number of flushes').optional(),
  flushTotal: z.string().describe('number of flushes').optional(),
  'pri.flush.total': z.string().describe('number of flushes').optional(),
  'flush.total_time': z.string().describe('time spent in flush').optional(),
  ftt: z.string().describe('time spent in flush').optional(),
  flushTotalTime: z.string().describe('time spent in flush').optional(),
  'pri.flush.total_time': z.string().describe('time spent in flush').optional(),
  'get.current': z.string().describe('number of current get ops').optional(),
  gc: z.string().describe('number of current get ops').optional(),
  getCurrent: z.string().describe('number of current get ops').optional(),
  'pri.get.current': z.string().describe('number of current get ops').optional(),
  'get.time': z.string().describe('time spent in get').optional(),
  gti: z.string().describe('time spent in get').optional(),
  getTime: z.string().describe('time spent in get').optional(),
  'pri.get.time': z.string().describe('time spent in get').optional(),
  'get.total': z.string().describe('number of get ops').optional(),
  gto: z.string().describe('number of get ops').optional(),
  getTotal: z.string().describe('number of get ops').optional(),
  'pri.get.total': z.string().describe('number of get ops').optional(),
  'get.exists_time': z.string().describe('time spent in successful gets').optional(),
  geti: z.string().describe('time spent in successful gets').optional(),
  getExistsTime: z.string().describe('time spent in successful gets').optional(),
  'pri.get.exists_time': z.string().describe('time spent in successful gets').optional(),
  'get.exists_total': z.string().describe('number of successful gets').optional(),
  geto: z.string().describe('number of successful gets').optional(),
  getExistsTotal: z.string().describe('number of successful gets').optional(),
  'pri.get.exists_total': z.string().describe('number of successful gets').optional(),
  'get.missing_time': z.string().describe('time spent in failed gets').optional(),
  gmti: z.string().describe('time spent in failed gets').optional(),
  getMissingTime: z.string().describe('time spent in failed gets').optional(),
  'pri.get.missing_time': z.string().describe('time spent in failed gets').optional(),
  'get.missing_total': z.string().describe('number of failed gets').optional(),
  gmto: z.string().describe('number of failed gets').optional(),
  getMissingTotal: z.string().describe('number of failed gets').optional(),
  'pri.get.missing_total': z.string().describe('number of failed gets').optional(),
  'indexing.delete_current': z.string().describe('number of current deletions').optional(),
  idc: z.string().describe('number of current deletions').optional(),
  indexingDeleteCurrent: z.string().describe('number of current deletions').optional(),
  'pri.indexing.delete_current': z.string().describe('number of current deletions').optional(),
  'indexing.delete_time': z.string().describe('time spent in deletions').optional(),
  idti: z.string().describe('time spent in deletions').optional(),
  indexingDeleteTime: z.string().describe('time spent in deletions').optional(),
  'pri.indexing.delete_time': z.string().describe('time spent in deletions').optional(),
  'indexing.delete_total': z.string().describe('number of delete ops').optional(),
  idto: z.string().describe('number of delete ops').optional(),
  indexingDeleteTotal: z.string().describe('number of delete ops').optional(),
  'pri.indexing.delete_total': z.string().describe('number of delete ops').optional(),
  'indexing.index_current': z.string().describe('number of current indexing ops').optional(),
  iic: z.string().describe('number of current indexing ops').optional(),
  indexingIndexCurrent: z.string().describe('number of current indexing ops').optional(),
  'pri.indexing.index_current': z.string().describe('number of current indexing ops').optional(),
  'indexing.index_time': z.string().describe('time spent in indexing').optional(),
  iiti: z.string().describe('time spent in indexing').optional(),
  indexingIndexTime: z.string().describe('time spent in indexing').optional(),
  'pri.indexing.index_time': z.string().describe('time spent in indexing').optional(),
  'indexing.index_total': z.string().describe('number of indexing ops').optional(),
  iito: z.string().describe('number of indexing ops').optional(),
  indexingIndexTotal: z.string().describe('number of indexing ops').optional(),
  'pri.indexing.index_total': z.string().describe('number of indexing ops').optional(),
  'indexing.index_failed': z.string().describe('number of failed indexing ops').optional(),
  iif: z.string().describe('number of failed indexing ops').optional(),
  indexingIndexFailed: z.string().describe('number of failed indexing ops').optional(),
  'pri.indexing.index_failed': z.string().describe('number of failed indexing ops').optional(),
  'merges.current': z.string().describe('number of current merges').optional(),
  mc: z.string().describe('number of current merges').optional(),
  mergesCurrent: z.string().describe('number of current merges').optional(),
  'pri.merges.current': z.string().describe('number of current merges').optional(),
  'merges.current_docs': z.string().describe('number of current merging docs').optional(),
  mcd: z.string().describe('number of current merging docs').optional(),
  mergesCurrentDocs: z.string().describe('number of current merging docs').optional(),
  'pri.merges.current_docs': z.string().describe('number of current merging docs').optional(),
  'merges.current_size': z.string().describe('size of current merges').optional(),
  mcs: z.string().describe('size of current merges').optional(),
  mergesCurrentSize: z.string().describe('size of current merges').optional(),
  'pri.merges.current_size': z.string().describe('size of current merges').optional(),
  'merges.total': z.string().describe('number of completed merge ops').optional(),
  mt: z.string().describe('number of completed merge ops').optional(),
  mergesTotal: z.string().describe('number of completed merge ops').optional(),
  'pri.merges.total': z.string().describe('number of completed merge ops').optional(),
  'merges.total_docs': z.string().describe('docs merged').optional(),
  mtd: z.string().describe('docs merged').optional(),
  mergesTotalDocs: z.string().describe('docs merged').optional(),
  'pri.merges.total_docs': z.string().describe('docs merged').optional(),
  'merges.total_size': z.string().describe('size merged').optional(),
  mts: z.string().describe('size merged').optional(),
  mergesTotalSize: z.string().describe('size merged').optional(),
  'pri.merges.total_size': z.string().describe('size merged').optional(),
  'merges.total_time': z.string().describe('time spent in merges').optional(),
  mtt: z.string().describe('time spent in merges').optional(),
  mergesTotalTime: z.string().describe('time spent in merges').optional(),
  'pri.merges.total_time': z.string().describe('time spent in merges').optional(),
  'refresh.total': z.string().describe('total refreshes').optional(),
  rto: z.string().describe('total refreshes').optional(),
  refreshTotal: z.string().describe('total refreshes').optional(),
  'pri.refresh.total': z.string().describe('total refreshes').optional(),
  'refresh.time': z.string().describe('time spent in refreshes').optional(),
  rti: z.string().describe('time spent in refreshes').optional(),
  refreshTime: z.string().describe('time spent in refreshes').optional(),
  'pri.refresh.time': z.string().describe('time spent in refreshes').optional(),
  'refresh.external_total': z.string().describe('total external refreshes').optional(),
  reto: z.string().describe('total external refreshes').optional(),
  'pri.refresh.external_total': z.string().describe('total external refreshes').optional(),
  'refresh.external_time': z.string().describe('time spent in external refreshes').optional(),
  reti: z.string().describe('time spent in external refreshes').optional(),
  'pri.refresh.external_time': z.string().describe('time spent in external refreshes').optional(),
  'refresh.listeners': z.string().describe('number of pending refresh listeners').optional(),
  rli: z.string().describe('number of pending refresh listeners').optional(),
  refreshListeners: z.string().describe('number of pending refresh listeners').optional(),
  'pri.refresh.listeners': z.string().describe('number of pending refresh listeners').optional(),
  'search.fetch_current': z.string().describe('current fetch phase ops').optional(),
  sfc: z.string().describe('current fetch phase ops').optional(),
  searchFetchCurrent: z.string().describe('current fetch phase ops').optional(),
  'pri.search.fetch_current': z.string().describe('current fetch phase ops').optional(),
  'search.fetch_time': z.string().describe('time spent in fetch phase').optional(),
  sfti: z.string().describe('time spent in fetch phase').optional(),
  searchFetchTime: z.string().describe('time spent in fetch phase').optional(),
  'pri.search.fetch_time': z.string().describe('time spent in fetch phase').optional(),
  'search.fetch_total': z.string().describe('total fetch ops').optional(),
  sfto: z.string().describe('total fetch ops').optional(),
  searchFetchTotal: z.string().describe('total fetch ops').optional(),
  'pri.search.fetch_total': z.string().describe('total fetch ops').optional(),
  'search.open_contexts': z.string().describe('open search contexts').optional(),
  so: z.string().describe('open search contexts').optional(),
  searchOpenContexts: z.string().describe('open search contexts').optional(),
  'pri.search.open_contexts': z.string().describe('open search contexts').optional(),
  'search.query_current': z.string().describe('current query phase ops').optional(),
  sqc: z.string().describe('current query phase ops').optional(),
  searchQueryCurrent: z.string().describe('current query phase ops').optional(),
  'pri.search.query_current': z.string().describe('current query phase ops').optional(),
  'search.query_time': z.string().describe('time spent in query phase').optional(),
  sqti: z.string().describe('time spent in query phase').optional(),
  searchQueryTime: z.string().describe('time spent in query phase').optional(),
  'pri.search.query_time': z.string().describe('time spent in query phase').optional(),
  'search.query_total': z.string().describe('total query phase ops').optional(),
  sqto: z.string().describe('total query phase ops').optional(),
  searchQueryTotal: z.string().describe('total query phase ops').optional(),
  'pri.search.query_total': z.string().describe('total query phase ops').optional(),
  'search.scroll_current': z.string().describe('open scroll contexts').optional(),
  scc: z.string().describe('open scroll contexts').optional(),
  searchScrollCurrent: z.string().describe('open scroll contexts').optional(),
  'pri.search.scroll_current': z.string().describe('open scroll contexts').optional(),
  'search.scroll_time': z.string().describe('time scroll contexts held open').optional(),
  scti: z.string().describe('time scroll contexts held open').optional(),
  searchScrollTime: z.string().describe('time scroll contexts held open').optional(),
  'pri.search.scroll_time': z.string().describe('time scroll contexts held open').optional(),
  'search.scroll_total': z.string().describe('completed scroll contexts').optional(),
  scto: z.string().describe('completed scroll contexts').optional(),
  searchScrollTotal: z.string().describe('completed scroll contexts').optional(),
  'pri.search.scroll_total': z.string().describe('completed scroll contexts').optional(),
  'segments.count': z.string().describe('number of segments').optional(),
  sc: z.string().describe('number of segments').optional(),
  segmentsCount: z.string().describe('number of segments').optional(),
  'pri.segments.count': z.string().describe('number of segments').optional(),
  'segments.memory': z.string().describe('memory used by segments').optional(),
  sm: z.string().describe('memory used by segments').optional(),
  segmentsMemory: z.string().describe('memory used by segments').optional(),
  'pri.segments.memory': z.string().describe('memory used by segments').optional(),
  'segments.index_writer_memory': z.string().describe('memory used by index writer').optional(),
  siwm: z.string().describe('memory used by index writer').optional(),
  segmentsIndexWriterMemory: z.string().describe('memory used by index writer').optional(),
  'pri.segments.index_writer_memory': z.string().describe('memory used by index writer').optional(),
  'segments.version_map_memory': z.string().describe('memory used by version map').optional(),
  svmm: z.string().describe('memory used by version map').optional(),
  segmentsVersionMapMemory: z.string().describe('memory used by version map').optional(),
  'pri.segments.version_map_memory': z.string().describe('memory used by version map').optional(),
  'segments.fixed_bitset_memory': z.string().describe('memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields').optional(),
  sfbm: z.string().describe('memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields').optional(),
  fixedBitsetMemory: z.string().describe('memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields').optional(),
  'pri.segments.fixed_bitset_memory': z.string().describe('memory used by fixed bit sets for nested object field types and export type filters for types referred in _parent fields').optional(),
  'warmer.current': z.string().describe('current warmer ops').optional(),
  wc: z.string().describe('current warmer ops').optional(),
  warmerCurrent: z.string().describe('current warmer ops').optional(),
  'pri.warmer.current': z.string().describe('current warmer ops').optional(),
  'warmer.total': z.string().describe('total warmer ops').optional(),
  wto: z.string().describe('total warmer ops').optional(),
  warmerTotal: z.string().describe('total warmer ops').optional(),
  'pri.warmer.total': z.string().describe('total warmer ops').optional(),
  'warmer.total_time': z.string().describe('time spent in warmers').optional(),
  wtt: z.string().describe('time spent in warmers').optional(),
  warmerTotalTime: z.string().describe('time spent in warmers').optional(),
  'pri.warmer.total_time': z.string().describe('time spent in warmers').optional(),
  'suggest.current': z.string().describe('number of current suggest ops').optional(),
  suc: z.string().describe('number of current suggest ops').optional(),
  suggestCurrent: z.string().describe('number of current suggest ops').optional(),
  'pri.suggest.current': z.string().describe('number of current suggest ops').optional(),
  'suggest.time': z.string().describe('time spend in suggest').optional(),
  suti: z.string().describe('time spend in suggest').optional(),
  suggestTime: z.string().describe('time spend in suggest').optional(),
  'pri.suggest.time': z.string().describe('time spend in suggest').optional(),
  'suggest.total': z.string().describe('number of suggest ops').optional(),
  suto: z.string().describe('number of suggest ops').optional(),
  suggestTotal: z.string().describe('number of suggest ops').optional(),
  'pri.suggest.total': z.string().describe('number of suggest ops').optional(),
  'memory.total': z.string().describe('total used memory').optional(),
  tm: z.string().describe('total used memory').optional(),
  memoryTotal: z.string().describe('total used memory').optional(),
  'pri.memory.total': z.string().describe('total user memory').optional(),
  'search.throttled': z.string().describe('indicates if the index is search throttled').optional(),
  sth: z.string().describe('indicates if the index is search throttled').optional(),
  'bulk.total_operations': z.string().describe('number of bulk shard ops').optional(),
  bto: z.string().describe('number of bulk shard ops').optional(),
  bulkTotalOperation: z.string().describe('number of bulk shard ops').optional(),
  'pri.bulk.total_operations': z.string().describe('number of bulk shard ops').optional(),
  'bulk.total_time': z.string().describe('time spend in shard bulk').optional(),
  btti: z.string().describe('time spend in shard bulk').optional(),
  bulkTotalTime: z.string().describe('time spend in shard bulk').optional(),
  'pri.bulk.total_time': z.string().describe('time spend in shard bulk').optional(),
  'bulk.total_size_in_bytes': z.string().describe('total size in bytes of shard bulk').optional(),
  btsi: z.string().describe('total size in bytes of shard bulk').optional(),
  bulkTotalSizeInBytes: z.string().describe('total size in bytes of shard bulk').optional(),
  'pri.bulk.total_size_in_bytes': z.string().describe('total size in bytes of shard bulk').optional(),
  'bulk.avg_time': z.string().describe('average time spend in shard bulk').optional(),
  bati: z.string().describe('average time spend in shard bulk').optional(),
  bulkAvgTime: z.string().describe('average time spend in shard bulk').optional(),
  'pri.bulk.avg_time': z.string().describe('average time spend in shard bulk').optional(),
  'bulk.avg_size_in_bytes': z.string().describe('average size in bytes of shard bulk').optional(),
  basi: z.string().describe('average size in bytes of shard bulk').optional(),
  bulkAvgSizeInBytes: z.string().describe('average size in bytes of shard bulk').optional(),
  'pri.bulk.avg_size_in_bytes': z.string().describe('average size in bytes of shard bulk').optional()
}).meta({ id: 'CatIndicesIndicesRecord' })
export type CatIndicesIndicesRecord = z.infer<typeof CatIndicesIndicesRecord>

/**
 * Get index information.
 *
 * Get high-level information about indices in a cluster, including backing indices for data streams.
 *
 * Use this request to get the following information for each index in a cluster:
 * - shard count
 * - document count
 * - deleted document count
 * - primary store size
 * - total store size of all shards, including shard replicas
 *
 * These metrics are retrieved directly from Lucene, which Elasticsearch uses internally to power indexing and search. As a result, all document counts include hidden nested documents.
 * To get an accurate count of Elasticsearch documents, use the cat count or count APIs.
 *
 * NOTE: Storage metrics reported by this API reflect the post-compression size of the indices on disk. Because these values are calculated after Elasticsearch compresses the data and processes deletions, they are typically significantly smaller than the raw, uncompressed data volume ingested.
 *
 * IMPORTANT: For Elastic Cloud Serverless, ingest billing is based on the raw, uncompressed data volume, not the post-compression metrics reported here. To learn more, refer to [Elasticsearch billing dimensions](https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/elasticsearch-billing-dimensions).
 *
 * CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use an index endpoint.
 */
export const CatIndicesRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match.').optional().meta({ found_in: 'query' }),
  health: HealthStatus.describe('The health status used to limit returned indices. By default, the response includes indices of any health status.').optional().meta({ found_in: 'query' }),
  include_unloaded_segments: z.boolean().describe('If true, the response includes information from segments that are not loaded into memory.').optional().meta({ found_in: 'query' }),
  pri: z.boolean().describe('If true, the response only includes information from primary shards.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  h: CatCatIndicesColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatIndicesRequest' })
export type CatIndicesRequest = z.infer<typeof CatIndicesRequest>

export const CatIndicesResponse = z.array(CatIndicesIndicesRecord).meta({ id: 'CatIndicesResponse' })
export type CatIndicesResponse = z.infer<typeof CatIndicesResponse>
