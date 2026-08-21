/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { EventDefinition } from './connector_spec_events';
import { buildEventId } from './event_type_id';
import { validateEmittedEvents } from './validate_emitted_events';

const metadataId = '.myConnector';
const receivedKey = 'received';
const receivedEventId = buildEventId(metadataId, receivedKey);

const definitions: Record<string, EventDefinition> = {
  [receivedKey]: {
    eventId: receivedEventId,
    title: 'Received',
    description: 'fake event',
    eventSchema: z.object({
      body: z.string(),
    }),
  },
};

describe('validateEmittedEvents', () => {
  it('accepts an empty emit list', () => {
    expect(validateEmittedEvents(definitions, [])).toEqual({ ok: true });
  });

  it('accepts payloads that match definitions', () => {
    const result = validateEmittedEvents(definitions, [
      {
        eventId: receivedEventId,
        correlationKey: 'corr-1',
        payload: { body: 'hello' },
      },
    ]);

    expect(result).toEqual({ ok: true });
  });

  it('rejects an unknown eventId', () => {
    const result = validateEmittedEvents(definitions, [
      {
        eventId: 'other.unknown',
        correlationKey: 'corr-1',
        payload: { body: 'hello' },
      },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          type: 'unknown_event_id',
          eventId: 'other.unknown',
          index: 0,
        },
      ],
    });
  });

  it('rejects a payload that fails eventSchema', () => {
    const result = validateEmittedEvents(definitions, [
      {
        eventId: receivedEventId,
        correlationKey: 'corr-1',
        payload: { body: 123 },
      },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      type: 'invalid_payload',
      eventId: receivedEventId,
      index: 0,
    });
    expect(
      result.errors[0].type === 'invalid_payload' && result.errors[0].message.length
    ).toBeGreaterThan(0);
  });

  it('collects multiple errors across events', () => {
    const result = validateEmittedEvents(definitions, [
      {
        eventId: 'other.unknown',
        correlationKey: 'corr-1',
        payload: { body: 'hello' },
      },
      {
        eventId: receivedEventId,
        correlationKey: 'corr-2',
        payload: { body: true },
      },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }

    expect(result.errors.map((error) => error.type)).toEqual([
      'unknown_event_id',
      'invalid_payload',
    ]);
  });
});
