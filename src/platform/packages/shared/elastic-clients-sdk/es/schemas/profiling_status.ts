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
