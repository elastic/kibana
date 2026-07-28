/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpClient, McpConnectionError } from '@kbn/mcp-client';
import { createMcpFetch } from '../mcp/create_mcp_fetch';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import type { ConfiguredFetchFactory, ConfiguredFetchResource } from './configured_fetch_types';

const DEFAULT_MCP_CLIENT_VERSION = '1.0.0';

/**
 * Tracks the `ConfiguredFetchResource` backing each pooled client so `terminate` can close it
 * (release the undici dispatcher) when the pool evicts the client. Keyed by client instance so
 * entries drop automatically if a client is GC'd without an explicit terminate.
 */
const fetchResources = new WeakMap<McpClient, ConfiguredFetchResource>();

/**
 * Dependencies the MCP client type closes over. These are outbound-HTTP concerns specific to the
 * MCP client type and intentionally do not travel through the generic `BuildContext`, so non-HTTP
 * client types stay unaffected.
 */
export interface McpClientTypeDeps {
  configuredFetchFactory?: ConfiguredFetchFactory;
  defaultHeaders?: Readonly<Record<string, string>>;
  requestTimeout?: number;
}

/**
 * Factory for the registered client type behind `ctx.getClient('mcp')`.
 *
 * Build creates an `McpClient` using the `ConfiguredFetchFactory` closed over via `deps` (which
 * applies SSL/TLS, proxy, and User-Agent policy from the Actions config). If no factory is
 * available, falls back to the built-in Fetch API so the type remains usable in unit tests and
 * contexts where the factory has not been wired yet.
 *
 * `isUserError` classifies 401 and 403 HTTP statuses (from `McpConnectionError.httpStatus`) as
 * user errors so that the executor can surface them as non-retryable USER errors rather than
 * FRAMEWORK errors.
 */
export const createMcpClientType = (deps: McpClientTypeDeps = {}): ClientTypeSpec<McpClient> => ({
  id: 'mcp',

  async build(ctx: BuildContext): Promise<McpClient> {
    const serverUrl = typeof ctx.config?.serverUrl === 'string' ? ctx.config.serverUrl : undefined;

    if (!serverUrl) {
      throw new McpConnectionError('config.serverUrl is required', { httpStatus: undefined });
    }

    ctx.network.ensureUriAllowed(serverUrl);

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

    let customFetch: ((url: string | URL, init?: RequestInit) => Promise<Response>) | undefined;
    let resource: ConfiguredFetchResource | undefined;

    if (deps.configuredFetchFactory) {
      resource = deps.configuredFetchFactory({
        targetUrl: serverUrl,
        ...(hasHeaders ? { headers } : {}),
      });
      customFetch = createMcpFetch(resource);
    }

    const client = new McpClient(
      ctx.logger,
      {
        name: `kibana-mcp-${serverUrl}`,
        version: DEFAULT_MCP_CLIENT_VERSION,
        url: serverUrl,
      },
      {
        ...(hasHeaders ? { headers: { ...headers } } : {}),
        ...(customFetch ? { fetch: customFetch } : {}),
      }
    );

    if (resource) {
      fetchResources.set(client, resource);
    }

    await client.connect(deps.requestTimeout ? { timeout: deps.requestTimeout } : undefined);

    return client;
  },

  async terminate(client: McpClient): Promise<void> {
    try {
      await client.terminateSession();
    } catch {
      // best-effort
    }
    await client.disconnect();

    // Release the configured-fetch resource (undici dispatcher) tied to this client, if any.
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
    if (err instanceof McpConnectionError) {
      return (
        typeof err.httpStatus === 'number' && (err.httpStatus === 401 || err.httpStatus === 403)
      );
    }
    return false;
  },
});
