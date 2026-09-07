/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Exa MCP Connector (v2)
 *
 * An MCP-native v2 connector that connects to the Exa MCP server.
 *
 * Auth: x-api-key header (API key)
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  AgentRunInput,
  CallToolInput,
  FetchInput,
  SearchAdvancedInput,
  SearchInput,
} from './types';
import {
  AgentRunInputSchema,
  CallToolInputSchema,
  FetchInputSchema,
  ListToolsInputSchema,
  SearchAdvancedInputSchema,
  SearchInputSchema,
} from './types';

// The `tools=` query parameter controls which MCP tools the Exa server exposes.
// Only web_search_exa and web_fetch_exa are enabled by default; the other two
// must be requested explicitly via this parameter.
const EXA_MCP_SERVER_URL =
  'https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa,agent_run';

export const ExaConnector: ConnectorSpec = {
  metadata: {
    id: '.exa',
    displayName: 'Exa',
    description: i18n.translate('core.kibanaConnectorSpecs.exa.metadata.description', {
      defaultMessage: 'Search the web and read page content using Exa',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // Two-step release: a new connector type must reach every Production-NonCanary
    // node before it can declare user-facing features. 'workflows' and others are
    // added in a follow-up PR once this type is in every running version.
    supportedFeatureIds: ['agentBuilder'],
    docsUrl: 'https://www.elastic.co/docs/reference/kibana/connectors-kibana/exa-action-type',
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        isRecommended: true,
        defaults: { headerField: 'x-api-key' },
        overrides: {
          meta: {
            headerField: { hidden: true },
            'x-api-key': {
              label: i18n.translate('core.kibanaConnectorSpecs.exa.auth.apiKey.label', {
                defaultMessage: 'Exa API key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.exa.auth.apiKey.helpText', {
                defaultMessage:
                  'Your Exa API key. Obtain one from https://dashboard.exa.ai. The key is sent as the x-api-key header on every request.',
              }),
              placeholder: 'exa_...',
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(EXA_MCP_SERVER_URL)
        .describe('Exa MCP Server URL')
        .meta({
          widget: 'text',
          hidden: true,
          placeholder: EXA_MCP_SERVER_URL,
          label: i18n.translate('core.kibanaConnectorSpecs.exa.config.serverUrl.label', {
            defaultMessage: 'MCP Server URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.exa.config.serverUrl.helpText', {
            defaultMessage:
              'The URL of the Exa MCP server. The ?tools= query parameter controls which tools the server exposes.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    exaSearch: {
      isTool: true,
      scope: 'read',
      description:
        'Search the web for any topic using Exa. Returns the most relevant pages as text highlights with titles, URLs, and publication dates. Exa understands natural language — describe the page you are looking for rather than using keywords. Use exaFetch afterwards to read the full text of specific pages. Use exaSearchAdvanced when you need domain filters, date ranges, or category constraints.',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        return callToolJson(ctx, 'web_search_exa', {
          query: input.query,
          numResults: input.numResults,
        });
      },
    },

    exaFetch: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch the full text content of one or more web pages by URL using Exa. Returns clean markdown text, title, author, and publication date for each page. Use this when you already have specific URLs — for example from exaSearch results or from another tool — and need to read their contents. Batch multiple URLs in a single call (up to 25) rather than calling once per URL.',
      input: FetchInputSchema,
      handler: async (ctx, input: FetchInput) => {
        return callToolJson(ctx, 'web_fetch_exa', {
          urls: input.urls,
          maxCharacters: input.maxCharacters,
        });
      },
    },

    exaSearchAdvanced: {
      isTool: true,
      scope: 'read',
      description:
        'Advanced Exa web search with full control over filters. Use this instead of exaSearch when you need: domain allowlists or blocklists, published/crawl date bounds, page-category filters (news, github, pdf, company, people), text include/exclude filters, geo-targeting, summaries, highlights, or subpage crawling. Returns the same page data as exaSearch but with richer control over which pages are selected and what content is extracted.',
      input: SearchAdvancedInputSchema,
      handler: async (ctx, input: SearchAdvancedInput) => {
        return callToolJson(ctx, 'web_search_advanced_exa', {
          query: input.query,
          numResults: input.numResults,
          ...(input.type !== undefined && { type: input.type }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.includeDomains !== undefined && { includeDomains: input.includeDomains }),
          ...(input.excludeDomains !== undefined && { excludeDomains: input.excludeDomains }),
          ...(input.startPublishedDate !== undefined && {
            startPublishedDate: input.startPublishedDate,
          }),
          ...(input.endPublishedDate !== undefined && { endPublishedDate: input.endPublishedDate }),
          ...(input.startCrawlDate !== undefined && { startCrawlDate: input.startCrawlDate }),
          ...(input.endCrawlDate !== undefined && { endCrawlDate: input.endCrawlDate }),
          ...(input.includeText !== undefined && { includeText: input.includeText }),
          ...(input.excludeText !== undefined && { excludeText: input.excludeText }),
          ...(input.userLocation !== undefined && { userLocation: input.userLocation }),
          ...(input.moderation !== undefined && { moderation: input.moderation }),
          ...(input.textMaxCharacters !== undefined && {
            textMaxCharacters: input.textMaxCharacters,
          }),
          ...(input.enableSummary !== undefined && { enableSummary: input.enableSummary }),
          ...(input.summaryQuery !== undefined && { summaryQuery: input.summaryQuery }),
          ...(input.enableHighlights !== undefined && { enableHighlights: input.enableHighlights }),
          ...(input.highlightsQuery !== undefined && { highlightsQuery: input.highlightsQuery }),
          ...(input.highlightsMaxCharacters !== undefined && {
            highlightsMaxCharacters: input.highlightsMaxCharacters,
          }),
          ...(input.maxAgeHours !== undefined && { maxAgeHours: input.maxAgeHours }),
          ...(input.subpages !== undefined && { subpages: input.subpages }),
          ...(input.subpageTarget !== undefined && { subpageTarget: input.subpageTarget }),
        });
      },
    },

    exaAgentRun: {
      isTool: true,
      scope: 'write',
      description:
        'Run an Exa autonomous research agent to answer complex multi-step questions, build structured lists (e.g. company profiles with funding and headcount), or enrich a set of entities. The agent autonomously searches, follows up, and synthesises its findings into a single structured response. Warning: agent runs are long-running (seconds to minutes) and are much more likely to time out than a single search — prefer exaSearch + exaFetch for straightforward lookups, and only reach for this when the objective genuinely requires multi-step autonomous research.',
      input: AgentRunInputSchema,
      handler: async (ctx, input: AgentRunInput) => {
        return callToolJson(ctx, 'agent_run', {
          ...(input.query !== undefined && { query: input.query }),
          ...(input.runId !== undefined && { runId: input.runId }),
          ...(input.previousRunId !== undefined && { previousRunId: input.previousRunId }),
          ...(input.systemPrompt !== undefined && { systemPrompt: input.systemPrompt }),
          ...(input.effort !== undefined && { effort: input.effort }),
        });
      },
    },

    listTools: {
      isTool: true,
      scope: 'read',
      description:
        'List all tools currently available on the Exa MCP server. Use this to discover available tool names and their parameter schemas. The set of tools depends on the ?tools= parameter in the connector server URL.',
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
      scope: 'destroy',
      description:
        'Call any tool on the Exa MCP server directly by name. Use this as an escape hatch when a capability is not yet covered by the typed actions. Call listTools first to see what tool names are available.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.exa.test.description', {
      defaultMessage: 'Verifies connection to the Exa MCP server by listing available tools.',
    }),
    enabled: true,
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        await mcp.listTools();
        return {};
      });
    },
  },

  skill: [
    'Exa — cross-action guidance for web research.',
    '',
    'Typical pattern for researching a topic:',
    '  1. exaSearch — find the most relevant pages for a topic; each result carries title, URL, and highlights.',
    '  2. Pick the 1-3 most relevant URLs from the results.',
    '  3. exaFetch — batch those URLs in one call to read their full text.',
    '',
    'Use exaSearchAdvanced instead of exaSearch when you need:',
    '  - Domain restrictions: only results from elastic.co, arxiv.org, etc.',
    '  - Date bounds: news published in the last 30 days, papers after 2025.',
    '  - Category filters: "news" for breaking stories, "github" for repos, "pdf" for papers.',
    '  - Summaries or highlights when you want structured snippets rather than raw text.',
    '',
    'Use exaAgentRun only for objectives that genuinely need many autonomous web-research steps,',
    'e.g. "list all AI-ops vendors founded after 2022 with their funding rounds and headcount".',
    'For straightforward questions prefer exaSearch + exaFetch — they are faster and more predictable.',
    '',
    'Natural-language query tips:',
    '  - Describe the ideal page, not keywords: "engineering blog post about Rust memory model" beats "rust memory".',
    '  - Prefix a category token to narrow the corpus: "category:people John Doe software engineer".',
    '  - Include a company or product name to anchor results: "Elastic Kibana observability plugin changelog".',
  ].join('\n'),
};
