/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { DateTime, Id, Ids, RequestBase, integer } from './_types'

export const LogstashPipelineMetadata = z.object({
  type: z.string(),
  version: z.string()
}).meta({ id: 'LogstashPipelineMetadata' })
export type LogstashPipelineMetadata = z.infer<typeof LogstashPipelineMetadata>

export const LogstashPipelineSettings = z.object({
  'pipeline.workers': integer.describe('The number of workers that will, in parallel, execute the filter and output stages of the pipeline.'),
  'pipeline.batch.size': integer.describe('The maximum number of events an individual worker thread will collect from inputs before attempting to execute its filters and outputs.'),
  'pipeline.batch.delay': integer.describe('When creating pipeline event batches, how long in milliseconds to wait for each event before dispatching an undersized batch to pipeline workers.'),
  'queue.type': z.string().describe('The internal queuing model to use for event buffering.'),
  'queue.max_bytes': z.string().describe('The total capacity of the queue (`queue.type: persisted`) in number of bytes.'),
  'queue.checkpoint.writes': integer.describe('The maximum number of written events before forcing a checkpoint when persistent queues are enabled (`queue.type: persisted`).')
}).meta({ id: 'LogstashPipelineSettings' })
export type LogstashPipelineSettings = z.infer<typeof LogstashPipelineSettings>

export const LogstashPipeline = z.object({
  description: z.string().describe('A description of the pipeline. This description is not used by Elasticsearch or Logstash.'),
  last_modified: DateTime.describe('The date the pipeline was last updated. It must be in the `yyyy-MM-dd\'T\'HH:mm:ss.SSSZZ` strict_date_time format.'),
  pipeline: z.string().describe('The configuration for the pipeline.'),
  pipeline_metadata: LogstashPipelineMetadata.describe('Optional metadata about the pipeline, which can have any contents. This metadata is not generated or used by Elasticsearch or Logstash.'),
  pipeline_settings: LogstashPipelineSettings.describe('Settings for the pipeline. It supports only flat keys in dot notation.'),
  username: z.string().describe('The user who last updated the pipeline.')
}).meta({ id: 'LogstashPipeline' })
export type LogstashPipeline = z.infer<typeof LogstashPipeline>

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

/**
 * Get Logstash pipelines.
 *
 * Get pipelines that are used for Logstash Central Management.
 */
export const LogstashGetPipelineRequest = z.object({
  ...RequestBase.shape,
  id: Ids.describe('A comma-separated list of pipeline identifiers.').optional().meta({ found_in: 'path' })
}).meta({ id: 'LogstashGetPipelineRequest' })
export type LogstashGetPipelineRequest = z.infer<typeof LogstashGetPipelineRequest>

export const LogstashGetPipelineResponse = z.record(Id, LogstashPipeline).meta({ id: 'LogstashGetPipelineResponse' })
export type LogstashGetPipelineResponse = z.infer<typeof LogstashGetPipelineResponse>

/**
 * Create or update a Logstash pipeline.
 *
 * Create a pipeline that is used for Logstash Central Management.
 * If the specified pipeline exists, it is replaced.
 */
export const LogstashPutPipelineRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('An identifier for the pipeline. Pipeline IDs must begin with a letter or underscore and contain only letters, underscores, dashes, hyphens and numbers.').meta({ found_in: 'path' }),
  pipeline: LogstashPipeline.optional().meta({ found_in: 'body' })
}).meta({ id: 'LogstashPutPipelineRequest' })
export type LogstashPutPipelineRequest = z.infer<typeof LogstashPutPipelineRequest>

export const LogstashPutPipelineResponse = z.boolean().meta({ id: 'LogstashPutPipelineResponse' })
export type LogstashPutPipelineResponse = z.infer<typeof LogstashPutPipelineResponse>
