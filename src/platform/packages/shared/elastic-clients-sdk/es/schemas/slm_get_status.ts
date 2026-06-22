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

export const LifecycleOperationMode = z.enum(['RUNNING', 'STOPPING', 'STOPPED']).meta({ id: 'LifecycleOperationMode' })
export type LifecycleOperationMode = z.infer<typeof LifecycleOperationMode>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Get the snapshot lifecycle management status. */
export const SlmGetStatusRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SlmGetStatusRequest' })
export type SlmGetStatusRequest = z.infer<typeof SlmGetStatusRequest>

export const SlmGetStatusResponse = z.object({
  operation_mode: LifecycleOperationMode
}).meta({ id: 'SlmGetStatusResponse' })
export type SlmGetStatusResponse = z.infer<typeof SlmGetStatusResponse>
