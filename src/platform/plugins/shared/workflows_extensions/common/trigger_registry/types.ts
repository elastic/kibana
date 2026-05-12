/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

/**
 * How the hook behaves when a subscribed handler returns an error.
 * - 'open': log the error and continue (pass-through with original payload).
 * - 'closed': reject the hook call with the error (fail-safe).
 */
export type HookFailurePolicy = 'open' | 'closed';

/**
 * Synchronous hook contract for a trigger.
 * When present, the trigger may be invoked via `WorkflowsClient.invokeHook`
 * and handlers are chained in registration order.
 */
export interface TriggerSyncBlock<OutputSchema extends z.ZodObject = z.ZodObject> {
  /** Zod object schema for the value returned by the hook chain. */
  outputSchema: OutputSchema;
  /** Per-handler timeout (not a total chain budget). Each handler gets this window independently (e.g. '15s'). */
  maxTimeout: string;
  /** Fail-safe policy when a handler throws or times out. */
  failurePolicy: HookFailurePolicy;
  /**
   * When true, each handler receives the previous handler's output as its input
   * (pipeline mode). When false, every handler receives the original payload and
   * handler return values are ignored — use non-chained mode for side-effect-only handlers.
   */
  chained: boolean;
}

/**
 * Shared trigger contract (common to server and public).
 *
 * Constraints (enforced at registration):
 * - id: globally unique, namespaced format <solution>.<event>
 * - eventSchema: must be a Zod object schema that rejects unknown fields
 */
export interface CommonTriggerDefinition<
  EventSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodObject = z.ZodObject
> {
  /** Globally unique, namespaced identifier (e.g. cases.updated, alerts.severity_high) */
  id: string;
  /**
   * Payload contract (Zod object schema; must reject unknown fields by default).
   * Adding descriptions to properties (e.g. with .describe()) is recommended so they will
   * help users to understand the data they will receive with the event.
   */
  eventSchema: EventSchema;
  /**
   * Optional synchronous hook contract. When present, this trigger can be invoked
   * via `WorkflowsClient.invokeHook` in addition to the normal async `emitEvent` path.
   */
  sync?: TriggerSyncBlock<OutputSchema>;
}
