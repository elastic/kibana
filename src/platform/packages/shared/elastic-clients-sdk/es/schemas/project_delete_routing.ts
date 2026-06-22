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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Delete a project routing expression. */
export const ProjectDeleteRoutingRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('The name of project routing expression').meta({ found_in: 'path' })
}).meta({ id: 'ProjectDeleteRoutingRequest' })
export type ProjectDeleteRoutingRequest = z.infer<typeof ProjectDeleteRoutingRequest>

export const ProjectDeleteRoutingResponse = AcknowledgedResponseBase.meta({ id: 'ProjectDeleteRoutingResponse' })
export type ProjectDeleteRoutingResponse = z.infer<typeof ProjectDeleteRoutingResponse>
