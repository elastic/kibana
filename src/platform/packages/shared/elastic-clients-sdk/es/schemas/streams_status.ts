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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Get the status of streams.
 *
 * Get the current status for all types of streams.
 */
export const StreamsStatusRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'StreamsStatusRequest' })
export type StreamsStatusRequest = z.infer<typeof StreamsStatusRequest>

export const StreamsStatusStreamStatus = z.object({
  enabled: z.boolean().describe('If true, the stream feature is enabled.')
}).meta({ id: 'StreamsStatusStreamStatus' })
export type StreamsStatusStreamStatus = z.infer<typeof StreamsStatusStreamStatus>

export const StreamsStatusResponse = z.object({
  logs: StreamsStatusStreamStatus,
  'logs.otel': StreamsStatusStreamStatus,
  'logs.ecs': StreamsStatusStreamStatus
}).meta({ id: 'StreamsStatusResponse' })
export type StreamsStatusResponse = z.infer<typeof StreamsStatusResponse>
