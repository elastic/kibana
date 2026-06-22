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

export const LifecycleOperationMode = z.enum(['RUNNING', 'STOPPING', 'STOPPED']).meta({ id: 'LifecycleOperationMode' })
export type LifecycleOperationMode = z.infer<typeof LifecycleOperationMode>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Get the ILM status.
 *
 * Get the current index lifecycle management status.
 */
export const IlmGetStatusRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IlmGetStatusRequest' })
export type IlmGetStatusRequest = z.infer<typeof IlmGetStatusRequest>

export const IlmGetStatusResponse = z.object({
  operation_mode: LifecycleOperationMode
}).meta({ id: 'IlmGetStatusResponse' })
export type IlmGetStatusResponse = z.infer<typeof IlmGetStatusResponse>
