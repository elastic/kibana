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
