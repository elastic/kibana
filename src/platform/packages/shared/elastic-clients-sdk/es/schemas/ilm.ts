/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, ByteSize, DateTime, Duration, DurationLarge, EmptyObject, EpochTime, IndexName, Indices, LifecycleOperationMode, Metadata, Name, RequestBase, VersionNumber, integer, long } from './_types'

export const IlmAllocateAction = z.object({
  number_of_replicas: integer.optional(),
  total_shards_per_node: integer.optional(),
  include: z.record(z.string(), z.string()).optional(),
  exclude: z.record(z.string(), z.string()).optional(),
  require: z.record(z.string(), z.string()).optional()
}).meta({ id: 'IlmAllocateAction' })
export type IlmAllocateAction = z.infer<typeof IlmAllocateAction>

export const IlmDeleteAction = z.object({
  delete_searchable_snapshot: z.boolean().optional()
}).meta({ id: 'IlmDeleteAction' })
export type IlmDeleteAction = z.infer<typeof IlmDeleteAction>

export const IlmDownsampleAction = z.object({
  fixed_interval: DurationLarge,
  wait_timeout: Duration.optional()
}).meta({ id: 'IlmDownsampleAction' })
export type IlmDownsampleAction = z.infer<typeof IlmDownsampleAction>

export const IlmForceMergeAction = z.object({
  max_num_segments: integer,
  index_codec: z.string().optional()
}).meta({ id: 'IlmForceMergeAction' })
export type IlmForceMergeAction = z.infer<typeof IlmForceMergeAction>

export const IlmMigrateAction = z.object({
  enabled: z.boolean().optional()
}).meta({ id: 'IlmMigrateAction' })
export type IlmMigrateAction = z.infer<typeof IlmMigrateAction>

export const IlmRolloverAction = z.object({
  max_size: ByteSize.describe('The `max_size` condition has been deprecated in 9.3.0 and `max_primary_shard_size` should be used instead').optional(),
  max_primary_shard_size: ByteSize.optional(),
  max_age: Duration.optional(),
  max_docs: long.optional(),
  max_primary_shard_docs: long.optional(),
  min_size: ByteSize.optional(),
  min_primary_shard_size: ByteSize.optional(),
  min_age: Duration.optional(),
  min_docs: long.optional(),
  min_primary_shard_docs: long.optional()
}).meta({ id: 'IlmRolloverAction' })
export type IlmRolloverAction = z.infer<typeof IlmRolloverAction>

export const IlmSetPriorityAction = z.object({
  priority: integer.optional()
}).meta({ id: 'IlmSetPriorityAction' })
export type IlmSetPriorityAction = z.infer<typeof IlmSetPriorityAction>

export const IlmSearchableSnapshotAction = z.object({
  snapshot_repository: z.string(),
  force_merge_index: z.boolean().optional()
}).meta({ id: 'IlmSearchableSnapshotAction' })
export type IlmSearchableSnapshotAction = z.infer<typeof IlmSearchableSnapshotAction>

export const IlmShrinkAction = z.object({
  number_of_shards: integer.optional(),
  max_primary_shard_size: ByteSize.optional(),
  allow_write_after_shrink: z.boolean().optional()
}).meta({ id: 'IlmShrinkAction' })
export type IlmShrinkAction = z.infer<typeof IlmShrinkAction>

export const IlmWaitForSnapshotAction = z.object({
  policy: z.string()
}).meta({ id: 'IlmWaitForSnapshotAction' })
export type IlmWaitForSnapshotAction = z.infer<typeof IlmWaitForSnapshotAction>

export const IlmActions = z.object({
  allocate: IlmAllocateAction.describe('Phases allowed: warm, cold.').optional(),
  delete: IlmDeleteAction.describe('Phases allowed: delete.').optional(),
  downsample: IlmDownsampleAction.describe('Phases allowed: hot, warm, cold.').optional(),
  freeze: EmptyObject.describe('The freeze action is a noop in 8.x').optional(),
  forcemerge: IlmForceMergeAction.describe('Phases allowed: hot, warm.').optional(),
  migrate: IlmMigrateAction.describe('Phases allowed: warm, cold.').optional(),
  readonly: EmptyObject.describe('Phases allowed: hot, warm, cold.').optional(),
  rollover: IlmRolloverAction.describe('Phases allowed: hot.').optional(),
  set_priority: IlmSetPriorityAction.describe('Phases allowed: hot, warm, cold.').optional(),
  searchable_snapshot: IlmSearchableSnapshotAction.describe('Phases allowed: hot, cold, frozen.').optional(),
  shrink: IlmShrinkAction.describe('Phases allowed: hot, warm.').optional(),
  unfollow: EmptyObject.describe('Phases allowed: hot, warm, cold, frozen.').optional(),
  wait_for_snapshot: IlmWaitForSnapshotAction.describe('Phases allowed: delete.').optional()
}).meta({ id: 'IlmActions' })
export type IlmActions = z.infer<typeof IlmActions>

export const IlmPhase = z.object({
  actions: IlmActions.optional(),
  min_age: Duration.optional()
}).meta({ id: 'IlmPhase' })
export type IlmPhase = z.infer<typeof IlmPhase>

export const IlmPhases = z.object({
  cold: IlmPhase.optional(),
  delete: IlmPhase.optional(),
  frozen: IlmPhase.optional(),
  hot: IlmPhase.optional(),
  warm: IlmPhase.optional()
}).meta({ id: 'IlmPhases' })
export type IlmPhases = z.infer<typeof IlmPhases>

export const IlmPolicy = z.object({
  phases: IlmPhases,
  _meta: Metadata.describe('Arbitrary metadata that is not automatically generated or used by Elasticsearch.').optional()
}).meta({ id: 'IlmPolicy' })
export type IlmPolicy = z.infer<typeof IlmPolicy>

/**
 * Delete a lifecycle policy.
 *
 * You cannot delete policies that are currently in use. If the policy is being used to manage any indices, the request fails and returns an error.
 */
export const IlmDeleteLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Identifier for the policy.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IlmDeleteLifecycleRequest' })
export type IlmDeleteLifecycleRequest = z.infer<typeof IlmDeleteLifecycleRequest>

export const IlmDeleteLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'IlmDeleteLifecycleResponse' })
export type IlmDeleteLifecycleResponse = z.infer<typeof IlmDeleteLifecycleResponse>

export const IlmExplainLifecycleLifecycleExplainPhaseExecution = z.object({
  phase_definition: IlmPhase.optional(),
  policy: Name,
  version: VersionNumber,
  modified_date_in_millis: EpochTime
}).meta({ id: 'IlmExplainLifecycleLifecycleExplainPhaseExecution' })
export type IlmExplainLifecycleLifecycleExplainPhaseExecution = z.infer<typeof IlmExplainLifecycleLifecycleExplainPhaseExecution>

export const IlmExplainLifecycleLifecycleExplainManaged = z.object({
  action: Name.optional(),
  action_time: DateTime.optional(),
  action_time_millis: EpochTime.optional(),
  age: Duration.optional(),
  failed_step: Name.optional(),
  failed_step_retry_count: integer.optional(),
  index: IndexName,
  index_creation_date: DateTime.optional(),
  index_creation_date_millis: EpochTime.optional(),
  is_auto_retryable_error: z.boolean().optional(),
  lifecycle_date: DateTime.optional(),
  lifecycle_date_millis: EpochTime.optional(),
  managed: z.literal(true),
  phase: Name.optional(),
  phase_time: DateTime.optional(),
  phase_time_millis: EpochTime.optional(),
  policy: Name.optional(),
  previous_step_info: z.record(z.string(), z.any()).optional(),
  repository_name: z.string().optional(),
  snapshot_name: z.string().optional(),
  shrink_index_name: z.string().optional(),
  step: Name.optional(),
  step_info: z.record(z.string(), z.any()).optional(),
  step_time: DateTime.optional(),
  step_time_millis: EpochTime.optional(),
  phase_execution: IlmExplainLifecycleLifecycleExplainPhaseExecution.optional(),
  time_since_index_creation: Duration.optional(),
  skip: z.boolean()
}).meta({ id: 'IlmExplainLifecycleLifecycleExplainManaged' })
export type IlmExplainLifecycleLifecycleExplainManaged = z.infer<typeof IlmExplainLifecycleLifecycleExplainManaged>

export const IlmExplainLifecycleLifecycleExplainUnmanaged = z.object({
  index: IndexName,
  managed: z.literal(false)
}).meta({ id: 'IlmExplainLifecycleLifecycleExplainUnmanaged' })
export type IlmExplainLifecycleLifecycleExplainUnmanaged = z.infer<typeof IlmExplainLifecycleLifecycleExplainUnmanaged>

export const IlmExplainLifecycleLifecycleExplain = z.union([IlmExplainLifecycleLifecycleExplainManaged, IlmExplainLifecycleLifecycleExplainUnmanaged]).meta({ id: 'IlmExplainLifecycleLifecycleExplain' })
export type IlmExplainLifecycleLifecycleExplain = z.infer<typeof IlmExplainLifecycleLifecycleExplain>

/**
 * Explain the lifecycle state.
 *
 * Get the current lifecycle status for one or more indices.
 * For data streams, the API retrieves the current lifecycle status for the stream's backing indices.
 *
 * The response indicates when the index entered each lifecycle state, provides the definition of the running phase, and information about any failures.
 */
export const IlmExplainLifecycleRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Comma-separated list of data streams, indices, and aliases to target. Supports wildcards (`*`). To target all data streams and indices, use `*` or `_all`.').meta({ found_in: 'path' }),
  only_errors: z.boolean().describe('Filters the returned indices to only indices that are managed by ILM and are in an error state, either due to an encountering an error while executing the policy, or attempting to use a policy that does not exist.').optional().meta({ found_in: 'query' }),
  only_managed: z.boolean().describe('Filters the returned indices to only indices that are managed by ILM.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IlmExplainLifecycleRequest' })
export type IlmExplainLifecycleRequest = z.infer<typeof IlmExplainLifecycleRequest>

export const IlmExplainLifecycleResponse = z.object({
  indices: z.record(IndexName, IlmExplainLifecycleLifecycleExplain)
}).meta({ id: 'IlmExplainLifecycleResponse' })
export type IlmExplainLifecycleResponse = z.infer<typeof IlmExplainLifecycleResponse>

export const IlmGetLifecycleLifecycle = z.object({
  modified_date: DateTime,
  policy: IlmPolicy,
  version: VersionNumber
}).meta({ id: 'IlmGetLifecycleLifecycle' })
export type IlmGetLifecycleLifecycle = z.infer<typeof IlmGetLifecycleLifecycle>

/** Get lifecycle policies. */
export const IlmGetLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Identifier for the policy.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IlmGetLifecycleRequest' })
export type IlmGetLifecycleRequest = z.infer<typeof IlmGetLifecycleRequest>

export const IlmGetLifecycleResponse = z.record(z.string(), IlmGetLifecycleLifecycle).meta({ id: 'IlmGetLifecycleResponse' })
export type IlmGetLifecycleResponse = z.infer<typeof IlmGetLifecycleResponse>

/**
 * Get the ILM status.
 *
 * Get the current index lifecycle management status.
 */
export const IlmGetStatusRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IlmGetStatusRequest' })
export type IlmGetStatusRequest = z.infer<typeof IlmGetStatusRequest>

export const IlmGetStatusResponse = z.object({
  operation_mode: LifecycleOperationMode
}).meta({ id: 'IlmGetStatusResponse' })
export type IlmGetStatusResponse = z.infer<typeof IlmGetStatusResponse>

/**
 * Migrate to data tiers routing.
 *
 * Switch the indices, ILM policies, and legacy, composable, and component templates from using custom node attributes and attribute-based allocation filters to using data tiers.
 * Optionally, delete one legacy index template.
 * Using node roles enables ILM to automatically move the indices between data tiers.
 *
 * Migrating away from custom node attributes routing can be manually performed.
 * This API provides an automated way of performing three out of the four manual steps listed in the migration guide:
 *
 * 1. Stop setting the custom hot attribute on new indices.
 * 1. Remove custom allocation settings from existing ILM policies.
 * 1. Replace custom allocation settings from existing indices with the corresponding tier preference.
 *
 * ILM must be stopped before performing the migration.
 * Use the stop ILM and get ILM status APIs to wait until the reported operation mode is `STOPPED`.
 */
export const IlmMigrateToDataTiersRequest = z.object({
  ...RequestBase.shape,
  dry_run: z.boolean().describe('If true, simulates the migration from node attributes based allocation filters to data tiers, but does not perform the migration. This provides a way to retrieve the indices and ILM policies that need to be migrated.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. It can also be set to `-1` to indicate that the request should never timeout.').optional().meta({ found_in: 'query' }),
  legacy_template_to_delete: z.string().optional().meta({ found_in: 'body' }),
  node_attribute: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'IlmMigrateToDataTiersRequest' })
export type IlmMigrateToDataTiersRequest = z.infer<typeof IlmMigrateToDataTiersRequest>

export const IlmMigrateToDataTiersResponse = z.object({
  dry_run: z.boolean(),
  removed_legacy_template: z.string().describe('The name of the legacy index template that was deleted. This information is missing if no legacy index templates were deleted.'),
  migrated_ilm_policies: z.array(z.string()).describe('The ILM policies that were updated.'),
  migrated_indices: Indices.describe('The indices that were migrated to tier preference routing.'),
  migrated_legacy_templates: z.array(z.string()).describe('The legacy index templates that were updated to not contain custom routing settings for the provided data attribute.'),
  migrated_composable_templates: z.array(z.string()).describe('The composable index templates that were updated to not contain custom routing settings for the provided data attribute.'),
  migrated_component_templates: z.array(z.string()).describe('The component templates that were updated to not contain custom routing settings for the provided data attribute.')
}).meta({ id: 'IlmMigrateToDataTiersResponse' })
export type IlmMigrateToDataTiersResponse = z.infer<typeof IlmMigrateToDataTiersResponse>

export const IlmMoveToStepStepKey = z.object({
  action: z.string().describe('The optional action to which the index will be moved.').optional(),
  name: z.string().describe('The optional step name to which the index will be moved.').optional(),
  phase: z.string()
}).meta({ id: 'IlmMoveToStepStepKey' })
export type IlmMoveToStepStepKey = z.infer<typeof IlmMoveToStepStepKey>

/**
 * Move to a lifecycle step.
 *
 * Manually move an index into a specific step in the lifecycle policy and run that step.
 *
 * WARNING: This operation can result in the loss of data. Manually moving an index into a specific step runs that step even if it has already been performed. This is a potentially destructive action and this should be considered an expert level API.
 *
 * You must specify both the current step and the step to be executed in the body of the request.
 * The request will fail if the current step does not match the step currently running for the index
 * This is to prevent the index from being moved from an unexpected step into the next step.
 *
 * When specifying the target (`next_step`) to which the index will be moved, either the name or both the action and name fields are optional.
 * If only the phase is specified, the index will move to the first step of the first action in the target phase.
 * If the phase and action are specified, the index will move to the first step of the specified action in the specified phase.
 * Only actions specified in the ILM policy are considered valid.
 * An index cannot move to a step that is not part of its policy.
 */
export const IlmMoveToStepRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the index whose lifecycle step is to change').meta({ found_in: 'path' }),
  current_step: IlmMoveToStepStepKey.describe('The step that the index is expected to be in.').meta({ found_in: 'body' }),
  next_step: IlmMoveToStepStepKey.describe('The step that you want to run.').meta({ found_in: 'body' })
}).meta({ id: 'IlmMoveToStepRequest' })
export type IlmMoveToStepRequest = z.infer<typeof IlmMoveToStepRequest>

export const IlmMoveToStepResponse = AcknowledgedResponseBase.meta({ id: 'IlmMoveToStepResponse' })
export type IlmMoveToStepResponse = z.infer<typeof IlmMoveToStepResponse>

/**
 * Create or update a lifecycle policy.
 *
 * If the specified policy exists, it is replaced and the policy version is incremented.
 *
 * NOTE: Only the latest version of the policy is stored, you cannot revert to previous versions.
 */
export const IlmPutLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Identifier for the policy.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  policy: IlmPolicy.optional().meta({ found_in: 'body' })
}).meta({ id: 'IlmPutLifecycleRequest' })
export type IlmPutLifecycleRequest = z.infer<typeof IlmPutLifecycleRequest>

export const IlmPutLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'IlmPutLifecycleResponse' })
export type IlmPutLifecycleResponse = z.infer<typeof IlmPutLifecycleResponse>

/**
 * Remove policies from an index.
 *
 * Remove the assigned lifecycle policies from an index or a data stream's backing indices.
 * It also stops managing the indices.
 */
export const IlmRemovePolicyRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the index to remove policy on').meta({ found_in: 'path' })
}).meta({ id: 'IlmRemovePolicyRequest' })
export type IlmRemovePolicyRequest = z.infer<typeof IlmRemovePolicyRequest>

export const IlmRemovePolicyResponse = z.object({
  failed_indexes: z.array(IndexName),
  has_failures: z.boolean()
}).meta({ id: 'IlmRemovePolicyResponse' })
export type IlmRemovePolicyResponse = z.infer<typeof IlmRemovePolicyResponse>

/**
 * Retry a policy.
 *
 * Retry running the lifecycle policy for an index that is in the ERROR step.
 * The API sets the policy back to the step where the error occurred and runs the step.
 * Use the explain lifecycle state API to determine whether an index is in the ERROR step.
 */
export const IlmRetryRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('The name of the indices (comma-separated) whose failed lifecycle step is to be retry').meta({ found_in: 'path' })
}).meta({ id: 'IlmRetryRequest' })
export type IlmRetryRequest = z.infer<typeof IlmRetryRequest>

export const IlmRetryResponse = AcknowledgedResponseBase.meta({ id: 'IlmRetryResponse' })
export type IlmRetryResponse = z.infer<typeof IlmRetryResponse>

/**
 * Start the ILM plugin.
 *
 * Start the index lifecycle management plugin if it is currently stopped.
 * ILM is started automatically when the cluster is formed.
 * Restarting ILM is necessary only when it has been stopped using the stop ILM API.
 */
export const IlmStartRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IlmStartRequest' })
export type IlmStartRequest = z.infer<typeof IlmStartRequest>

export const IlmStartResponse = AcknowledgedResponseBase.meta({ id: 'IlmStartResponse' })
export type IlmStartResponse = z.infer<typeof IlmStartResponse>

/**
 * Stop the ILM plugin.
 *
 * Halt all lifecycle management operations and stop the index lifecycle management plugin.
 * This is useful when you are performing maintenance on the cluster and need to prevent ILM from performing any actions on your indices.
 *
 * The API returns as soon as the stop request has been acknowledged, but the plugin might continue to run until in-progress operations complete and the plugin can be safely stopped.
 * Use the get ILM status API to check whether ILM is running.
 */
export const IlmStopRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IlmStopRequest' })
export type IlmStopRequest = z.infer<typeof IlmStopRequest>

export const IlmStopResponse = AcknowledgedResponseBase.meta({ id: 'IlmStopResponse' })
export type IlmStopResponse = z.infer<typeof IlmStopResponse>
