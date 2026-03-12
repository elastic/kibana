/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import { createMcpClientFromAxios } from './create_mcp_client_from_axios';

/** MCP connector type id (same as @kbn/connector-schemas/mcp CONNECTOR_ID) */
const MCP_CONNECTOR_ID = '.mcp';
/** MCP client version string */
const MCP_CLIENT_VERSION = '1.0.0';

/** Feature IDs supported by the MCP connector (values match @kbn/actions-plugin/common) */
const MCP_SUPPORTED_FEATURE_IDS = [
  'generativeAIForSecurity',
  'generativeAIForSearchPlayground',
  'generativeAIForObservability',
  'workflows',
] as const;

/**
 * MCP v2 connector spec. Uses the framework's axios (ctx.client) for auth/SSL/proxy
 * and builds an McpClient from it via createMcpClientFromAxios. Lives in connector-specs
 * with all other spec'd connectors.
 */
export const mcpConnectorSpec: ConnectorSpec = {
  metadata: {
    id: MCP_CONNECTOR_ID,
    displayName: i18n.translate('connectors.mcp.title', { defaultMessage: 'MCP' }),
    description: i18n.translate('connectors.mcp.description', {
      defaultMessage: 'Connect to Model Context Protocol (MCP) servers to list and call tools',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: [...MCP_SUPPORTED_FEATURE_IDS],
  },

  auth: {
    types: ['none', 'bearer', 'basic', 'api_key_header'],
  },

  schema: z.object({
    serverUrl: z.string().url().describe('MCP server URL'),
    headers: z.record(z.string(), z.string()).optional().describe('Optional HTTP headers'),
  }),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    listTools: {
      isTool: true,
      description: i18n.translate('connectors.mcp.actions.listTools.description', {
        defaultMessage: 'List tools available on the MCP server',
      }),
      input: z.object({
        forceRefresh: z.boolean().optional().describe('Bypass cache and refresh the tools list'),
      }),
      handler: async (ctx, input) => {
        const serverUrl = (ctx.config?.serverUrl as string) ?? '';
        if (!serverUrl) {
          throw new Error('MCP connector config.serverUrl is required');
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
          const result = await mcpClient.listTools();
          return result;
        } finally {
          await mcpClient.disconnect();
        }
      },
    },

    callTool: {
      isTool: true,
      description: i18n.translate('connectors.mcp.actions.callTool.description', {
        defaultMessage: 'Call a tool on the MCP server',
      }),
      input: z.object({
        name: z.string().describe('Tool name'),
        arguments: z.record(z.string(), z.unknown()).optional().describe('Tool arguments'),
      }),
      handler: async (ctx, input) => {
        const serverUrl = (ctx.config?.serverUrl as string) ?? '';
        if (!serverUrl) {
          throw new Error('MCP connector config.serverUrl is required');
        }
        const typedInput = input as { name: string; arguments?: Record<string, unknown> };
        const mcpClient = createMcpClientFromAxios({
          logger: ctx.log,
          axiosInstance: ctx.client,
          url: serverUrl,
          name: `kibana-mcp-${serverUrl}`,
          version: MCP_CLIENT_VERSION,
        });
        try {
          await mcpClient.connect();
          const result = await mcpClient.callTool({
            name: typedInput.name,
            arguments: typedInput.arguments,
          });
          return result;
        } finally {
          await mcpClient.disconnect();
        }
      },
    },
  },

  test: {
    description: i18n.translate('connectors.mcp.test.description', {
      defaultMessage: 'Verify connection to the MCP server',
    }),
    handler: async (ctx) => {
      const serverUrl = (ctx.config?.serverUrl as string) ?? '';
      if (!serverUrl) {
        return { ok: false, message: 'MCP connector config.serverUrl is required' };
      }
      const mcpClient = createMcpClientFromAxios({
        logger: ctx.log,
        axiosInstance: ctx.client,
        url: serverUrl,
        name: `kibana-mcp-test-${serverUrl}`,
        version: MCP_CLIENT_VERSION,
      });
      try {
        const { connected } = await mcpClient.connect();
        if (connected) {
          return {
            ok: true,
            message: i18n.translate('connectors.mcp.test.success', {
              defaultMessage: 'Successfully connected to MCP server',
            }),
          };
        }
        return { ok: false, message: 'Connection did not succeed' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.log.error(`MCP connector test failed: ${message}`);
        return { ok: false, message };
      } finally {
        await mcpClient.disconnect();
      }
    },
  },
};
