/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev';

export const FirecrawlConnector: ConnectorSpec = {
  metadata: {
    id: '.firecrawl',
    displayName: 'Firecrawl',
    description: i18n.translate('core.kibanaConnectorSpecs.firecrawl.metadata.description', {
      defaultMessage: 'Scrape, search, map, and crawl the web via the Firecrawl API.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer'],
  },

  schema: z.object({}),

  actions: {
    scrape: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.firecrawl.actions.scrape.description',
        {
          defaultMessage: 'Scrape a single URL and extract content (for example, markdown)',
        }
      ),
      input: z.object({
        url: z.string().url().describe('The URL to scrape'),
        onlyMainContent: z.boolean().optional().default(true),
        waitFor: z.number().int().min(0).optional().default(0),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/scrape`, {
          url: input.url,
          onlyMainContent: input.onlyMainContent,
          waitFor: input.waitFor,
        });
        return response.data;
      },
    },

    search: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.firecrawl.actions.search.description',
        {
          defaultMessage: 'Search the web and get full page content from results',
        }
      ),
      input: z.object({
        query: z.string().min(1).describe('Search query'),
        limit: z.number().int().min(1).max(100).optional().default(5),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/search`, {
          query: input.query,
          limit: input.limit,
        });
        return response.data;
      },
    },

    map: {
      isTool: true,
      description: i18n.translate('core.kibanaConnectorSpecs.firecrawl.actions.map.description', {
        defaultMessage: 'Map a website to discover indexed URLs',
      }),
      input: z.object({
        url: z.string().url().describe('Base URL to map'),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100_000).optional().default(5000),
        includeSubdomains: z.boolean().optional().default(true),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/map`, {
          url: input.url,
          search: input.search,
          limit: input.limit,
          includeSubdomains: input.includeSubdomains,
        });
        return response.data;
      },
    },

    crawl: {
      isTool: true,
      description: i18n.translate('core.kibanaConnectorSpecs.firecrawl.actions.crawl.description', {
        defaultMessage: 'Start an asynchronous crawl of a website; returns a job ID',
      }),
      input: z.object({
        url: z.string().url().describe('Base URL to start crawling from'),
        limit: z.number().int().min(1).optional().default(100),
        maxDiscoveryDepth: z.number().int().min(0).optional(),
        allowExternalLinks: z.boolean().optional().default(false),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/crawl`, {
          url: input.url,
          limit: input.limit,
          maxDiscoveryDepth: input.maxDiscoveryDepth,
          allowExternalLinks: input.allowExternalLinks,
        });
        return response.data;
      },
    },

    getCrawlStatus: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.firecrawl.actions.getCrawlStatus.description',
        { defaultMessage: 'Get the status and results of a crawl job' }
      ),
      input: z.object({
        id: z.string().uuid().describe('Crawl job ID (UUID) from the crawl action'),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.get(`${FIRECRAWL_API_BASE}/v2/crawl/${input.id}`);
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.description', {
      defaultMessage: 'Verifies Firecrawl API key',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Firecrawl test handler');
      try {
        await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/scrape`, {
          url: 'https://example.com',
        });
        return {
          ok: true,
          message: i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.successMessage', {
            defaultMessage: 'Successfully connected to Firecrawl API',
          }),
        };
      } catch (error) {
        const err = error as { message?: string; response?: { status?: number; data?: unknown } };
        const status = err.response?.status;
        const message =
          status === 401
            ? i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.unauthorizedMessage', {
                defaultMessage: 'Invalid or missing API key',
              })
            : err.message ?? 'Unknown error';
        return {
          ok: false,
          message: i18n.translate('core.kibanaConnectorSpecs.firecrawl.test.failureMessage', {
            defaultMessage: 'Failed to connect to Firecrawl API: {reason}',
            values: { reason: message },
          }),
        };
      }
    },
  },
};
