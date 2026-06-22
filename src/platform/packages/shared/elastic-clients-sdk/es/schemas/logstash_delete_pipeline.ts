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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete a Logstash pipeline.
 *
 * Delete a pipeline that is used for Logstash Central Management.
 * If the request succeeds, you receive an empty response with an appropriate status code.
 */
export const LogstashDeletePipelineRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('An identifier for the pipeline.').meta({ found_in: 'path' })
}).meta({ id: 'LogstashDeletePipelineRequest' })
export type LogstashDeletePipelineRequest = z.infer<typeof LogstashDeletePipelineRequest>

export const LogstashDeletePipelineResponse = z.boolean().meta({ id: 'LogstashDeletePipelineResponse' })
export type LogstashDeletePipelineResponse = z.infer<typeof LogstashDeletePipelineResponse>
