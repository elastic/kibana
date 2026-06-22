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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatTransformColumn = z.enum(['changes_last_detection_time', 'cldt', 'checkpoint', 'cp', 'checkpoint_duration_time_exp_avg', 'cdtea', 'checkpointTimeExpAvg', 'checkpoint_progress', 'c', 'checkpointProgress', 'create_time', 'ct', 'createTime', 'delete_time', 'dtime', 'description', 'd', 'dest_index', 'di', 'destIndex', 'documents_deleted', 'docd', 'documents_indexed', 'doci', 'docs_per_second', 'dps', 'documents_processed', 'docp', 'frequency', 'f', 'id', 'index_failure', 'if', 'index_time', 'itime', 'index_total', 'it', 'indexed_documents_exp_avg', 'idea', 'last_search_time', 'lst', 'lastSearchTime', 'max_page_search_size', 'mpsz', 'pages_processed', 'pp', 'pipeline', 'p', 'processed_documents_exp_avg', 'pdea', 'processing_time', 'pt', 'reason', 'r', 'search_failure', 'sf', 'search_time', 'stime', 'search_total', 'st', 'source_index', 'si', 'sourceIndex', 'state', 's', 'transform_type', 'tt', 'trigger_count', 'tc', 'version', 'v']).meta({ id: 'CatCatTransformColumn' })
export type CatCatTransformColumn = z.infer<typeof CatCatTransformColumn>

export const CatCatTransformColumns = z.union([CatCatTransformColumn, z.array(CatCatTransformColumn)]).meta({ id: 'CatCatTransformColumns' })
export type CatCatTransformColumns = z.infer<typeof CatCatTransformColumns>

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
