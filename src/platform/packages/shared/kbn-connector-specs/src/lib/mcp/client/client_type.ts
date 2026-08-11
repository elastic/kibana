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
    // Tolerate auth types without a header producer (e.g. `none`) by falling back to no headers.
    let authHeaders: Record<string, string> = {};
    try {
      authHeaders = await ctx.credential.getAuthHeaders();
    } catch (err) {
      ctx.logger.debug(
        `No auth headers for MCP client: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const headers: Record<string, string> = { ...(deps.defaultHeaders ?? {}), ...authHeaders };
    const hasHeaders = Object.keys(headers).length > 0;

    const resource = createFetchResource({
      networkSettings: ctx.networkSettings,
      logger: ctx.logger,
      targetUrl: serverUrl,
      ...(hasHeaders ? { headers } : {}),
      ...(deps.userAgent ? { userAgent: deps.userAgent } : {}),
    });
    const customFetch = createSseGatedFetch(resource);

    const client = new McpClient(
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
  },

  async terminate(client: McpClient): Promise<void> {
    await client.disconnect();

    const resource = fetchResources.get(client);
    if (resource) {
      fetchResources.delete(client);
      try {
        await resource.close();
      } catch {
        // best-effort
      }
    }
  },

  isUserError(err: unknown): boolean {
    if (err instanceof UnauthorizedError) {
      return true;
    }
    if (err instanceof StreamableHTTPError) {
      return err.code === 401 || err.code === 403;
    }
    if (err instanceof Error) {
      if (err.message.startsWith('Unauthorized error:')) {
        return true;
      }
      if (err.cause instanceof UnauthorizedError) {
        return true;
      }
      if (err.cause instanceof StreamableHTTPError) {
        return err.cause.code === 401 || err.cause.code === 403;
      }
    }
    return false;
  },
});
