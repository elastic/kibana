/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import { McpClient } from '@kbn/mcp-client';
import type { FetchLike } from '@kbn/mcp-client';
import type { ClientTypeSpec } from './client_type_spec';

const MCP_CLIENT_VERSION = '1.0.0';

const extractStaticHeaders = (axiosInstance: AxiosInstance): Record<string, string> => {
  const common = axiosInstance.defaults?.headers?.common;
  if (!common || typeof common !== 'object') {
    return {};
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(common)) {
    if (typeof value === 'string') {
      headers[key] = value;
    }
  }
  return headers;
};

export const mcpClientType: ClientTypeSpec<McpClient> = {
  id: 'mcp',

  async build(ctx) {
    const serverUrl = typeof ctx.config?.serverUrl === 'string' ? ctx.config.serverUrl : undefined;
    if (!serverUrl) {
      throw new Error('config.serverUrl is required');
    }

    ctx.network.ensureUriAllowed(serverUrl);

    const headers = extractStaticHeaders(ctx.axiosInstance);

    const guardedFetch: FetchLike = async (url, init) => {
      ctx.network.ensureUriAllowed(typeof url === 'string' ? url : url.toString());
      return fetch(url, init);
    };

    const client = new McpClient(
      ctx.logger,
      { name: `kibana-mcp-${serverUrl}`, version: MCP_CLIENT_VERSION, url: serverUrl },
      { headers, fetch: guardedFetch }
    );
    await client.connect();
    return client;
  },

  async terminate(client) {
    await client.terminate();
  },
};
