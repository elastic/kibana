/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { createMcpClientFromAxios } from './create_mcp_client_from_axios';

const MCP_CLIENT_VERSION = '1.0.0';

/**
 * Lifecycle helper for MCP-native v2 connectors: creates an McpClient from
 * the connector's Axios instance, connects, runs the callback, and disconnects.
 * Every action call gets a fresh MCP session (connect-per-action pattern).
 */
export const withMcpClient = async <T>(
  ctx: ActionContext,
  fn: (mcp: ReturnType<typeof createMcpClientFromAxios>) => Promise<T>
): Promise<T> => {
  const serverUrl = typeof ctx.config?.serverUrl === 'string' ? ctx.config.serverUrl : '';
  if (!serverUrl) {
    throw new Error('config.serverUrl is required');
  }
  const mcpClient = createMcpClientFromAxios({
    logger: ctx.log,
    axiosInstance: ctx.client,
    url: serverUrl,
    name: `kibana-mcp-${serverUrl}`,
    version: MCP_CLIENT_VERSION,
  });
  try {
    await mcpClient.connect();
    return await fn(mcpClient);
  } catch (error) {
    ctx.log.error(
      `MCP operation failed for ${serverUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  } finally {
    await mcpClient.disconnect();
  }
};
