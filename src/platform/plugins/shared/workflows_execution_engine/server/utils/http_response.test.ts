/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTextContentType, readResponseStream } from './http_response';

describe('isTextContentType', () => {
  it('should return false for null (missing Content-Type)', () => {
    expect(isTextContentType(null)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isTextContentType('')).toBe(false);
  });

  it('should return true for text/* types', () => {
    expect(isTextContentType('text/plain')).toBe(true);
    expect(isTextContentType('text/html')).toBe(true);
    expect(isTextContentType('text/css')).toBe(true);
    expect(isTextContentType('text/xml')).toBe(true);
  });

  it('should return true for +json structured syntax suffix', () => {
    expect(isTextContentType('application/vnd.api+json')).toBe(true);
    expect(isTextContentType('application/hal+json')).toBe(true);
  });

  it('should return true for +xml structured syntax suffix', () => {
    expect(isTextContentType('application/atom+xml')).toBe(true);
    expect(isTextContentType('application/soap+xml')).toBe(true);
  });

  it('should return true for application/json (via IANA charset lookup)', () => {
    expect(isTextContentType('application/json')).toBe(true);
  });

  it('should return true for application/javascript', () => {
    expect(isTextContentType('application/javascript')).toBe(true);
  });

  it('should return false for binary types', () => {
    expect(isTextContentType('image/png')).toBe(false);
    expect(isTextContentType('image/jpeg')).toBe(false);
    expect(isTextContentType('application/pdf')).toBe(false);
    expect(isTextContentType('application/octet-stream')).toBe(false);
    expect(isTextContentType('audio/mpeg')).toBe(false);
    expect(isTextContentType('video/mp4')).toBe(false);
  });

  it('should return false for unknown/custom types', () => {
    expect(isTextContentType('application/x-custom-format')).toBe(false);
  });

  it('should strip charset parameter before checking', () => {
    expect(isTextContentType('text/plain; charset=utf-8')).toBe(true);
    expect(isTextContentType('image/png; charset=binary')).toBe(false);
    expect(isTextContentType('application/json; charset=utf-8')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isTextContentType('TEXT/PLAIN')).toBe(true);
    expect(isTextContentType('Application/JSON')).toBe(true);
    expect(isTextContentType('IMAGE/PNG')).toBe(false);
  });
});

describe('readResponseStream', () => {
  const createMockResponse = (data: Uint8Array): Response => {
    let consumed = false;
    return {
      body: {
        getReader: () => ({
          read: async () => {
            if (consumed) return { done: true, value: undefined };
            consumed = true;
            return { done: false, value: data };
          },
          releaseLock: () => {},
          cancel: jest.fn(),
        }),
      },
    } as unknown as Response;
  };

  const createMultiChunkResponse = (chunks: Uint8Array[]): Response => {
    let index = 0;
    return {
      body: {
        getReader: () => ({
          read: async () => {
            if (index >= chunks.length) return { done: true, value: undefined };
            const value = chunks[index];
            index++;
            return { done: false, value };
          },
          releaseLock: () => {},
          cancel: jest.fn(),
        }),
      },
    } as unknown as Response;
  };

  it('should read a response body into a Buffer', async () => {
    const data = new TextEncoder().encode('hello world');
    const response = createMockResponse(data);

    const result = await readResponseStream(response, 1024);
    expect(result.buffer.toString('utf-8')).toBe('hello world');
    expect(result.truncated).toBe(false);
  });

  it('should handle empty body (null)', async () => {
    const response = { body: null } as unknown as Response;
    const result = await readResponseStream(response, 1024);
    expect(result.buffer.byteLength).toBe(0);
    expect(result.truncated).toBe(false);
  });

  it('should preserve binary data exactly', async () => {
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe, 0x00, 0x01]);
    const response = createMockResponse(binaryData);

    const result = await readResponseStream(response, 1024);
    expect(result.buffer).toEqual(Buffer.from(binaryData));
    expect(result.truncated).toBe(false);
  });

  it('should concatenate multiple chunks', async () => {
    const chunk1 = new TextEncoder().encode('hello ');
    const chunk2 = new TextEncoder().encode('world');
    const response = createMultiChunkResponse([chunk1, chunk2]);

    const result = await readResponseStream(response, 1024);
    expect(result.buffer.toString('utf-8')).toBe('hello world');
    expect(result.truncated).toBe(false);
  });

  it('should return truncated: true when exceeding maxBytes', async () => {
    const data = new Uint8Array(500);
    data.fill(0xff);
    const response = createMockResponse(data);

    const result = await readResponseStream(response, 100);
    expect(result.truncated).toBe(true);
    expect(result.buffer.byteLength).toBe(0);
  });

  it('should not enforce limit when maxBytes is 0', async () => {
    const data = new Uint8Array(500);
    data.fill(0xff);
    const response = createMockResponse(data);

    const result = await readResponseStream(response, 0);
    expect(result.truncated).toBe(false);
    expect(result.buffer.byteLength).toBe(500);
  });
});
