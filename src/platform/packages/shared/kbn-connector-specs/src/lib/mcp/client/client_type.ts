/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  McpClient,
  McpError,
  McpErrorCode,
  McpNotConnectedError,
  StreamableHTTPError,
  UnauthorizedError,
  type FetchLike,
} from '@kbn/mcp-client';
import type { BuildContext, ClientTypeSpec } from '../../clients/client_type_spec';
import { createFetchResource, type McpFetchResource } from './fetch_resource';
import { McpConnectionTransportError } from './mcp_connection_transport_error';

export { McpConnectionTransportError };

const DEFAULT_MCP_CLIENT_NAME = 'kibana-mcp';
const DEFAULT_MCP_CLIENT_VERSION = '1.0.0';
const USER_ERROR_HTTP_STATUS_CODES = new Set([401, 403]);
const TERMINAL_UNDICI_CODES = new Set(['UND_ERR_SOCKET', 'UND_ERR_CLOSED', 'UND_ERR_DESTROYED']);
const SOCKET_HANG_UP = 'socket hang up';
// Thrown by the SDK protocol layer once its transport is gone.
const SDK_NOT_CONNECTED_MESSAGE = 'Not connected';
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'EPIPE',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

export const MCP_CONNECT_MAX_ATTEMPTS = 3;
export const MCP_CONNECT_RETRY_DELAY_MS = 100;

export interface McpConnectRetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

export class McpConnectionHttpError extends Error {
  constructor(public readonly httpStatus: number, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = 'McpConnectionHttpError';
  }
}

/**
 * Tracks the `McpFetchResource` backing each pooled client so `terminate` can close it
 * (release the undici dispatcher) when the pool evicts the client. Keyed by client instance so
 * entries drop automatically if a client is GC'd without an explicit terminate.
 */
const fetchResources = new WeakMap<McpClient, McpFetchResource>();

/**
 * Optional closed-over defaults for the MCP client type. Outbound network policy comes from
 * `BuildContext.networkSettings` at build time — not from these deps.
 */
export interface McpClientTypeDeps {
  defaultHeaders?: Readonly<Record<string, string>>;
  userAgent?: string;
  connectRetry?: McpConnectRetryOptions;
}

const getErrorCode = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return undefined;
  }
  return typeof err.code === 'string' ? err.code : undefined;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
};

const getTransportErrorCode = (err: unknown): string | undefined => {
  const direct = getErrorCode(err);
  if (direct !== undefined) {
    return direct;
  }
  const cause = err instanceof Error ? err.cause : undefined;
  const causeCode = getErrorCode(cause);
  if (causeCode !== undefined) {
    return causeCode;
  }
  if (getErrorMessage(err).includes(SOCKET_HANG_UP)) {
    return 'ECONNRESET';
  }
  if (cause !== undefined && getErrorMessage(cause).includes(SOCKET_HANG_UP)) {
    return 'ECONNRESET';
  }
  return undefined;
};

const matchesErrorOrCause = (err: unknown, predicate: (current: unknown) => boolean): boolean => {
  if (predicate(err)) {
    return true;
  }
  // Undici's fetch throws TypeError("fetch failed") and puts UND_ERR_* on cause.
  const cause = err instanceof Error ? err.cause : undefined;
  return cause !== undefined && predicate(cause);
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const isTransientConnectError = (err: unknown): boolean => {
  if (err instanceof McpConnectionHttpError) {
    return err.httpStatus >= 500;
  }
  if (err instanceof McpConnectionTransportError) {
    return TRANSIENT_ERROR_CODES.has(err.code);
  }
  const code = getTransportErrorCode(err);
  return code !== undefined && TRANSIENT_ERROR_CODES.has(code);
};

const connectOnce = async (
  ctx: BuildContext,
  deps: McpClientTypeDeps,
  clientName: string,
  serverUrl: string
): Promise<McpClient> => {
  const resource = createFetchResource({
    networkSettings: ctx.networkSettings,
    logger: ctx.logger,
    targetUrl: serverUrl,
    ...(deps.defaultHeaders ? { headers: deps.defaultHeaders } : {}),
    getAuthHeaders: () => ctx.credential.getAuthHeaders(),
    ...(deps.userAgent ? { userAgent: deps.userAgent } : {}),
  });
  let userErrorHttpStatus: number | undefined;
  let transientHttpStatus: number | undefined;
  let transportErrorCode: string | undefined;
  const customFetch: FetchLike = async (url, init) => {
    try {
      const response = await resource.fetch(url, init);
      if (USER_ERROR_HTTP_STATUS_CODES.has(response.status)) {
        userErrorHttpStatus = response.status;
      } else if (response.status >= 500) {
        transientHttpStatus = response.status;
      }
      return response;
    } catch (err) {
      transportErrorCode = getTransportErrorCode(err);
      throw err;
    }
  };

  let client: McpClient | undefined;
  try {
    client = new McpClient(
      ctx.logger,
      {
        name: clientName,
        version: DEFAULT_MCP_CLIENT_VERSION,
        url: serverUrl,
      },
      {
        fetch: customFetch,
      }
    );

    fetchResources.set(client, resource);
    await client.connect();
    return client;
  } catch (err) {
    if (client) {
      fetchResources.delete(client);
    }
    try {
      await resource.close();
    } catch {
      // Preserve the original connection error.
    }
    if (userErrorHttpStatus !== undefined) {
      throw new McpConnectionHttpError(userErrorHttpStatus, err);
    }
    if (transientHttpStatus !== undefined) {
      throw new McpConnectionHttpError(transientHttpStatus, err);
    }
    if (transportErrorCode !== undefined) {
      throw new McpConnectionTransportError(transportErrorCode, err);
    }
    throw err;
  }
};

export const createMcpClientType = (deps: McpClientTypeDeps = {}): ClientTypeSpec<McpClient> => ({
  id: 'mcp',

  async build(ctx: BuildContext): Promise<McpClient> {
    const serverUrl = typeof ctx.config?.serverUrl === 'string' ? ctx.config.serverUrl : undefined;

    if (!serverUrl) {
      throw new Error('config.serverUrl is required');
    }

    const clientName =
      typeof ctx.config?.clientName === 'string' && ctx.config.clientName !== ''
        ? ctx.config.clientName
        : DEFAULT_MCP_CLIENT_NAME;

    const maxAttempts = deps.connectRetry?.maxAttempts ?? MCP_CONNECT_MAX_ATTEMPTS;
    const delayMs = deps.connectRetry?.delayMs ?? MCP_CONNECT_RETRY_DELAY_MS;

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await connectOnce(ctx, deps, clientName, serverUrl);
      } catch (err) {
        lastError = err;
        if (!isTransientConnectError(err) || attempt === maxAttempts) {
          throw err;
        }
        ctx.logger.warn(
          `MCP connect attempt ${attempt}/${maxAttempts} failed: ${getErrorMessage(
            err
          )}; retrying in ${delayMs}ms`
        );
        await delay(delayMs);
      }
    }

    throw lastError;
  },

  async terminate(client: McpClient): Promise<void> {
    const resource = fetchResources.get(client);
    fetchResources.delete(client);

    try {
      await client.disconnect();
    } finally {
      if (resource) {
        try {
          await resource.close();
        } catch {
          // Best-effort; do not mask a disconnect error with a cleanup failure.
        }
      }
    }
  },

  isUserError(err: unknown): boolean {
    return matchesErrorOrCause(err, (current) => {
      if (current instanceof McpConnectionHttpError) {
        return USER_ERROR_HTTP_STATUS_CODES.has(current.httpStatus);
      }
      if (current instanceof UnauthorizedError) {
        return true;
      }
      if (current instanceof StreamableHTTPError) {
        return current.code === 401 || current.code === 403;
      }
      return false;
    });
  },

  shouldInvalidateOnError(err: unknown): boolean {
    return matchesErrorOrCause(err, (current) => {
      if (current instanceof UnauthorizedError) {
        return true;
      }
      // The SDK dropped its transport: pending requests fail with ConnectionClosed and later
      // requests with "Not connected". Nothing reconnects a pooled client, so drop it.
      if (current instanceof McpNotConnectedError) {
        return true;
      }
      if (current instanceof McpError) {
        return current.code === McpErrorCode.ConnectionClosed;
      }
      if (current instanceof Error && current.message === SDK_NOT_CONNECTED_MESSAGE) {
        return true;
      }
      if (current instanceof StreamableHTTPError) {
        return current.code === 401 || current.code === 403 || current.code === 404;
      }
      const code = getErrorCode(current);
      return code !== undefined && TERMINAL_UNDICI_CODES.has(code);
    });
  },
});
