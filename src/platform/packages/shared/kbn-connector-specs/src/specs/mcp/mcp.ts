/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
  SUB_ACTION,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TestConnectorRequestSchema,
} from '@kbn/connector-schemas/mcp';
import type { ListToolsResponse } from '@kbn/mcp-client';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { buildHeadersFromSecrets, buildMcpAuthHeaders } from './auth_headers';
import { classifyMcpError, logMcpError } from './errors';
import { buildListToolsCacheKey, listToolsCache } from './list_tools_cache';
import type {
  CallToolParams,
  ListToolsParams,
  MCPConnectorConfig,
  MCPConnectorSecrets,
  McpTestConnectorResponse,
} from './types';

const asConfig = (ctx: ActionContext): MCPConnectorConfig => ctx.config as MCPConnectorConfig;

const asSecrets = (ctx: ActionContext): MCPConnectorSecrets =>
  (ctx.secrets ?? {}) as MCPConnectorSecrets;

const testHandler = async (ctx: ActionContext): Promise<McpTestConnectorResponse> => {
  try {
    const client = await ctx.getClient('mcp');
    await client.listTools();
    return { connected: true, capabilities: client.getServerCapabilities() };
  } catch (err) {
    logMcpError(ctx.log, err, { operation: 'test' });
    throw err;
  }
};

const listToolsHandler = async (
  ctx: ActionContext,
  params: ListToolsParams = {}
): Promise<ListToolsResponse> => {
  const config = asConfig(ctx);
  const authHeaders = buildHeadersFromSecrets(asSecrets(ctx), config);
  const cacheKey = buildListToolsCacheKey(
    ctx.connectorId ?? '',
    {
      serverUrl: config.serverUrl,
      headers: config.headers,
      hasAuth: config.hasAuth,
      authType: config.authType,
    },
    authHeaders
  );

  if (!params.forceRefresh) {
    const cachedResult = listToolsCache.get(cacheKey);
    if (cachedResult) {
      ctx.log.debug(
        `Returning cached listTools result for connector ${ctx.connectorId} (${cachedResult.tools.length} tools)`
      );
      return cachedResult;
    }
  }

  ctx.connectorUsageCollector?.addRequestBodyBytes(undefined, params);

  try {
    const client = await ctx.getClient('mcp');
    const result = await client.listTools();
    ctx.log.debug(`Listed ${result.tools.length} tools from MCP server`);
    listToolsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logMcpError(ctx.log, err, { operation: 'listTools' });
    throw err;
  }
};

const callToolHandler = async (ctx: ActionContext, params: CallToolParams) => {
  ctx.connectorUsageCollector?.addRequestBodyBytes(undefined, params);

  try {
    const client = await ctx.getClient('mcp');
    const result = await client.callTool({ name: params.name, arguments: params.arguments });
    ctx.log.debug(`Successfully called tool: ${params.name}`);
    return result;
  } catch (err) {
    logMcpError(ctx.log, err, {
      operation: `callTool(${params.name})`,
      redactToolError: true,
    });
    throw err;
  }
};

export const mcpConnectorSpec: ConnectorSpec = {
  metadata: {
    id: CONNECTOR_ID,
    displayName: CONNECTOR_NAME,
    description: i18n.translate('connectorSpecs.mcp.metadata.description', {
      defaultMessage: 'Connect to an MCP (Model Context Protocol) server.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: [
      'generativeAIForSecurity',
      'generativeAIForObservability',
      'workflows',
      'agentBuilder',
    ],
  },
  stackCompat: {
    configSchema: MCPConnectorConfigSchema,
    secretsSchema: MCPConnectorSecretsSchema,
    allowedHostsKeys: ['serverUrl'],
    isolatedClientSubActions: ['test', '_test'],
    formatIsolatedTerminateFailure: (err) =>
      `MCP test client terminate failed: ${err instanceof Error ? err.message : String(err)}`,
    getAuthHeaders: buildMcpAuthHeaders,
    classifyError: classifyMcpError,
  },
  actions: {
    [SUB_ACTION.INITIALIZE]: {
      scope: 'read',
      input: TestConnectorRequestSchema,
      handler: testHandler,
    },
    [SUB_ACTION.LIST_TOOLS]: {
      scope: 'read',
      input: ListToolsRequestSchema,
      handler: listToolsHandler,
    },
    [SUB_ACTION.CALL_TOOL]: {
      scope: 'write',
      input: CallToolRequestSchema,
      handler: callToolHandler,
    },
  },
  test: {
    enabled: false,
    handler: testHandler as unknown as ConnectorSpec['test']['handler'],
  },
};
