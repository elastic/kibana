/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { McpClient } from '@kbn/mcp-client';
import { createMcpClientFromAxios } from '../mcp/create_mcp_client_from_axios';
import type { ClientTypeSpec } from './client_type_spec';

const MCP_CLIENT_VERSION = '1.0.0';

export const mcpClientType: ClientTypeSpec<McpClient> = {
  id: 'mcp',

  // Runs at lease time (first getClient('mcp') for this connector), not at spec load.
  // Same per-action axios + config as before; connect moved out of withMcpClient's finally.
  async build(ctx) {
    const serverUrl =
      typeof ctx.config?.serverUrl === 'string' ? ctx.config.serverUrl : undefined;
    if (!serverUrl) {
      throw new Error('config.serverUrl is required');
    }
    const client = createMcpClientFromAxios({
      logger: ctx.logger,
      axiosInstance: ctx.axiosInstance,
      url: serverUrl,
      name: `kibana-mcp-${serverUrl}`,
      version: MCP_CLIENT_VERSION,
    });
    await client.connect();
    return client;
  },

  // Reserved for future pool eviction / connector-delete hooks; not called in this PoC.
  async terminate(client) {
    await client.disconnect();
  },
};
