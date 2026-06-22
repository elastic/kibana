/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, RequestBase } from './_types'

export const StreamsStreamType = z.enum(['logs', 'logs.otel', 'logs.ecs']).meta({ id: 'StreamsStreamType' })
export type StreamsStreamType = z.infer<typeof StreamsStreamType>

/**
 * Disable a named stream.
 *
 * Turn off the named stream feature for this cluster.
 */
export const StreamsLogsDisableRequest = z.object({
  ...RequestBase.shape,
  name: StreamsStreamType.describe('The stream type to disable.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'StreamsLogsDisableRequest' })
export type StreamsLogsDisableRequest = z.infer<typeof StreamsLogsDisableRequest>

export const StreamsLogsDisableResponse = AcknowledgedResponseBase.meta({ id: 'StreamsLogsDisableResponse' })
export type StreamsLogsDisableResponse = z.infer<typeof StreamsLogsDisableResponse>

/**
 * Enable a named stream.
 *
 * Turn on the named stream feature for this cluster.
 *
 * NOTE: To protect existing data, this feature can be turned on only if the cluster does not have
 * existing indices or data streams that match the pattern `<name>|<name>.*` for the enabled stream
 * type name. If those indices or data streams exist, a `409 - Conflict` response and error is
 * returned.
 */
export const StreamsLogsEnableRequest = z.object({
  ...RequestBase.shape,
  name: StreamsStreamType.describe('The stream type to enable.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'StreamsLogsEnableRequest' })
export type StreamsLogsEnableRequest = z.infer<typeof StreamsLogsEnableRequest>

export const StreamsLogsEnableResponse = AcknowledgedResponseBase.meta({ id: 'StreamsLogsEnableResponse' })
export type StreamsLogsEnableResponse = z.infer<typeof StreamsLogsEnableResponse>

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
