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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Open anomaly detection jobs.
 *
 * An anomaly detection job must be opened to be ready to receive and analyze
 * data. It can be opened and closed multiple times throughout its lifecycle.
 * When you open a new job, it starts with an empty model.
 * When you open an existing job, the most recent model state is automatically
 * loaded. The job is ready to resume its analysis from where it left off, once
 * new data is received.
 */
export const MlOpenJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlOpenJobRequest' })
export type MlOpenJobRequest = z.infer<typeof MlOpenJobRequest>

export const MlOpenJobResponse = z.object({
  opened: z.boolean(),
  node: NodeId.describe('The ID of the node that the job was started on. In serverless this will be the "serverless". If the job is allowed to open lazily and has not yet been assigned to a node, this value is an empty string.')
}).meta({ id: 'MlOpenJobResponse' })
export type MlOpenJobResponse = z.infer<typeof MlOpenJobResponse>
