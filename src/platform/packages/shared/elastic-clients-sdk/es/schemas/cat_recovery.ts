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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

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

export const CatCatRecoveryColumn = z.union([z.enum(['index', 'i', 'idx', 'shard', 's', 'sh', 'start_time', 'start', 'start_time_millis', 'start_millis', 'stop_time', 'stop', 'stop_time_millis', 'stop_millis', 'time', 't', 'ti', 'type', 'ty', 'stage', 'st', 'source_host', 'shost', 'source_node', 'snode', 'target_host', 'thost', 'target_node', 'tnode', 'repository', 'rep', 'snapshot', 'snap', 'files', 'f', 'files_recovered', 'fr', 'files_percent', 'fp', 'files_total', 'tf', 'bytes', 'b', 'bytes_recovered', 'br', 'bytes_percent', 'bp', 'bytes_total', 'tb', 'translog_ops', 'to', 'translog_ops_recovered', 'tor', 'translog_ops_percent', 'top']), z.string()]).meta({ id: 'CatCatRecoveryColumn' })
export type CatCatRecoveryColumn = z.infer<typeof CatCatRecoveryColumn>

export const CatCatRecoveryColumns = z.union([CatCatRecoveryColumn, z.array(CatCatRecoveryColumn)]).meta({ id: 'CatCatRecoveryColumns' })
export type CatCatRecoveryColumns = z.infer<typeof CatCatRecoveryColumns>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

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
