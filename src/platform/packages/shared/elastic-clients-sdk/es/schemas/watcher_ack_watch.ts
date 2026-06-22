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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const WatcherAcknowledgementOptions = z.enum(['awaits_successful_execution', 'ackable', 'acked']).meta({ id: 'WatcherAcknowledgementOptions' })
export type WatcherAcknowledgementOptions = z.infer<typeof WatcherAcknowledgementOptions>

export const WatcherAcknowledgeState = z.object({
  state: WatcherAcknowledgementOptions,
  timestamp: DateTime
}).meta({ id: 'WatcherAcknowledgeState' })
export type WatcherAcknowledgeState = z.infer<typeof WatcherAcknowledgeState>

export const WatcherExecutionState = z.object({
  successful: z.boolean(),
  timestamp: DateTime,
  reason: z.string().optional()
}).meta({ id: 'WatcherExecutionState' })
export type WatcherExecutionState = z.infer<typeof WatcherExecutionState>

export const WatcherThrottleState = z.object({
  reason: z.string(),
  timestamp: DateTime
}).meta({ id: 'WatcherThrottleState' })
export type WatcherThrottleState = z.infer<typeof WatcherThrottleState>

export const WatcherActionStatus = z.object({
  ack: WatcherAcknowledgeState,
  last_execution: WatcherExecutionState.optional(),
  last_successful_execution: WatcherExecutionState.optional(),
  last_throttle: WatcherThrottleState.optional()
}).meta({ id: 'WatcherActionStatus' })
export type WatcherActionStatus = z.infer<typeof WatcherActionStatus>

export const WatcherActions = z.record(IndexName, WatcherActionStatus).meta({ id: 'WatcherActions' })
export type WatcherActions = z.infer<typeof WatcherActions>

export const WatcherActivationState = z.object({
  active: z.boolean(),
  timestamp: DateTime
}).meta({ id: 'WatcherActivationState' })
export type WatcherActivationState = z.infer<typeof WatcherActivationState>

export const WatcherWatchStatus = z.object({
  actions: WatcherActions,
  last_checked: DateTime.optional(),
  last_met_condition: DateTime.optional(),
  state: WatcherActivationState,
  version: VersionNumber,
  execution_state: z.string().optional()
}).meta({ id: 'WatcherWatchStatus' })
export type WatcherWatchStatus = z.infer<typeof WatcherWatchStatus>

/**
 * Acknowledge a watch.
 *
 * Acknowledging a watch enables you to manually throttle the execution of the watch's actions.
 *
 * The acknowledgement state of an action is stored in the `status.actions.<id>.ack.state` structure.
 *
 * IMPORTANT: If the specified watch is currently being executed, this API will return an error
 * The reason for this behavior is to prevent overwriting the watch status from a watch execution.
 *
 * Acknowledging an action throttles further executions of that action until its `ack.state` is reset to `awaits_successful_execution`.
 * This happens when the condition of the watch is not met (the condition evaluates to false).
 * To demonstrate how throttling works in practice and how it can be configured for individual actions within a watch, refer to External documentation.
 */
export const WatcherAckWatchRequest = z.object({
  ...RequestBase.shape,
  watch_id: Name.describe('The watch identifier.').meta({ found_in: 'path' }),
  action_id: Names.describe('A comma-separated list of the action identifiers to acknowledge. If you omit this parameter, all of the actions of the watch are acknowledged.').optional().meta({ found_in: 'path' })
}).meta({ id: 'WatcherAckWatchRequest' })
export type WatcherAckWatchRequest = z.infer<typeof WatcherAckWatchRequest>

export const WatcherAckWatchResponse = z.object({
  status: WatcherWatchStatus
}).meta({ id: 'WatcherAckWatchResponse' })
export type WatcherAckWatchResponse = z.infer<typeof WatcherAckWatchResponse>
