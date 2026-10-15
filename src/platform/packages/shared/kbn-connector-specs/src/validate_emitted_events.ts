/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventDefinition, EventPayload } from './connector_spec_events';

export type ValidateEmittedEventsError =
  | {
      readonly type: 'unknown_event_id';
      readonly eventId: string;
      readonly index: number;
    }
  | {
      readonly type: 'invalid_payload';
      readonly eventId: string;
      readonly index: number;
      readonly message: string;
    };

export type ValidateEmittedEventsResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: ValidateEmittedEventsError[] };

/**
 * Validates emitted events against connector `definitions` before publish.
 *
 * The actions hub must call this after `handleEvents` and before publishing.
 * Connectors must not be treated as the sole enforcement plane: they transform
 * attacker-controlled ingress (`rawBody`) into emits.
 *
 * Rules:
 * - every `event.eventId` must match some `definitions[*].eventId`
 * - every `event.payload` must pass the matching `eventSchema`
 */
export const validateEmittedEvents = (
  definitions: Record<string, EventDefinition>,
  events: readonly EventPayload[]
): ValidateEmittedEventsResult => {
  const definitionByEventId = new Map(
    Object.values(definitions).map((definition) => [definition.eventId, definition])
  );
  const errors: ValidateEmittedEventsError[] = [];

  for (const [index, event] of events.entries()) {
    const definition = definitionByEventId.get(event.eventId);

    if (definition === undefined) {
      errors.push({
        type: 'unknown_event_id',
        eventId: event.eventId,
        index,
      });
    } else {
      const parsed = definition.eventSchema.safeParse(event.payload);
      if (!parsed.success) {
        errors.push({
          type: 'invalid_payload',
          eventId: event.eventId,
          index,
          message: parsed.error.message,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
};
