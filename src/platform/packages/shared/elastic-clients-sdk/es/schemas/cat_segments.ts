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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const CatCatRequestBase = z.object({
  ...RequestBase.shape
}).meta({ id: 'CatCatRequestBase' })
export type CatCatRequestBase = z.infer<typeof CatCatRequestBase>

export const CatCatSegmentsColumn = z.union([z.enum(['index', 'i', 'idx', 'shard', 's', 'sh', 'prirep', 'p', 'pr', 'primaryOrReplica', 'ip', 'segment', 'generation', 'docs.count', 'docs.deleted', 'size', 'size.memory', 'committed', 'searchable', 'version', 'compound', 'id']), z.string()]).meta({ id: 'CatCatSegmentsColumn' })
export type CatCatSegmentsColumn = z.infer<typeof CatCatSegmentsColumn>

export const CatCatSegmentsColumns = z.union([CatCatSegmentsColumn, z.array(CatCatSegmentsColumn)]).meta({ id: 'CatCatSegmentsColumns' })
export type CatCatSegmentsColumns = z.infer<typeof CatCatSegmentsColumns>

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
