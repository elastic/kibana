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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

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

export const CatCatTrainedModelsColumn = z.enum(['create_time', 'ct', 'created_by', 'c', 'createdBy', 'data_frame_analytics_id', 'df', 'dataFrameAnalytics', 'dfid', 'description', 'd', 'heap_size', 'hs', 'modelHeapSize', 'id', 'ingest.count', 'ic', 'ingestCount', 'ingest.current', 'icurr', 'ingestCurrent', 'ingest.failed', 'if', 'ingestFailed', 'ingest.pipelines', 'ip', 'ingestPipelines', 'ingest.time', 'it', 'ingestTime', 'license', 'l', 'operations', 'o', 'modelOperations', 'version', 'v']).meta({ id: 'CatCatTrainedModelsColumn' })
export type CatCatTrainedModelsColumn = z.infer<typeof CatCatTrainedModelsColumn>

export const CatCatTrainedModelsColumns = z.union([CatCatTrainedModelsColumn, z.array(CatCatTrainedModelsColumn)]).meta({ id: 'CatCatTrainedModelsColumns' })
export type CatCatTrainedModelsColumns = z.infer<typeof CatCatTrainedModelsColumns>

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
