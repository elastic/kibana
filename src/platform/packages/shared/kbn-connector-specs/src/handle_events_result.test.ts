/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_HANDSHAKE_CHALLENGE_LENGTH } from './specs/inbound_webhook/constants';
import {
  isJsonSerializableSpokeBody,
  MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH,
  MAX_HANDLE_EVENTS_EVENT_ID_LENGTH,
  MAX_HANDLE_EVENTS_EVENTS,
  MAX_HANDLE_EVENTS_HEADERS,
  MAX_HANDLE_EVENTS_HEADER_NAME_LENGTH,
  MAX_HANDLE_EVENTS_HEADER_VALUE_LENGTH,
  MAX_HANDLE_EVENTS_HTTP_BODY_BYTES,
  MAX_HANDLE_EVENTS_PAYLOAD_BYTES,
  MAX_HANDLE_EVENTS_PAYLOAD_KEY_LENGTH,
  MAX_HANDLE_EVENTS_PAYLOAD_KEYS,
  parseHandleEventsResult,
  SPOKE_HTTP_STATUS_MAX,
} from './handle_events_result';

const emitEvent = (overrides?: {
  eventId?: string;
  correlationKey?: string;
  payload?: Record<string, unknown>;
}) => ({
  type: 'emit' as const,
  events: [
    {
      eventId: overrides?.eventId ?? 'inboundWebhook.received',
      correlationKey: overrides?.correlationKey ?? 'c1',
      payload: overrides?.payload ?? { body: {} },
    },
  ],
});

describe('isJsonSerializableSpokeBody', () => {
  it('accepts JSON values', () => {
    expect(isJsonSerializableSpokeBody('ok')).toBe(true);
    expect(isJsonSerializableSpokeBody(1)).toBe(true);
    expect(isJsonSerializableSpokeBody(true)).toBe(true);
    expect(isJsonSerializableSpokeBody(null)).toBe(true);
    expect(isJsonSerializableSpokeBody({ challenge: 'abc' })).toBe(true);
    expect(isJsonSerializableSpokeBody(['a', 1])).toBe(true);
  });

  it('rejects functions, class instances, and Buffer', () => {
    expect(isJsonSerializableSpokeBody(() => 'nope')).toBe(false);
    expect(isJsonSerializableSpokeBody(new Error('nope'))).toBe(false);
    expect(isJsonSerializableSpokeBody(new Map())).toBe(false);
    expect(isJsonSerializableSpokeBody({ fn: () => 1 })).toBe(false);
    expect(isJsonSerializableSpokeBody(Buffer.from('x'))).toBe(false);
  });

  it('rejects cyclic objects without throwing', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isJsonSerializableSpokeBody(cyclic)).toBe(false);
  });
});

describe('parseHandleEventsResult', () => {
  it('accepts an emit result', () => {
    expect(
      parseHandleEventsResult({
        type: 'emit',
        events: [
          { eventId: 'inboundWebhook.received', correlationKey: 'c1', payload: { body: {} } },
        ],
      })
    ).toEqual({
      ok: true,
      data: {
        type: 'emit',
        events: [
          { eventId: 'inboundWebhook.received', correlationKey: 'c1', payload: { body: {} } },
        ],
      },
    });
  });

  it('accepts an http handshake ack', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: { challenge: 'abc' } },
      })
    ).toMatchObject({ ok: true, data: { type: 'http' } });
  });

  it('accepts a handshake body at the challenge length cap', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: {
          status: 200,
          body: { challenge: 'c'.repeat(MAX_HANDSHAKE_CHALLENGE_LENGTH) },
          headers: { 'content-type': 'application/json' },
        },
      }).ok
    ).toBe(true);
  });

  it('rejects an unknown discriminant', () => {
    expect(parseHandleEventsResult({ type: 'drop' })).toEqual(
      expect.objectContaining({ ok: false, message: expect.any(String) })
    );
  });

  it('rejects a missing httpResponse', () => {
    expect(parseHandleEventsResult({ type: 'http', status: 200, body: {} })).toEqual(
      expect.objectContaining({ ok: false, message: expect.stringMatching(/httpResponse/i) })
    );
  });

  it('rejects a status below the allowed range', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 99 },
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/status/i) }));
  });

  it('rejects a status above the allowed range', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: SPOKE_HTTP_STATUS_MAX + 1, body: { challenge: 'abc' } },
      }).ok
    ).toBe(false);
  });

  it('rejects a function HTTP body', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: () => 'nope' },
      }).ok
    ).toBe(false);
  });

  it('rejects a Buffer HTTP body', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: Buffer.from('x') },
      }).ok
    ).toBe(false);
  });

  it('rejects an eventId over the max length', () => {
    expect(
      parseHandleEventsResult(
        emitEvent({ eventId: 'e'.repeat(MAX_HANDLE_EVENTS_EVENT_ID_LENGTH + 1) })
      )
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/eventId/i) }));
  });

  it('rejects a correlationKey over the max length', () => {
    expect(
      parseHandleEventsResult(
        emitEvent({ correlationKey: 'k'.repeat(MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH + 1) })
      )
    ).toEqual(
      expect.objectContaining({ ok: false, message: expect.stringMatching(/correlationKey/i) })
    );
  });

  it('rejects more events than the max size', () => {
    expect(
      parseHandleEventsResult({
        type: 'emit',
        events: Array.from({ length: MAX_HANDLE_EVENTS_EVENTS + 1 }, (_, index) => ({
          eventId: 'inboundWebhook.received',
          correlationKey: `c${index}`,
          payload: { body: {} },
        })),
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/events/i) }));
  });

  it('rejects a payload with too many keys', () => {
    const payload = Object.fromEntries(
      Array.from({ length: MAX_HANDLE_EVENTS_PAYLOAD_KEYS + 1 }, (_, index) => [`k${index}`, index])
    );
    expect(parseHandleEventsResult(emitEvent({ payload }))).toEqual(
      expect.objectContaining({ ok: false, message: expect.stringMatching(/payload/i) })
    );
  });

  it('rejects a payload key over the max length', () => {
    expect(
      parseHandleEventsResult(
        emitEvent({ payload: { ['k'.repeat(MAX_HANDLE_EVENTS_PAYLOAD_KEY_LENGTH + 1)]: 1 } })
      )
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/payload/i) }));
  });

  it('rejects a payload over the byte budget', () => {
    expect(
      parseHandleEventsResult(
        emitEvent({ payload: { body: 'x'.repeat(MAX_HANDLE_EVENTS_PAYLOAD_BYTES + 1) } })
      )
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/payload/i) }));
  });

  it('rejects events whose payloads exceed the total byte budget', () => {
    const halfPlus = 'x'.repeat(Math.floor(MAX_HANDLE_EVENTS_PAYLOAD_BYTES / 2) + 32);
    expect(
      parseHandleEventsResult({
        type: 'emit',
        events: [
          { eventId: 'inboundWebhook.received', correlationKey: 'c1', payload: { body: halfPlus } },
          { eventId: 'inboundWebhook.received', correlationKey: 'c2', payload: { body: halfPlus } },
        ],
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/events/i) }));
  });

  it('rejects an HTTP body over the byte budget', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: 'x'.repeat(MAX_HANDLE_EVENTS_HTTP_BODY_BYTES + 1) },
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/body/i) }));
  });

  it('rejects too many HTTP headers', () => {
    const headers = Object.fromEntries(
      Array.from({ length: MAX_HANDLE_EVENTS_HEADERS + 1 }, (_, index) => [`h${index}`, 'v'])
    );
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: { challenge: 'abc' }, headers },
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/headers/i) }));
  });

  it('rejects an HTTP header name over the max length', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: {
          status: 200,
          headers: { ['h'.repeat(MAX_HANDLE_EVENTS_HEADER_NAME_LENGTH + 1)]: 'v' },
        },
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/headers/i) }));
  });

  it('accepts more events when maxEvents is raised', () => {
    const events = Array.from({ length: MAX_HANDLE_EVENTS_EVENTS + 1 }, (_, index) => ({
      eventId: 'inboundWebhook.received',
      correlationKey: `c${index}`,
      payload: { body: {} },
    }));
    expect(parseHandleEventsResult({ type: 'emit', events }).ok).toBe(false);
    expect(
      parseHandleEventsResult({ type: 'emit', events }, { maxEvents: MAX_HANDLE_EVENTS_EVENTS + 1 })
        .ok
    ).toBe(true);
  });

  it('rejects a payload that exceeds a tighter maxPayloadBytes', () => {
    expect(
      parseHandleEventsResult(emitEvent({ payload: { body: 'x'.repeat(200) } }), {
        maxPayloadBytes: 50,
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/payload/i) }));
  });

  it('accepts a payload over the default budget when maxPayloadBytes is raised', () => {
    expect(
      parseHandleEventsResult(
        emitEvent({ payload: { body: 'x'.repeat(MAX_HANDLE_EVENTS_PAYLOAD_BYTES + 1) } }),
        { maxPayloadBytes: MAX_HANDLE_EVENTS_PAYLOAD_BYTES + 64 }
      ).ok
    ).toBe(true);
  });

  it('rejects an HTTP header value over the max length', () => {
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: {
          status: 200,
          headers: { 'content-type': 'v'.repeat(MAX_HANDLE_EVENTS_HEADER_VALUE_LENGTH + 1) },
        },
      })
    ).toEqual(expect.objectContaining({ ok: false, message: expect.stringMatching(/headers/i) }));
  });
});
