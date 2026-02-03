/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../../common/trigger_registry/types';

/**
 * Event data passed to trigger handlers when evaluating matches.
 * This is a generic interface that can be extended for specific trigger types.
 */
export interface TriggerEventData {
  /** The type of event (should match the trigger type, e.g., 'streams.upsertStream') */
  type: string;
  /** Event-specific payload data */
  payload: Record<string, unknown>;
}

/**
 * Result of a trigger match evaluation.
 */
export interface TriggerMatchResult {
  /** Whether the trigger matches the event */
  matches: boolean;
  /** Optional inputs to pass to the workflow when it runs */
  workflowInputs?: Record<string, unknown>;
}

/**
 * Function type for evaluating if an event matches a trigger configuration.
 */
export type TriggerMatcher<Config = unknown> = (
  triggerConfig: Config | undefined,
  eventData: TriggerEventData
) => TriggerMatchResult;

/**
 * Definition of a server-side workflow trigger extension.
 * Contains the technical/behavioral implementation of a trigger.
 *
 * The config type is automatically inferred from the configSchema,
 * so you don't need to specify it explicitly. Use `createServerTriggerDefinition` helper function
 * for the best type inference experience.
 *
 * @example
 * ```typescript
 * // Using the helper function (recommended for best type inference)
 * const myTriggerDefinition = createServerTriggerDefinition({
 *   id: 'streams.upsertStream',
 *   configSchema: z.object({ stream: z.string(), changeTypes: z.array(z.string()).optional() }),
 *   matches: (config, event) => {
 *     // Evaluate if the event matches this trigger's configuration
 *     return { matches: true, workflowInputs: { stream: event.payload.streamName } };
 *   },
 * });
 * ```
 */
export interface ServerTriggerDefinition<Config extends z.ZodType = z.ZodType>
  extends CommonTriggerDefinition<Config> {
  /**
   * Function to evaluate if an event matches this trigger's configuration.
   * Called when a trigger event occurs to determine which workflows should run.
   *
   * @param triggerConfig - The parsed trigger configuration from the workflow definition (the `with` block)
   * @param eventData - The event data that triggered the evaluation
   * @returns Whether the trigger matches and optional workflow inputs
   */
  matches: TriggerMatcher<z.infer<Config>>;
}

/**
 * Helper function to create a ServerTriggerDefinition with automatic type inference.
 * This ensures that the config type is correctly inferred from the configSchema
 * without needing explicit type annotations.
 *
 * @example
 * ```typescript
 * const myTriggerDefinition = createServerTriggerDefinition({
 *   id: 'streams.upsertStream',
 *   configSchema: z.object({ stream: z.string() }),
 *   matches: (config, event) => ({ matches: true }),
 * });
 * ```
 */
export function createServerTriggerDefinition<Config extends z.ZodType = z.ZodType>(
  definition: ServerTriggerDefinition<Config>
): ServerTriggerDefinition<Config> {
  return definition;
}
