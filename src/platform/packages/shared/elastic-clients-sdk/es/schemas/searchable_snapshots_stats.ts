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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const SearchableSnapshotsStatsLevel = z.enum(['cluster', 'indices', 'shards']).meta({ id: 'SearchableSnapshotsStatsLevel' })
export type SearchableSnapshotsStatsLevel = z.infer<typeof SearchableSnapshotsStatsLevel>

/** Get searchable snapshot statistics. */
export const SearchableSnapshotsStatsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams and indices to retrieve statistics for.').optional().meta({ found_in: 'path' }),
  level: SearchableSnapshotsStatsLevel.describe('Return stats aggregated at cluster, index or shard level').optional().meta({ found_in: 'query' })
}).meta({ id: 'SearchableSnapshotsStatsRequest' })
export type SearchableSnapshotsStatsRequest = z.infer<typeof SearchableSnapshotsStatsRequest>

export const SearchableSnapshotsStatsResponse = z.object({
  stats: z.any(),
  total: z.any()
}).meta({ id: 'SearchableSnapshotsStatsResponse' })
export type SearchableSnapshotsStatsResponse = z.infer<typeof SearchableSnapshotsStatsResponse>
