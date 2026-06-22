/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SpecUtilsStringified } from './_spec_utils'
import { ByteSize, DateTime, Duration, EpochTime, ExpandWildcards, Fields, HealthStatus, Host, Id, IndexName, Indices, Ip, Name, Names, NodeId, NodeIds, Percentage, RequestBase, TimeOfDay, VersionString, integer } from './_types'
import { MlCategorizationStatus, MlDatafeedState, MlJobState, MlMemoryStatus } from './ml'
import { WatcherScheduleTimeOfDay } from './watcher'

export const CatCatAliasesColumn = z.union([z.enum(['alias', 'a', 'index', 'i', 'idx', 'filter', 'f', 'fi', 'routing.index', 'ri', 'routingIndex', 'routing.search', 'rs', 'routingSearch', 'is_write_index', 'w', 'isWriteIndex']), z.string()]).meta({ id: 'CatCatAliasesColumn' })
export type CatCatAliasesColumn = z.infer<typeof CatCatAliasesColumn>

export const CatCatAliasesColumns = z.union([CatCatAliasesColumn, z.array(CatCatAliasesColumn)]).meta({ id: 'CatCatAliasesColumns' })
export type CatCatAliasesColumns = z.infer<typeof CatCatAliasesColumns>

export const CatCatAllocationColumn = z.union([z.enum(['shards', 's', 'shards.undesired', 'write_load.forecast', 'wlf', 'writeLoadForecast', 'disk.indices.forecast', 'dif', 'diskIndicesForecast', 'disk.indices', 'di', 'diskIndices', 'disk.used', 'du', 'diskUsed', 'disk.avail', 'da', 'diskAvail', 'disk.total', 'dt', 'diskTotal', 'disk.percent', 'dp', 'diskPercent', 'host', 'h', 'ip', 'node', 'n', 'node.role', 'r', 'role', 'nodeRole']), z.string()]).meta({ id: 'CatCatAllocationColumn' })
export type CatCatAllocationColumn = z.infer<typeof CatCatAllocationColumn>

export const CatCatAllocationColumns = z.union([CatCatAllocationColumn, z.array(CatCatAllocationColumn)]).meta({ id: 'CatCatAllocationColumns' })
export type CatCatAllocationColumns = z.infer<typeof CatCatAllocationColumns>

export const CatCatAnomalyDetectorColumn = z.enum(['assignment_explanation', 'ae', 'buckets.count', 'bc', 'bucketsCount', 'buckets.time.exp_avg', 'btea', 'bucketsTimeExpAvg', 'buckets.time.exp_avg_hour', 'bteah', 'bucketsTimeExpAvgHour', 'buckets.time.max', 'btmax', 'bucketsTimeMax', 'buckets.time.min', 'btmin', 'bucketsTimeMin', 'buckets.time.total', 'btt', 'bucketsTimeTotal', 'data.buckets', 'db', 'dataBuckets', 'data.earliest_record', 'der', 'dataEarliestRecord', 'data.empty_buckets', 'deb', 'dataEmptyBuckets', 'data.input_bytes', 'dib', 'dataInputBytes', 'data.input_fields', 'dif', 'dataInputFields', 'data.input_records', 'dir', 'dataInputRecords', 'data.invalid_dates', 'did', 'dataInvalidDates', 'data.last', 'dl', 'dataLast', 'data.last_empty_bucket', 'dleb', 'dataLastEmptyBucket', 'data.last_sparse_bucket', 'dlsb', 'dataLastSparseBucket', 'data.latest_record', 'dlr', 'dataLatestRecord', 'data.missing_fields', 'dmf', 'dataMissingFields', 'data.out_of_order_timestamps', 'doot', 'dataOutOfOrderTimestamps', 'data.processed_fields', 'dpf', 'dataProcessedFields', 'data.processed_records', 'dpr', 'dataProcessedRecords', 'data.sparse_buckets', 'dsb', 'dataSparseBuckets', 'forecasts.memory.avg', 'fmavg', 'forecastsMemoryAvg', 'forecasts.memory.max', 'fmmax', 'forecastsMemoryMax', 'forecasts.memory.min', 'fmmin', 'forecastsMemoryMin', 'forecasts.memory.total', 'fmt', 'forecastsMemoryTotal', 'forecasts.records.avg', 'fravg', 'forecastsRecordsAvg', 'forecasts.records.max', 'frmax', 'forecastsRecordsMax', 'forecasts.records.min', 'frmin', 'forecastsRecordsMin', 'forecasts.records.total', 'frt', 'forecastsRecordsTotal', 'forecasts.time.avg', 'ftavg', 'forecastsTimeAvg', 'forecasts.time.max', 'ftmax', 'forecastsTimeMax', 'forecasts.time.min', 'ftmin', 'forecastsTimeMin', 'forecasts.time.total', 'ftt', 'forecastsTimeTotal', 'forecasts.total', 'ft', 'forecastsTotal', 'id', 'model.bucket_allocation_failures', 'mbaf', 'modelBucketAllocationFailures', 'model.by_fields', 'mbf', 'modelByFields', 'model.bytes', 'mb', 'modelBytes', 'model.bytes_exceeded', 'mbe', 'modelBytesExceeded', 'model.categorization_status', 'mcs', 'modelCategorizationStatus', 'model.categorized_doc_count', 'mcdc', 'modelCategorizedDocCount', 'model.dead_category_count', 'mdcc', 'modelDeadCategoryCount', 'model.failed_category_count', 'mdcc', 'modelFailedCategoryCount', 'model.frequent_category_count', 'mfcc', 'modelFrequentCategoryCount', 'model.log_time', 'mlt', 'modelLogTime', 'model.memory_limit', 'mml', 'modelMemoryLimit', 'model.memory_status', 'mms', 'modelMemoryStatus', 'model.over_fields', 'mof', 'modelOverFields', 'model.partition_fields', 'mpf', 'modelPartitionFields', 'model.rare_category_count', 'mrcc', 'modelRareCategoryCount', 'model.timestamp', 'mt', 'modelTimestamp', 'model.total_category_count', 'mtcc', 'modelTotalCategoryCount', 'node.address', 'na', 'nodeAddress', 'node.ephemeral_id', 'ne', 'nodeEphemeralId', 'node.id', 'ni', 'nodeId', 'node.name', 'nn', 'nodeName', 'opened_time', 'ot', 'state', 's']).meta({ id: 'CatCatAnomalyDetectorColumn' })
export type CatCatAnomalyDetectorColumn = z.infer<typeof CatCatAnomalyDetectorColumn>

export const CatCatAnomalyDetectorColumns = z.union([CatCatAnomalyDetectorColumn, z.array(CatCatAnomalyDetectorColumn)]).meta({ id: 'CatCatAnomalyDetectorColumns' })
export type CatCatAnomalyDetectorColumns = z.infer<typeof CatCatAnomalyDetectorColumns>

export const CatCatCircuitBreakerColumn = z.union([z.enum(['node_id', 'id', 'node_name', 'nn', 'breaker', 'br', 'limit', 'l', 'limit_bytes', 'lb', 'estimated', 'e', 'estimated_bytes', 'eb', 'tripped', 't', 'overhead', 'o']), z.string()]).meta({ id: 'CatCatCircuitBreakerColumn' })
export type CatCatCircuitBreakerColumn = z.infer<typeof CatCatCircuitBreakerColumn>

export const CatCatCircuitBreakerColumns = z.union([CatCatCircuitBreakerColumn, z.array(CatCatCircuitBreakerColumn)]).meta({ id: 'CatCatCircuitBreakerColumns' })
export type CatCatCircuitBreakerColumns = z.infer<typeof CatCatCircuitBreakerColumns>

export const CatCatComponentColumn = z.union([z.enum(['name', 'n', 'version', 'v', 'alias_count', 'a', 'mapping_count', 'm', 'settings_count', 's', 'metadata_count', 'me', 'included_in', 'i']), z.string()]).meta({ id: 'CatCatComponentColumn' })
export type CatCatComponentColumn = z.infer<typeof CatCatComponentColumn>

export const CatCatComponentColumns = z.union([CatCatComponentColumn, z.array(CatCatComponentColumn)]).meta({ id: 'CatCatComponentColumns' })
export type CatCatComponentColumns = z.infer<typeof CatCatComponentColumns>

export const CatCatCountColumn = z.union([z.enum(['epoch', 't', 'time', 'timestamp', 'ts', 'hms', 'hhmmss', 'count', 'dc', 'docs.count', 'docsCount']), z.string()]).meta({ id: 'CatCatCountColumn' })
export type CatCatCountColumn = z.infer<typeof CatCatCountColumn>

export const CatCatCountColumns = z.union([CatCatCountColumn, z.array(CatCatCountColumn)]).meta({ id: 'CatCatCountColumns' })
export type CatCatCountColumns = z.infer<typeof CatCatCountColumns>

export const CatCatDatafeedColumn = z.enum(['ae', 'assignment_explanation', 'bc', 'buckets.count', 'bucketsCount', 'id', 'na', 'node.address', 'nodeAddress', 'ne', 'node.ephemeral_id', 'nodeEphemeralId', 'ni', 'node.id', 'nodeId', 'nn', 'node.name', 'nodeName', 'sba', 'search.bucket_avg', 'searchBucketAvg', 'sc', 'search.count', 'searchCount', 'seah', 'search.exp_avg_hour', 'searchExpAvgHour', 'st', 'search.time', 'searchTime', 's', 'state']).meta({ id: 'CatCatDatafeedColumn' })
export type CatCatDatafeedColumn = z.infer<typeof CatCatDatafeedColumn>

export const CatCatDatafeedColumns = z.union([CatCatDatafeedColumn, z.array(CatCatDatafeedColumn)]).meta({ id: 'CatCatDatafeedColumns' })
export type CatCatDatafeedColumns = z.infer<typeof CatCatDatafeedColumns>

export const CatCatDfaColumn = z.enum(['assignment_explanation', 'ae', 'create_time', 'ct', 'createTime', 'description', 'd', 'dest_index', 'di', 'destIndex', 'failure_reason', 'fr', 'failureReason', 'id', 'model_memory_limit', 'mml', 'modelMemoryLimit', 'node.address', 'na', 'nodeAddress', 'node.ephemeral_id', 'ne', 'nodeEphemeralId', 'node.id', 'ni', 'nodeId', 'node.name', 'nn', 'nodeName', 'progress', 'p', 'source_index', 'si', 'sourceIndex', 'state', 's', 'type', 't', 'version', 'v']).meta({ id: 'CatCatDfaColumn' })
export type CatCatDfaColumn = z.infer<typeof CatCatDfaColumn>

export const CatCatDfaColumns = z.union([CatCatDfaColumn, z.array(CatCatDfaColumn)]).meta({ id: 'CatCatDfaColumns' })
export type CatCatDfaColumns = z.infer<typeof CatCatDfaColumns>

export const CatCatFieldDataColumn = z.union([z.enum(['id', 'host', 'h', 'ip', 'node', 'n', 'field', 'f', 'size', 's']), z.string()]).meta({ id: 'CatCatFieldDataColumn' })
export type CatCatFieldDataColumn = z.infer<typeof CatCatFieldDataColumn>

export const CatCatFieldDataColumns = z.union([CatCatFieldDataColumn, z.array(CatCatFieldDataColumn)]).meta({ id: 'CatCatFieldDataColumns' })
export type CatCatFieldDataColumns = z.infer<typeof CatCatFieldDataColumns>

export const CatCatHealthColumn = z.union([z.enum(['epoch', 't', 'time', 'timestamp', 'ts', 'hms', 'hhmmss', 'cluster', 'cl', 'status', 'st', 'node.total', 'nt', 'nodeTotal', 'node.data', 'nd', 'nodeData', 'shards', 't', 'sh', 'shards.total', 'shardsTotal', 'pri', 'p', 'shards.primary', 'shardsPrimary', 'relo', 'r', 'shards.relocating', 'shardsRelocating', 'init', 'i', 'shards.initializing', 'shardsInitializing', 'unassign', 'u', 'shards.unassigned', 'shardsUnassigned', 'unassign.pri', 'up', 'shards.unassigned.primary', 'shardsUnassignedPrimary', 'pending_tasks', 'pt', 'pendingTasks', 'max_task_wait_time', 'mtwt', 'maxTaskWaitTime', 'active_shards_percent', 'asp', 'activeShardsPercent']), z.string()]).meta({ id: 'CatCatHealthColumn' })
export type CatCatHealthColumn = z.infer<typeof CatCatHealthColumn>

export const CatCatHealthColumns = z.union([CatCatHealthColumn, z.array(CatCatHealthColumn)]).meta({ id: 'CatCatHealthColumns' })
export type CatCatHealthColumns = z.infer<typeof CatCatHealthColumns>

export const CatCatIndicesColumn = z.union([z.enum(['health', 'h', 'status', 's', 'index', 'i', 'idx', 'uuid', 'id', 'uuid', 'pri', 'p', 'shards.primary', 'shardsPrimary', 'rep', 'r', 'shards.replica', 'shardsReplica', 'docs.count', 'dc', 'docsCount', 'docs.deleted', 'dd', 'docsDeleted', 'creation.date', 'cd', 'creation.date.string', 'cds', 'store.size', 'ss', 'storeSize', 'pri.store.size', 'dataset.size', 'completion.size', 'cs', 'completionSize', 'pri.completion.size', 'fielddata.memory_size', 'fm', 'fielddataMemory', 'pri.fielddata.memory_size', 'fielddata.evictions', 'fe', 'fielddataEvictions', 'pri.fielddata.evictions', 'query_cache.memory_size', 'qcm', 'queryCacheMemory', 'pri.query_cache.memory_size', 'query_cache.evictions', 'qce', 'queryCacheEvictions', 'pri.query_cache.evictions', 'request_cache.memory_size', 'rcm', 'requestCacheMemory', 'pri.request_cache.memory_size', 'request_cache.evictions', 'rce', 'requestCacheEvictions', 'pri.request_cache.evictions', 'request_cache.hit_count', 'rchc', 'requestCacheHitCount', 'pri.request_cache.hit_count', 'request_cache.miss_count', 'rcmc', 'requestCacheMissCount', 'pri.request_cache.miss_count', 'flush.total', 'ft', 'flushTotal', 'pri.flush.total', 'flush.total_time', 'ftt', 'flushTotalTime', 'pri.flush.total_time', 'get.current', 'gc', 'getCurrent', 'pri.get.current', 'get.time', 'gti', 'getTime', 'pri.get.time', 'get.total', 'gto', 'getTotal', 'pri.get.total', 'get.exists_time', 'geti', 'getExistsTime', 'pri.get.exists_time', 'get.exists_total', 'geto', 'getExistsTotal', 'pri.get.exists_total', 'get.missing_time', 'gmti', 'getMissingTime', 'pri.get.missing_time', 'get.missing_total', 'gmto', 'getMissingTotal', 'pri.get.missing_total', 'indexing.delete_current', 'idc', 'indexingDeleteCurrent', 'pri.indexing.delete_current', 'indexing.delete_time', 'idti', 'indexingDeleteTime', 'pri.indexing.delete_time', 'indexing.delete_total', 'idto', 'indexingDeleteTotal', 'pri.indexing.delete_total', 'indexing.index_current', 'iic', 'indexingIndexCurrent', 'pri.indexing.index_current', 'indexing.index_time', 'iiti', 'indexingIndexTime', 'pri.indexing.index_time', 'indexing.index_total', 'iito', 'indexingIndexTotal', 'pri.indexing.index_total', 'indexing.index_failed', 'iif', 'indexingIndexFailed', 'pri.indexing.index_failed', 'indexing.index_failed_due_to_version_conflict', 'iifvc', 'indexingIndexFailedDueToVersionConflict', 'pri.indexing.index_failed_due_to_version_conflict', 'merges.current', 'mc', 'mergesCurrent', 'pri.merges.current', 'merges.current_docs', 'mcd', 'mergesCurrentDocs', 'pri.merges.current_docs', 'merges.current_size', 'mcs', 'mergesCurrentSize', 'pri.merges.current_size', 'merges.total', 'mt', 'mergesTotal', 'pri.merges.total', 'merges.total_docs', 'mtd', 'mergesTotalDocs', 'pri.merges.total_docs', 'merges.total_size', 'mts', 'mergesTotalSize', 'pri.merges.total_size', 'merges.total_time', 'mtt', 'mergesTotalTime', 'pri.merges.total_time', 'refresh.total', 'rto', 'refreshTotal', 'pri.refresh.total', 'refresh.time', 'rti', 'refreshTime', 'pri.refresh.time', 'refresh.external_total', 'rto', 'refreshTotal', 'pri.refresh.external_total', 'refresh.external_time', 'rti', 'refreshTime', 'pri.refresh.external_time', 'refresh.listeners', 'rli', 'refreshListeners', 'pri.refresh.listeners', 'search.fetch_current', 'sfc', 'searchFetchCurrent', 'pri.search.fetch_current', 'search.fetch_time', 'sfti', 'searchFetchTime', 'pri.search.fetch_time', 'search.fetch_total', 'sfto', 'searchFetchTotal', 'pri.search.fetch_total', 'search.open_contexts', 'so', 'searchOpenContexts', 'pri.search.open_contexts', 'search.query_current', 'sqc', 'searchQueryCurrent', 'pri.search.query_current', 'search.query_time', 'sqti', 'searchQueryTime', 'pri.search.query_time', 'search.query_total', 'sqto', 'searchQueryTotal', 'pri.search.query_total', 'search.scroll_current', 'scc', 'searchScrollCurrent', 'pri.search.scroll_current', 'search.scroll_time', 'scti', 'searchScrollTime', 'pri.search.scroll_time', 'search.scroll_total', 'scto', 'searchScrollTotal', 'pri.search.scroll_total', 'segments.count', 'sc', 'segmentsCount', 'pri.segments.count', 'segments.memory', 'sm', 'segmentsMemory', 'pri.segments.memory', 'segments.index_writer_memory', 'siwm', 'segmentsIndexWriterMemory', 'pri.segments.index_writer_memory', 'segments.version_map_memory', 'svmm', 'segmentsVersionMapMemory', 'pri.segments.version_map_memory', 'segments.fixed_bitset_memory', 'sfbm', 'fixedBitsetMemory', 'pri.segments.fixed_bitset_memory', 'warmer.current', 'wc', 'warmerCurrent', 'pri.warmer.current', 'warmer.total', 'wto', 'warmerTotal', 'pri.warmer.total', 'warmer.total_time', 'wtt', 'warmerTotalTime', 'pri.warmer.total_time', 'suggest.current', 'suc', 'suggestCurrent', 'pri.suggest.current', 'suggest.time', 'suti', 'suggestTime', 'pri.suggest.time', 'suggest.total', 'suto', 'suggestTotal', 'pri.suggest.total', 'memory.total', 'tm', 'memoryTotal', 'pri.memory.total', 'bulk.total_operations', 'bto', 'bulkTotalOperation', 'pri.bulk.total_operations', 'bulk.total_time', 'btti', 'bulkTotalTime', 'pri.bulk.total_time', 'bulk.total_size_in_bytes', 'btsi', 'bulkTotalSizeInBytes', 'pri.bulk.total_size_in_bytes', 'bulk.avg_time', 'bati', 'bulkAvgTime', 'pri.bulk.avg_time', 'bulk.avg_size_in_bytes', 'basi', 'bulkAvgSizeInBytes', 'pri.bulk.avg_size_in_bytes', 'dense_vector.value_count', 'dvc', 'denseVectorCount', 'pri.dense_vector.value_count', 'sparse_vector.value_count', 'svc', 'sparseVectorCount', 'pri.sparse_vector.value_count']), z.string()]).meta({ id: 'CatCatIndicesColumn' })
export type CatCatIndicesColumn = z.infer<typeof CatCatIndicesColumn>

export const CatCatIndicesColumns = z.union([CatCatIndicesColumn, z.array(CatCatIndicesColumn)]).meta({ id: 'CatCatIndicesColumns' })
export type CatCatIndicesColumns = z.infer<typeof CatCatIndicesColumns>

export const CatCatMasterColumn = z.union([z.enum(['id', 'host', 'h', 'ip', 'node', 'n']), z.string()]).meta({ id: 'CatCatMasterColumn' })
export type CatCatMasterColumn = z.infer<typeof CatCatMasterColumn>

export const CatCatMasterColumns = z.union([CatCatMasterColumn, z.array(CatCatMasterColumn)]).meta({ id: 'CatCatMasterColumns' })
export type CatCatMasterColumns = z.infer<typeof CatCatMasterColumns>

export const CatCatNodeColumn = z.union([z.enum(['build', 'b', 'completion.size', 'cs', 'completionSize', 'cpu', 'disk.avail', 'd', 'disk', 'diskAvail', 'disk.total', 'dt', 'diskTotal', 'disk.used', 'du', 'diskUsed', 'disk.used_percent', 'dup', 'diskUsedPercent', 'fielddata.evictions', 'fe', 'fielddataEvictions', 'fielddata.memory_size', 'fm', 'fielddataMemory', 'file_desc.current', 'fdc', 'fileDescriptorCurrent', 'file_desc.max', 'fdm', 'fileDescriptorMax', 'file_desc.percent', 'fdp', 'fileDescriptorPercent', 'flush.total', 'ft', 'flushTotal', 'flush.total_time', 'ftt', 'flushTotalTime', 'get.current', 'gc', 'getCurrent', 'get.exists_time', 'geti', 'getExistsTime', 'get.exists_total', 'geto', 'getExistsTotal', 'get.missing_time', 'gmti', 'getMissingTime', 'get.missing_total', 'gmto', 'getMissingTotal', 'get.time', 'gti', 'getTime', 'get.total', 'gto', 'getTotal', 'heap.current', 'hc', 'heapCurrent', 'heap.max', 'hm', 'heapMax', 'heap.percent', 'hp', 'heapPercent', 'http_address', 'http', 'id', 'nodeId', 'indexing.delete_current', 'idc', 'indexingDeleteCurrent', 'indexing.delete_time', 'idti', 'indexingDeleteTime', 'indexing.delete_total', 'idto', 'indexingDeleteTotal', 'indexing.index_current', 'iic', 'indexingIndexCurrent', 'indexing.index_failed', 'iif', 'indexingIndexFailed', 'indexing.index_failed_due_to_version_conflict', 'iifvc', 'indexingIndexFailedDueToVersionConflict', 'indexing.index_time', 'iiti', 'indexingIndexTime', 'indexing.index_total', 'iito', 'indexingIndexTotal', 'ip', 'i', 'jdk', 'j', 'load_1m', 'l', 'load_5m', 'l', 'load_15m', 'l', 'available_processors', 'ap', 'mappings.total_count', 'mtc', 'mappingsTotalCount', 'mappings.total_estimated_overhead_in_bytes', 'mteo', 'mappingsTotalEstimatedOverheadInBytes', 'master', 'm', 'merges.current', 'mc', 'mergesCurrent', 'merges.current_docs', 'mcd', 'mergesCurrentDocs', 'merges.current_size', 'mcs', 'mergesCurrentSize', 'merges.total', 'mt', 'mergesTotal', 'merges.total_docs', 'mtd', 'mergesTotalDocs', 'merges.total_size', 'mts', 'mergesTotalSize', 'merges.total_time', 'mtt', 'mergesTotalTime', 'name', 'n', 'node.role', 'r', 'role', 'nodeRole', 'pid', 'p', 'port', 'po', 'query_cache.memory_size', 'qcm', 'queryCacheMemory', 'query_cache.evictions', 'qce', 'queryCacheEvictions', 'query_cache.hit_count', 'qchc', 'queryCacheHitCount', 'query_cache.miss_count', 'qcmc', 'queryCacheMissCount', 'ram.current', 'rc', 'ramCurrent', 'ram.max', 'rm', 'ramMax', 'ram.percent', 'rp', 'ramPercent', 'refresh.total', 'rto', 'refreshTotal', 'refresh.time', 'rti', 'refreshTime', 'request_cache.memory_size', 'rcm', 'requestCacheMemory', 'request_cache.evictions', 'rce', 'requestCacheEvictions', 'request_cache.hit_count', 'rchc', 'requestCacheHitCount', 'request_cache.miss_count', 'rcmc', 'requestCacheMissCount', 'script.compilations', 'scrcc', 'scriptCompilations', 'script.cache_evictions', 'scrce', 'scriptCacheEvictions', 'search.fetch_current', 'sfc', 'searchFetchCurrent', 'search.fetch_time', 'sfti', 'searchFetchTime', 'search.fetch_total', 'sfto', 'searchFetchTotal', 'search.open_contexts', 'so', 'searchOpenContexts', 'search.query_current', 'sqc', 'searchQueryCurrent', 'search.query_time', 'sqti', 'searchQueryTime', 'search.query_total', 'sqto', 'searchQueryTotal', 'search.scroll_current', 'scc', 'searchScrollCurrent', 'search.scroll_time', 'scti', 'searchScrollTime', 'search.scroll_total', 'scto', 'searchScrollTotal', 'segments.count', 'sc', 'segmentsCount', 'segments.fixed_bitset_memory', 'sfbm', 'fixedBitsetMemory', 'segments.index_writer_memory', 'siwm', 'segmentsIndexWriterMemory', 'segments.memory', 'sm', 'segmentsMemory', 'segments.version_map_memory', 'svmm', 'segmentsVersionMapMemory', 'shard_stats.total_count', 'sstc', 'shards', 'shardStatsTotalCount', 'suggest.current', 'suc', 'suggestCurrent', 'suggest.time', 'suti', 'suggestTime', 'suggest.total', 'suto', 'suggestTotal', 'uptime', 'u', 'version', 'v']), z.string()]).meta({ id: 'CatCatNodeColumn' })
export type CatCatNodeColumn = z.infer<typeof CatCatNodeColumn>

export const CatCatNodeColumns = z.union([CatCatNodeColumn, z.array(CatCatNodeColumn)]).meta({ id: 'CatCatNodeColumns' })
export type CatCatNodeColumns = z.infer<typeof CatCatNodeColumns>

export const CatCatNodeattrsColumn = z.union([z.enum(['node', 'id', 'id', 'nodeId', 'pid', 'p', 'host', 'h', 'ip', 'i', 'port', 'po', 'attr', 'attr.name', 'value', 'attr.value']), z.string()]).meta({ id: 'CatCatNodeattrsColumn' })
export type CatCatNodeattrsColumn = z.infer<typeof CatCatNodeattrsColumn>

export const CatCatNodeattrsColumns = z.union([CatCatNodeattrsColumn, z.array(CatCatNodeattrsColumn)]).meta({ id: 'CatCatNodeattrsColumns' })
export type CatCatNodeattrsColumns = z.infer<typeof CatCatNodeattrsColumns>

export const CatCatPendingTasksColumn = z.union([z.enum(['insertOrder', 'o', 'timeInQueue', 't', 'priority', 'p', 'source', 's']), z.string()]).meta({ id: 'CatCatPendingTasksColumn' })
export type CatCatPendingTasksColumn = z.infer<typeof CatCatPendingTasksColumn>

export const CatCatPendingTasksColumns = z.union([CatCatPendingTasksColumn, z.array(CatCatPendingTasksColumn)]).meta({ id: 'CatCatPendingTasksColumns' })
export type CatCatPendingTasksColumns = z.infer<typeof CatCatPendingTasksColumns>

export const CatCatPluginsColumn = z.union([z.enum(['id', 'name', 'n', 'component', 'c', 'version', 'v', 'description', 'd']), z.string()]).meta({ id: 'CatCatPluginsColumn' })
export type CatCatPluginsColumn = z.infer<typeof CatCatPluginsColumn>

export const CatCatPluginsColumns = z.union([CatCatPluginsColumn, z.array(CatCatPluginsColumn)]).meta({ id: 'CatCatPluginsColumns' })
export type CatCatPluginsColumns = z.infer<typeof CatCatPluginsColumns>

export const CatCatRecoveryColumn = z.union([z.enum(['index', 'i', 'idx', 'shard', 's', 'sh', 'start_time', 'start', 'start_time_millis', 'start_millis', 'stop_time', 'stop', 'stop_time_millis', 'stop_millis', 'time', 't', 'ti', 'type', 'ty', 'stage', 'st', 'source_host', 'shost', 'source_node', 'snode', 'target_host', 'thost', 'target_node', 'tnode', 'repository', 'rep', 'snapshot', 'snap', 'files', 'f', 'files_recovered', 'fr', 'files_percent', 'fp', 'files_total', 'tf', 'bytes', 'b', 'bytes_recovered', 'br', 'bytes_percent', 'bp', 'bytes_total', 'tb', 'translog_ops', 'to', 'translog_ops_recovered', 'tor', 'translog_ops_percent', 'top']), z.string()]).meta({ id: 'CatCatRecoveryColumn' })
export type CatCatRecoveryColumn = z.infer<typeof CatCatRecoveryColumn>

export const CatCatRecoveryColumns = z.union([CatCatRecoveryColumn, z.array(CatCatRecoveryColumn)]).meta({ id: 'CatCatRecoveryColumns' })
export type CatCatRecoveryColumns = z.infer<typeof CatCatRecoveryColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatSegmentsColumn = z.union([z.enum(['index', 'i', 'idx', 'shard', 's', 'sh', 'prirep', 'p', 'pr', 'primaryOrReplica', 'ip', 'segment', 'generation', 'docs.count', 'docs.deleted', 'size', 'size.memory', 'committed', 'searchable', 'version', 'compound', 'id']), z.string()]).meta({ id: 'CatCatSegmentsColumn' })
export type CatCatSegmentsColumn = z.infer<typeof CatCatSegmentsColumn>

export const CatCatSegmentsColumns = z.union([CatCatSegmentsColumn, z.array(CatCatSegmentsColumn)]).meta({ id: 'CatCatSegmentsColumns' })
export type CatCatSegmentsColumns = z.infer<typeof CatCatSegmentsColumns>

export const CatCatShardColumn = z.union([z.enum(['completion.size', 'cs', 'completionSize', 'dataset.size', 'dense_vector.value_count', 'dvc', 'denseVectorCount', 'docs', 'd', 'dc', 'fielddata.evictions', 'fe', 'fielddataEvictions', 'fielddata.memory_size', 'fm', 'fielddataMemory', 'flush.total', 'ft', 'flushTotal', 'flush.total_time', 'ftt', 'flushTotalTime', 'get.current', 'gc', 'getCurrent', 'get.exists_time', 'geti', 'getExistsTime', 'get.exists_total', 'geto', 'getExistsTotal', 'get.missing_time', 'gmti', 'getMissingTime', 'get.missing_total', 'gmto', 'getMissingTotal', 'get.time', 'gti', 'getTime', 'get.total', 'gto', 'getTotal', 'id', 'index', 'i', 'idx', 'indexing.delete_current', 'idc', 'indexingDeleteCurrent', 'indexing.delete_time', 'idti', 'indexingDeleteTime', 'indexing.delete_total', 'idto', 'indexingDeleteTotal', 'indexing.index_current', 'iic', 'indexingIndexCurrent', 'indexing.index_failed_due_to_version_conflict', 'iifvc', 'indexingIndexFailedDueToVersionConflict', 'indexing.index_failed', 'iif', 'indexingIndexFailed', 'indexing.index_time', 'iiti', 'indexingIndexTime', 'indexing.index_total', 'iito', 'indexingIndexTotal', 'ip', 'merges.current', 'mc', 'mergesCurrent', 'merges.current_docs', 'mcd', 'mergesCurrentDocs', 'merges.current_size', 'mcs', 'mergesCurrentSize', 'merges.total', 'mt', 'mergesTotal', 'merges.total_docs', 'mtd', 'mergesTotalDocs', 'merges.total_size', 'mts', 'mergesTotalSize', 'merges.total_time', 'mtt', 'mergesTotalTime', 'node', 'n', 'prirep', 'p', 'pr', 'primaryOrReplica', 'query_cache.evictions', 'qce', 'queryCacheEvictions', 'query_cache.memory_size', 'qcm', 'queryCacheMemory', 'recoverysource.type', 'rs', 'refresh.time', 'rti', 'refreshTime', 'refresh.total', 'rto', 'refreshTotal', 'search.fetch_current', 'sfc', 'searchFetchCurrent', 'search.fetch_time', 'sfti', 'searchFetchTime', 'search.fetch_total', 'sfto', 'searchFetchTotal', 'search.open_contexts', 'so', 'searchOpenContexts', 'search.query_current', 'sqc', 'searchQueryCurrent', 'search.query_time', 'sqti', 'searchQueryTime', 'search.query_total', 'sqto', 'searchQueryTotal', 'search.scroll_current', 'scc', 'searchScrollCurrent', 'search.scroll_time', 'scti', 'searchScrollTime', 'search.scroll_total', 'scto', 'searchScrollTotal', 'segments.count', 'sc', 'segmentsCount', 'segments.fixed_bitset_memory', 'sfbm', 'fixedBitsetMemory', 'segments.index_writer_memory', 'siwm', 'segmentsIndexWriterMemory', 'segments.memory', 'sm', 'segmentsMemory', 'segments.version_map_memory', 'svmm', 'segmentsVersionMapMemory', 'seq_no.global_checkpoint', 'sqg', 'globalCheckpoint', 'seq_no.local_checkpoint', 'sql', 'localCheckpoint', 'seq_no.max', 'sqm', 'maxSeqNo', 'shard', 's', 'sh', 'dsparse_vector.value_count', 'svc', 'sparseVectorCount', 'state', 'st', 'store', 'sto', 'suggest.current', 'suc', 'suggestCurrent', 'suggest.time', 'suti', 'suggestTime', 'suggest.total', 'suto', 'suggestTotal', 'sync_id', 'unassigned.at', 'ua', 'unassigned.details', 'ud', 'unassigned.for', 'uf', 'unassigned.reason', 'ur']), z.string()]).meta({ id: 'CatCatShardColumn' })
export type CatCatShardColumn = z.infer<typeof CatCatShardColumn>

export const CatCatShardColumns = z.union([CatCatShardColumn, z.array(CatCatShardColumn)]).meta({ id: 'CatCatShardColumns' })
export type CatCatShardColumns = z.infer<typeof CatCatShardColumns>

export const CatCatSnapshotsColumn = z.union([z.enum(['id', 'snapshot', 'repository', 're', 'repo', 'status', 's', 'start_epoch', 'ste', 'startEpoch', 'start_time', 'sti', 'startTime', 'end_epoch', 'ete', 'endEpoch', 'end_time', 'eti', 'endTime', 'duration', 'dur', 'indices', 'i', 'successful_shards', 'ss', 'failed_shards', 'fs', 'total_shards', 'ts', 'reason', 'r']), z.string()]).meta({ id: 'CatCatSnapshotsColumn' })
export type CatCatSnapshotsColumn = z.infer<typeof CatCatSnapshotsColumn>

export const CatCatSnapshotsColumns = z.union([CatCatSnapshotsColumn, z.array(CatCatSnapshotsColumn)]).meta({ id: 'CatCatSnapshotsColumns' })
export type CatCatSnapshotsColumns = z.infer<typeof CatCatSnapshotsColumns>

export const CatCatTasksColumn = z.union([z.enum(['id', 'action', 'ac', 'task_id', 'ti', 'parent_task_id', 'pti', 'type', 'ty', 'start_time', 'start', 'timestamp', 'ts', 'hms', 'hhmmss', 'running_time_ns', 'time', 'running_time', 'time', 'node_id', 'ni', 'ip', 'i', 'port', 'po', 'node', 'n', 'version', 'v', 'x_opaque_id', 'x']), z.string()]).meta({ id: 'CatCatTasksColumn' })
export type CatCatTasksColumn = z.infer<typeof CatCatTasksColumn>

export const CatCatTasksColumns = z.union([CatCatTasksColumn, z.array(CatCatTasksColumn)]).meta({ id: 'CatCatTasksColumns' })
export type CatCatTasksColumns = z.infer<typeof CatCatTasksColumns>

export const CatCatTemplatesColumn = z.union([z.enum(['name', 'n', 'index_patterns', 't', 'order', 'o', 'p', 'version', 'v', 'composed_of', 'c']), z.string()]).meta({ id: 'CatCatTemplatesColumn' })
export type CatCatTemplatesColumn = z.infer<typeof CatCatTemplatesColumn>

export const CatCatTemplatesColumns = z.union([CatCatTemplatesColumn, z.array(CatCatTemplatesColumn)]).meta({ id: 'CatCatTemplatesColumns' })
export type CatCatTemplatesColumns = z.infer<typeof CatCatTemplatesColumns>

export const CatCatThreadPoolColumn = z.union([z.enum(['active', 'a', 'completed', 'c', 'core', 'cr', 'ephemeral_id', 'eid', 'host', 'h', 'ip', 'i', 'keep_alive', 'k', 'largest', 'l', 'max', 'mx', 'name', 'node_id', 'id', 'node_name', 'pid', 'p', 'pool_size', 'psz', 'port', 'po', 'queue', 'q', 'queue_size', 'qs', 'rejected', 'r', 'size', 'sz', 'type', 't']), z.string()]).meta({ id: 'CatCatThreadPoolColumn' })
export type CatCatThreadPoolColumn = z.infer<typeof CatCatThreadPoolColumn>

export const CatCatThreadPoolColumns = z.union([CatCatThreadPoolColumn, z.array(CatCatThreadPoolColumn)]).meta({ id: 'CatCatThreadPoolColumns' })
export type CatCatThreadPoolColumns = z.infer<typeof CatCatThreadPoolColumns>

export const CatCatTrainedModelsColumn = z.enum(['create_time', 'ct', 'created_by', 'c', 'createdBy', 'data_frame_analytics_id', 'df', 'dataFrameAnalytics', 'dfid', 'description', 'd', 'heap_size', 'hs', 'modelHeapSize', 'id', 'ingest.count', 'ic', 'ingestCount', 'ingest.current', 'icurr', 'ingestCurrent', 'ingest.failed', 'if', 'ingestFailed', 'ingest.pipelines', 'ip', 'ingestPipelines', 'ingest.time', 'it', 'ingestTime', 'license', 'l', 'operations', 'o', 'modelOperations', 'version', 'v']).meta({ id: 'CatCatTrainedModelsColumn' })
export type CatCatTrainedModelsColumn = z.infer<typeof CatCatTrainedModelsColumn>

export const CatCatTrainedModelsColumns = z.union([CatCatTrainedModelsColumn, z.array(CatCatTrainedModelsColumn)]).meta({ id: 'CatCatTrainedModelsColumns' })
export type CatCatTrainedModelsColumns = z.infer<typeof CatCatTrainedModelsColumns>

export const CatCatTransformColumn = z.enum(['changes_last_detection_time', 'cldt', 'checkpoint', 'cp', 'checkpoint_duration_time_exp_avg', 'cdtea', 'checkpointTimeExpAvg', 'checkpoint_progress', 'c', 'checkpointProgress', 'create_time', 'ct', 'createTime', 'delete_time', 'dtime', 'description', 'd', 'dest_index', 'di', 'destIndex', 'documents_deleted', 'docd', 'documents_indexed', 'doci', 'docs_per_second', 'dps', 'documents_processed', 'docp', 'frequency', 'f', 'id', 'index_failure', 'if', 'index_time', 'itime', 'index_total', 'it', 'indexed_documents_exp_avg', 'idea', 'last_search_time', 'lst', 'lastSearchTime', 'max_page_search_size', 'mpsz', 'pages_processed', 'pp', 'pipeline', 'p', 'processed_documents_exp_avg', 'pdea', 'processing_time', 'pt', 'reason', 'r', 'search_failure', 'sf', 'search_time', 'stime', 'search_total', 'st', 'source_index', 'si', 'sourceIndex', 'state', 's', 'transform_type', 'tt', 'trigger_count', 'tc', 'version', 'v']).meta({ id: 'CatCatTransformColumn' })
export type CatCatTransformColumn = z.infer<typeof CatCatTransformColumn>

export const CatCatTransformColumns = z.union([CatCatTransformColumn, z.array(CatCatTransformColumn)]).meta({ id: 'CatCatTransformColumns' })
export type CatCatTransformColumns = z.infer<typeof CatCatTransformColumns>

export const CatAliasesAliasesRecord = z.object({
  alias: z.string().describe('alias name').optional(),
  a: z.string().describe('alias name').optional(),
  index: IndexName.describe('index alias points to').optional(),
  i: IndexName.describe('index alias points to').optional(),
  idx: IndexName.describe('index alias points to').optional(),
  filter: z.string().describe('filter').optional(),
  f: z.string().describe('filter').optional(),
  fi: z.string().describe('filter').optional(),
  'routing.index': z.string().describe('index routing').optional(),
  ri: z.string().describe('index routing').optional(),
  routingIndex: z.string().describe('index routing').optional(),
  'routing.search': z.string().describe('search routing').optional(),
  rs: z.string().describe('search routing').optional(),
  routingSearch: z.string().describe('search routing').optional(),
  is_write_index: z.string().describe('write index').optional(),
  w: z.string().describe('write index').optional(),
  isWriteIndex: z.string().describe('write index').optional()
}).meta({ id: 'CatAliasesAliasesRecord' })
export type CatAliasesAliasesRecord = z.infer<typeof CatAliasesAliasesRecord>

/**
 * Get aliases.
 *
 * Get the cluster's index aliases, including filter and routing information.
 * This API does not return data stream aliases.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or the Kibana console. They are not intended for use by applications. For application consumption, use the aliases API.
 */
export const CatAliasesRequest = z.object({
  ...CatCatRequestBase.shape,
  name: Names.describe('A comma-separated list of aliases to retrieve. Supports wildcards (`*`).  To retrieve all aliases, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  h: CatCatAliasesColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. It supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicated that the request should never timeout, you can set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatAliasesRequest' })
export type CatAliasesRequest = z.infer<typeof CatAliasesRequest>

export const CatAliasesResponse = z.array(CatAliasesAliasesRecord).meta({ id: 'CatAliasesResponse' })
export type CatAliasesResponse = z.infer<typeof CatAliasesResponse>

export const CatAllocationAllocationRecord = z.object({
  shards: z.string().describe('Number of primary and replica shards assigned to the node.').optional(),
  s: z.string().describe('Number of primary and replica shards assigned to the node.').optional(),
  'shards.undesired': z.union([z.string(), z.null()]).describe('Amount of shards that are scheduled to be moved elsewhere in the cluster or -1 other than desired balance allocator is used').optional(),
  'write_load.forecast': z.union([SpecUtilsStringified, z.null()]).describe('Sum of index write load forecasts').optional(),
  wlf: z.union([SpecUtilsStringified, z.null()]).describe('Sum of index write load forecasts').optional(),
  writeLoadForecast: z.union([SpecUtilsStringified, z.null()]).describe('Sum of index write load forecasts').optional(),
  'disk.indices.forecast': z.union([ByteSize, z.null()]).describe('Sum of shard size forecasts').optional(),
  dif: z.union([ByteSize, z.null()]).describe('Sum of shard size forecasts').optional(),
  diskIndicesForecast: z.union([ByteSize, z.null()]).describe('Sum of shard size forecasts').optional(),
  'disk.indices': z.union([ByteSize, z.null()]).describe('Disk space used by the node’s shards. Does not include disk space for the translog or unassigned shards. IMPORTANT: This metric double-counts disk space for hard-linked files, such as those created when shrinking, splitting, or cloning an index.').optional(),
  di: z.union([ByteSize, z.null()]).describe('Disk space used by the node’s shards. Does not include disk space for the translog or unassigned shards. IMPORTANT: This metric double-counts disk space for hard-linked files, such as those created when shrinking, splitting, or cloning an index.').optional(),
  diskIndices: z.union([ByteSize, z.null()]).describe('Disk space used by the node’s shards. Does not include disk space for the translog or unassigned shards. IMPORTANT: This metric double-counts disk space for hard-linked files, such as those created when shrinking, splitting, or cloning an index.').optional(),
  'disk.used': z.union([ByteSize, z.null()]).describe('Total disk space in use. Elasticsearch retrieves this metric from the node’s operating system (OS). The metric includes disk space for: Elasticsearch, including the translog and unassigned shards; the node’s operating system; any other applications or files on the node. Unlike `disk.indices`, this metric does not double-count disk space for hard-linked files.').optional(),
  du: z.union([ByteSize, z.null()]).describe('Total disk space in use. Elasticsearch retrieves this metric from the node’s operating system (OS). The metric includes disk space for: Elasticsearch, including the translog and unassigned shards; the node’s operating system; any other applications or files on the node. Unlike `disk.indices`, this metric does not double-count disk space for hard-linked files.').optional(),
  diskUsed: z.union([ByteSize, z.null()]).describe('Total disk space in use. Elasticsearch retrieves this metric from the node’s operating system (OS). The metric includes disk space for: Elasticsearch, including the translog and unassigned shards; the node’s operating system; any other applications or files on the node. Unlike `disk.indices`, this metric does not double-count disk space for hard-linked files.').optional(),
  'disk.avail': z.union([ByteSize, z.null()]).describe('Free disk space available to Elasticsearch. Elasticsearch retrieves this metric from the node’s operating system. Disk-based shard allocation uses this metric to assign shards to nodes based on available disk space.').optional(),
  da: z.union([ByteSize, z.null()]).describe('Free disk space available to Elasticsearch. Elasticsearch retrieves this metric from the node’s operating system. Disk-based shard allocation uses this metric to assign shards to nodes based on available disk space.').optional(),
  diskAvail: z.union([ByteSize, z.null()]).describe('Free disk space available to Elasticsearch. Elasticsearch retrieves this metric from the node’s operating system. Disk-based shard allocation uses this metric to assign shards to nodes based on available disk space.').optional(),
  'disk.total': z.union([ByteSize, z.null()]).describe('Total disk space for the node, including in-use and available space.').optional(),
  dt: z.union([ByteSize, z.null()]).describe('Total disk space for the node, including in-use and available space.').optional(),
  diskTotal: z.union([ByteSize, z.null()]).describe('Total disk space for the node, including in-use and available space.').optional(),
  'disk.percent': z.union([Percentage, z.null()]).describe('Total percentage of disk space in use. Calculated as `disk.used / disk.total`.').optional(),
  dp: z.union([Percentage, z.null()]).describe('Total percentage of disk space in use. Calculated as `disk.used / disk.total`.').optional(),
  diskPercent: z.union([Percentage, z.null()]).describe('Total percentage of disk space in use. Calculated as `disk.used / disk.total`.').optional(),
  host: z.union([Host, z.null()]).describe('Network host for the node. Set using the `network.host` setting.').optional(),
  h: z.union([Host, z.null()]).describe('Network host for the node. Set using the `network.host` setting.').optional(),
  ip: z.union([Ip, z.null()]).describe('IP address and port for the node.').optional(),
  node: z.string().describe('Name for the node. Set using the `node.name` setting.').optional(),
  n: z.string().describe('Name for the node. Set using the `node.name` setting.').optional(),
  'node.role': z.union([z.string(), z.null()]).describe('Node roles').optional(),
  r: z.union([z.string(), z.null()]).describe('Node roles').optional(),
  role: z.union([z.string(), z.null()]).describe('Node roles').optional(),
  nodeRole: z.union([z.string(), z.null()]).describe('Node roles').optional()
}).meta({ id: 'CatAllocationAllocationRecord' })
export type CatAllocationAllocationRecord = z.infer<typeof CatAllocationAllocationRecord>

/**
 * Get shard allocation information.
 *
 * Get a snapshot of the number of shards allocated to each data node and their disk space.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
 */
export const CatAllocationRequest = z.object({
  ...CatCatRequestBase.shape,
  node_id: NodeIds.describe('A comma-separated list of node identifiers or names used to limit the returned information.').optional().meta({ found_in: 'path' }),
  h: CatCatAllocationColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatAllocationRequest' })
export type CatAllocationRequest = z.infer<typeof CatAllocationRequest>

export const CatAllocationResponse = z.array(CatAllocationAllocationRecord).meta({ id: 'CatAllocationResponse' })
export type CatAllocationResponse = z.infer<typeof CatAllocationResponse>

export const CatCircuitBreakerCircuitBreakerRecord = z.object({
  node_id: NodeId.describe('Persistent node ID').optional(),
  id: NodeId.describe('Persistent node ID').optional(),
  node_name: z.string().describe('Node name').optional(),
  nn: z.string().describe('Node name').optional(),
  breaker: z.string().describe('Breaker name').optional(),
  br: z.string().describe('Breaker name').optional(),
  limit: z.string().describe('Limit size').optional(),
  l: z.string().describe('Limit size').optional(),
  limit_bytes: ByteSize.describe('Limit size in bytes').optional(),
  lb: ByteSize.describe('Limit size in bytes').optional(),
  estimated: z.string().describe('Estimated size').optional(),
  e: z.string().describe('Estimated size').optional(),
  estimated_bytes: ByteSize.describe('Estimated size in bytes').optional(),
  eb: ByteSize.describe('Estimated size in bytes').optional(),
  tripped: z.string().describe('Tripped count').optional(),
  t: z.string().describe('Tripped count').optional(),
  overhead: z.string().describe('Overhead').optional(),
  o: z.string().describe('Overhead').optional()
}).meta({ id: 'CatCircuitBreakerCircuitBreakerRecord' })
export type CatCircuitBreakerCircuitBreakerRecord = z.infer<typeof CatCircuitBreakerCircuitBreakerRecord>

/**
 * Get circuit breakers statistics.
 *
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
 */
export const CatCircuitBreakerRequest = z.object({
  ...CatCatRequestBase.shape,
  circuit_breaker_patterns: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of regular-expressions to filter the circuit breakers in the output').optional().meta({ found_in: 'path' }),
  h: CatCatCircuitBreakerColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatCircuitBreakerRequest' })
export type CatCircuitBreakerRequest = z.infer<typeof CatCircuitBreakerRequest>

export const CatCircuitBreakerResponse = z.array(CatCircuitBreakerCircuitBreakerRecord).meta({ id: 'CatCircuitBreakerResponse' })
export type CatCircuitBreakerResponse = z.infer<typeof CatCircuitBreakerResponse>

export const CatComponentTemplatesComponentTemplate = z.object({
  name: z.string(),
  version: z.union([z.string(), z.null()]),
  alias_count: z.string(),
  mapping_count: z.string(),
  settings_count: z.string(),
  metadata_count: z.string(),
  included_in: z.string()
}).meta({ id: 'CatComponentTemplatesComponentTemplate' })
export type CatComponentTemplatesComponentTemplate = z.infer<typeof CatComponentTemplatesComponentTemplate>

/**
 * Get component templates.
 *
 * Get information about component templates in a cluster.
 * Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the get component template API.
 */
export const CatComponentTemplatesRequest = z.object({
  ...CatCatRequestBase.shape,
  name: z.string().describe('The name of the component template. It accepts wildcard expressions. If it is omitted, all component templates are returned.').optional().meta({ found_in: 'path' }),
  h: CatCatComponentColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatComponentTemplatesRequest' })
export type CatComponentTemplatesRequest = z.infer<typeof CatComponentTemplatesRequest>

export const CatComponentTemplatesResponse = z.array(CatComponentTemplatesComponentTemplate).meta({ id: 'CatComponentTemplatesResponse' })
export type CatComponentTemplatesResponse = z.infer<typeof CatComponentTemplatesResponse>

export const CatCountCountRecord = z.object({
  epoch: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  t: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  time: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  timestamp: TimeOfDay.describe('time in HH:MM:SS').optional(),
  ts: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hms: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hhmmss: TimeOfDay.describe('time in HH:MM:SS').optional(),
  count: z.string().describe('the document count').optional(),
  dc: z.string().describe('the document count').optional(),
  'docs.count': z.string().describe('the document count').optional(),
  docsCount: z.string().describe('the document count').optional()
}).meta({ id: 'CatCountCountRecord' })
export type CatCountCountRecord = z.infer<typeof CatCountCountRecord>

/**
 * Get a document count.
 *
 * Get quick access to a document count for a data stream, an index, or an entire cluster.
 * The document count only includes live documents, not deleted documents which have not yet been removed by the merge process.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the count API.
 *
 * NOTE: Starting in Elasticsearch 9.3.0, this endpoint also supports the `POST` method. This is primarily intended for project routing in serverless environments.
 */
export const CatCountRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. It supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  h: CatCatCountColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatCountRequest' })
export type CatCountRequest = z.infer<typeof CatCountRequest>

export const CatCountResponse = z.array(CatCountCountRecord).meta({ id: 'CatCountResponse' })
export type CatCountResponse = z.infer<typeof CatCountResponse>

export const CatFielddataFielddataRecord = z.object({
  id: z.string().describe('node id').optional(),
  host: z.string().describe('host name').optional(),
  h: z.string().describe('host name').optional(),
  ip: z.string().describe('ip address').optional(),
  node: z.string().describe('node name').optional(),
  n: z.string().describe('node name').optional(),
  field: z.string().describe('field name').optional(),
  f: z.string().describe('field name').optional(),
  size: z.string().describe('field data usage').optional()
}).meta({ id: 'CatFielddataFielddataRecord' })
export type CatFielddataFielddataRecord = z.infer<typeof CatFielddataFielddataRecord>

/**
 * Get field data cache information.
 *
 * Get the amount of heap memory currently used by the field data cache on every data node in the cluster.
 *
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the nodes stats API.
 */
export const CatFielddataRequest = z.object({
  ...CatCatRequestBase.shape,
  fields: Fields.describe('Comma-separated list of fields used to limit returned information. To retrieve all fields, omit this parameter.').optional().meta({ found_in: 'path' }),
  h: CatCatFieldDataColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatFielddataRequest' })
export type CatFielddataRequest = z.infer<typeof CatFielddataRequest>

export const CatFielddataResponse = z.array(CatFielddataFielddataRecord).meta({ id: 'CatFielddataResponse' })
export type CatFielddataResponse = z.infer<typeof CatFielddataResponse>

export const CatHealthHealthRecord = z.object({
  epoch: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  time: SpecUtilsStringified.describe('seconds since 1970-01-01 00:00:00').optional(),
  timestamp: TimeOfDay.describe('time in HH:MM:SS').optional(),
  ts: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hms: TimeOfDay.describe('time in HH:MM:SS').optional(),
  hhmmss: TimeOfDay.describe('time in HH:MM:SS').optional(),
  cluster: z.string().describe('cluster name').optional(),
  cl: z.string().describe('cluster name').optional(),
  status: z.string().describe('health status').optional(),
  st: z.string().describe('health status').optional(),
  'node.total': z.string().describe('total number of nodes').optional(),
  nt: z.string().describe('total number of nodes').optional(),
  nodeTotal: z.string().describe('total number of nodes').optional(),
  'node.data': z.string().describe('number of nodes that can store data').optional(),
  nd: z.string().describe('number of nodes that can store data').optional(),
  nodeData: z.string().describe('number of nodes that can store data').optional(),
  shards: z.string().describe('total number of shards').optional(),
  t: z.string().describe('total number of shards').optional(),
  sh: z.string().describe('total number of shards').optional(),
  'shards.total': z.string().describe('total number of shards').optional(),
  shardsTotal: z.string().describe('total number of shards').optional(),
  pri: z.string().describe('number of primary shards').optional(),
  p: z.string().describe('number of primary shards').optional(),
  'shards.primary': z.string().describe('number of primary shards').optional(),
  shardsPrimary: z.string().describe('number of primary shards').optional(),
  relo: z.string().describe('number of relocating nodes').optional(),
  r: z.string().describe('number of relocating nodes').optional(),
  'shards.relocating': z.string().describe('number of relocating nodes').optional(),
  shardsRelocating: z.string().describe('number of relocating nodes').optional(),
  init: z.string().describe('number of initializing nodes').optional(),
  i: z.string().describe('number of initializing nodes').optional(),
  'shards.initializing': z.string().describe('number of initializing nodes').optional(),
  shardsInitializing: z.string().describe('number of initializing nodes').optional(),
  'unassign.pri': z.string().describe('number of unassigned primary shards').optional(),
  up: z.string().describe('number of unassigned primary shards').optional(),
  'shards.unassigned.primary': z.string().describe('number of unassigned primary shards').optional(),
  shardsUnassignedPrimary: z.string().describe('number of unassigned primary shards').optional(),
  unassign: z.string().describe('number of unassigned shards').optional(),
  u: z.string().describe('number of unassigned shards').optional(),
  'shards.unassigned': z.string().describe('number of unassigned shards').optional(),
  shardsUnassigned: z.string().describe('number of unassigned shards').optional(),
  pending_tasks: z.string().describe('number of pending tasks').optional(),
  pt: z.string().describe('number of pending tasks').optional(),
  pendingTasks: z.string().describe('number of pending tasks').optional(),
  max_task_wait_time: z.string().describe('wait time of longest task pending').optional(),
  mtwt: z.string().describe('wait time of longest task pending').optional(),
  maxTaskWaitTime: z.string().describe('wait time of longest task pending').optional(),
  active_shards_percent: z.string().describe('active number of shards in percent').optional(),
  asp: z.string().describe('active number of shards in percent').optional(),
  activeShardsPercent: z.string().describe('active number of shards in percent').optional()
}).meta({ id: 'CatHealthHealthRecord' })
export type CatHealthHealthRecord = z.infer<typeof CatHealthHealthRecord>

/**
 * Get the cluster health status.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
 * They are not intended for use by applications. For application consumption, use the cluster health API.
 * This API is often used to check malfunctioning clusters.
 * To help you track cluster health alongside log files and alerting systems, the API returns timestamps in two formats:
 * `HH:MM:SS`, which is human-readable but includes no date information;
 * `Unix epoch time`, which is machine-sortable and includes date information.
 * The latter format is useful for cluster recoveries that take multiple days.
 * You can use the cat health API to verify cluster health across multiple nodes.
 * You also can use the API to track the recovery of a large cluster over a longer period of time.
 */
export const CatHealthRequest = z.object({
  ...CatCatRequestBase.shape,
  ts: z.boolean().describe('If true, returns `HH:MM:SS` and Unix epoch timestamps.').optional().meta({ found_in: 'query' }),
  h: CatCatHealthColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatHealthRequest' })
export type CatHealthRequest = z.infer<typeof CatHealthRequest>

export const CatHealthResponse = z.array(CatHealthHealthRecord).meta({ id: 'CatHealthResponse' })
export type CatHealthResponse = z.infer<typeof CatHealthResponse>

/**
 * Get CAT help.
 *
 * Get help for the CAT APIs.
 */
export const CatHelpRequest = z.object({
}).meta({ id: 'CatHelpRequest' })
export type CatHelpRequest = z.infer<typeof CatHelpRequest>

export const CatHelpResponse = z.object({
}).meta({ id: 'CatHelpResponse' })
export type CatHelpResponse = z.infer<typeof CatHelpResponse>

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

export const CatMasterMasterRecord = z.object({
  id: z.string().describe('node id').optional(),
  host: z.string().describe('host name').optional(),
  h: z.string().describe('host name').optional(),
  ip: z.string().describe('ip address').optional(),
  node: z.string().describe('node name').optional(),
  n: z.string().describe('node name').optional()
}).meta({ id: 'CatMasterMasterRecord' })
export type CatMasterMasterRecord = z.infer<typeof CatMasterMasterRecord>

/**
 * Get master node information.
 *
 * Get information about the master node, including the ID, bound IP address, and name.
 *
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatMasterRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatMasterColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMasterRequest' })
export type CatMasterRequest = z.infer<typeof CatMasterRequest>

export const CatMasterResponse = z.array(CatMasterMasterRecord).meta({ id: 'CatMasterResponse' })
export type CatMasterResponse = z.infer<typeof CatMasterResponse>

export const CatMlDataFrameAnalyticsDataFrameAnalyticsRecord = z.object({
  id: Id.describe('The identifier for the job.').optional(),
  type: z.string().describe('The type of analysis that the job performs.').optional(),
  t: z.string().describe('The type of analysis that the job performs.').optional(),
  create_time: z.string().describe('The time when the job was created.').optional(),
  ct: z.string().describe('The time when the job was created.').optional(),
  createTime: z.string().describe('The time when the job was created.').optional(),
  version: VersionString.describe('The version of Elasticsearch when the job was created.').optional(),
  v: VersionString.describe('The version of Elasticsearch when the job was created.').optional(),
  source_index: IndexName.describe('The name of the source index.').optional(),
  si: IndexName.describe('The name of the source index.').optional(),
  sourceIndex: IndexName.describe('The name of the source index.').optional(),
  dest_index: IndexName.describe('The name of the destination index.').optional(),
  di: IndexName.describe('The name of the destination index.').optional(),
  destIndex: IndexName.describe('The name of the destination index.').optional(),
  description: z.string().describe('A description of the job.').optional(),
  d: z.string().describe('A description of the job.').optional(),
  model_memory_limit: z.string().describe('The approximate maximum amount of memory resources that are permitted for the job.').optional(),
  mml: z.string().describe('The approximate maximum amount of memory resources that are permitted for the job.').optional(),
  modelMemoryLimit: z.string().describe('The approximate maximum amount of memory resources that are permitted for the job.').optional(),
  state: z.string().describe('The current status of the job.').optional(),
  s: z.string().describe('The current status of the job.').optional(),
  failure_reason: z.string().describe('Messages about the reason why the job failed.').optional(),
  fr: z.string().describe('Messages about the reason why the job failed.').optional(),
  failureReason: z.string().describe('Messages about the reason why the job failed.').optional(),
  progress: z.string().describe('The progress report for the job by phase.').optional(),
  p: z.string().describe('The progress report for the job by phase.').optional(),
  assignment_explanation: z.string().describe('Messages related to the selection of a node.').optional(),
  ae: z.string().describe('Messages related to the selection of a node.').optional(),
  assignmentExplanation: z.string().describe('Messages related to the selection of a node.').optional(),
  'node.id': Id.describe('The unique identifier of the assigned node.').optional(),
  ni: Id.describe('The unique identifier of the assigned node.').optional(),
  nodeId: Id.describe('The unique identifier of the assigned node.').optional(),
  'node.name': Name.describe('The name of the assigned node.').optional(),
  nn: Name.describe('The name of the assigned node.').optional(),
  nodeName: Name.describe('The name of the assigned node.').optional(),
  'node.ephemeral_id': Id.describe('The ephemeral identifier of the assigned node.').optional(),
  ne: Id.describe('The ephemeral identifier of the assigned node.').optional(),
  nodeEphemeralId: Id.describe('The ephemeral identifier of the assigned node.').optional(),
  'node.address': z.string().describe('The network address of the assigned node.').optional(),
  na: z.string().describe('The network address of the assigned node.').optional(),
  nodeAddress: z.string().describe('The network address of the assigned node.').optional()
}).meta({ id: 'CatMlDataFrameAnalyticsDataFrameAnalyticsRecord' })
export type CatMlDataFrameAnalyticsDataFrameAnalyticsRecord = z.infer<typeof CatMlDataFrameAnalyticsDataFrameAnalyticsRecord>

/**
 * Get data frame analytics jobs.
 *
 * Get configuration and usage information about data frame analytics jobs.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get data frame analytics jobs statistics API.
 */
export const CatMlDataFrameAnalyticsRequest = z.object({
  ...CatCatRequestBase.shape,
  id: Id.describe('The ID of the data frame analytics to fetch').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Whether to ignore if a wildcard expression matches no configs. (This includes `_all` string or when no configs have been specified.)').optional().meta({ found_in: 'query' }),
  h: CatCatDfaColumns.describe('Comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatDfaColumns.describe('Comma-separated list of column names or column aliases used to sort the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMlDataFrameAnalyticsRequest' })
export type CatMlDataFrameAnalyticsRequest = z.infer<typeof CatMlDataFrameAnalyticsRequest>

export const CatMlDataFrameAnalyticsResponse = z.array(CatMlDataFrameAnalyticsDataFrameAnalyticsRecord).meta({ id: 'CatMlDataFrameAnalyticsResponse' })
export type CatMlDataFrameAnalyticsResponse = z.infer<typeof CatMlDataFrameAnalyticsResponse>

export const CatMlDatafeedsDatafeedsRecord = z.object({
  id: z.string().describe('The datafeed identifier.').optional(),
  state: MlDatafeedState.describe('The status of the datafeed.').optional(),
  s: MlDatafeedState.describe('The status of the datafeed.').optional(),
  assignment_explanation: z.string().describe('For started datafeeds only, contains messages relating to the selection of a node.').optional(),
  ae: z.string().describe('For started datafeeds only, contains messages relating to the selection of a node.').optional(),
  'buckets.count': z.string().describe('The number of buckets processed.').optional(),
  bc: z.string().describe('The number of buckets processed.').optional(),
  bucketsCount: z.string().describe('The number of buckets processed.').optional(),
  'search.count': z.string().describe('The number of searches run by the datafeed.').optional(),
  sc: z.string().describe('The number of searches run by the datafeed.').optional(),
  searchCount: z.string().describe('The number of searches run by the datafeed.').optional(),
  'search.time': z.string().describe('The total time the datafeed spent searching, in milliseconds.').optional(),
  st: z.string().describe('The total time the datafeed spent searching, in milliseconds.').optional(),
  searchTime: z.string().describe('The total time the datafeed spent searching, in milliseconds.').optional(),
  'search.bucket_avg': z.string().describe('The average search time per bucket, in milliseconds.').optional(),
  sba: z.string().describe('The average search time per bucket, in milliseconds.').optional(),
  searchBucketAvg: z.string().describe('The average search time per bucket, in milliseconds.').optional(),
  'search.exp_avg_hour': z.string().describe('The exponential average search time per hour, in milliseconds.').optional(),
  seah: z.string().describe('The exponential average search time per hour, in milliseconds.').optional(),
  searchExpAvgHour: z.string().describe('The exponential average search time per hour, in milliseconds.').optional(),
  'node.id': z.string().describe('The unique identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  ni: z.string().describe('The unique identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeId: z.string().describe('The unique identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  'node.name': z.string().describe('The name of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nn: z.string().describe('The name of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeName: z.string().describe('The name of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  'node.ephemeral_id': z.string().describe('The ephemeral identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  ne: z.string().describe('The ephemeral identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeEphemeralId: z.string().describe('The ephemeral identifier of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  'node.address': z.string().describe('The network address of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  na: z.string().describe('The network address of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional(),
  nodeAddress: z.string().describe('The network address of the assigned node. For started datafeeds only, this information pertains to the node upon which the datafeed is started.').optional()
}).meta({ id: 'CatMlDatafeedsDatafeedsRecord' })
export type CatMlDatafeedsDatafeedsRecord = z.infer<typeof CatMlDatafeedsDatafeedsRecord>

/**
 * Get datafeeds.
 *
 * Get configuration and usage information about datafeeds.
 * This API returns a maximum of 10,000 datafeeds.
 * If the Elasticsearch security features are enabled, you must have `monitor_ml`, `monitor`, `manage_ml`, or `manage`
 * cluster privileges to use this API.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get datafeed statistics API.
 */
export const CatMlDatafeedsRequest = z.object({
  ...CatCatRequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: * Contains wildcard expressions and there are no datafeeds that match. * Contains the `_all` string or no identifiers and there are no matches. * Contains wildcard expressions and there are only partial matches. If `true`, the API returns an empty datafeeds array when there are no matches and the subset of results when there are partial matches. If `false`, the API returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  h: CatCatDatafeedColumns.describe('Comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatDatafeedColumns.describe('Comma-separated list of column names or column aliases used to sort the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMlDatafeedsRequest' })
export type CatMlDatafeedsRequest = z.infer<typeof CatMlDatafeedsRequest>

export const CatMlDatafeedsResponse = z.array(CatMlDatafeedsDatafeedsRecord).meta({ id: 'CatMlDatafeedsResponse' })
export type CatMlDatafeedsResponse = z.infer<typeof CatMlDatafeedsResponse>

export const CatMlJobsJobsRecord = z.object({
  id: Id.describe('The anomaly detection job identifier.').optional(),
  state: MlJobState.describe('The status of the anomaly detection job.').optional(),
  s: MlJobState.describe('The status of the anomaly detection job.').optional(),
  opened_time: z.string().describe('For open jobs only, the amount of time the job has been opened.').optional(),
  ot: z.string().describe('For open jobs only, the amount of time the job has been opened.').optional(),
  assignment_explanation: z.string().describe('For open anomaly detection jobs only, contains messages relating to the selection of a node to run the job.').optional(),
  ae: z.string().describe('For open anomaly detection jobs only, contains messages relating to the selection of a node to run the job.').optional(),
  'data.processed_records': z.string().describe('The number of input documents that have been processed by the anomaly detection job. This value includes documents with missing fields, since they are nonetheless analyzed. If you use datafeeds and have aggregations in your search query, the `processed_record_count` is the number of aggregation results processed, not the number of Elasticsearch documents.').optional(),
  dpr: z.string().describe('The number of input documents that have been processed by the anomaly detection job. This value includes documents with missing fields, since they are nonetheless analyzed. If you use datafeeds and have aggregations in your search query, the `processed_record_count` is the number of aggregation results processed, not the number of Elasticsearch documents.').optional(),
  dataProcessedRecords: z.string().describe('The number of input documents that have been processed by the anomaly detection job. This value includes documents with missing fields, since they are nonetheless analyzed. If you use datafeeds and have aggregations in your search query, the `processed_record_count` is the number of aggregation results processed, not the number of Elasticsearch documents.').optional(),
  'data.processed_fields': z.string().describe('The total number of fields in all the documents that have been processed by the anomaly detection job. Only fields that are specified in the detector configuration object contribute to this count. The timestamp is not included in this count.').optional(),
  dpf: z.string().describe('The total number of fields in all the documents that have been processed by the anomaly detection job. Only fields that are specified in the detector configuration object contribute to this count. The timestamp is not included in this count.').optional(),
  dataProcessedFields: z.string().describe('The total number of fields in all the documents that have been processed by the anomaly detection job. Only fields that are specified in the detector configuration object contribute to this count. The timestamp is not included in this count.').optional(),
  'data.input_bytes': ByteSize.describe('The number of bytes of input data posted to the anomaly detection job.').optional(),
  dib: ByteSize.describe('The number of bytes of input data posted to the anomaly detection job.').optional(),
  dataInputBytes: ByteSize.describe('The number of bytes of input data posted to the anomaly detection job.').optional(),
  'data.input_records': z.string().describe('The number of input documents posted to the anomaly detection job.').optional(),
  dir: z.string().describe('The number of input documents posted to the anomaly detection job.').optional(),
  dataInputRecords: z.string().describe('The number of input documents posted to the anomaly detection job.').optional(),
  'data.input_fields': z.string().describe('The total number of fields in input documents posted to the anomaly detection job. This count includes fields that are not used in the analysis. However, be aware that if you are using a datafeed, it extracts only the required fields from the documents it retrieves before posting them to the job.').optional(),
  dif: z.string().describe('The total number of fields in input documents posted to the anomaly detection job. This count includes fields that are not used in the analysis. However, be aware that if you are using a datafeed, it extracts only the required fields from the documents it retrieves before posting them to the job.').optional(),
  dataInputFields: z.string().describe('The total number of fields in input documents posted to the anomaly detection job. This count includes fields that are not used in the analysis. However, be aware that if you are using a datafeed, it extracts only the required fields from the documents it retrieves before posting them to the job.').optional(),
  'data.invalid_dates': z.string().describe('The number of input documents with either a missing date field or a date that could not be parsed.').optional(),
  did: z.string().describe('The number of input documents with either a missing date field or a date that could not be parsed.').optional(),
  dataInvalidDates: z.string().describe('The number of input documents with either a missing date field or a date that could not be parsed.').optional(),
  'data.missing_fields': z.string().describe('The number of input documents that are missing a field that the anomaly detection job is configured to analyze. Input documents with missing fields are still processed because it is possible that not all fields are missing. If you are using datafeeds or posting data to the job in JSON format, a high `missing_field_count` is often not an indication of data issues. It is not necessarily a cause for concern.').optional(),
  dmf: z.string().describe('The number of input documents that are missing a field that the anomaly detection job is configured to analyze. Input documents with missing fields are still processed because it is possible that not all fields are missing. If you are using datafeeds or posting data to the job in JSON format, a high `missing_field_count` is often not an indication of data issues. It is not necessarily a cause for concern.').optional(),
  dataMissingFields: z.string().describe('The number of input documents that are missing a field that the anomaly detection job is configured to analyze. Input documents with missing fields are still processed because it is possible that not all fields are missing. If you are using datafeeds or posting data to the job in JSON format, a high `missing_field_count` is often not an indication of data issues. It is not necessarily a cause for concern.').optional(),
  'data.out_of_order_timestamps': z.string().describe('The number of input documents that have a timestamp chronologically preceding the start of the current anomaly detection bucket offset by the latency window. This information is applicable only when you provide data to the anomaly detection job by using the post data API. These out of order documents are discarded, since jobs require time series data to be in ascending chronological order.').optional(),
  doot: z.string().describe('The number of input documents that have a timestamp chronologically preceding the start of the current anomaly detection bucket offset by the latency window. This information is applicable only when you provide data to the anomaly detection job by using the post data API. These out of order documents are discarded, since jobs require time series data to be in ascending chronological order.').optional(),
  dataOutOfOrderTimestamps: z.string().describe('The number of input documents that have a timestamp chronologically preceding the start of the current anomaly detection bucket offset by the latency window. This information is applicable only when you provide data to the anomaly detection job by using the post data API. These out of order documents are discarded, since jobs require time series data to be in ascending chronological order.').optional(),
  'data.empty_buckets': z.string().describe('The number of buckets which did not contain any data. If your data contains many empty buckets, consider increasing your `bucket_span` or using functions that are tolerant to gaps in data such as mean, `non_null_sum` or `non_zero_count`.').optional(),
  deb: z.string().describe('The number of buckets which did not contain any data. If your data contains many empty buckets, consider increasing your `bucket_span` or using functions that are tolerant to gaps in data such as mean, `non_null_sum` or `non_zero_count`.').optional(),
  dataEmptyBuckets: z.string().describe('The number of buckets which did not contain any data. If your data contains many empty buckets, consider increasing your `bucket_span` or using functions that are tolerant to gaps in data such as mean, `non_null_sum` or `non_zero_count`.').optional(),
  'data.sparse_buckets': z.string().describe('The number of buckets that contained few data points compared to the expected number of data points. If your data contains many sparse buckets, consider using a longer `bucket_span`.').optional(),
  dsb: z.string().describe('The number of buckets that contained few data points compared to the expected number of data points. If your data contains many sparse buckets, consider using a longer `bucket_span`.').optional(),
  dataSparseBuckets: z.string().describe('The number of buckets that contained few data points compared to the expected number of data points. If your data contains many sparse buckets, consider using a longer `bucket_span`.').optional(),
  'data.buckets': z.string().describe('The total number of buckets processed.').optional(),
  db: z.string().describe('The total number of buckets processed.').optional(),
  dataBuckets: z.string().describe('The total number of buckets processed.').optional(),
  'data.earliest_record': z.string().describe('The timestamp of the earliest chronologically input document.').optional(),
  der: z.string().describe('The timestamp of the earliest chronologically input document.').optional(),
  dataEarliestRecord: z.string().describe('The timestamp of the earliest chronologically input document.').optional(),
  'data.latest_record': z.string().describe('The timestamp of the latest chronologically input document.').optional(),
  dlr: z.string().describe('The timestamp of the latest chronologically input document.').optional(),
  dataLatestRecord: z.string().describe('The timestamp of the latest chronologically input document.').optional(),
  'data.last': z.string().describe('The timestamp at which data was last analyzed, according to server time.').optional(),
  dl: z.string().describe('The timestamp at which data was last analyzed, according to server time.').optional(),
  dataLast: z.string().describe('The timestamp at which data was last analyzed, according to server time.').optional(),
  'data.last_empty_bucket': z.string().describe('The timestamp of the last bucket that did not contain any data.').optional(),
  dleb: z.string().describe('The timestamp of the last bucket that did not contain any data.').optional(),
  dataLastEmptyBucket: z.string().describe('The timestamp of the last bucket that did not contain any data.').optional(),
  'data.last_sparse_bucket': z.string().describe('The timestamp of the last bucket that was considered sparse.').optional(),
  dlsb: z.string().describe('The timestamp of the last bucket that was considered sparse.').optional(),
  dataLastSparseBucket: z.string().describe('The timestamp of the last bucket that was considered sparse.').optional(),
  'model.bytes': ByteSize.describe('The number of bytes of memory used by the models. This is the maximum value since the last time the model was persisted. If the job is closed, this value indicates the latest size.').optional(),
  mb: ByteSize.describe('The number of bytes of memory used by the models. This is the maximum value since the last time the model was persisted. If the job is closed, this value indicates the latest size.').optional(),
  modelBytes: ByteSize.describe('The number of bytes of memory used by the models. This is the maximum value since the last time the model was persisted. If the job is closed, this value indicates the latest size.').optional(),
  'model.memory_status': MlMemoryStatus.describe('The status of the mathematical models.').optional(),
  mms: MlMemoryStatus.describe('The status of the mathematical models.').optional(),
  modelMemoryStatus: MlMemoryStatus.describe('The status of the mathematical models.').optional(),
  'model.bytes_exceeded': ByteSize.describe('The number of bytes over the high limit for memory usage at the last allocation failure.').optional(),
  mbe: ByteSize.describe('The number of bytes over the high limit for memory usage at the last allocation failure.').optional(),
  modelBytesExceeded: ByteSize.describe('The number of bytes over the high limit for memory usage at the last allocation failure.').optional(),
  'model.memory_limit': z.string().describe('The upper limit for model memory usage, checked on increasing values.').optional(),
  mml: z.string().describe('The upper limit for model memory usage, checked on increasing values.').optional(),
  modelMemoryLimit: z.string().describe('The upper limit for model memory usage, checked on increasing values.').optional(),
  'model.by_fields': z.string().describe('The number of `by` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  mbf: z.string().describe('The number of `by` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  modelByFields: z.string().describe('The number of `by` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  'model.over_fields': z.string().describe('The number of `over` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  mof: z.string().describe('The number of `over` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  modelOverFields: z.string().describe('The number of `over` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  'model.partition_fields': z.string().describe('The number of `partition` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  mpf: z.string().describe('The number of `partition` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  modelPartitionFields: z.string().describe('The number of `partition` field values that were analyzed by the models. This value is cumulative for all detectors in the job.').optional(),
  'model.bucket_allocation_failures': z.string().describe('The number of buckets for which new entities in incoming data were not processed due to insufficient model memory. This situation is also signified by a `hard_limit: memory_status` property value.').optional(),
  mbaf: z.string().describe('The number of buckets for which new entities in incoming data were not processed due to insufficient model memory. This situation is also signified by a `hard_limit: memory_status` property value.').optional(),
  modelBucketAllocationFailures: z.string().describe('The number of buckets for which new entities in incoming data were not processed due to insufficient model memory. This situation is also signified by a `hard_limit: memory_status` property value.').optional(),
  'model.categorization_status': MlCategorizationStatus.describe('The status of categorization for the job.').optional(),
  mcs: MlCategorizationStatus.describe('The status of categorization for the job.').optional(),
  modelCategorizationStatus: MlCategorizationStatus.describe('The status of categorization for the job.').optional(),
  'model.categorized_doc_count': z.string().describe('The number of documents that have had a field categorized.').optional(),
  mcdc: z.string().describe('The number of documents that have had a field categorized.').optional(),
  modelCategorizedDocCount: z.string().describe('The number of documents that have had a field categorized.').optional(),
  'model.total_category_count': z.string().describe('The number of categories created by categorization.').optional(),
  mtcc: z.string().describe('The number of categories created by categorization.').optional(),
  modelTotalCategoryCount: z.string().describe('The number of categories created by categorization.').optional(),
  'model.frequent_category_count': z.string().describe('The number of categories that match more than 1% of categorized documents.').optional(),
  modelFrequentCategoryCount: z.string().describe('The number of categories that match more than 1% of categorized documents.').optional(),
  'model.rare_category_count': z.string().describe('The number of categories that match just one categorized document.').optional(),
  mrcc: z.string().describe('The number of categories that match just one categorized document.').optional(),
  modelRareCategoryCount: z.string().describe('The number of categories that match just one categorized document.').optional(),
  'model.dead_category_count': z.string().describe('The number of categories created by categorization that will never be assigned again because another category’s definition makes it a superset of the dead category. Dead categories are a side effect of the way categorization has no prior training.').optional(),
  mdcc: z.string().describe('The number of categories created by categorization that will never be assigned again because another category’s definition makes it a superset of the dead category. Dead categories are a side effect of the way categorization has no prior training.').optional(),
  modelDeadCategoryCount: z.string().describe('The number of categories created by categorization that will never be assigned again because another category’s definition makes it a superset of the dead category. Dead categories are a side effect of the way categorization has no prior training.').optional(),
  'model.failed_category_count': z.string().describe('The number of times that categorization wanted to create a new category but couldn’t because the job had hit its `model_memory_limit`. This count does not track which specific categories failed to be created. Therefore you cannot use this value to determine the number of unique categories that were missed.').optional(),
  mfcc: z.string().describe('The number of times that categorization wanted to create a new category but couldn’t because the job had hit its `model_memory_limit`. This count does not track which specific categories failed to be created. Therefore you cannot use this value to determine the number of unique categories that were missed.').optional(),
  modelFailedCategoryCount: z.string().describe('The number of times that categorization wanted to create a new category but couldn’t because the job had hit its `model_memory_limit`. This count does not track which specific categories failed to be created. Therefore you cannot use this value to determine the number of unique categories that were missed.').optional(),
  'model.log_time': z.string().describe('The timestamp when the model stats were gathered, according to server time.').optional(),
  mlt: z.string().describe('The timestamp when the model stats were gathered, according to server time.').optional(),
  modelLogTime: z.string().describe('The timestamp when the model stats were gathered, according to server time.').optional(),
  'model.timestamp': z.string().describe('The timestamp of the last record when the model stats were gathered.').optional(),
  mt: z.string().describe('The timestamp of the last record when the model stats were gathered.').optional(),
  modelTimestamp: z.string().describe('The timestamp of the last record when the model stats were gathered.').optional(),
  'forecasts.total': z.string().describe('The number of individual forecasts currently available for the job. A value of one or more indicates that forecasts exist.').optional(),
  ft: z.string().describe('The number of individual forecasts currently available for the job. A value of one or more indicates that forecasts exist.').optional(),
  forecastsTotal: z.string().describe('The number of individual forecasts currently available for the job. A value of one or more indicates that forecasts exist.').optional(),
  'forecasts.memory.min': z.string().describe('The minimum memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  fmmin: z.string().describe('The minimum memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  forecastsMemoryMin: z.string().describe('The minimum memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  'forecasts.memory.max': z.string().describe('The maximum memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  fmmax: z.string().describe('The maximum memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  forecastsMemoryMax: z.string().describe('The maximum memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  'forecasts.memory.avg': z.string().describe('The average memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  fmavg: z.string().describe('The average memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  forecastsMemoryAvg: z.string().describe('The average memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  'forecasts.memory.total': z.string().describe('The total memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  fmt: z.string().describe('The total memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  forecastsMemoryTotal: z.string().describe('The total memory usage in bytes for forecasts related to the anomaly detection job.').optional(),
  'forecasts.records.min': z.string().describe('The minimum number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  frmin: z.string().describe('The minimum number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  forecastsRecordsMin: z.string().describe('The minimum number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  'forecasts.records.max': z.string().describe('The maximum number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  frmax: z.string().describe('The maximum number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  forecastsRecordsMax: z.string().describe('The maximum number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  'forecasts.records.avg': z.string().describe('The average number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  fravg: z.string().describe('The average number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  forecastsRecordsAvg: z.string().describe('The average number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  'forecasts.records.total': z.string().describe('The total number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  frt: z.string().describe('The total number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  forecastsRecordsTotal: z.string().describe('The total number of `model_forecast` documents written for forecasts related to the anomaly detection job.').optional(),
  'forecasts.time.min': z.string().describe('The minimum runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  ftmin: z.string().describe('The minimum runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  forecastsTimeMin: z.string().describe('The minimum runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  'forecasts.time.max': z.string().describe('The maximum runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  ftmax: z.string().describe('The maximum runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  forecastsTimeMax: z.string().describe('The maximum runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  'forecasts.time.avg': z.string().describe('The average runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  ftavg: z.string().describe('The average runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  forecastsTimeAvg: z.string().describe('The average runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  'forecasts.time.total': z.string().describe('The total runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  ftt: z.string().describe('The total runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  forecastsTimeTotal: z.string().describe('The total runtime in milliseconds for forecasts related to the anomaly detection job.').optional(),
  'node.id': NodeId.describe('The uniqe identifier of the assigned node.').optional(),
  ni: NodeId.describe('The uniqe identifier of the assigned node.').optional(),
  nodeId: NodeId.describe('The uniqe identifier of the assigned node.').optional(),
  'node.name': z.string().describe('The name of the assigned node.').optional(),
  nn: z.string().describe('The name of the assigned node.').optional(),
  nodeName: z.string().describe('The name of the assigned node.').optional(),
  'node.ephemeral_id': NodeId.describe('The ephemeral identifier of the assigned node.').optional(),
  ne: NodeId.describe('The ephemeral identifier of the assigned node.').optional(),
  nodeEphemeralId: NodeId.describe('The ephemeral identifier of the assigned node.').optional(),
  'node.address': z.string().describe('The network address of the assigned node.').optional(),
  na: z.string().describe('The network address of the assigned node.').optional(),
  nodeAddress: z.string().describe('The network address of the assigned node.').optional(),
  'buckets.count': z.string().describe('The number of bucket results produced by the job.').optional(),
  bc: z.string().describe('The number of bucket results produced by the job.').optional(),
  bucketsCount: z.string().describe('The number of bucket results produced by the job.').optional(),
  'buckets.time.total': z.string().describe('The sum of all bucket processing times, in milliseconds.').optional(),
  btt: z.string().describe('The sum of all bucket processing times, in milliseconds.').optional(),
  bucketsTimeTotal: z.string().describe('The sum of all bucket processing times, in milliseconds.').optional(),
  'buckets.time.min': z.string().describe('The minimum of all bucket processing times, in milliseconds.').optional(),
  btmin: z.string().describe('The minimum of all bucket processing times, in milliseconds.').optional(),
  bucketsTimeMin: z.string().describe('The minimum of all bucket processing times, in milliseconds.').optional(),
  'buckets.time.max': z.string().describe('The maximum of all bucket processing times, in milliseconds.').optional(),
  btmax: z.string().describe('The maximum of all bucket processing times, in milliseconds.').optional(),
  bucketsTimeMax: z.string().describe('The maximum of all bucket processing times, in milliseconds.').optional(),
  'buckets.time.exp_avg': z.string().describe('The exponential moving average of all bucket processing times, in milliseconds.').optional(),
  btea: z.string().describe('The exponential moving average of all bucket processing times, in milliseconds.').optional(),
  bucketsTimeExpAvg: z.string().describe('The exponential moving average of all bucket processing times, in milliseconds.').optional(),
  'buckets.time.exp_avg_hour': z.string().describe('The exponential moving average of bucket processing times calculated in a one hour time window, in milliseconds.').optional(),
  bteah: z.string().describe('The exponential moving average of bucket processing times calculated in a one hour time window, in milliseconds.').optional(),
  bucketsTimeExpAvgHour: z.string().describe('The exponential moving average of bucket processing times calculated in a one hour time window, in milliseconds.').optional()
}).meta({ id: 'CatMlJobsJobsRecord' })
export type CatMlJobsJobsRecord = z.infer<typeof CatMlJobsJobsRecord>

/**
 * Get anomaly detection jobs.
 *
 * Get configuration and usage information for anomaly detection jobs.
 * This API returns a maximum of 10,000 jobs.
 * If the Elasticsearch security features are enabled, you must have `monitor_ml`,
 * `monitor`, `manage_ml`, or `manage` cluster privileges to use this API.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get anomaly detection job statistics API.
 */
export const CatMlJobsRequest = z.object({
  ...CatCatRequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: * Contains wildcard expressions and there are no jobs that match. * Contains the `_all` string or no identifiers and there are no matches. * Contains wildcard expressions and there are only partial matches. If `true`, the API returns an empty jobs array when there are no matches and the subset of results when there are partial matches. If `false`, the API returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  h: CatCatAnomalyDetectorColumns.describe('Comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatAnomalyDetectorColumns.describe('Comma-separated list of column names or column aliases used to sort the response.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMlJobsRequest' })
export type CatMlJobsRequest = z.infer<typeof CatMlJobsRequest>

export const CatMlJobsResponse = z.array(CatMlJobsJobsRecord).meta({ id: 'CatMlJobsResponse' })
export type CatMlJobsResponse = z.infer<typeof CatMlJobsResponse>

/**
 * Get trained models.
 *
 * Get configuration and usage information about inference trained models.
 *
 * IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get trained models statistics API.
 */
export const CatMlTrainedModelsRequest = z.object({
  ...CatCatRequestBase.shape,
  model_id: Id.describe('A unique identifier for the trained model.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: contains wildcard expressions and there are no models that match; contains the `_all` string or no identifiers and there are no matches; contains wildcard expressions and there are only partial matches. If `true`, the API returns an empty array when there are no matches and the subset of results when there are partial matches. If `false`, the API returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  h: CatCatTrainedModelsColumns.describe('A comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatTrainedModelsColumns.describe('A comma-separated list of column names or aliases used to sort the response.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of transforms.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The maximum number of transforms to display.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatMlTrainedModelsRequest' })
export type CatMlTrainedModelsRequest = z.infer<typeof CatMlTrainedModelsRequest>

export const CatMlTrainedModelsTrainedModelsRecord = z.object({
  id: Id.describe('The model identifier.').optional(),
  created_by: z.string().describe('Information about the creator of the model.').optional(),
  c: z.string().describe('Information about the creator of the model.').optional(),
  createdBy: z.string().describe('Information about the creator of the model.').optional(),
  heap_size: ByteSize.describe('The estimated heap size to keep the model in memory.').optional(),
  hs: ByteSize.describe('The estimated heap size to keep the model in memory.').optional(),
  modelHeapSize: ByteSize.describe('The estimated heap size to keep the model in memory.').optional(),
  operations: z.string().describe('The estimated number of operations to use the model. This number helps to measure the computational complexity of the model.').optional(),
  o: z.string().describe('The estimated number of operations to use the model. This number helps to measure the computational complexity of the model.').optional(),
  modelOperations: z.string().describe('The estimated number of operations to use the model. This number helps to measure the computational complexity of the model.').optional(),
  license: z.string().describe('The license level of the model.').optional(),
  l: z.string().describe('The license level of the model.').optional(),
  create_time: DateTime.describe('The time the model was created.').optional(),
  ct: DateTime.describe('The time the model was created.').optional(),
  version: VersionString.describe('The version of Elasticsearch when the model was created.').optional(),
  v: VersionString.describe('The version of Elasticsearch when the model was created.').optional(),
  description: z.string().describe('A description of the model.').optional(),
  d: z.string().describe('A description of the model.').optional(),
  'ingest.pipelines': z.string().describe('The number of pipelines that are referencing the model.').optional(),
  ip: z.string().describe('The number of pipelines that are referencing the model.').optional(),
  ingestPipelines: z.string().describe('The number of pipelines that are referencing the model.').optional(),
  'ingest.count': z.string().describe('The total number of documents that are processed by the model.').optional(),
  ic: z.string().describe('The total number of documents that are processed by the model.').optional(),
  ingestCount: z.string().describe('The total number of documents that are processed by the model.').optional(),
  'ingest.time': z.string().describe('The total time spent processing documents with thie model.').optional(),
  it: z.string().describe('The total time spent processing documents with thie model.').optional(),
  ingestTime: z.string().describe('The total time spent processing documents with thie model.').optional(),
  'ingest.current': z.string().describe('The total number of documents that are currently being handled by the model.').optional(),
  icurr: z.string().describe('The total number of documents that are currently being handled by the model.').optional(),
  ingestCurrent: z.string().describe('The total number of documents that are currently being handled by the model.').optional(),
  'ingest.failed': z.string().describe('The total number of failed ingest attempts with the model.').optional(),
  if: z.string().describe('The total number of failed ingest attempts with the model.').optional(),
  ingestFailed: z.string().describe('The total number of failed ingest attempts with the model.').optional(),
  'data_frame.id': z.string().describe('The identifier for the data frame analytics job that created the model. Only displayed if the job is still available.').optional(),
  dfid: z.string().describe('The identifier for the data frame analytics job that created the model. Only displayed if the job is still available.').optional(),
  dataFrameAnalytics: z.string().describe('The identifier for the data frame analytics job that created the model. Only displayed if the job is still available.').optional(),
  'data_frame.create_time': z.string().describe('The time the data frame analytics job was created.').optional(),
  dft: z.string().describe('The time the data frame analytics job was created.').optional(),
  dataFrameAnalyticsTime: z.string().describe('The time the data frame analytics job was created.').optional(),
  'data_frame.source_index': z.string().describe('The source index used to train in the data frame analysis.').optional(),
  dfsi: z.string().describe('The source index used to train in the data frame analysis.').optional(),
  dataFrameAnalyticsSrcIndex: z.string().describe('The source index used to train in the data frame analysis.').optional(),
  'data_frame.analysis': z.string().describe('The analysis used by the data frame to build the model.').optional(),
  dfa: z.string().describe('The analysis used by the data frame to build the model.').optional(),
  dataFrameAnalyticsAnalysis: z.string().describe('The analysis used by the data frame to build the model.').optional(),
  type: z.string().optional()
}).meta({ id: 'CatMlTrainedModelsTrainedModelsRecord' })
export type CatMlTrainedModelsTrainedModelsRecord = z.infer<typeof CatMlTrainedModelsTrainedModelsRecord>

export const CatMlTrainedModelsResponse = z.array(CatMlTrainedModelsTrainedModelsRecord).meta({ id: 'CatMlTrainedModelsResponse' })
export type CatMlTrainedModelsResponse = z.infer<typeof CatMlTrainedModelsResponse>

export const CatNodeattrsNodeAttributesRecord = z.object({
  node: z.string().describe('The node name.').optional(),
  id: z.string().describe('The unique node identifier.').optional(),
  pid: z.string().describe('The process identifier.').optional(),
  host: z.string().describe('The host name.').optional(),
  h: z.string().describe('The host name.').optional(),
  ip: z.string().describe('The IP address.').optional(),
  i: z.string().describe('The IP address.').optional(),
  port: z.string().describe('The bound transport port.').optional(),
  attr: z.string().describe('The attribute name.').optional(),
  value: z.string().describe('The attribute value.').optional()
}).meta({ id: 'CatNodeattrsNodeAttributesRecord' })
export type CatNodeattrsNodeAttributesRecord = z.infer<typeof CatNodeattrsNodeAttributesRecord>

/**
 * Get node attribute information.
 *
 * Get information about custom node attributes.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatNodeattrsRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatNodeattrsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatNodeattrsRequest' })
export type CatNodeattrsRequest = z.infer<typeof CatNodeattrsRequest>

export const CatNodeattrsResponse = z.array(CatNodeattrsNodeAttributesRecord).meta({ id: 'CatNodeattrsResponse' })
export type CatNodeattrsResponse = z.infer<typeof CatNodeattrsResponse>

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

export const CatPendingTasksPendingTasksRecord = z.object({
  insertOrder: z.string().describe('The task insertion order.').optional(),
  o: z.string().describe('The task insertion order.').optional(),
  timeInQueue: z.string().describe('Indicates how long the task has been in queue.').optional(),
  t: z.string().describe('Indicates how long the task has been in queue.').optional(),
  priority: z.string().describe('The task priority.').optional(),
  p: z.string().describe('The task priority.').optional(),
  source: z.string().describe('The task source.').optional(),
  s: z.string().describe('The task source.').optional()
}).meta({ id: 'CatPendingTasksPendingTasksRecord' })
export type CatPendingTasksPendingTasksRecord = z.infer<typeof CatPendingTasksPendingTasksRecord>

/**
 * Get pending task information.
 *
 * Get information about cluster-level changes that have not yet taken effect.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the pending cluster tasks API.
 */
export const CatPendingTasksRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatPendingTasksColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatPendingTasksRequest' })
export type CatPendingTasksRequest = z.infer<typeof CatPendingTasksRequest>

export const CatPendingTasksResponse = z.array(CatPendingTasksPendingTasksRecord).meta({ id: 'CatPendingTasksResponse' })
export type CatPendingTasksResponse = z.infer<typeof CatPendingTasksResponse>

export const CatPluginsPluginsRecord = z.object({
  id: NodeId.describe('The unique node identifier.').optional(),
  name: Name.describe('The node name.').optional(),
  n: Name.describe('The node name.').optional(),
  component: z.string().describe('The component name.').optional(),
  c: z.string().describe('The component name.').optional(),
  version: VersionString.describe('The component version.').optional(),
  v: VersionString.describe('The component version.').optional(),
  description: z.string().describe('The plugin details.').optional(),
  d: z.string().describe('The plugin details.').optional(),
  type: z.string().describe('The plugin type.').optional(),
  t: z.string().describe('The plugin type.').optional()
}).meta({ id: 'CatPluginsPluginsRecord' })
export type CatPluginsPluginsRecord = z.infer<typeof CatPluginsPluginsRecord>

/**
 * Get plugin information.
 *
 * Get a list of plugins running on each node of a cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatPluginsRequest = z.object({
  ...CatCatRequestBase.shape,
  h: CatCatPluginsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  include_bootstrap: z.boolean().describe('Include bootstrap plugins in the response').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatPluginsRequest' })
export type CatPluginsRequest = z.infer<typeof CatPluginsRequest>

export const CatPluginsResponse = z.array(CatPluginsPluginsRecord).meta({ id: 'CatPluginsResponse' })
export type CatPluginsResponse = z.infer<typeof CatPluginsResponse>

export const CatRecoveryRecoveryRecord = z.object({
  index: IndexName.describe('The index name.').optional(),
  i: IndexName.describe('The index name.').optional(),
  idx: IndexName.describe('The index name.').optional(),
  shard: z.string().describe('The shard name.').optional(),
  s: z.string().describe('The shard name.').optional(),
  sh: z.string().describe('The shard name.').optional(),
  start_time: DateTime.describe('The recovery start time.').optional(),
  start: DateTime.describe('The recovery start time.').optional(),
  start_time_millis: EpochTime.describe('The recovery start time in epoch milliseconds.').optional(),
  start_millis: EpochTime.describe('The recovery start time in epoch milliseconds.').optional(),
  stop_time: DateTime.describe('The recovery stop time.').optional(),
  stop: DateTime.describe('The recovery stop time.').optional(),
  stop_time_millis: EpochTime.describe('The recovery stop time in epoch milliseconds.').optional(),
  stop_millis: EpochTime.describe('The recovery stop time in epoch milliseconds.').optional(),
  time: Duration.describe('The recovery time.').optional(),
  t: Duration.describe('The recovery time.').optional(),
  ti: Duration.describe('The recovery time.').optional(),
  type: z.string().describe('The recovery type.').optional(),
  ty: z.string().describe('The recovery type.').optional(),
  stage: z.string().describe('The recovery stage.').optional(),
  st: z.string().describe('The recovery stage.').optional(),
  source_host: z.string().describe('The source host.').optional(),
  shost: z.string().describe('The source host.').optional(),
  source_node: z.string().describe('The source node name.').optional(),
  snode: z.string().describe('The source node name.').optional(),
  target_host: z.string().describe('The target host.').optional(),
  thost: z.string().describe('The target host.').optional(),
  target_node: z.string().describe('The target node name.').optional(),
  tnode: z.string().describe('The target node name.').optional(),
  repository: z.string().describe('The repository name.').optional(),
  rep: z.string().describe('The repository name.').optional(),
  snapshot: z.string().describe('The snapshot name.').optional(),
  snap: z.string().describe('The snapshot name.').optional(),
  files: z.string().describe('The number of files to recover.').optional(),
  f: z.string().describe('The number of files to recover.').optional(),
  files_recovered: z.string().describe('The files recovered.').optional(),
  fr: z.string().describe('The files recovered.').optional(),
  files_percent: Percentage.describe('The ratio of files recovered.').optional(),
  fp: Percentage.describe('The ratio of files recovered.').optional(),
  files_total: z.string().describe('The total number of files.').optional(),
  tf: z.string().describe('The total number of files.').optional(),
  bytes: z.string().describe('The number of bytes to recover.').optional(),
  b: z.string().describe('The number of bytes to recover.').optional(),
  bytes_recovered: z.string().describe('The bytes recovered.').optional(),
  br: z.string().describe('The bytes recovered.').optional(),
  bytes_percent: Percentage.describe('The ratio of bytes recovered.').optional(),
  bp: Percentage.describe('The ratio of bytes recovered.').optional(),
  bytes_total: z.string().describe('The total number of bytes.').optional(),
  tb: z.string().describe('The total number of bytes.').optional(),
  translog_ops: z.string().describe('The number of translog operations to recover.').optional(),
  to: z.string().describe('The number of translog operations to recover.').optional(),
  translog_ops_recovered: z.string().describe('The translog operations recovered.').optional(),
  tor: z.string().describe('The translog operations recovered.').optional(),
  translog_ops_percent: Percentage.describe('The ratio of translog operations recovered.').optional(),
  top: Percentage.describe('The ratio of translog operations recovered.').optional()
}).meta({ id: 'CatRecoveryRecoveryRecord' })
export type CatRecoveryRecoveryRecord = z.infer<typeof CatRecoveryRecoveryRecord>

/**
 * Get shard recovery information.
 *
 * Get information about ongoing and completed shard recoveries.
 * Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or syncing a replica shard from a primary shard. When a shard recovery completes, the recovered shard is available for search and indexing.
 * For data streams, the API returns information about the stream’s backing indices.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index recovery API.
 */
export const CatRecoveryRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  active_only: z.boolean().describe('If `true`, the response only includes ongoing shard recoveries.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('If `true`, the response includes detailed information about shard recoveries.').optional().meta({ found_in: 'query' }),
  h: CatCatRecoveryColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatRecoveryRequest' })
export type CatRecoveryRequest = z.infer<typeof CatRecoveryRequest>

export const CatRecoveryResponse = z.array(CatRecoveryRecoveryRecord).meta({ id: 'CatRecoveryResponse' })
export type CatRecoveryResponse = z.infer<typeof CatRecoveryResponse>

export const CatRepositoriesRepositoriesRecord = z.object({
  id: z.string().describe('The unique repository identifier.').optional(),
  repoId: z.string().describe('The unique repository identifier.').optional(),
  type: z.string().describe('The repository type.').optional(),
  t: z.string().describe('The repository type.').optional()
}).meta({ id: 'CatRepositoriesRepositoriesRecord' })
export type CatRepositoriesRepositoriesRecord = z.infer<typeof CatRepositoriesRepositoriesRecord>

/**
 * Get snapshot repository information.
 *
 * Get a list of snapshot repositories for a cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot repository API.
 */
export const CatRepositoriesRequest = z.object({
  ...CatCatRequestBase.shape,
  h: Names.describe('List of columns to appear in the response. Supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatRepositoriesRequest' })
export type CatRepositoriesRequest = z.infer<typeof CatRepositoriesRequest>

export const CatRepositoriesResponse = z.array(CatRepositoriesRepositoriesRecord).meta({ id: 'CatRepositoriesResponse' })
export type CatRepositoriesResponse = z.infer<typeof CatRepositoriesResponse>

/**
 * Get segment information.
 *
 * Get low-level information about the Lucene segments in index shards.
 * For data streams, the API returns information about the backing indices.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index segments API.
 */
export const CatSegmentsRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  h: CatCatSegmentsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard expressions can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as open,hidden.').optional().meta({ found_in: 'query' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  allow_closed: z.boolean().describe('If true, allow closed indices to be returned in the response otherwise if false, keep the legacy behaviour of throwing an exception if index pattern matches closed indices').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatSegmentsRequest' })
export type CatSegmentsRequest = z.infer<typeof CatSegmentsRequest>

export const CatSegmentsSegmentsRecord = z.object({
  index: IndexName.describe('The index name.').optional(),
  i: IndexName.describe('The index name.').optional(),
  idx: IndexName.describe('The index name.').optional(),
  shard: z.string().describe('The shard name.').optional(),
  s: z.string().describe('The shard name.').optional(),
  sh: z.string().describe('The shard name.').optional(),
  prirep: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  p: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  pr: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  primaryOrReplica: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  ip: z.string().describe('The IP address of the node where it lives.').optional(),
  id: NodeId.describe('The unique identifier of the node where it lives.').optional(),
  segment: z.string().describe('The segment name, which is derived from the segment generation and used internally to create file names in the directory of the shard.').optional(),
  seg: z.string().describe('The segment name, which is derived from the segment generation and used internally to create file names in the directory of the shard.').optional(),
  generation: z.string().describe('The segment generation number. Elasticsearch increments this generation number for each segment written then uses this number to derive the segment name.').optional(),
  g: z.string().describe('The segment generation number. Elasticsearch increments this generation number for each segment written then uses this number to derive the segment name.').optional(),
  gen: z.string().describe('The segment generation number. Elasticsearch increments this generation number for each segment written then uses this number to derive the segment name.').optional(),
  'docs.count': z.string().describe('The number of documents in the segment. This excludes deleted documents and counts any nested documents separately from their parents. It also excludes documents which were indexed recently and do not yet belong to a segment.').optional(),
  dc: z.string().describe('The number of documents in the segment. This excludes deleted documents and counts any nested documents separately from their parents. It also excludes documents which were indexed recently and do not yet belong to a segment.').optional(),
  docsCount: z.string().describe('The number of documents in the segment. This excludes deleted documents and counts any nested documents separately from their parents. It also excludes documents which were indexed recently and do not yet belong to a segment.').optional(),
  'docs.deleted': z.string().describe('The number of deleted documents in the segment, which might be higher or lower than the number of delete operations you have performed. This number excludes deletes that were performed recently and do not yet belong to a segment. Deleted documents are cleaned up by the automatic merge process if it makes sense to do so. Also, Elasticsearch creates extra deleted documents to internally track the recent history of operations on a shard.').optional(),
  dd: z.string().describe('The number of deleted documents in the segment, which might be higher or lower than the number of delete operations you have performed. This number excludes deletes that were performed recently and do not yet belong to a segment. Deleted documents are cleaned up by the automatic merge process if it makes sense to do so. Also, Elasticsearch creates extra deleted documents to internally track the recent history of operations on a shard.').optional(),
  docsDeleted: z.string().describe('The number of deleted documents in the segment, which might be higher or lower than the number of delete operations you have performed. This number excludes deletes that were performed recently and do not yet belong to a segment. Deleted documents are cleaned up by the automatic merge process if it makes sense to do so. Also, Elasticsearch creates extra deleted documents to internally track the recent history of operations on a shard.').optional(),
  size: ByteSize.describe('The segment size in bytes.').optional(),
  si: ByteSize.describe('The segment size in bytes.').optional(),
  'size.memory': ByteSize.describe('The segment memory in bytes. A value of `-1` indicates Elasticsearch was unable to compute this number.').optional(),
  sm: ByteSize.describe('The segment memory in bytes. A value of `-1` indicates Elasticsearch was unable to compute this number.').optional(),
  sizeMemory: ByteSize.describe('The segment memory in bytes. A value of `-1` indicates Elasticsearch was unable to compute this number.').optional(),
  committed: z.string().describe('If `true`, the segment is synced to disk. Segments that are synced can survive a hard reboot. If `false`, the data from uncommitted segments is also stored in the transaction log so that Elasticsearch is able to replay changes on the next start.').optional(),
  ic: z.string().describe('If `true`, the segment is synced to disk. Segments that are synced can survive a hard reboot. If `false`, the data from uncommitted segments is also stored in the transaction log so that Elasticsearch is able to replay changes on the next start.').optional(),
  isCommitted: z.string().describe('If `true`, the segment is synced to disk. Segments that are synced can survive a hard reboot. If `false`, the data from uncommitted segments is also stored in the transaction log so that Elasticsearch is able to replay changes on the next start.').optional(),
  searchable: z.string().describe('If `true`, the segment is searchable. If `false`, the segment has most likely been written to disk but needs a refresh to be searchable.').optional(),
  is: z.string().describe('If `true`, the segment is searchable. If `false`, the segment has most likely been written to disk but needs a refresh to be searchable.').optional(),
  isSearchable: z.string().describe('If `true`, the segment is searchable. If `false`, the segment has most likely been written to disk but needs a refresh to be searchable.').optional(),
  version: VersionString.describe('The version of Lucene used to write the segment.').optional(),
  v: VersionString.describe('The version of Lucene used to write the segment.').optional(),
  compound: z.string().describe('If `true`, the segment is stored in a compound file. This means Lucene merged all files from the segment in a single file to save file descriptors.').optional(),
  ico: z.string().describe('If `true`, the segment is stored in a compound file. This means Lucene merged all files from the segment in a single file to save file descriptors.').optional(),
  isCompound: z.string().describe('If `true`, the segment is stored in a compound file. This means Lucene merged all files from the segment in a single file to save file descriptors.').optional()
}).meta({ id: 'CatSegmentsSegmentsRecord' })
export type CatSegmentsSegmentsRecord = z.infer<typeof CatSegmentsSegmentsRecord>

export const CatSegmentsResponse = z.array(CatSegmentsSegmentsRecord).meta({ id: 'CatSegmentsResponse' })
export type CatSegmentsResponse = z.infer<typeof CatSegmentsResponse>

/**
 * Get shard information.
 *
 * Get information about the shards in a cluster.
 * For data streams, the API returns information about the backing indices.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
 */
export const CatShardsRequest = z.object({
  ...CatCatRequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  h: CatCatShardColumns.describe('List of columns to appear in the response. Supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatShardsRequest' })
export type CatShardsRequest = z.infer<typeof CatShardsRequest>

export const CatShardsShardsRecord = z.object({
  index: z.string().describe('The index name.').optional(),
  i: z.string().describe('The index name.').optional(),
  idx: z.string().describe('The index name.').optional(),
  shard: z.string().describe('The shard name.').optional(),
  s: z.string().describe('The shard name.').optional(),
  sh: z.string().describe('The shard name.').optional(),
  prirep: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  p: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  pr: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  primaryOrReplica: z.string().describe('The shard type: `primary` or `replica`.').optional(),
  state: z.string().describe('The shard state. Returned values include: `INITIALIZING`: The shard is recovering from a peer shard or gateway. `RELOCATING`: The shard is relocating. `STARTED`: The shard has started. `UNASSIGNED`: The shard is not assigned to any node.').optional(),
  st: z.string().describe('The shard state. Returned values include: `INITIALIZING`: The shard is recovering from a peer shard or gateway. `RELOCATING`: The shard is relocating. `STARTED`: The shard has started. `UNASSIGNED`: The shard is not assigned to any node.').optional(),
  docs: z.union([z.string(), z.null()]).describe('The number of documents in the shard.').optional(),
  d: z.union([z.string(), z.null()]).describe('The number of documents in the shard.').optional(),
  dc: z.union([z.string(), z.null()]).describe('The number of documents in the shard.').optional(),
  store: z.union([z.string(), z.null()]).describe('The disk space used by the shard.').optional(),
  sto: z.union([z.string(), z.null()]).describe('The disk space used by the shard.').optional(),
  dataset: z.union([z.string(), z.null()]).describe('total size of dataset (including the cache for partially mounted indices)').optional(),
  ip: z.union([z.string(), z.null()]).describe('The IP address of the node.').optional(),
  id: z.string().describe('The unique identifier for the node.').optional(),
  node: z.union([z.string(), z.null()]).describe('The name of node.').optional(),
  n: z.union([z.string(), z.null()]).describe('The name of node.').optional(),
  sync_id: z.string().describe('The sync identifier.').optional(),
  'unassigned.reason': z.string().describe('The reason for the last change to the state of an unassigned shard. It does not explain why the shard is currently unassigned; use the cluster allocation explain API for that information. Returned values include: `ALLOCATION_FAILED`: Unassigned as a result of a failed allocation of the shard. `CLUSTER_RECOVERED`: Unassigned as a result of a full cluster recovery. `DANGLING_INDEX_IMPORTED`: Unassigned as a result of importing a dangling index. `EXISTING_INDEX_RESTORED`: Unassigned as a result of restoring into a closed index. `FORCED_EMPTY_PRIMARY`: The shard’s allocation was last modified by forcing an empty primary using the cluster reroute API. `INDEX_CLOSED`: Unassigned because the index was closed. `INDEX_CREATED`: Unassigned as a result of an API creation of an index. `INDEX_REOPENED`: Unassigned as a result of opening a closed index. `MANUAL_ALLOCATION`: The shard’s allocation was last modified by the cluster reroute API. `NEW_INDEX_RESTORED`: Unassigned as a result of restoring into a new index. `NODE_LEFT`: Unassigned as a result of the node hosting it leaving the cluster. `NODE_RESTARTING`: Similar to `NODE_LEFT`, except that the node was registered as restarting using the node shutdown API. `PRIMARY_FAILED`: The shard was initializing as a replica, but the primary shard failed before the initialization completed. `REALLOCATED_REPLICA`: A better replica location is identified and causes the existing replica allocation to be cancelled. `REINITIALIZED`: When a shard moves from started back to initializing. `REPLICA_ADDED`: Unassigned as a result of explicit addition of a replica. `REROUTE_CANCELLED`: Unassigned as a result of explicit cancel reroute command.').optional(),
  ur: z.string().describe('The reason for the last change to the state of an unassigned shard. It does not explain why the shard is currently unassigned; use the cluster allocation explain API for that information. Returned values include: `ALLOCATION_FAILED`: Unassigned as a result of a failed allocation of the shard. `CLUSTER_RECOVERED`: Unassigned as a result of a full cluster recovery. `DANGLING_INDEX_IMPORTED`: Unassigned as a result of importing a dangling index. `EXISTING_INDEX_RESTORED`: Unassigned as a result of restoring into a closed index. `FORCED_EMPTY_PRIMARY`: The shard’s allocation was last modified by forcing an empty primary using the cluster reroute API. `INDEX_CLOSED`: Unassigned because the index was closed. `INDEX_CREATED`: Unassigned as a result of an API creation of an index. `INDEX_REOPENED`: Unassigned as a result of opening a closed index. `MANUAL_ALLOCATION`: The shard’s allocation was last modified by the cluster reroute API. `NEW_INDEX_RESTORED`: Unassigned as a result of restoring into a new index. `NODE_LEFT`: Unassigned as a result of the node hosting it leaving the cluster. `NODE_RESTARTING`: Similar to `NODE_LEFT`, except that the node was registered as restarting using the node shutdown API. `PRIMARY_FAILED`: The shard was initializing as a replica, but the primary shard failed before the initialization completed. `REALLOCATED_REPLICA`: A better replica location is identified and causes the existing replica allocation to be cancelled. `REINITIALIZED`: When a shard moves from started back to initializing. `REPLICA_ADDED`: Unassigned as a result of explicit addition of a replica. `REROUTE_CANCELLED`: Unassigned as a result of explicit cancel reroute command.').optional(),
  'unassigned.at': z.string().describe('The time at which the shard became unassigned in Coordinated Universal Time (UTC).').optional(),
  ua: z.string().describe('The time at which the shard became unassigned in Coordinated Universal Time (UTC).').optional(),
  'unassigned.for': z.string().describe('The time at which the shard was requested to be unassigned in Coordinated Universal Time (UTC).').optional(),
  uf: z.string().describe('The time at which the shard was requested to be unassigned in Coordinated Universal Time (UTC).').optional(),
  'unassigned.details': z.string().describe('Additional details as to why the shard became unassigned. It does not explain why the shard is not assigned; use the cluster allocation explain API for that information.').optional(),
  ud: z.string().describe('Additional details as to why the shard became unassigned. It does not explain why the shard is not assigned; use the cluster allocation explain API for that information.').optional(),
  'recoverysource.type': z.string().describe('The type of recovery source.').optional(),
  rs: z.string().describe('The type of recovery source.').optional(),
  'completion.size': z.string().describe('The size of completion.').optional(),
  cs: z.string().describe('The size of completion.').optional(),
  completionSize: z.string().describe('The size of completion.').optional(),
  'fielddata.memory_size': z.string().describe('The used fielddata cache memory.').optional(),
  fm: z.string().describe('The used fielddata cache memory.').optional(),
  fielddataMemory: z.string().describe('The used fielddata cache memory.').optional(),
  'fielddata.evictions': z.string().describe('The fielddata cache evictions.').optional(),
  fe: z.string().describe('The fielddata cache evictions.').optional(),
  fielddataEvictions: z.string().describe('The fielddata cache evictions.').optional(),
  'query_cache.memory_size': z.string().describe('The used query cache memory.').optional(),
  qcm: z.string().describe('The used query cache memory.').optional(),
  queryCacheMemory: z.string().describe('The used query cache memory.').optional(),
  'query_cache.evictions': z.string().describe('The query cache evictions.').optional(),
  qce: z.string().describe('The query cache evictions.').optional(),
  queryCacheEvictions: z.string().describe('The query cache evictions.').optional(),
  'flush.total': z.string().describe('The number of flushes.').optional(),
  ft: z.string().describe('The number of flushes.').optional(),
  flushTotal: z.string().describe('The number of flushes.').optional(),
  'flush.total_time': z.string().describe('The time spent in flush.').optional(),
  ftt: z.string().describe('The time spent in flush.').optional(),
  flushTotalTime: z.string().describe('The time spent in flush.').optional(),
  'get.current': z.string().describe('The number of current get operations.').optional(),
  gc: z.string().describe('The number of current get operations.').optional(),
  getCurrent: z.string().describe('The number of current get operations.').optional(),
  'get.time': z.string().describe('The time spent in get operations.').optional(),
  gti: z.string().describe('The time spent in get operations.').optional(),
  getTime: z.string().describe('The time spent in get operations.').optional(),
  'get.total': z.string().describe('The number of get operations.').optional(),
  gto: z.string().describe('The number of get operations.').optional(),
  getTotal: z.string().describe('The number of get operations.').optional(),
  'get.exists_time': z.string().describe('The time spent in successful get operations.').optional(),
  geti: z.string().describe('The time spent in successful get operations.').optional(),
  getExistsTime: z.string().describe('The time spent in successful get operations.').optional(),
  'get.exists_total': z.string().describe('The number of successful get operations.').optional(),
  geto: z.string().describe('The number of successful get operations.').optional(),
  getExistsTotal: z.string().describe('The number of successful get operations.').optional(),
  'get.missing_time': z.string().describe('The time spent in failed get operations.').optional(),
  gmti: z.string().describe('The time spent in failed get operations.').optional(),
  getMissingTime: z.string().describe('The time spent in failed get operations.').optional(),
  'get.missing_total': z.string().describe('The number of failed get operations.').optional(),
  gmto: z.string().describe('The number of failed get operations.').optional(),
  getMissingTotal: z.string().describe('The number of failed get operations.').optional(),
  'indexing.delete_current': z.string().describe('The number of current deletion operations.').optional(),
  idc: z.string().describe('The number of current deletion operations.').optional(),
  indexingDeleteCurrent: z.string().describe('The number of current deletion operations.').optional(),
  'indexing.delete_time': z.string().describe('The time spent in deletion operations.').optional(),
  idti: z.string().describe('The time spent in deletion operations.').optional(),
  indexingDeleteTime: z.string().describe('The time spent in deletion operations.').optional(),
  'indexing.delete_total': z.string().describe('The number of delete operations.').optional(),
  idto: z.string().describe('The number of delete operations.').optional(),
  indexingDeleteTotal: z.string().describe('The number of delete operations.').optional(),
  'indexing.index_current': z.string().describe('The number of current indexing operations.').optional(),
  iic: z.string().describe('The number of current indexing operations.').optional(),
  indexingIndexCurrent: z.string().describe('The number of current indexing operations.').optional(),
  'indexing.index_time': z.string().describe('The time spent in indexing operations.').optional(),
  iiti: z.string().describe('The time spent in indexing operations.').optional(),
  indexingIndexTime: z.string().describe('The time spent in indexing operations.').optional(),
  'indexing.index_total': z.string().describe('The number of indexing operations.').optional(),
  iito: z.string().describe('The number of indexing operations.').optional(),
  indexingIndexTotal: z.string().describe('The number of indexing operations.').optional(),
  'indexing.index_failed': z.string().describe('The number of failed indexing operations.').optional(),
  iif: z.string().describe('The number of failed indexing operations.').optional(),
  indexingIndexFailed: z.string().describe('The number of failed indexing operations.').optional(),
  'merges.current': z.string().describe('The number of current merge operations.').optional(),
  mc: z.string().describe('The number of current merge operations.').optional(),
  mergesCurrent: z.string().describe('The number of current merge operations.').optional(),
  'merges.current_docs': z.string().describe('The number of current merging documents.').optional(),
  mcd: z.string().describe('The number of current merging documents.').optional(),
  mergesCurrentDocs: z.string().describe('The number of current merging documents.').optional(),
  'merges.current_size': z.string().describe('The size of current merge operations.').optional(),
  mcs: z.string().describe('The size of current merge operations.').optional(),
  mergesCurrentSize: z.string().describe('The size of current merge operations.').optional(),
  'merges.total': z.string().describe('The number of completed merge operations.').optional(),
  mt: z.string().describe('The number of completed merge operations.').optional(),
  mergesTotal: z.string().describe('The number of completed merge operations.').optional(),
  'merges.total_docs': z.string().describe('The nuber of merged documents.').optional(),
  mtd: z.string().describe('The nuber of merged documents.').optional(),
  mergesTotalDocs: z.string().describe('The nuber of merged documents.').optional(),
  'merges.total_size': z.string().describe('The size of current merges.').optional(),
  mts: z.string().describe('The size of current merges.').optional(),
  mergesTotalSize: z.string().describe('The size of current merges.').optional(),
  'merges.total_time': z.string().describe('The time spent merging documents.').optional(),
  mtt: z.string().describe('The time spent merging documents.').optional(),
  mergesTotalTime: z.string().describe('The time spent merging documents.').optional(),
  'refresh.total': z.string().describe('The total number of refreshes.').optional(),
  'refresh.time': z.string().describe('The time spent in refreshes.').optional(),
  'refresh.external_total': z.string().describe('The total nunber of external refreshes.').optional(),
  rto: z.string().describe('The total nunber of external refreshes.').optional(),
  refreshTotal: z.string().describe('The total nunber of external refreshes.').optional(),
  'refresh.external_time': z.string().describe('The time spent in external refreshes.').optional(),
  rti: z.string().describe('The time spent in external refreshes.').optional(),
  refreshTime: z.string().describe('The time spent in external refreshes.').optional(),
  'refresh.listeners': z.string().describe('The number of pending refresh listeners.').optional(),
  rli: z.string().describe('The number of pending refresh listeners.').optional(),
  refreshListeners: z.string().describe('The number of pending refresh listeners.').optional(),
  'search.fetch_current': z.string().describe('The current fetch phase operations.').optional(),
  sfc: z.string().describe('The current fetch phase operations.').optional(),
  searchFetchCurrent: z.string().describe('The current fetch phase operations.').optional(),
  'search.fetch_time': z.string().describe('The time spent in fetch phase.').optional(),
  sfti: z.string().describe('The time spent in fetch phase.').optional(),
  searchFetchTime: z.string().describe('The time spent in fetch phase.').optional(),
  'search.fetch_total': z.string().describe('The total number of fetch operations.').optional(),
  sfto: z.string().describe('The total number of fetch operations.').optional(),
  searchFetchTotal: z.string().describe('The total number of fetch operations.').optional(),
  'search.open_contexts': z.string().describe('The number of open search contexts.').optional(),
  so: z.string().describe('The number of open search contexts.').optional(),
  searchOpenContexts: z.string().describe('The number of open search contexts.').optional(),
  'search.query_current': z.string().describe('The current query phase operations.').optional(),
  sqc: z.string().describe('The current query phase operations.').optional(),
  searchQueryCurrent: z.string().describe('The current query phase operations.').optional(),
  'search.query_time': z.string().describe('The time spent in query phase.').optional(),
  sqti: z.string().describe('The time spent in query phase.').optional(),
  searchQueryTime: z.string().describe('The time spent in query phase.').optional(),
  'search.query_total': z.string().describe('The total number of query phase operations.').optional(),
  sqto: z.string().describe('The total number of query phase operations.').optional(),
  searchQueryTotal: z.string().describe('The total number of query phase operations.').optional(),
  'search.scroll_current': z.string().describe('The open scroll contexts.').optional(),
  scc: z.string().describe('The open scroll contexts.').optional(),
  searchScrollCurrent: z.string().describe('The open scroll contexts.').optional(),
  'search.scroll_time': z.string().describe('The time scroll contexts were held open.').optional(),
  scti: z.string().describe('The time scroll contexts were held open.').optional(),
  searchScrollTime: z.string().describe('The time scroll contexts were held open.').optional(),
  'search.scroll_total': z.string().describe('The number of completed scroll contexts.').optional(),
  scto: z.string().describe('The number of completed scroll contexts.').optional(),
  searchScrollTotal: z.string().describe('The number of completed scroll contexts.').optional(),
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
  'segments.fixed_bitset_memory': z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in `_parent` fields.').optional(),
  sfbm: z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in `_parent` fields.').optional(),
  fixedBitsetMemory: z.string().describe('The memory used by fixed bit sets for nested object field types and export type filters for types referred in `_parent` fields.').optional(),
  'seq_no.max': z.string().describe('The maximum sequence number.').optional(),
  sqm: z.string().describe('The maximum sequence number.').optional(),
  maxSeqNo: z.string().describe('The maximum sequence number.').optional(),
  'seq_no.local_checkpoint': z.string().describe('The local checkpoint.').optional(),
  sql: z.string().describe('The local checkpoint.').optional(),
  localCheckpoint: z.string().describe('The local checkpoint.').optional(),
  'seq_no.global_checkpoint': z.string().describe('The global checkpoint.').optional(),
  sqg: z.string().describe('The global checkpoint.').optional(),
  globalCheckpoint: z.string().describe('The global checkpoint.').optional(),
  'warmer.current': z.string().describe('The number of current warmer operations.').optional(),
  wc: z.string().describe('The number of current warmer operations.').optional(),
  warmerCurrent: z.string().describe('The number of current warmer operations.').optional(),
  'warmer.total': z.string().describe('The total number of warmer operations.').optional(),
  wto: z.string().describe('The total number of warmer operations.').optional(),
  warmerTotal: z.string().describe('The total number of warmer operations.').optional(),
  'warmer.total_time': z.string().describe('The time spent in warmer operations.').optional(),
  wtt: z.string().describe('The time spent in warmer operations.').optional(),
  warmerTotalTime: z.string().describe('The time spent in warmer operations.').optional(),
  'path.data': z.string().describe('The shard data path.').optional(),
  pd: z.string().describe('The shard data path.').optional(),
  dataPath: z.string().describe('The shard data path.').optional(),
  'path.state': z.string().describe('The shard state path.').optional(),
  ps: z.string().describe('The shard state path.').optional(),
  statsPath: z.string().describe('The shard state path.').optional(),
  'bulk.total_operations': z.string().describe('The number of bulk shard operations.').optional(),
  bto: z.string().describe('The number of bulk shard operations.').optional(),
  bulkTotalOperations: z.string().describe('The number of bulk shard operations.').optional(),
  'bulk.total_time': z.string().describe('The time spent in shard bulk operations.').optional(),
  btti: z.string().describe('The time spent in shard bulk operations.').optional(),
  bulkTotalTime: z.string().describe('The time spent in shard bulk operations.').optional(),
  'bulk.total_size_in_bytes': z.string().describe('The total size in bytes of shard bulk operations.').optional(),
  btsi: z.string().describe('The total size in bytes of shard bulk operations.').optional(),
  bulkTotalSizeInBytes: z.string().describe('The total size in bytes of shard bulk operations.').optional(),
  'bulk.avg_time': z.string().describe('The average time spent in shard bulk operations.').optional(),
  bati: z.string().describe('The average time spent in shard bulk operations.').optional(),
  bulkAvgTime: z.string().describe('The average time spent in shard bulk operations.').optional(),
  'bulk.avg_size_in_bytes': z.string().describe('The average size in bytes of shard bulk operations.').optional(),
  basi: z.string().describe('The average size in bytes of shard bulk operations.').optional(),
  bulkAvgSizeInBytes: z.string().describe('The average size in bytes of shard bulk operations.').optional()
}).meta({ id: 'CatShardsShardsRecord' })
export type CatShardsShardsRecord = z.infer<typeof CatShardsShardsRecord>

export const CatShardsResponse = z.array(CatShardsShardsRecord).meta({ id: 'CatShardsResponse' })
export type CatShardsResponse = z.infer<typeof CatShardsResponse>

/**
 * Get snapshot information.
 *
 * Get information about the snapshots stored in one or more repositories.
 * A snapshot is a backup of an index or running Elasticsearch cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot API.
 */
export const CatSnapshotsRequest = z.object({
  ...CatCatRequestBase.shape,
  repository: Names.describe('A comma-separated list of snapshot repositories used to limit the request. Accepts wildcard expressions. `_all` returns all repositories. If any repository fails during the request, Elasticsearch returns an error.').optional().meta({ found_in: 'path' }),
  ignore_unavailable: z.boolean().describe('If `true`, the response does not include information from unavailable snapshots.').optional().meta({ found_in: 'query' }),
  h: CatCatSnapshotsColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatSnapshotsRequest' })
export type CatSnapshotsRequest = z.infer<typeof CatSnapshotsRequest>

export const CatSnapshotsSnapshotsRecord = z.object({
  id: z.string().describe('The unique identifier for the snapshot.').optional(),
  snapshot: z.string().describe('The unique identifier for the snapshot.').optional(),
  repository: z.string().describe('The repository name.').optional(),
  re: z.string().describe('The repository name.').optional(),
  repo: z.string().describe('The repository name.').optional(),
  status: z.string().describe('The state of the snapshot process. Returned values include: `FAILED`: The snapshot process failed. `INCOMPATIBLE`: The snapshot process is incompatible with the current cluster version. `IN_PROGRESS`: The snapshot process started but has not completed. `PARTIAL`: The snapshot process completed with a partial success. `SUCCESS`: The snapshot process completed with a full success.').optional(),
  s: z.string().describe('The state of the snapshot process. Returned values include: `FAILED`: The snapshot process failed. `INCOMPATIBLE`: The snapshot process is incompatible with the current cluster version. `IN_PROGRESS`: The snapshot process started but has not completed. `PARTIAL`: The snapshot process completed with a partial success. `SUCCESS`: The snapshot process completed with a full success.').optional(),
  start_epoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process started.').optional(),
  ste: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process started.').optional(),
  startEpoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process started.').optional(),
  start_time: WatcherScheduleTimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process started.').optional(),
  sti: WatcherScheduleTimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process started.').optional(),
  startTime: WatcherScheduleTimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process started.').optional(),
  end_epoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process ended.').optional(),
  ete: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process ended.').optional(),
  endEpoch: SpecUtilsStringified.describe('The Unix epoch time (seconds since 1970-01-01 00:00:00) at which the snapshot process ended.').optional(),
  end_time: TimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process ended.').optional(),
  eti: TimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process ended.').optional(),
  endTime: TimeOfDay.describe('The time (HH:MM:SS) at which the snapshot process ended.').optional(),
  duration: Duration.describe('The time it took the snapshot process to complete, in time units.').optional(),
  dur: Duration.describe('The time it took the snapshot process to complete, in time units.').optional(),
  indices: z.string().describe('The number of indices in the snapshot.').optional(),
  i: z.string().describe('The number of indices in the snapshot.').optional(),
  successful_shards: z.string().describe('The number of successful shards in the snapshot.').optional(),
  ss: z.string().describe('The number of successful shards in the snapshot.').optional(),
  failed_shards: z.string().describe('The number of failed shards in the snapshot.').optional(),
  fs: z.string().describe('The number of failed shards in the snapshot.').optional(),
  total_shards: z.string().describe('The total number of shards in the snapshot.').optional(),
  ts: z.string().describe('The total number of shards in the snapshot.').optional(),
  reason: z.string().describe('The reason for any snapshot failures.').optional(),
  r: z.string().describe('The reason for any snapshot failures.').optional()
}).meta({ id: 'CatSnapshotsSnapshotsRecord' })
export type CatSnapshotsSnapshotsRecord = z.infer<typeof CatSnapshotsSnapshotsRecord>

export const CatSnapshotsResponse = z.array(CatSnapshotsSnapshotsRecord).meta({ id: 'CatSnapshotsResponse' })
export type CatSnapshotsResponse = z.infer<typeof CatSnapshotsResponse>

/**
 * Get task information.
 *
 * Get information about tasks currently running in the cluster.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the task management API.
 */
export const CatTasksRequest = z.object({
  ...CatCatRequestBase.shape,
  actions: z.array(z.string()).describe('The task action names, which are used to limit the response.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('If `true`, the response includes detailed information about shard recoveries.').optional().meta({ found_in: 'query' }),
  nodes: z.array(z.string()).describe('Unique node identifiers, which are used to limit the response.').optional().meta({ found_in: 'query' }),
  parent_task_id: z.string().describe('The parent task identifier, which is used to limit the response.').optional().meta({ found_in: 'query' }),
  h: CatCatTasksColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If `true`, the request blocks until the task has completed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatTasksRequest' })
export type CatTasksRequest = z.infer<typeof CatTasksRequest>

export const CatTasksTasksRecord = z.object({
  id: Id.describe('The identifier of the task with the node.').optional(),
  action: z.string().describe('The task action.').optional(),
  ac: z.string().describe('The task action.').optional(),
  task_id: Id.describe('The unique task identifier.').optional(),
  ti: Id.describe('The unique task identifier.').optional(),
  parent_task_id: z.string().describe('The parent task identifier.').optional(),
  pti: z.string().describe('The parent task identifier.').optional(),
  type: z.string().describe('The task type.').optional(),
  ty: z.string().describe('The task type.').optional(),
  start_time: z.string().describe('The start time in milliseconds.').optional(),
  start: z.string().describe('The start time in milliseconds.').optional(),
  timestamp: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  ts: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  hms: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  hhmmss: z.string().describe('The start time in `HH:MM:SS` format.').optional(),
  running_time_ns: z.string().describe('The running time in nanoseconds.').optional(),
  running_time: z.string().describe('The running time.').optional(),
  time: z.string().describe('The running time.').optional(),
  node_id: NodeId.describe('The unique node identifier.').optional(),
  ni: NodeId.describe('The unique node identifier.').optional(),
  ip: z.string().describe('The IP address for the node.').optional(),
  i: z.string().describe('The IP address for the node.').optional(),
  port: z.string().describe('The bound transport port for the node.').optional(),
  po: z.string().describe('The bound transport port for the node.').optional(),
  node: z.string().describe('The node name.').optional(),
  n: z.string().describe('The node name.').optional(),
  version: VersionString.describe('The Elasticsearch version.').optional(),
  v: VersionString.describe('The Elasticsearch version.').optional(),
  x_opaque_id: z.string().describe('The X-Opaque-ID header.').optional(),
  x: z.string().describe('The X-Opaque-ID header.').optional(),
  description: z.string().describe('The task action description.').optional(),
  desc: z.string().describe('The task action description.').optional()
}).meta({ id: 'CatTasksTasksRecord' })
export type CatTasksTasksRecord = z.infer<typeof CatTasksTasksRecord>

export const CatTasksResponse = z.array(CatTasksTasksRecord).meta({ id: 'CatTasksResponse' })
export type CatTasksResponse = z.infer<typeof CatTasksResponse>

/**
 * Get index template information.
 *
 * Get information about the index templates in a cluster.
 * You can use index templates to apply index settings and field mappings to new indices at creation.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get index template API.
 */
export const CatTemplatesRequest = z.object({
  ...CatCatRequestBase.shape,
  name: Name.describe('The name of the template to return. Accepts wildcard expressions. If omitted, all templates are returned.').optional().meta({ found_in: 'path' }),
  h: CatCatTemplatesColumns.describe('A comma-separated list of columns names to display. It supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('List of columns that determine how the table should be sorted. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatTemplatesRequest' })
export type CatTemplatesRequest = z.infer<typeof CatTemplatesRequest>

export const CatTemplatesTemplatesRecord = z.object({
  name: Name.describe('The template name.').optional(),
  n: Name.describe('The template name.').optional(),
  index_patterns: z.string().describe('The template index patterns.').optional(),
  t: z.string().describe('The template index patterns.').optional(),
  order: z.string().describe('The template application order or priority number.').optional(),
  o: z.string().describe('The template application order or priority number.').optional(),
  p: z.string().describe('The template application order or priority number.').optional(),
  version: z.union([VersionString, z.null()]).describe('The template version.').optional(),
  v: z.union([VersionString, z.null()]).describe('The template version.').optional(),
  composed_of: z.string().describe('The component templates that comprise the index template.').optional(),
  c: z.string().describe('The component templates that comprise the index template.').optional()
}).meta({ id: 'CatTemplatesTemplatesRecord' })
export type CatTemplatesTemplatesRecord = z.infer<typeof CatTemplatesTemplatesRecord>

export const CatTemplatesResponse = z.array(CatTemplatesTemplatesRecord).meta({ id: 'CatTemplatesResponse' })
export type CatTemplatesResponse = z.infer<typeof CatTemplatesResponse>

/**
 * Get thread pool statistics.
 *
 * Get thread pool statistics for each node in a cluster.
 * Returned information includes all built-in thread pools and custom thread pools.
 * IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
 */
export const CatThreadPoolRequest = z.object({
  ...CatCatRequestBase.shape,
  thread_pool_patterns: Names.describe('A comma-separated list of thread pool names used to limit the request. Accepts wildcard expressions.').optional().meta({ found_in: 'path' }),
  h: CatCatThreadPoolColumns.describe('List of columns to appear in the response. Supports simple wildcards.').optional().meta({ found_in: 'query' }),
  s: Names.describe('A comma-separated list of column names or aliases that determines the sort order. Sorting defaults to ascending and can be changed by setting `:asc` or `:desc` as a suffix to the column name.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('If `true`, the request computes the list of selected nodes from the local cluster state. If `false` the list of selected nodes are computed from the cluster state of the master node. In both cases the coordinating node will send requests for further information to each selected node.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatThreadPoolRequest' })
export type CatThreadPoolRequest = z.infer<typeof CatThreadPoolRequest>

export const CatThreadPoolThreadPoolRecord = z.object({
  node_name: z.string().describe('The node name.').optional(),
  nn: z.string().describe('The node name.').optional(),
  node_id: NodeId.describe('The persistent node identifier.').optional(),
  id: NodeId.describe('The persistent node identifier.').optional(),
  ephemeral_node_id: z.string().describe('The ephemeral node identifier.').optional(),
  eid: z.string().describe('The ephemeral node identifier.').optional(),
  pid: z.string().describe('The process identifier.').optional(),
  p: z.string().describe('The process identifier.').optional(),
  host: z.string().describe('The host name for the current node.').optional(),
  h: z.string().describe('The host name for the current node.').optional(),
  ip: z.string().describe('The IP address for the current node.').optional(),
  i: z.string().describe('The IP address for the current node.').optional(),
  port: z.string().describe('The bound transport port for the current node.').optional(),
  po: z.string().describe('The bound transport port for the current node.').optional(),
  name: z.string().describe('The thread pool name.').optional(),
  n: z.string().describe('The thread pool name.').optional(),
  type: z.string().describe('The thread pool type. Returned values include `fixed`, `fixed_auto_queue_size`, `direct`, and `scaling`.').optional(),
  t: z.string().describe('The thread pool type. Returned values include `fixed`, `fixed_auto_queue_size`, `direct`, and `scaling`.').optional(),
  active: z.string().describe('The number of active threads in the current thread pool.').optional(),
  a: z.string().describe('The number of active threads in the current thread pool.').optional(),
  pool_size: z.string().describe('The number of threads in the current thread pool.').optional(),
  psz: z.string().describe('The number of threads in the current thread pool.').optional(),
  queue: z.string().describe('The number of tasks currently in queue.').optional(),
  q: z.string().describe('The number of tasks currently in queue.').optional(),
  queue_size: z.string().describe('The maximum number of tasks permitted in the queue.').optional(),
  qs: z.string().describe('The maximum number of tasks permitted in the queue.').optional(),
  rejected: z.string().describe('The number of rejected tasks.').optional(),
  r: z.string().describe('The number of rejected tasks.').optional(),
  largest: z.string().describe('The highest number of active threads in the current thread pool.').optional(),
  l: z.string().describe('The highest number of active threads in the current thread pool.').optional(),
  completed: z.string().describe('The number of completed tasks.').optional(),
  c: z.string().describe('The number of completed tasks.').optional(),
  core: z.union([z.string(), z.null()]).describe('The core number of active threads allowed in a scaling thread pool.').optional(),
  cr: z.union([z.string(), z.null()]).describe('The core number of active threads allowed in a scaling thread pool.').optional(),
  max: z.union([z.string(), z.null()]).describe('The maximum number of active threads allowed in a scaling thread pool.').optional(),
  mx: z.union([z.string(), z.null()]).describe('The maximum number of active threads allowed in a scaling thread pool.').optional(),
  size: z.union([z.string(), z.null()]).describe('The number of active threads allowed in a fixed thread pool.').optional(),
  sz: z.union([z.string(), z.null()]).describe('The number of active threads allowed in a fixed thread pool.').optional(),
  keep_alive: z.union([z.string(), z.null()]).describe('The thread keep alive time.').optional(),
  ka: z.union([z.string(), z.null()]).describe('The thread keep alive time.').optional()
}).meta({ id: 'CatThreadPoolThreadPoolRecord' })
export type CatThreadPoolThreadPoolRecord = z.infer<typeof CatThreadPoolThreadPoolRecord>

export const CatThreadPoolResponse = z.array(CatThreadPoolThreadPoolRecord).meta({ id: 'CatThreadPoolResponse' })
export type CatThreadPoolResponse = z.infer<typeof CatThreadPoolResponse>

/**
 * Get transform information.
 *
 * Get configuration and usage information about transforms.
 *
 * CAT APIs are only intended for human consumption using the Kibana
 * console or command line. They are not intended for use by applications. For
 * application consumption, use the get transform statistics API.
 */
export const CatTransformsRequest = z.object({
  ...CatCatRequestBase.shape,
  transform_id: Id.describe('A transform identifier or a wildcard expression. If you do not specify one of these options, the API returns information for all transforms.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: contains wildcard expressions and there are no transforms that match; contains the `_all` string or no identifiers and there are no matches; contains wildcard expressions and there are only partial matches. If `true`, it returns an empty transforms array when there are no matches and the subset of results when there are partial matches. If `false`, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of transforms.').optional().meta({ found_in: 'query' }),
  h: CatCatTransformColumns.describe('Comma-separated list of column names to display.').optional().meta({ found_in: 'query' }),
  s: CatCatTransformColumns.describe('Comma-separated list of column names or column aliases used to sort the response.').optional().meta({ found_in: 'query' }),
  size: integer.describe('The maximum number of transforms to obtain.').optional().meta({ found_in: 'query' })
}).meta({ id: 'CatTransformsRequest' })
export type CatTransformsRequest = z.infer<typeof CatTransformsRequest>

export const CatTransformsTransformsRecord = z.object({
  id: Id.describe('The transform identifier.').optional(),
  state: z.string().describe('The status of the transform. Returned values include: `aborting`: The transform is aborting. `failed: The transform failed. For more information about the failure, check the `reason` field. `indexing`: The transform is actively processing data and creating new documents. `started`: The transform is running but not actively indexing data. `stopped`: The transform is stopped. `stopping`: The transform is stopping.').optional(),
  s: z.string().describe('The status of the transform. Returned values include: `aborting`: The transform is aborting. `failed: The transform failed. For more information about the failure, check the `reason` field. `indexing`: The transform is actively processing data and creating new documents. `started`: The transform is running but not actively indexing data. `stopped`: The transform is stopped. `stopping`: The transform is stopping.').optional(),
  checkpoint: z.string().describe('The sequence number for the checkpoint.').optional(),
  c: z.string().describe('The sequence number for the checkpoint.').optional(),
  documents_processed: z.string().describe('The number of documents that have been processed from the source index of the transform.').optional(),
  docp: z.string().describe('The number of documents that have been processed from the source index of the transform.').optional(),
  documentsProcessed: z.string().describe('The number of documents that have been processed from the source index of the transform.').optional(),
  checkpoint_progress: z.union([z.string(), z.null()]).describe('The progress of the next checkpoint that is currently in progress.').optional(),
  cp: z.union([z.string(), z.null()]).describe('The progress of the next checkpoint that is currently in progress.').optional(),
  checkpointProgress: z.union([z.string(), z.null()]).describe('The progress of the next checkpoint that is currently in progress.').optional(),
  last_search_time: z.union([z.string(), z.null()]).describe('The timestamp of the last search in the source indices. This field is shown only if the transform is running.').optional(),
  lst: z.union([z.string(), z.null()]).describe('The timestamp of the last search in the source indices. This field is shown only if the transform is running.').optional(),
  lastSearchTime: z.union([z.string(), z.null()]).describe('The timestamp of the last search in the source indices. This field is shown only if the transform is running.').optional(),
  changes_last_detection_time: z.union([z.string(), z.null()]).describe('The timestamp when changes were last detected in the source indices.').optional(),
  cldt: z.union([z.string(), z.null()]).describe('The timestamp when changes were last detected in the source indices.').optional(),
  create_time: z.string().describe('The time the transform was created.').optional(),
  ct: z.string().describe('The time the transform was created.').optional(),
  createTime: z.string().describe('The time the transform was created.').optional(),
  version: VersionString.describe('The version of Elasticsearch that existed on the node when the transform was created.').optional(),
  v: VersionString.describe('The version of Elasticsearch that existed on the node when the transform was created.').optional(),
  source_index: z.string().describe('The source indices for the transform.').optional(),
  si: z.string().describe('The source indices for the transform.').optional(),
  sourceIndex: z.string().describe('The source indices for the transform.').optional(),
  dest_index: z.string().describe('The destination index for the transform.').optional(),
  di: z.string().describe('The destination index for the transform.').optional(),
  destIndex: z.string().describe('The destination index for the transform.').optional(),
  pipeline: z.string().describe('The unique identifier for the ingest pipeline.').optional(),
  p: z.string().describe('The unique identifier for the ingest pipeline.').optional(),
  description: z.string().describe('The description of the transform.').optional(),
  d: z.string().describe('The description of the transform.').optional(),
  transform_type: z.string().describe('The type of transform: `batch` or `continuous`.').optional(),
  tt: z.string().describe('The type of transform: `batch` or `continuous`.').optional(),
  frequency: z.string().describe('The interval between checks for changes in the source indices when the transform is running continuously.').optional(),
  f: z.string().describe('The interval between checks for changes in the source indices when the transform is running continuously.').optional(),
  max_page_search_size: z.string().describe('The initial page size that is used for the composite aggregation for each checkpoint.').optional(),
  mpsz: z.string().describe('The initial page size that is used for the composite aggregation for each checkpoint.').optional(),
  docs_per_second: z.string().describe('The number of input documents per second.').optional(),
  dps: z.string().describe('The number of input documents per second.').optional(),
  reason: z.string().describe('If a transform has a `failed` state, these details describe the reason for failure.').optional(),
  r: z.string().describe('If a transform has a `failed` state, these details describe the reason for failure.').optional(),
  search_total: z.string().describe('The total number of search operations on the source index for the transform.').optional(),
  st: z.string().describe('The total number of search operations on the source index for the transform.').optional(),
  search_failure: z.string().describe('The total number of search failures.').optional(),
  sf: z.string().describe('The total number of search failures.').optional(),
  search_time: z.string().describe('The total amount of search time, in milliseconds.').optional(),
  stime: z.string().describe('The total amount of search time, in milliseconds.').optional(),
  index_total: z.string().describe('The total number of index operations done by the transform.').optional(),
  it: z.string().describe('The total number of index operations done by the transform.').optional(),
  index_failure: z.string().describe('The total number of indexing failures.').optional(),
  if: z.string().describe('The total number of indexing failures.').optional(),
  index_time: z.string().describe('The total time spent indexing documents, in milliseconds.').optional(),
  itime: z.string().describe('The total time spent indexing documents, in milliseconds.').optional(),
  documents_indexed: z.string().describe('The number of documents that have been indexed into the destination index for the transform.').optional(),
  doci: z.string().describe('The number of documents that have been indexed into the destination index for the transform.').optional(),
  delete_time: z.string().describe('The total time spent deleting documents, in milliseconds.').optional(),
  dtime: z.string().describe('The total time spent deleting documents, in milliseconds.').optional(),
  documents_deleted: z.string().describe('The number of documents deleted from the destination index due to the retention policy for the transform.').optional(),
  docd: z.string().describe('The number of documents deleted from the destination index due to the retention policy for the transform.').optional(),
  trigger_count: z.string().describe('The number of times the transform has been triggered by the scheduler. For example, the scheduler triggers the transform indexer to check for updates or ingest new data at an interval specified in the `frequency` property.').optional(),
  tc: z.string().describe('The number of times the transform has been triggered by the scheduler. For example, the scheduler triggers the transform indexer to check for updates or ingest new data at an interval specified in the `frequency` property.').optional(),
  pages_processed: z.string().describe('The number of search or bulk index operations processed. Documents are processed in batches instead of individually.').optional(),
  pp: z.string().describe('The number of search or bulk index operations processed. Documents are processed in batches instead of individually.').optional(),
  processing_time: z.string().describe('The total time spent processing results, in milliseconds.').optional(),
  pt: z.string().describe('The total time spent processing results, in milliseconds.').optional(),
  checkpoint_duration_time_exp_avg: z.string().describe('The exponential moving average of the duration of the checkpoint, in milliseconds.').optional(),
  cdtea: z.string().describe('The exponential moving average of the duration of the checkpoint, in milliseconds.').optional(),
  checkpointTimeExpAvg: z.string().describe('The exponential moving average of the duration of the checkpoint, in milliseconds.').optional(),
  indexed_documents_exp_avg: z.string().describe('The exponential moving average of the number of new documents that have been indexed.').optional(),
  idea: z.string().describe('The exponential moving average of the number of new documents that have been indexed.').optional(),
  processed_documents_exp_avg: z.string().describe('The exponential moving average of the number of documents that have been processed.').optional(),
  pdea: z.string().describe('The exponential moving average of the number of documents that have been processed.').optional()
}).meta({ id: 'CatTransformsTransformsRecord' })
export type CatTransformsTransformsRecord = z.infer<typeof CatTransformsTransformsRecord>

export const CatTransformsResponse = z.array(CatTransformsTransformsRecord).meta({ id: 'CatTransformsResponse' })
export type CatTransformsResponse = z.infer<typeof CatTransformsResponse>
