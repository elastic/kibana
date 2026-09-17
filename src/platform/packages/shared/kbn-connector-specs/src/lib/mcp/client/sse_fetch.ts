/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchLike } from '@kbn/mcp-client';
import type { McpFetchResource } from './fetch_resource';

// How long to wait for the GET SSE channel before proceeding anyway.
const SSE_READY_TIMEOUT_MS = 5_000;
const MCP_SESSION_HEADER = 'mcp-session-id';

interface SseChannelGate {
  open: Promise<void>;
  markOpen: (() => void) | null;
}

/**
 * Wraps an {@link McpFetchResource} with the SSE gate logic required by the MCP Streamable HTTP
 * transport. The gate coordinates between the GET SSE channel and subsequent POST tool-calls so
 * that POSTs do not race the channel open.
 *
 * The underlying resource already applies network policy from `BuildContext.networkSettings`; this
 * wrapper adds only the MCP-specific SSE ordering guarantee.
 */
export function createSseGatedFetch(resource: McpFetchResource): FetchLike {
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

  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const sessionId = new Headers(init?.headers).get(MCP_SESSION_HEADER) ?? '';

    if (method === 'GET') {
      // Create-or-get so a GET that wins the race with the initialized 202 still opens the gate.
      const response = await resource.fetch(url, init);
      const gate = ensureChannelGate(sessionId);
      gate.markOpen?.();
      gate.markOpen = null;
      return response;
    }

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
