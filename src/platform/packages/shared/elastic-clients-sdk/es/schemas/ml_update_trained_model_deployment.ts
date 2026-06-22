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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

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

export const MlAdaptiveAllocationsSettings = z.object({
  enabled: z.boolean().describe('If true, adaptive_allocations is enabled'),
  min_number_of_allocations: integer.describe('Specifies the minimum number of allocations to scale to. If set, it must be greater than or equal to 0. If not defined, the deployment scales to 0.').optional(),
  max_number_of_allocations: integer.describe('Specifies the maximum number of allocations to scale to. If set, it must be greater than or equal to min_number_of_allocations.').optional()
}).meta({ id: 'MlAdaptiveAllocationsSettings' })
export type MlAdaptiveAllocationsSettings = z.infer<typeof MlAdaptiveAllocationsSettings>

export const MlDeploymentAssignmentState = z.enum(['started', 'starting', 'stopping', 'failed']).meta({ id: 'MlDeploymentAssignmentState' })
export type MlDeploymentAssignmentState = z.infer<typeof MlDeploymentAssignmentState>

export const MlRoutingState = z.enum(['failed', 'started', 'starting', 'stopped', 'stopping']).meta({ id: 'MlRoutingState' })
export type MlRoutingState = z.infer<typeof MlRoutingState>

export const MlTrainedModelAssignmentRoutingTable = z.object({
  reason: z.string().describe('The reason for the current state. It is usually populated only when the `routing_state` is `failed`.').optional(),
  routing_state: MlRoutingState.describe('The current routing state.'),
  current_allocations: integer.describe('Current number of allocations.'),
  target_allocations: integer.describe('Target number of allocations.')
}).meta({ id: 'MlTrainedModelAssignmentRoutingTable' })
export type MlTrainedModelAssignmentRoutingTable = z.infer<typeof MlTrainedModelAssignmentRoutingTable>

export const MlTrainingPriority = z.enum(['normal', 'low']).meta({ id: 'MlTrainingPriority' })
export type MlTrainingPriority = z.infer<typeof MlTrainingPriority>

export const MlTrainedModelAssignmentTaskParameters = z.object({
  model_bytes: ByteSize.describe('The size of the trained model in bytes.'),
  model_id: Id.describe('The unique identifier for the trained model.'),
  deployment_id: Id.describe('The unique identifier for the trained model deployment.'),
  cache_size: ByteSize.describe('The size of the trained model cache.').optional(),
  number_of_allocations: integer.describe('The total number of allocations this model is assigned across ML nodes.'),
  priority: MlTrainingPriority,
  per_deployment_memory_bytes: ByteSize,
  per_allocation_memory_bytes: ByteSize,
  queue_capacity: integer.describe('Number of inference requests are allowed in the queue at a time.'),
  threads_per_allocation: integer.describe('Number of threads per allocation.')
}).meta({ id: 'MlTrainedModelAssignmentTaskParameters' })
export type MlTrainedModelAssignmentTaskParameters = z.infer<typeof MlTrainedModelAssignmentTaskParameters>

export const MlTrainedModelAssignment = z.object({
  adaptive_allocations: z.union([MlAdaptiveAllocationsSettings, z.null()]).optional(),
  assignment_state: MlDeploymentAssignmentState.describe('The overall assignment state.'),
  max_assigned_allocations: integer.optional(),
  reason: z.string().optional(),
  routing_table: z.record(z.string(), MlTrainedModelAssignmentRoutingTable).describe('The allocation state for each node.'),
  start_time: DateTime.describe('The timestamp when the deployment started.'),
  task_parameters: MlTrainedModelAssignmentTaskParameters
}).meta({ id: 'MlTrainedModelAssignment' })
export type MlTrainedModelAssignment = z.infer<typeof MlTrainedModelAssignment>

/** Update a trained model deployment. */
export const MlUpdateTrainedModelDeploymentRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model. Currently, only PyTorch models are supported.').meta({ found_in: 'path' }),
  number_of_allocations: integer.describe('The number of model allocations on each node where the model is deployed. All allocations on a node share the same copy of the model in memory but use a separate set of threads to evaluate the model. Increasing this value generally increases the throughput. If this setting is greater than the number of hardware threads it will automatically be changed to a value less than the number of hardware threads. If adaptive_allocations is enabled, do not set this value, because it’s automatically set.').optional().meta({ found_in: 'body' }),
  adaptive_allocations: MlAdaptiveAllocationsSettings.describe('Adaptive allocations configuration. When enabled, the number of allocations is set based on the current load. If adaptive_allocations is enabled, do not set the number of allocations manually.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateTrainedModelDeploymentRequest' })
export type MlUpdateTrainedModelDeploymentRequest = z.infer<typeof MlUpdateTrainedModelDeploymentRequest>

export const MlUpdateTrainedModelDeploymentResponse = z.object({
  assignment: MlTrainedModelAssignment
}).meta({ id: 'MlUpdateTrainedModelDeploymentResponse' })
export type MlUpdateTrainedModelDeploymentResponse = z.infer<typeof MlUpdateTrainedModelDeploymentResponse>
