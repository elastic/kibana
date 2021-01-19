/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { Request } from '@hapi/hapi';
import { Boom } from '@hapi/boom';

import mockFs from 'mock-fs';
import { createReadStream } from 'fs';

import { getResponsePayloadBytes } from './get_payload_size';

describe('getPayloadSize', () => {
  afterEach(() => mockFs.restore());

  test('handles Boom errors', () => {
    const boomError = new Boom('oops');
    const payload = boomError.output.payload;
    const result = getResponsePayloadBytes(boomError);
    expect(result).toBe(JSON.stringify(payload).length);
  });

  test('handles Buffers', () => {
    const payload = 'heya';
    const result = getResponsePayloadBytes({
      variety: 'buffer',
      source: Buffer.from(payload),
    } as Request['response']);
    expect(result).toBe(payload.length);
  });

  test('handles Streams', async () => {
    mockFs({ 'test.txt': 'heya' });
    const readStream = createReadStream('test.txt');

    let data = '';
    for await (const chunk of readStream) {
      data += chunk;
    }

    const result = getResponsePayloadBytes({
      variety: 'stream',
      source: readStream,
    } as Request['response']);

    expect(result).toBe(data.length);
  });

  describe('handles plain responses', () => {
    test('when source is text', () => {
      const payload = 'heya';
      const result = getResponsePayloadBytes({
        variety: 'plain',
        source: payload,
      } as Request['response']);
      expect(result).toBe(payload.length);
    });

    test('when source is string', () => {
      const payload = { message: 'heya' };
      const result = getResponsePayloadBytes({
        variety: 'plain',
        source: payload,
      } as Request['response']);
      expect(result).toBe(JSON.stringify(payload).length);
    });
  });

  describe('handles content-length header', () => {
    test('falls back to value from content-length header if available', () => {
      const headers = { 'content-length': '123' };
      const result = getResponsePayloadBytes(({ headers } as unknown) as Request['response']);
      expect(result).toBe(123);
    });

    test('uses first value when hapi header is an array', () => {
      const headers = { 'content-length': ['123', '456'] };
      const result = getResponsePayloadBytes(({ headers } as unknown) as Request['response']);
      expect(result).toBe(123);
    });

    test('returns undefined if length is NaN', () => {
      const headers = { 'content-length': 'oops' };
      const result = getResponsePayloadBytes(({ headers } as unknown) as Request['response']);
      expect(result).toBeUndefined();
    });
  });

  test('defaults to undefined', () => {
    const result = getResponsePayloadBytes(({} as unknown) as Request['response']);
    expect(result).toBeUndefined();
  });

  test('swallows errors to prevent crashing Kibana', () => {
    const payload = { circular: this };
    const result = getResponsePayloadBytes(({
      variety: 'plain',
      source: payload.circular,
    } as unknown) as Request['response']);
    expect(result).toBeUndefined();
  });
});
