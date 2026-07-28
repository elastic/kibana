/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * MCP (v2) — generic Model Context Protocol connector.
 *
 * Unlike the curated MCP specs (github, tavily) which hardwire a server URL and named actions,
 * this connector points at any user-supplied MCP server and exposes the generic listTools/callTool
 * operations. It acquires its MCP client via `ctx.getClient('mcp')`, so the connection is built
 * once per connector instance and reused across executions (pooled by the actions plugin), rather
 * than the connect-per-call pattern of the legacy `.mcp` connector and the `withMcpClient` helper.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import type { CallToolInput } from './types';
import { ListToolsInputSchema, CallToolInputSchema } from './types';

export const McpV2Connector: ConnectorSpec = {
  metadata: {
    id: '.mcp_v2',
    displayName: 'MCP (v2)',
    description: i18n.translate('core.kibanaConnectorSpecs.mcpV2.metadata.description', {
      defaultMessage:
        'Connect to any Model Context Protocol (MCP) server and call its tools over a pooled, reused connection.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['none', 'bearer', 'api_key_header', 'basic'],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .describe('MCP server URL')
        .meta({
          widget: 'text',
          placeholder: 'https://my-mcp-server.example.com/mcp',
          label: i18n.translate('connectorSpecs.mcpV2.config.serverUrl.label', {
            defaultMessage: 'MCP Server URL',
          }),
          helpText: i18n.translate('connectorSpecs.mcpV2.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the MCP server to connect to.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    listTools: {
      isTool: true,
      description:
        'List all tools available on the configured MCP server. Use this to discover available capabilities before calling a tool.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        const mcp = await ctx.getClient('mcp');
        const { tools } = await mcp.listTools();
        return tools;
      },
    },

    callTool: {
      isTool: true,
      description:
        'Call a tool on the configured MCP server by name. Use listTools first to discover tool names and their argument schemas.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        const mcp = await ctx.getClient('mcp');
        const result = await mcp.callTool({ name: input.name, arguments: input.arguments });
        return result.content;
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.mcpV2.test.description', {
      defaultMessage: 'Verifies the connection to the MCP server by listing its available tools.',
    }),
    handler: async (ctx) => {
      const mcp = await ctx.getClient('mcp');
      const { tools } = await mcp.listTools();
      return { ok: true, message: `Connected to MCP server. ${tools.length} tools available.` };
    },
  },

  skill: [
    'MCP (v2) — generic Model Context Protocol connector.',
    '',
    '1. listTools — discover the tools the configured server exposes.',
    '2. callTool — invoke a tool by name with its arguments (see the tool schema from listTools).',
  ].join('\n'),
};
