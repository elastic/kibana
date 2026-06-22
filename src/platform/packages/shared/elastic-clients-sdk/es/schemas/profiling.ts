/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, RequestBase } from './_types'

/** Returns basic information about the status of Universal Profiling. */
export const ProfilingFlamegraphRequest = z.object({
  ...RequestBase.shape,
  conditions: z.any().optional().meta({ found_in: 'body' })
}).meta({ id: 'ProfilingFlamegraphRequest' })
export type ProfilingFlamegraphRequest = z.infer<typeof ProfilingFlamegraphRequest>

export const ProfilingFlamegraphResponse = z.any().meta({ id: 'ProfilingFlamegraphResponse' })
export type ProfilingFlamegraphResponse = z.infer<typeof ProfilingFlamegraphResponse>

/** Extracts raw stacktrace information from Universal Profiling. */
export const ProfilingStacktracesRequest = z.object({
  ...RequestBase.shape,
  conditions: z.any().optional().meta({ found_in: 'body' })
}).meta({ id: 'ProfilingStacktracesRequest' })
export type ProfilingStacktracesRequest = z.infer<typeof ProfilingStacktracesRequest>

export const ProfilingStacktracesResponse = z.any().meta({ id: 'ProfilingStacktracesResponse' })
export type ProfilingStacktracesResponse = z.infer<typeof ProfilingStacktracesResponse>

export const ProfilingStatusProfilingOperationMode = z.enum(['RUNNING', 'STOPPING', 'STOPPED']).meta({ id: 'ProfilingStatusProfilingOperationMode' })
export type ProfilingStatusProfilingOperationMode = z.infer<typeof ProfilingStatusProfilingOperationMode>

/** Returns basic information about the status of Universal Profiling. */
export const ProfilingStatusRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  wait_for_resources_created: z.boolean().describe('Whether to return immediately or wait until resources have been created').optional().meta({ found_in: 'query' })
}).meta({ id: 'ProfilingStatusRequest' })
export type ProfilingStatusRequest = z.infer<typeof ProfilingStatusRequest>

export const ProfilingStatusResponse = z.object({
  operation_mode: ProfilingStatusProfilingOperationMode
}).meta({ id: 'ProfilingStatusResponse' })
export type ProfilingStatusResponse = z.infer<typeof ProfilingStatusResponse>

/** Extracts a list of topN functions from Universal Profiling. */
export const ProfilingTopnFunctionsRequest = z.object({
  ...RequestBase.shape,
  conditions: z.any().optional().meta({ found_in: 'body' })
}).meta({ id: 'ProfilingTopnFunctionsRequest' })
export type ProfilingTopnFunctionsRequest = z.infer<typeof ProfilingTopnFunctionsRequest>

export const ProfilingTopnFunctionsResponse = z.any().meta({ id: 'ProfilingTopnFunctionsResponse' })
export type ProfilingTopnFunctionsResponse = z.infer<typeof ProfilingTopnFunctionsResponse>
