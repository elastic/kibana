/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConfiguredFetchResource, FetchLike } from '../clients/configured_fetch_types';

// How long to wait for the GET SSE channel before proceeding anyway.
const SSE_READY_TIMEOUT_MS = 5_000;
const MCP_SESSION_HEADER = 'mcp-session-id';

interface SseChannelGate {
  open: Promise<void>;
  markOpen: (() => void) | null;
}

/**
 * Wraps a `ConfiguredFetchResource` (returned by `ConfiguredFetchFactory`) with the SSE gate
 * logic required by the MCP Streamable HTTP transport. The gate coordinates between the GET SSE
 * channel and subsequent POST tool-calls so that POSTs do not race the channel open.
 *
 * The underlying `ConfiguredFetchResource.fetch` already applies SSL/TLS, proxy, User-Agent, and
 * body-size policy; this wrapper adds only the MCP-specific SSE ordering guarantee.
 */
export function createMcpFetch(resource: ConfiguredFetchResource): FetchLike {
  const gates = new Map<string, SseChannelGate>();

  const ensureChannelGate = (sessionId: string): SseChannelGate => {
    let gate = gates.get(sessionId);
    if (!gate) {
      let markOpen: (() => void) | null = null;
      const open = new Promise<void>((res) => {
        markOpen = res;
      });
      gate = { open, markOpen };
      gates.set(sessionId, gate);
    }
    return gate;
  };

  const getSessionId = (headers: Record<string, string>): string => {
    const lowerName = MCP_SESSION_HEADER.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerName) return value;
    }
    return '';
  };

  const normalizeHeaders = (init?: RequestInit): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!init?.headers) return headers;
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, init.headers);
    }
    return headers;
  };

  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = normalizeHeaders(init);
    const sessionId = getSessionId(headers);

    if (method === 'GET') {
      // Fire the underlying fetch for the SSE channel and resolve the gate on return.
      const response = await resource.fetch(url, init);
      const gate = gates.get(sessionId);
      if (gate) {
        gate.markOpen?.();
      }
      return response;
    }

    // For non-GET requests, wait for the SSE gate (if one was created by a prior 202).
    const gate = gates.get(sessionId);
    if (gate) {
      const races: Array<Promise<void>> = [
        gate.open,
        new Promise<void>((resolve) => setTimeout(resolve, SSE_READY_TIMEOUT_MS)),
      ];
      if (init?.signal) {
        races.push(
          new Promise<void>((resolve) => {
            if (init.signal?.aborted) resolve();
            else init.signal?.addEventListener('abort', () => resolve(), { once: true });
          })
        );
      }
      await Promise.race(races);
    }

    const response = await resource.fetch(url, init);

    // A 202 to a POST means the initialized notification was accepted; create the gate so
    // subsequent tool-call POSTs can await the GET SSE channel.
    if (response.status === 202) {
      const responseSessionId = response.headers.get(MCP_SESSION_HEADER) || sessionId;
      ensureChannelGate(responseSessionId);
    }

    return response;
  };
}
