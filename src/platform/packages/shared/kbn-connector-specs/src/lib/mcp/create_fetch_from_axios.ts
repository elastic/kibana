/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AxiosInstance,
  AxiosResponse,
  AxiosResponseHeaders,
  RawAxiosResponseHeaders,
} from 'axios';
import type { FetchLike } from '@kbn/mcp-client';

/**
 * Builds a Fetch API–compatible function that delegates to a preconfigured
 * Axios instance. Use this when you already have an axios instance with auth,
 * SSL, and proxy configured (e.g. from getAxiosInstanceWithAuth) so that
 * McpClient can reuse the same transport and auth instead of duplicating it.
 *
 * @param axiosInstance - Axios instance with auth and any other config already applied
 * @returns A FetchLike suitable for passing to McpClient as the `fetch` option
 */
// How long to wait for the GET SSE channel before proceeding anyway.
// Bounds the sseReady gate against ordering races and servers that never open the channel.
const SSE_READY_TIMEOUT_MS = 5_000;

const MCP_SESSION_HEADER = 'mcp-session-id';

interface SseChannelGate {
  open: Promise<void>;
  markOpen: (() => void) | null;
}

export function createFetchFromAxios(axiosInstance: AxiosInstance): FetchLike {
  // The MCP SDK fires the GET SSE channel as a fire-and-forget side effect of the
  // initialized handshake. Some servers require that channel to be established before
  // they process tool-call POSTs. Pre-create a gate when we see the initialized 202
  // so subsequent POSTs can await it without adding a fixed delay.
  //
  // Keyed by Mcp-Session-Id so concurrent sessions sharing this fetch instance don't
  // unblock each other (session-less servers fall back to ''). Resolved gates are kept
  // rather than deleted so a later 202 (e.g. notifications/cancelled) finds an already-
  // resolved gate and passes through immediately instead of re-creating a stale one.
  const gates = new Map<string, SseChannelGate>();

  const ensureChannelGate = (sessionId: string): SseChannelGate => {
    let sseChannelGate = gates.get(sessionId);
    if (!sseChannelGate) {
      let markOpen: (() => void) | null = null;
      const open = new Promise<void>((res) => {
        markOpen = res;
      });
      sseChannelGate = { open, markOpen };
      gates.set(sessionId, sseChannelGate);
    }
    return sseChannelGate;
  };

  // Use responseType:'stream' so the SDK's SSE parser reads events as they arrive
  // rather than buffering the entire (potentially infinite) stream in memory.
  const callSseGet = async (
    urlString: string,
    headers: Record<string, string>,
    init?: RequestInit
  ): Promise<Response> => {
    const res = await axiosInstance.request({
      url: urlString,
      method: 'GET',
      headers: Object.keys(headers).length ? headers : undefined,
      signal: init?.signal ?? undefined,
      responseType: 'stream',
      validateStatus: () => true,
    });

    // Resolve this session's gate so its own waiting POSTs can proceed.
    const sessionId = getHeaderValue(headers, MCP_SESSION_HEADER);
    const sseChannelGate = gates.get(sessionId);
    if (sseChannelGate) {
      sseChannelGate.markOpen?.();
    }

    return new Response(createWebStream(res), {
      status: res.status,
      statusText: res.statusText ?? '',
      headers: toWebHeaders(res),
    });
  };

  // All the other SSE methods buffer the response for JSON parsing
  const callSseWithMethod = async (
    method: string,
    urlString: string,
    headers: Record<string, string>,
    init?: RequestInit
  ): Promise<Response> => {
    const sessionId = getHeaderValue(headers, MCP_SESSION_HEADER);
    const sseChannelGate = gates.get(sessionId);
    if (sseChannelGate) {
      // Race the gate against a timeout and the abort signal so a stuck or
      // out-of-order GET can never cause tool-call POSTs to hang indefinitely.
      // Whichever wins first, execution falls through to the request below.
      const races: Array<Promise<void>> = [
        sseChannelGate.open,
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

    const res = await axiosInstance.request({
      url: urlString,
      method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD',
      headers: Object.keys(headers).length ? headers : undefined,
      data: init?.body ?? undefined,
      signal: init?.signal ?? undefined,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    // A 202 to a POST means the initialized notification was accepted; the SDK fires
    // the GET SSE channel immediately after. Pre-create the gate here so tool-call
    // POSTs can await it, preferring the session id the server just assigned.
    if (res.status === 202) {
      const responseSessionId = getHeaderValue(res.headers, MCP_SESSION_HEADER) || sessionId;
      ensureChannelGate(responseSessionId);
    }

    return new Response(res.data, {
      status: res.status,
      statusText: res.statusText ?? '',
      headers: toWebHeaders(res),
    });
  };

  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};

    if (init?.headers) {
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
    }

    if (method === 'GET') {
      return callSseGet(urlString, headers, init);
    } else {
      return callSseWithMethod(method, urlString, headers, init);
    }
  };
}

// Case-insensitive lookup since header keys may arrive in varying case.
function getHeaderValue(
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders,
  name: string
): string {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
    }
  }
  return '';
}

function toWebHeaders(res: AxiosResponse): Headers {
  const headers = new Headers();
  if (res.headers && typeof res.headers === 'object') {
    for (const [key, value] of Object.entries(res.headers)) {
      if (value !== undefined && value !== null) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      }
    }
  }
  return headers;
}

/** Converts the Node.js Readable from an Axios `responseType:'stream'` response into the
 *  web-API ReadableStream<Uint8Array> expected by the Fetch-compatible Response constructor. */
function createWebStream(res: AxiosResponse) {
  const nodeStream = res.data as NodeJS.ReadableStream;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Uint8Array));
      });
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err: Error) => controller.error(err));
    },
    cancel() {
      (nodeStream as { destroy?: () => void }).destroy?.();
    },
  });
}
