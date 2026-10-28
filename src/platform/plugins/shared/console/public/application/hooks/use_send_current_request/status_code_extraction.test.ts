/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';

jest.unmock('./send_request');

describe('Status Code Extraction in sendRequest', () => {
  let mockHttp: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    mockHttp = {
      post: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractStatusCodeAndText function behavior', () => {
    it('should use proxy headers when available for ES requests', async () => {
      const { sendRequest } = await import('./send_request');

      const mockResponse = {
        response: {
          status: 200, // Actual HTTP status
          statusText: 'OK',
          headers: new Map([
            ['x-console-proxy-status-code', '404'], // ES status from proxy
            ['x-console-proxy-status-text', 'Not Found'],
            ['Content-Type', 'application/json'],
          ]),
        },
        body: JSON.stringify({ error: 'index_not_found_exception' }),
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      const result = await sendRequest({
        http: mockHttp,
        requests: [{ url: '/_search', method: 'GET', data: ['{}'] }],
      });

      expect(result[0].response.statusCode).toBe(404); // Should use proxy header
      expect(result[0].response.statusText).toBe('Not Found');
    });

    it('should fall back to actual response status when proxy headers are missing', async () => {
      const { sendRequest } = await import('./send_request');

      const mockResponse = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          headers: new Map([['Content-Type', 'application/json']]),
        },
        body: JSON.stringify({
          statusCode: 400,
          error: 'Bad Request',
          message:
            "Method must be one of, case insensitive ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']. Received 'INVALIDMETHOD'.",
        }),
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      const result = await sendRequest({
        http: mockHttp,
        requests: [{ url: '/_search', method: 'INVALIDMETHOD', data: ['{}'] }],
      });

      expect(result[0].response.statusCode).toBe(400); // Should use actual response status, not 500
      expect(result[0].response.statusText).toBe('Bad Request');
    });

    it('should handle empty proxy header as missing header', async () => {
      const { sendRequest } = await import('./send_request');

      const mockResponse = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          headers: new Map([
            ['x-console-proxy-status-code', ''], // Empty header value
            ['Content-Type', 'application/json'],
          ]),
        },
        body: JSON.stringify({ error: 'validation error' }),
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      const result = await sendRequest({
        http: mockHttp,
        requests: [{ url: '/_search', method: 'INVALID', data: ['{}'] }],
      });

      expect(result[0].response.statusCode).toBe(400); // Should fall back to actual status
      expect(result[0].response.statusText).toBe('Bad Request');
    });
  });

  describe('ndjson response handling', () => {
    // The core HTTP client parses application/ndjson responses as Blob objects.
    // Console must read the Blob text rather than JSON.stringify-ing it (which yields "{}").
    it('should display ndjson blob body as plain text', async () => {
      const { sendRequest } = await import('./send_request');

      const ndjsonText = '{"type":"dashboard","id":"abc"}\n{"type":"index-pattern","id":"def"}\n';
      const mockResponse = {
        response: {
          status: 200,
          statusText: 'OK',
          headers: new Map([
            ['x-console-proxy-status-code', '200'],
            ['x-console-proxy-status-text', 'OK'],
            ['Content-Type', 'application/ndjson'],
          ]),
        },
        body: new Blob([ndjsonText], { type: 'application/ndjson' }),
      };

      mockHttp.post.mockResolvedValue(mockResponse);

      const result = await sendRequest({
        http: mockHttp,
        requests: [{ url: '/_export', method: 'POST', data: ['{}'] }],
      });

      // Each ndjson line should be pretty-printed as JSON
      expect(result[0].response.value).toContain('"type": "dashboard"');
      expect(result[0].response.value).toContain('"type": "index-pattern"');
      expect(result[0].response.value).not.toBe('{}');
      expect(result[0].response.contentType).toBe('application/ndjson');
    });

    it('should display ndjson blob error body as plain text', async () => {
      const { sendRequest } = await import('./send_request');

      const ndjsonError = '{"error":"not_found","id":"missing"}\n';

      const fetchError = {
        response: {
          status: 200,
          statusText: 'OK',
          headers: new Map([
            ['x-console-proxy-status-code', '404'],
            ['x-console-proxy-status-text', 'Not Found'],
            ['Content-Type', 'application/ndjson'],
          ]),
        },
        body: new Blob([ndjsonError], { type: 'application/ndjson' }),
      };

      mockHttp.post.mockRejectedValue(fetchError);

      const result = await sendRequest({
        http: mockHttp,
        requests: [{ url: '/_export', method: 'POST', data: ['{}'] }],
      });

      expect(result[0].response.value).toContain('"error": "not_found"');
      expect(result[0].response.value).not.toBe('{}');
    });
  });
});
