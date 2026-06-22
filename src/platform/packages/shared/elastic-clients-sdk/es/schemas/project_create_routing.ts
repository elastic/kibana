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

export const ProjectRoutingExpression = z.string().meta({ id: 'ProjectRoutingExpression' })
export type ProjectRoutingExpression = z.infer<typeof ProjectRoutingExpression>

export const ProjectProjectRoutingExpression = z.object({
  expression: ProjectRoutingExpression
}).meta({ id: 'ProjectProjectRoutingExpression' })
export type ProjectProjectRoutingExpression = z.infer<typeof ProjectProjectRoutingExpression>

/** Create or update a project routing expression. */
export const ProjectCreateRoutingRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('The name of project routing expression').meta({ found_in: 'path' }),
  expressions: ProjectProjectRoutingExpression.meta({ found_in: 'body' })
}).meta({ id: 'ProjectCreateRoutingRequest' })
export type ProjectCreateRoutingRequest = z.infer<typeof ProjectCreateRoutingRequest>

export const ProjectCreateRoutingResponse = AcknowledgedResponseBase.meta({ id: 'ProjectCreateRoutingResponse' })
export type ProjectCreateRoutingResponse = z.infer<typeof ProjectCreateRoutingResponse>
