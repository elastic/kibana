/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StreamChangeTypeSchema } from '@kbn/workflows';
import { StreamsUpsertStreamTriggerSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { createServerTriggerDefinition } from '../trigger_registry/types';
import type { TriggerEventData, TriggerMatchResult } from '../trigger_registry/types';

/**
 * Event payload for stream upsert events.
 */
export interface StreamsUpsertStreamEventPayload {
  /** The name of the stream that was changed */
  streamName: string;
  /** The types of changes that occurred */
  changeTypes: string[];
  /** Whether the stream was created (true) or updated (false) */
  isCreated: boolean;
  /** The stream definition after the change */
  streamDefinition?: Record<string, unknown>;
}

/**
 * Get the config schema from the workflow schema.
 * This extracts the `with` property schema from StreamsUpsertStreamTriggerSchema.
 */
const configSchema = StreamsUpsertStreamTriggerSchema.shape.with.unwrap();

/**
 * Type for the trigger configuration.
 */
type StreamsUpsertStreamConfig = z.infer<typeof configSchema>;

/**
 * Check if a stream name matches a pattern.
 * Supports wildcards (*) for pattern matching.
 *
 * @param pattern - The pattern to match against (e.g., "logs-*", "metrics-*-production")
 * @param streamName - The stream name to check
 * @returns Whether the stream name matches the pattern
 */
function matchesStreamPattern(pattern: string, streamName: string): boolean {
  // Escape regex special characters except *
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Convert * to regex wildcard
  const regexPattern = escapedPattern.replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(streamName);
}

/**
 * Matcher function for streams.upsertStream trigger.
 * Evaluates if an event matches the trigger configuration.
 */
function matchesStreamsUpsertStreamTrigger(
  triggerConfig: StreamsUpsertStreamConfig | undefined,
  eventData: TriggerEventData
): TriggerMatchResult {
  const payload = eventData.payload as unknown as StreamsUpsertStreamEventPayload;

  // If no config is provided, match all stream upsert events
  if (!triggerConfig) {
    return {
      matches: true,
      workflowInputs: {
        stream: {
          name: payload.streamName,
          changeTypes: payload.changeTypes,
          isCreated: payload.isCreated,
          definition: payload.streamDefinition,
        },
      },
    };
  }

  // Check if stream name matches the pattern
  if (triggerConfig.stream && !matchesStreamPattern(triggerConfig.stream, payload.streamName)) {
    return { matches: false };
  }

  // Check if change types match (if specified)
  const configChangeTypes = triggerConfig.changeTypes;
  if (configChangeTypes && configChangeTypes.length > 0) {
    const hasMatchingChangeType = payload.changeTypes.some((changeType) =>
      configChangeTypes.includes(changeType as z.infer<typeof StreamChangeTypeSchema>)
    );

    if (!hasMatchingChangeType) {
      return { matches: false };
    }
  }

  // All conditions match
  return {
    matches: true,
    workflowInputs: {
      stream: {
        name: payload.streamName,
        changeTypes: payload.changeTypes,
        isCreated: payload.isCreated,
        definition: payload.streamDefinition,
      },
    },
  };
}

/**
 * Server-side trigger definition for streams.upsertStream.
 * This trigger fires when a stream is created or updated.
 */
export const streamsUpsertStreamTriggerDefinition = createServerTriggerDefinition({
  id: 'streams.upsertStream',
  configSchema,
  matches: matchesStreamsUpsertStreamTrigger,
});
