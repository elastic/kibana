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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const ProjectRoutingExpression = z.string().meta({ id: 'ProjectRoutingExpression' })
export type ProjectRoutingExpression = z.infer<typeof ProjectRoutingExpression>

export const ProjectProjectRoutingExpression = z.object({
  expression: ProjectRoutingExpression
}).meta({ id: 'ProjectProjectRoutingExpression' })
export type ProjectProjectRoutingExpression = z.infer<typeof ProjectProjectRoutingExpression>

/** Get a project routing expression. */
export const ProjectGetRoutingRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('The name of project routing expression').meta({ found_in: 'path' })
}).meta({ id: 'ProjectGetRoutingRequest' })
export type ProjectGetRoutingRequest = z.infer<typeof ProjectGetRoutingRequest>

export const ProjectGetRoutingResponse = ProjectProjectRoutingExpression.meta({ id: 'ProjectGetRoutingResponse' })
export type ProjectGetRoutingResponse = z.infer<typeof ProjectGetRoutingResponse>
