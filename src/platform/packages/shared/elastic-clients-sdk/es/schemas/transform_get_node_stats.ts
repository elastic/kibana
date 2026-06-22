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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/**
 * Get node stats.
 *
 * Get per-node information about transform usage.
 */
export const TransformGetNodeStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'TransformGetNodeStatsRequest' })
export type TransformGetNodeStatsRequest = z.infer<typeof TransformGetNodeStatsRequest>

export const TransformGetNodeStatsTransformSchedulerStats = z.object({
  registered_transform_count: integer,
  peek_transform: z.string().optional()
}).meta({ id: 'TransformGetNodeStatsTransformSchedulerStats' })
export type TransformGetNodeStatsTransformSchedulerStats = z.infer<typeof TransformGetNodeStatsTransformSchedulerStats>

export const TransformGetNodeStatsTransformNodeStats = z.object({
  scheduler: TransformGetNodeStatsTransformSchedulerStats
}).meta({ id: 'TransformGetNodeStatsTransformNodeStats' })
export type TransformGetNodeStatsTransformNodeStats = z.infer<typeof TransformGetNodeStatsTransformNodeStats>

export const TransformGetNodeStatsTransformNodeFullStats = z.object({
  total: TransformGetNodeStatsTransformNodeStats
}).catchall(z.any()).meta({ id: 'TransformGetNodeStatsTransformNodeFullStats' })
export type TransformGetNodeStatsTransformNodeFullStats = z.infer<typeof TransformGetNodeStatsTransformNodeFullStats>

export const TransformGetNodeStatsResponse = TransformGetNodeStatsTransformNodeFullStats.meta({ id: 'TransformGetNodeStatsResponse' })
export type TransformGetNodeStatsResponse = z.infer<typeof TransformGetNodeStatsResponse>
