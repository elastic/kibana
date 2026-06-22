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

export const WatcherActivationStatus = z.object({
  actions: WatcherActions,
  state: WatcherActivationState,
  version: VersionNumber
}).meta({ id: 'WatcherActivationStatus' })
export type WatcherActivationStatus = z.infer<typeof WatcherActivationStatus>

/**
 * Deactivate a watch.
 *
 * A watch can be either active or inactive.
 */
export const WatcherDeactivateWatchRequest = z.object({
  ...RequestBase.shape,
  watch_id: Name.describe('The watch identifier.').meta({ found_in: 'path' })
}).meta({ id: 'WatcherDeactivateWatchRequest' })
export type WatcherDeactivateWatchRequest = z.infer<typeof WatcherDeactivateWatchRequest>

export const WatcherDeactivateWatchResponse = z.object({
  status: WatcherActivationStatus
}).meta({ id: 'WatcherDeactivateWatchResponse' })
export type WatcherDeactivateWatchResponse = z.infer<typeof WatcherDeactivateWatchResponse>
