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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Retry a policy.
 *
 * Retry running the lifecycle policy for an index that is in the ERROR step.
 * The API sets the policy back to the step where the error occurred and runs the step.
 * Use the explain lifecycle state API to determine whether an index is in the ERROR step.
 */
export const IlmRetryRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the indices (comma-separated) whose failed lifecycle step is to be retry').meta({ found_in: 'path' })
}).meta({ id: 'IlmRetryRequest' })
export type IlmRetryRequest = z.infer<typeof IlmRetryRequest>

export const IlmRetryResponse = AcknowledgedResponseBase.meta({ id: 'IlmRetryResponse' })
export type IlmRetryResponse = z.infer<typeof IlmRetryResponse>
