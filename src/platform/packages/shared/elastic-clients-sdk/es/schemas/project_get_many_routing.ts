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

export const ProjectNamedProjectRoutingExpressions = z.record(z.string(), ProjectProjectRoutingExpression).meta({ id: 'ProjectNamedProjectRoutingExpressions' })
export type ProjectNamedProjectRoutingExpressions = z.infer<typeof ProjectNamedProjectRoutingExpressions>

/** Get project routing expressions. */
export const ProjectGetManyRoutingRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'ProjectGetManyRoutingRequest' })
export type ProjectGetManyRoutingRequest = z.infer<typeof ProjectGetManyRoutingRequest>

export const ProjectGetManyRoutingResponse = ProjectNamedProjectRoutingExpressions.meta({ id: 'ProjectGetManyRoutingResponse' })
export type ProjectGetManyRoutingResponse = z.infer<typeof ProjectGetManyRoutingResponse>
