/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tavily MCP Connector (v2)
 *
 * An MCP-native v2 connector that connects to the Tavily MCP server.
 *
 * Auth: Bearer token (API key)
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type { CallToolInput, CrawlInput, ExtractInput, MapInput, SearchInput } from './types';
import searchWorkflow from './workflows/search.yaml';
import extractWorkflow from './workflows/extract.yaml';
import crawlWorkflow from './workflows/crawl.yaml';
import mapWorkflow from './workflows/map.yaml';
import {
  ListToolsInputSchema,
  SearchInputSchema,
  ExtractInputSchema,
  CrawlInputSchema,
  MapInputSchema,
  CallToolInputSchema,
} from './types';

const TAVILY_MCP_SERVER_URL = 'https://mcp.tavily.com/mcp/';

export const TavilyConnector: ConnectorSpec = {
  metadata: {
    id: '.tavily_mcp',
    displayName: 'Tavily',
    description: i18n.translate('core.kibanaConnectorSpecs.tavily.metadata.description', {
      defaultMessage: 'Search the web and extract content from pages using Tavily',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['bearer'],
  },

  schema: z.object({
    serverUrl: UISchemas.url()
      .default(TAVILY_MCP_SERVER_URL)
      .describe('Tavily MCP Server URL')
      .meta({
        widget: 'text',
        placeholder: 'https://mcp.tavily.com/mcp/',
        label: i18n.translate('connectorSpecs.tavily.config.serverUrl.label', {
          defaultMessage: 'MCP Server URL',
        }),
        helpText: i18n.translate('connectorSpecs.tavily.config.serverUrl.helpText', {
          defaultMessage: 'The URL of the Tavily MCP server.',
        }),
      }),
  }),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    tavilySearch: {
      isTool: true,
      description: i18n.translate('connectorSpecs.tavily.actions.tavilySearch.description', {
        defaultMessage: 'Search the web for current information on any topic using Tavily.',
      }),
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        return callToolJson(ctx, 'tavily_search', {
          query: input.query,
          max_results: input.max_results,
          search_depth: input.search_depth,
          include_raw_content: input.include_raw_content,
        });
      },
    },

    tavilyExtract: {
      isTool: true,
      description: i18n.translate('connectorSpecs.tavily.actions.tavilyExtract.description', {
        defaultMessage: 'Extract and retrieve content from one or more web page URLs using Tavily.',
      }),
      input: ExtractInputSchema,
      handler: async (ctx, input: ExtractInput) => {
        return callToolJson(ctx, 'tavily_extract', {
          urls: input.urls,
          extract_depth: input.extract_depth,
          include_images: input.include_images,
        });
      },
    },

    tavilyCrawl: {
      isTool: true,
      description: i18n.translate('connectorSpecs.tavily.actions.tavilyCrawl.description', {
        defaultMessage:
          'Crawl a website starting from a URL, extracting content from pages with configurable depth and breadth.',
      }),
      input: CrawlInputSchema,
      handler: async (ctx, input: CrawlInput) => {
        return callToolJson(ctx, 'tavily_crawl', {
          url: input.url,
          max_depth: input.max_depth,
          max_breadth: input.max_breadth,
          limit: input.limit,
          instructions: input.instructions,
          extract_depth: input.extract_depth,
        });
      },
    },

    tavilyMap: {
      isTool: true,
      description: i18n.translate('connectorSpecs.tavily.actions.tavilyMap.description', {
        defaultMessage:
          "Map a website's structure by returning a list of URLs found starting from a base URL.",
      }),
      input: MapInputSchema,
      handler: async (ctx, input: MapInput) => {
        return callToolJson(ctx, 'tavily_map', {
          url: input.url,
          max_depth: input.max_depth,
          max_breadth: input.max_breadth,
          limit: input.limit,
          instructions: input.instructions,
        });
      },
    },

    listTools: {
      isTool: true,
      description: i18n.translate('connectorSpecs.tavily.actions.listTools.description', {
        defaultMessage:
          'List all tools available on the Tavily MCP server. Use this to discover available capabilities.',
      }),
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      description: i18n.translate('connectorSpecs.tavily.actions.callTool.description', {
        defaultMessage:
          'Call any tool on the Tavily MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      }),
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.tavily.test.description', {
      defaultMessage: 'Verifies connection to the Tavily MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to Tavily MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  agentBuilderWorkflows: [searchWorkflow, extractWorkflow, crawlWorkflow, mapWorkflow],
};
