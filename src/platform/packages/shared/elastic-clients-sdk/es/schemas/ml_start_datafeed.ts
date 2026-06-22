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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const NodeIds = z.union([NodeId, z.array(NodeId)]).meta({ id: 'NodeIds' })
export type NodeIds = z.infer<typeof NodeIds>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Start datafeeds.
 *
 * A datafeed must be started in order to retrieve data from Elasticsearch. A datafeed can be started and stopped
 * multiple times throughout its lifecycle.
 *
 * Before you can start a datafeed, the anomaly detection job must be open. Otherwise, an error occurs.
 *
 * If you restart a stopped datafeed, it continues processing input data from the next millisecond after it was stopped.
 * If new data was indexed for that exact millisecond between stopping and starting, it will be ignored.
 *
 * When Elasticsearch security features are enabled, your datafeed remembers which roles the last user to create or
 * update it had at the time of creation or update and runs the query using those same roles. If you provided secondary
 * authorization headers when you created or updated the datafeed, those credentials are used instead.
 */
export const MlStartDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStartDatafeedRequest' })
export type MlStartDatafeedRequest = z.infer<typeof MlStartDatafeedRequest>

export const MlStartDatafeedResponse = z.object({
  node: NodeIds.describe('The ID of the node that the job was started on. In serverless this will be the "serverless". If the job is allowed to open lazily and has not yet been assigned to a node, this value is an empty string.'),
  started: z.boolean().describe('For a successful response, this value is always `true`. On failure, an exception is returned instead.')
}).meta({ id: 'MlStartDatafeedResponse' })
export type MlStartDatafeedResponse = z.infer<typeof MlStartDatafeedResponse>
