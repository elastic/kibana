/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpClient, StreamableHTTPError, UnauthorizedError } from '@kbn/mcp-client';
import type { BuildContext, ClientTypeSpec } from '../../clients/client_type_spec';
import { createFetchResource, type McpFetchResource } from './fetch_resource';
import { createSseGatedFetch } from './sse_fetch';

const DEFAULT_MCP_CLIENT_VERSION = '1.0.0';
const MAX_CAUSE_DEPTH = 5;
const TERMINAL_UNDICI_CODES = new Set(['UND_ERR_SOCKET', 'UND_ERR_CLOSED', 'UND_ERR_DESTROYED']);

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
}

const getErrorCode = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return undefined;
  }
  return typeof err.code === 'string' ? err.code : undefined;
};

const walkCauseChain = (err: unknown, predicate: (current: unknown) => boolean): boolean => {
  let current: unknown = err;
  const seen = new Set<unknown>();

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth++) {
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);

    if (predicate(current)) {
      return true;
    }

    current = current instanceof Error ? current.cause : undefined;
  }

  return false;
};

/**
 * Factory for the registered client type behind `ctx.getClient('mcp')`.
 *
 * Build applies `ctx.networkSettings` (allowlist, TLS, proxy, timeout, body size) through an
 * MCP fetch resource, then connects `@kbn/mcp-client` with Streamable HTTP.
 *
 * `isUserError` classifies unauthorized / forbidden failures as user errors so the executor can
 * surface them as non-retryable USER errors rather than FRAMEWORK errors.
 */
export const createMcpClientType = (deps: McpClientTypeDeps = {}): ClientTypeSpec<McpClient> => ({
  id: 'mcp',

  async build(ctx: BuildContext): Promise<McpClient> {
    const serverUrl = typeof ctx.config?.serverUrl === 'string' ? ctx.config.serverUrl : undefined;

    if (!serverUrl) {
      throw new Error('config.serverUrl is required');
    }

    // Auth headers come from the connector's configured auth type via the framework credential.
    // `none` implements getAuthHeaders as `{}`; other failures must propagate.
    const authHeaders = await ctx.credential.getAuthHeaders();

    const credentialHeaderNames = Object.keys(authHeaders);
    const headers: Record<string, string> = { ...(deps.defaultHeaders ?? {}), ...authHeaders };
    const hasHeaders = Object.keys(headers).length > 0;

    const resource = createFetchResource({
      networkSettings: ctx.networkSettings,
      logger: ctx.logger,
      targetUrl: serverUrl,
      ...(hasHeaders ? { headers } : {}),
      ...(credentialHeaderNames.length > 0 ? { credentialHeaderNames } : {}),
      ...(deps.userAgent ? { userAgent: deps.userAgent } : {}),
    });
    const customFetch = createSseGatedFetch(resource);

    let client: McpClient | undefined;
    try {
      client = new McpClient(
        ctx.logger,
        {
          name: `kibana-mcp-${serverUrl}`,
          version: DEFAULT_MCP_CLIENT_VERSION,
          url: serverUrl,
        },
        {
          ...(hasHeaders ? { headers: { ...headers } } : {}),
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
      throw err;
    }
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
    return walkCauseChain(err, (current) => {
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
    return walkCauseChain(err, (current) => {
      if (current instanceof UnauthorizedError) {
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
