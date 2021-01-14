/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  test('handles plain text', () => {
    const payload = { message: 'heya' };
    const result = getResponsePayloadBytes({
      variety: 'plain',
      source: payload,
    } as Request['response']);
    expect(result).toBe(JSON.stringify(payload).length);
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
