/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GravityZone JSON-RPC 2.0 client helper.
 *
 * Every GravityZone call is a JSON-RPC 2.0 POST to a service-specific path.
 * The JSON-RPC envelope wraps the method, an auto-incrementing id and the
 * caller-supplied params. HTTP 200 may carry a JSON-RPC error in the body.
 * Retries on 429 and 5xx are delegated to the Kibana Actions framework.
 */

import type { ActionContext } from '../../connector_spec';

// ---------------------------------------------------------------------------
// Config helper
// ---------------------------------------------------------------------------

interface BitdefenderConfig {
  accessUrl?: string;
}

/** Returns the base API URL with no trailing slash. */
export const getAccessUrl = (ctx: ActionContext): string => {
  const cfg = ctx.config as BitdefenderConfig | undefined;
  return (cfg?.accessUrl ?? 'https://cloudap.gravityzone.bitdefender.com/api').replace(/\/+$/, '');
};

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/**
 * Builds the HTTP Basic Authorization header value from the raw API key.
 *
 * GravityZone uses HTTP Basic auth with the API key as the username and an
 * empty password. The framework's api_key_header auth type stores the raw key
 * under the Authorization header field, so we transform it into the proper
 * `Basic base64(apiKey:)` format here.
 */
export const getAuthHeader = (ctx: ActionContext): string => {
  const secrets = ctx.secrets as Record<string, string> | undefined;
  const rawKey = secrets?.Authorization ?? '';
  const encoded = Buffer.from(`${rawKey}:`).toString('base64');
  return `Basic ${encoded}`;
};

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: string;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/** JSON-RPC error codes that map to auth errors. */
const AUTH_ERROR_CODES = new Set([-32001]);

/** JSON-RPC error codes for not-found. */
const NOT_FOUND_CODES = new Set([-32002]);

function isHtmlResponse(contentType?: string): boolean {
  return !!contentType && contentType.includes('text/html');
}

// ---------------------------------------------------------------------------
// JSON-RPC call
// ---------------------------------------------------------------------------

let rpcId = 0;

/** Builds a JSON-RPC 2.0 request body. */
function buildJsonRpcBody(method: string, params: Record<string, unknown>): JsonRpcRequest {
  rpcId += 1;
  return {
    jsonrpc: '2.0',
    method,
    params,
    id: String(rpcId),
  };
}

/**
 * Sends a single JSON-RPC 2.0 request to GravityZone and returns the parsed result.
 * Retries on 429 and 5xx are delegated to the Kibana Actions framework.
 *
 * @param ctx Action context with the authenticated Axios client
 * @param servicePath Service path (e.g. /v1.0/jsonrpc/network)
 * @param method JSON-RPC method name
 * @param params JSON-RPC params object
 */
export async function jsonRpcCall<T = unknown>(
  ctx: ActionContext,
  servicePath: string,
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const baseUrl = getAccessUrl(ctx);
  const parsed = new URL(baseUrl);
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') + servicePath;
  const url = parsed.toString();
  const body = buildJsonRpcBody(method, params);
  const authHeader = getAuthHeader(ctx);
  const ctxTimeout = (ctx.client.defaults as { timeout?: number }).timeout;
  const timeout = Math.min(30_000, ctxTimeout ?? 30_000);

  const response = await ctx.client.request({
    method: 'POST',
    url,
    data: body,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    timeout,
    maxRedirects: 0,
    validateStatus: () => true,
  });

  const { status, headers, data } = response;

  // Detect HTML error pages (gateway/proxy errors returned as HTML)
  if (isHtmlResponse(headers?.['content-type'] as string | undefined)) {
    const text = typeof data === 'string' ? data.slice(0, 500) : 'HTML error response from gateway';
    throw new Error(`GravityZone returned an HTML error page (HTTP ${status}): ${text}`);
  }

  // HTTP-level errors (non-200)
  if (status === 429) {
    const retryAfter = headers?.['retry-after'] as string | undefined;
    const err: Error & { statusCode?: number; retryAfterMs?: number } = new Error(
      `GravityZone API rate limit exceeded (HTTP 429)${
        retryAfter ? `: retry after ${retryAfter}s` : ''
      }`
    );
    err.statusCode = 429;
    if (retryAfter) {
      const ms = parseInt(retryAfter, 10) * 1000;
      if (!isNaN(ms)) err.retryAfterMs = ms;
    }
    throw err;
  }
  if (status === 401) {
    throw new Error('Invalid or expired API key');
  }
  if (status === 403) {
    throw new Error(
      'Insufficient permissions: the API key does not have the required API area enabled'
    );
  }
  if (status !== 200) {
    throw new Error(`GravityZone API error (HTTP ${status})`);
  }

  // JSON-RPC layer error (HTTP 200 but error in body)
  const rpcBody = data as JsonRpcResponse<T>;
  if (rpcBody.error) {
    const { code, message: msg } = rpcBody.error;

    if (AUTH_ERROR_CODES.has(code)) {
      throw new Error(`Authorization error: ${msg}`);
    }
    if (NOT_FOUND_CODES.has(code)) {
      throw new Error(`Not found: ${msg}`);
    }
    if (code === -32602) {
      throw new Error(`Invalid parameters: ${msg}`);
    }
    throw new Error(`GravityZone API error (code ${code}): ${msg}`);
  }

  if (!Object.prototype.hasOwnProperty.call(rpcBody, 'result')) {
    throw new Error(
      'Invalid JSON-RPC response: neither result nor error present in response envelope'
    );
  }

  return rpcBody.result as T;
}

/** Convenience alias for read calls. */
export const jsonRpcRead = jsonRpcCall;

/** Convenience alias for state-changing calls. */
export const jsonRpcWrite = jsonRpcCall;
