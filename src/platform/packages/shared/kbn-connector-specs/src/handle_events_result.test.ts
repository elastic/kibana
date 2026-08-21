/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isJsonSerializableSpokeBody,
  parseHandleEventsResult,
  SPOKE_HTTP_STATUS_MAX,
} from './handle_events_result';

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

  it('rejects an unknown discriminant or missing httpResponse', () => {
    const unknownType = parseHandleEventsResult({ type: 'drop' });
    expect(unknownType).toMatchObject({ ok: false });
    if (unknownType.ok) {
      throw new Error('expected parse failure');
    }
    expect(unknownType.message.length).toBeGreaterThan(0);

    const missingHttp = parseHandleEventsResult({ type: 'http', status: 200, body: {} });
    expect(missingHttp).toMatchObject({ ok: false });
    if (missingHttp.ok) {
      throw new Error('expected parse failure');
    }
    expect(missingHttp.message).toMatch(/httpResponse/i);
  });

  it('rejects out-of-range status and non-JSON bodies', () => {
    const lowStatus = parseHandleEventsResult({
      type: 'http',
      httpResponse: { status: 99 },
    });
    expect(lowStatus).toMatchObject({ ok: false });
    if (lowStatus.ok) {
      throw new Error('expected parse failure');
    }
    expect(lowStatus.message).toMatch(/status/i);

    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: SPOKE_HTTP_STATUS_MAX + 1, body: { challenge: 'abc' } },
      }).ok
    ).toBe(false);
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: () => 'nope' },
      }).ok
    ).toBe(false);
    expect(
      parseHandleEventsResult({
        type: 'http',
        httpResponse: { status: 200, body: Buffer.from('x') },
      }).ok
    ).toBe(false);
  });
});
