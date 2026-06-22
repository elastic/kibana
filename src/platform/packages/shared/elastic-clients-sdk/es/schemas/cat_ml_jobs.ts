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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const CatCatAnomalyDetectorColumn = z.enum(['assignment_explanation', 'ae', 'buckets.count', 'bc', 'bucketsCount', 'buckets.time.exp_avg', 'btea', 'bucketsTimeExpAvg', 'buckets.time.exp_avg_hour', 'bteah', 'bucketsTimeExpAvgHour', 'buckets.time.max', 'btmax', 'bucketsTimeMax', 'buckets.time.min', 'btmin', 'bucketsTimeMin', 'buckets.time.total', 'btt', 'bucketsTimeTotal', 'data.buckets', 'db', 'dataBuckets', 'data.earliest_record', 'der', 'dataEarliestRecord', 'data.empty_buckets', 'deb', 'dataEmptyBuckets', 'data.input_bytes', 'dib', 'dataInputBytes', 'data.input_fields', 'dif', 'dataInputFields', 'data.input_records', 'dir', 'dataInputRecords', 'data.invalid_dates', 'did', 'dataInvalidDates', 'data.last', 'dl', 'dataLast', 'data.last_empty_bucket', 'dleb', 'dataLastEmptyBucket', 'data.last_sparse_bucket', 'dlsb', 'dataLastSparseBucket', 'data.latest_record', 'dlr', 'dataLatestRecord', 'data.missing_fields', 'dmf', 'dataMissingFields', 'data.out_of_order_timestamps', 'doot', 'dataOutOfOrderTimestamps', 'data.processed_fields', 'dpf', 'dataProcessedFields', 'data.processed_records', 'dpr', 'dataProcessedRecords', 'data.sparse_buckets', 'dsb', 'dataSparseBuckets', 'forecasts.memory.avg', 'fmavg', 'forecastsMemoryAvg', 'forecasts.memory.max', 'fmmax', 'forecastsMemoryMax', 'forecasts.memory.min', 'fmmin', 'forecastsMemoryMin', 'forecasts.memory.total', 'fmt', 'forecastsMemoryTotal', 'forecasts.records.avg', 'fravg', 'forecastsRecordsAvg', 'forecasts.records.max', 'frmax', 'forecastsRecordsMax', 'forecasts.records.min', 'frmin', 'forecastsRecordsMin', 'forecasts.records.total', 'frt', 'forecastsRecordsTotal', 'forecasts.time.avg', 'ftavg', 'forecastsTimeAvg', 'forecasts.time.max', 'ftmax', 'forecastsTimeMax', 'forecasts.time.min', 'ftmin', 'forecastsTimeMin', 'forecasts.time.total', 'ftt', 'forecastsTimeTotal', 'forecasts.total', 'ft', 'forecastsTotal', 'id', 'model.bucket_allocation_failures', 'mbaf', 'modelBucketAllocationFailures', 'model.by_fields', 'mbf', 'modelByFields', 'model.bytes', 'mb', 'modelBytes', 'model.bytes_exceeded', 'mbe', 'modelBytesExceeded', 'model.categorization_status', 'mcs', 'modelCategorizationStatus', 'model.categorized_doc_count', 'mcdc', 'modelCategorizedDocCount', 'model.dead_category_count', 'mdcc', 'modelDeadCategoryCount', 'model.failed_category_count', 'mdcc', 'modelFailedCategoryCount', 'model.frequent_category_count', 'mfcc', 'modelFrequentCategoryCount', 'model.log_time', 'mlt', 'modelLogTime', 'model.memory_limit', 'mml', 'modelMemoryLimit', 'model.memory_status', 'mms', 'modelMemoryStatus', 'model.over_fields', 'mof', 'modelOverFields', 'model.partition_fields', 'mpf', 'modelPartitionFields', 'model.rare_category_count', 'mrcc', 'modelRareCategoryCount', 'model.timestamp', 'mt', 'modelTimestamp', 'model.total_category_count', 'mtcc', 'modelTotalCategoryCount', 'node.address', 'na', 'nodeAddress', 'node.ephemeral_id', 'ne', 'nodeEphemeralId', 'node.id', 'ni', 'nodeId', 'node.name', 'nn', 'nodeName', 'opened_time', 'ot', 'state', 's']).meta({ id: 'CatCatAnomalyDetectorColumn' })
export type CatCatAnomalyDetectorColumn = z.infer<typeof CatCatAnomalyDetectorColumn>

export const CatCatAnomalyDetectorColumns = z.union([CatCatAnomalyDetectorColumn, z.array(CatCatAnomalyDetectorColumn)]).meta({ id: 'CatCatAnomalyDetectorColumns' })
export type CatCatAnomalyDetectorColumns = z.infer<typeof CatCatAnomalyDetectorColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const MlJobState = z.enum(['closing', 'closed', 'opened', 'failed', 'opening']).meta({ id: 'MlJobState' })
export type MlJobState = z.infer<typeof MlJobState>

export const MlMemoryStatus = z.enum(['ok', 'soft_limit', 'hard_limit']).meta({ id: 'MlMemoryStatus' })
export type MlMemoryStatus = z.infer<typeof MlMemoryStatus>

export const MlCategorizationStatus = z.enum(['ok', 'warn']).meta({ id: 'MlCategorizationStatus' })
export type MlCategorizationStatus = z.infer<typeof MlCategorizationStatus>

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
