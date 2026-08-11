/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConfiguredFetchResource } from '../clients/configured_fetch_types';
import { createMcpFetch } from './create_mcp_fetch';

const makeResource = (fetchImpl?: jest.Mock): ConfiguredFetchResource => ({
  fetch: fetchImpl ?? jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
});

const makeResponse = (status = 200, headers: Record<string, string> = {}): Response => {
  return new Response(null, {
    status,
    headers,
  });
};

describe('createMcpFetch', () => {
  let mockFetch: jest.Mock;
  let resource: ConfiguredFetchResource;
  let fetch: ReturnType<typeof createMcpFetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch = jest.fn();
    resource = makeResource(mockFetch);
    fetch = createMcpFetch(resource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET (SSE stream channel)', () => {
    it('delegates GET requests to the underlying resource.fetch', async () => {
      mockFetch.mockResolvedValue(makeResponse(200));

      const response = await fetch('https://example.com/mcp', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/mcp', { method: 'GET' });
      expect(response.status).toBe(200);
    });

    it('defaults to GET when no method provided', async () => {
      mockFetch.mockResolvedValue(makeResponse(200));

      await fetch('https://example.com/mcp');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('accepts a URL object', async () => {
      mockFetch.mockResolvedValue(makeResponse(200));

      await fetch(new URL('https://example.com/mcp'));

      expect(mockFetch).toHaveBeenCalledWith(new URL('https://example.com/mcp'), undefined);
    });
  });

  describe('non-GET (tool calls)', () => {
    it('delegates POST requests to the underlying resource.fetch', async () => {
      mockFetch.mockResolvedValue(makeResponse(200));

      const response = await fetch('https://example.com/mcp', {
        method: 'POST',
        body: '{"jsonrpc":"2.0"}',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/mcp', {
        method: 'POST',
        body: '{"jsonrpc":"2.0"}',
      });
      expect(response.status).toBe(200);
    });

    it('passes through DELETE and other methods', async () => {
      mockFetch.mockResolvedValue(makeResponse(200));

      await fetch('https://example.com/mcp', { method: 'DELETE' });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/mcp', { method: 'DELETE' });
    });
  });

  describe('sseReady gate', () => {
    it('does not block when no gate is active (no prior 202)', async () => {
      mockFetch.mockResolvedValue(makeResponse(200));

      await fetch('https://example.com/mcp', { method: 'POST' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('creates a gate on a 202 response and blocks the next POST', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(202)).mockResolvedValueOnce(makeResponse(200));

      await fetch('https://example.com/mcp', { method: 'POST' }); // init → 202, gate created

      const toolCall = fetch('https://example.com/mcp', { method: 'POST' });
      // Gate is active — second fetch call has not been made yet
      expect(mockFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000); // advance past SSE_READY_TIMEOUT_MS
      await toolCall;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('resolves the gate when the GET SSE channel opens', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(202)) // POST init
        .mockResolvedValueOnce(makeResponse(200)) // GET SSE
        .mockResolvedValueOnce(makeResponse(200)); // POST tool-call

      await fetch('https://example.com/mcp', { method: 'POST' }); // creates gate

      const toolCall = fetch('https://example.com/mcp', { method: 'POST' }); // gated
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await fetch('https://example.com/mcp', { method: 'GET' }); // resolves gate
      await toolCall;

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('falls through after SSE_READY_TIMEOUT_MS when GET never arrives', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(202)).mockResolvedValueOnce(makeResponse(200));

      await fetch('https://example.com/mcp', { method: 'POST' });

      const toolCall = fetch('https://example.com/mcp', { method: 'POST' });
      jest.advanceTimersByTime(5000);
      await toolCall;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('falls through immediately when abort signal is already set', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(202)).mockResolvedValueOnce(makeResponse(200));

      await fetch('https://example.com/mcp', { method: 'POST' });

      const controller = new AbortController();
      controller.abort();

      await fetch('https://example.com/mcp', {
        method: 'POST',
        signal: controller.signal,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('keys gates by Mcp-Session-Id so concurrent sessions do not unblock each other', async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(202, { 'mcp-session-id': 'A' })) // POST init session A
        .mockResolvedValueOnce(makeResponse(202, { 'mcp-session-id': 'B' })) // POST init session B
        .mockResolvedValueOnce(makeResponse(200)) // GET SSE session A
        .mockResolvedValueOnce(makeResponse(200)); // POST tool-call session B once unblocked

      await fetch('https://example.com/mcp', {
        method: 'POST',
        headers: { 'mcp-session-id': 'A' },
      }); // creates gate for A

      await fetch('https://example.com/mcp', {
        method: 'POST',
        headers: { 'mcp-session-id': 'B' },
      }); // creates gate for B

      const sessionBToolCall = fetch('https://example.com/mcp', {
        method: 'POST',
        headers: { 'mcp-session-id': 'B' },
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Session A's GET opens — must NOT unblock session B
      await fetch('https://example.com/mcp', {
        method: 'GET',
        headers: { 'mcp-session-id': 'A' },
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Session B still gated until timeout
      jest.advanceTimersByTime(5000);
      await sessionBToolCall;
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });
});
