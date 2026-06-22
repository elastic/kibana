/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, RequestBase } from './_types'

export const ProjectRoutingExpression = z.string().meta({ id: 'ProjectRoutingExpression' })
export type ProjectRoutingExpression = z.infer<typeof ProjectRoutingExpression>

export const ProjectProjectRoutingExpression = z.object({
  expression: ProjectRoutingExpression
}).meta({ id: 'ProjectProjectRoutingExpression' })
export type ProjectProjectRoutingExpression = z.infer<typeof ProjectProjectRoutingExpression>

export const ProjectNamedProjectRoutingExpressions = z.record(z.string(), ProjectProjectRoutingExpression).meta({ id: 'ProjectNamedProjectRoutingExpressions' })
export type ProjectNamedProjectRoutingExpressions = z.infer<typeof ProjectNamedProjectRoutingExpressions>

/** Create or update project routing expressions. */
export const ProjectCreateManyRoutingRequest = z.object({
  ...RequestBase.shape,
  expressions: ProjectNamedProjectRoutingExpressions.optional().meta({ found_in: 'body' })
}).meta({ id: 'ProjectCreateManyRoutingRequest' })
export type ProjectCreateManyRoutingRequest = z.infer<typeof ProjectCreateManyRoutingRequest>

export const ProjectCreateManyRoutingResponse = AcknowledgedResponseBase.meta({ id: 'ProjectCreateManyRoutingResponse' })
export type ProjectCreateManyRoutingResponse = z.infer<typeof ProjectCreateManyRoutingResponse>

/** Create or update a project routing expression. */
export const ProjectCreateRoutingRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('The name of project routing expression').meta({ found_in: 'path' }),
  expressions: ProjectProjectRoutingExpression.optional().meta({ found_in: 'body' })
}).meta({ id: 'ProjectCreateRoutingRequest' })
export type ProjectCreateRoutingRequest = z.infer<typeof ProjectCreateRoutingRequest>

export const ProjectCreateRoutingResponse = AcknowledgedResponseBase.meta({ id: 'ProjectCreateRoutingResponse' })
export type ProjectCreateRoutingResponse = z.infer<typeof ProjectCreateRoutingResponse>

/** Delete a project routing expression. */
export const ProjectDeleteRoutingRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('The name of project routing expression').meta({ found_in: 'path' })
}).meta({ id: 'ProjectDeleteRoutingRequest' })
export type ProjectDeleteRoutingRequest = z.infer<typeof ProjectDeleteRoutingRequest>

export const ProjectDeleteRoutingResponse = AcknowledgedResponseBase.meta({ id: 'ProjectDeleteRoutingResponse' })
export type ProjectDeleteRoutingResponse = z.infer<typeof ProjectDeleteRoutingResponse>

/** Get project routing expressions. */
export const ProjectGetManyRoutingRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'ProjectGetManyRoutingRequest' })
export type ProjectGetManyRoutingRequest = z.infer<typeof ProjectGetManyRoutingRequest>

export const ProjectGetManyRoutingResponse = ProjectNamedProjectRoutingExpressions.meta({ id: 'ProjectGetManyRoutingResponse' })
export type ProjectGetManyRoutingResponse = z.infer<typeof ProjectGetManyRoutingResponse>

/** Get a project routing expression. */
export const ProjectGetRoutingRequest = z.object({
  ...RequestBase.shape,
  name: z.string().describe('The name of project routing expression').meta({ found_in: 'path' })
}).meta({ id: 'ProjectGetRoutingRequest' })
export type ProjectGetRoutingRequest = z.infer<typeof ProjectGetRoutingRequest>

export const ProjectGetRoutingResponse = ProjectProjectRoutingExpression.meta({ id: 'ProjectGetRoutingResponse' })
export type ProjectGetRoutingResponse = z.infer<typeof ProjectGetRoutingResponse>

export const ProjectTagsTags = z.object({
  _id: z.string(),
  _alias: z.string(),
  _type: z.string(),
  _organisation: z.string()
}).catchall(z.any()).meta({ id: 'ProjectTagsTags' })
export type ProjectTagsTags = z.infer<typeof ProjectTagsTags>

export const ProjectTagsProjectTags = z.object({
  origin: z.record(z.string(), ProjectTagsTags),
  linked_projects: z.record(z.string(), ProjectTagsTags).optional()
}).meta({ id: 'ProjectTagsProjectTags' })
export type ProjectTagsProjectTags = z.infer<typeof ProjectTagsProjectTags>

/**
 * Get tags.
 *
 * Get the tags that are defined for the project.
 */
export const ProjectTagsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'ProjectTagsRequest' })
export type ProjectTagsRequest = z.infer<typeof ProjectTagsRequest>

export const ProjectTagsResponse = ProjectTagsProjectTags.meta({ id: 'ProjectTagsResponse' })
export type ProjectTagsResponse = z.infer<typeof ProjectTagsResponse>
