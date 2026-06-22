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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Start a data frame analytics job.
 *
 * A data frame analytics job can be started and stopped multiple times
 * throughout its lifecycle.
 * If the destination index does not exist, it is created automatically the
 * first time you start the data frame analytics job. The
 * `index.number_of_shards` and `index.number_of_replicas` settings for the
 * destination index are copied from the source index. If there are multiple
 * source indices, the destination index copies the highest setting values. The
 * mappings for the destination index are also copied from the source indices.
 * If there are any mapping conflicts, the job fails to start.
 * If the destination index exists, it is used as is. You can therefore set up
 * the destination index in advance with custom settings and mappings.
 */
export const MlStartDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Controls the amount of time to wait until the data frame analytics job starts.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStartDataFrameAnalyticsRequest' })
export type MlStartDataFrameAnalyticsRequest = z.infer<typeof MlStartDataFrameAnalyticsRequest>

export const MlStartDataFrameAnalyticsResponse = z.object({
  acknowledged: z.boolean(),
  node: NodeId.describe('The ID of the node that the job was started on. If the job is allowed to open lazily and has not yet been assigned to a node, this value is an empty string. The node ID of the node the job has been assigned to, or an empty string if it hasn\'t been assigned to a node. In serverless if the job has been assigned to run then the node ID will be "serverless".')
}).meta({ id: 'MlStartDataFrameAnalyticsResponse' })
export type MlStartDataFrameAnalyticsResponse = z.infer<typeof MlStartDataFrameAnalyticsResponse>
