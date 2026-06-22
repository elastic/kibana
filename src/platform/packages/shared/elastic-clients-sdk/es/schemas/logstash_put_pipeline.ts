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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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
 * Create or update a Logstash pipeline.
 *
 * Create a pipeline that is used for Logstash Central Management.
 * If the specified pipeline exists, it is replaced.
 */
export const LogstashPutPipelineRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('An identifier for the pipeline. Pipeline IDs must begin with a letter or underscore and contain only letters, underscores, dashes, hyphens and numbers.').meta({ found_in: 'path' }),
  pipeline: LogstashPipeline.meta({ found_in: 'body' })
}).meta({ id: 'LogstashPutPipelineRequest' })
export type LogstashPutPipelineRequest = z.infer<typeof LogstashPutPipelineRequest>

export const LogstashPutPipelineResponse = z.boolean().meta({ id: 'LogstashPutPipelineResponse' })
export type LogstashPutPipelineResponse = z.infer<typeof LogstashPutPipelineResponse>
