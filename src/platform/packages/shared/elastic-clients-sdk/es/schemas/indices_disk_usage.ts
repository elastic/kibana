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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Analyze the index disk usage.
 *
 * Analyze the disk usage of each field of an index or data stream.
 * This API might not support indices created in previous Elasticsearch versions.
 * The result of a small index can be inaccurate as some parts of an index might not be analyzed by the API.
 *
 * NOTE: The total size of fields of the analyzed shards of the index in the response is usually smaller than the index `store_size` value because some small metadata files are ignored and some parts of data files might not be scanned by the API.
 * Since stored fields are stored together in a compressed format, the sizes of stored fields are also estimates and can be inaccurate.
 * The stored size of the `_id` field is likely underestimated while the `_source` field is overestimated.
 *
 * For usage examples see the External documentation or refer to [Analyze the index disk usage example](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/index-disk-usage) for an example.
 */
export const IndicesDiskUsageRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. It’s recommended to execute this API with a single index (or the latest backing index of a data stream) as the API consumes resources significantly.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  flush: z.boolean().describe('If `true`, the API performs a flush before analysis. If `false`, the response may not include uncommitted data.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  run_expensive_tasks: z.boolean().describe('Analyzing field disk usage is resource-intensive. To use the API, this parameter must be set to `true`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDiskUsageRequest' })
export type IndicesDiskUsageRequest = z.infer<typeof IndicesDiskUsageRequest>

export const IndicesDiskUsageResponse = z.any().meta({ id: 'IndicesDiskUsageResponse' })
export type IndicesDiskUsageResponse = z.infer<typeof IndicesDiskUsageResponse>
