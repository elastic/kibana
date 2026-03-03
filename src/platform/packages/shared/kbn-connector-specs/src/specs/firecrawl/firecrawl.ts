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

/** Max characters of markdown to include per page in crawlAndWait output. */
const MARKDOWN_SNIPPET_LENGTH = 500;
/** Max number of page entries to return in crawlAndWait output (keeps payload agent-safe). */
const MAX_PAGES_IN_OUTPUT = 30;

interface CrawlPageRaw {
  metadata?: {
    sourceURL?: string;
    url?: string;
    canonical?: string;
    title?: string;
    ogTitle?: string;
  };
  markdown?: string;
}

interface CrawlPageSlim {
  url: string;
  title: string;
  markdownSnippet: string;
}

/**
 * Slims raw Firecrawl crawl status response for agent use: url, title, markdownSnippet per page;
 * caps number of pages and snippet length to avoid oversized responses.
 */
function slimCrawlResult(raw: {
  status?: string;
  total?: number;
  data?: CrawlPageRaw[] | null;
  error?: string;
}): { status: string; total: number; data: CrawlPageSlim[]; error?: string } {
  const status = raw.status ?? 'unknown';
  const total = typeof raw.total === 'number' ? raw.total : 0;
  const items = Array.isArray(raw.data) ? raw.data : [];
  const slim: CrawlPageSlim[] = items.slice(0, MAX_PAGES_IN_OUTPUT).map((page) => {
    const meta = page.metadata ?? {};
    const url = meta.sourceURL ?? meta.url ?? meta.canonical ?? '';
    const title = meta.title ?? meta.ogTitle ?? '';
    const fullMarkdown = typeof page.markdown === 'string' ? page.markdown : '';
    const markdownSnippet =
      fullMarkdown.length <= MARKDOWN_SNIPPET_LENGTH
        ? fullMarkdown
        : fullMarkdown.slice(0, MARKDOWN_SNIPPET_LENGTH) + '...';
    return { url, title, markdownSnippet };
  });
  const result: { status: string; total: number; data: CrawlPageSlim[]; error?: string } = {
    status,
    total,
    data: slim,
  };
  if (raw.error !== undefined) {
    result.error = raw.error;
  }
  return result;
}

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
          defaultMessage:
            'Scrape a single URL and extract content (for example, markdown). Markdown is truncated to maxMarkdownLength (default 100000 chars) to avoid context overflow; only set a lower value if a previous scrape returned truncated output and you need to fit within a smaller context.',
        }
      ),
      input: z.object({
        url: z.string().url().describe('The URL to scrape'),
        onlyMainContent: z.boolean().optional().default(true),
        waitFor: z.number().int().min(0).optional().default(0),
        maxMarkdownLength: z
          .number()
          .int()
          .min(1000)
          .max(500_000)
          .optional()
          .default(100_000)
          .describe(
            'Maximum characters of markdown to return. Default 100000; max 500000 to avoid context overflow. Only set a lower value if you already got truncated output and need to fit within a smaller context.'
          ),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/scrape`, {
          url: input.url,
          onlyMainContent: input.onlyMainContent,
          waitFor: input.waitFor,
        });
        const data = response.data as {
          markdown?: string;
          data?: { markdown?: string };
          [key: string]: unknown;
        };
        const markdownContainer = data?.markdown !== undefined ? data : data?.data;
        const markdown =
          typeof markdownContainer?.markdown === 'string' ? markdownContainer.markdown : '';
        if (markdown.length > input.maxMarkdownLength) {
          const truncated =
            markdown.slice(0, input.maxMarkdownLength) +
            '\n\n[... content truncated for length ...]';
          if (markdownContainer) {
            markdownContainer.markdown = truncated;
          }
        }
        return data;
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
        limit: z.number().int().min(1).max(100).optional().default(20),
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

    crawlAndWait: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.firecrawl.actions.crawlAndWait.description',
        {
          defaultMessage:
            'Start a crawl of a website and poll until complete or failed; returns final status and results',
        }
      ),
      input: z.object({
        url: z.string().url().describe('Base URL to start crawling from'),
        limit: z.number().int().min(1).max(100).optional().default(20),
        maxDiscoveryDepth: z.number().int().min(0).optional(),
        allowExternalLinks: z.boolean().optional().default(false),
        pollIntervalMs: z.number().int().min(1000).max(60_000).optional().default(3000),
        maxWaitMs: z.number().int().min(5000).max(3_600_000).optional().default(1_800_000),
      }),
      handler: async (ctx, input) => {
        const startResponse = await ctx.client.post(`${FIRECRAWL_API_BASE}/v2/crawl`, {
          url: input.url,
          limit: input.limit,
          maxDiscoveryDepth: input.maxDiscoveryDepth,
          allowExternalLinks: input.allowExternalLinks,
        });
        const startData = startResponse.data as { id?: string; data?: { id?: string } };
        const jobId = startData?.id ?? startData?.data?.id;
        if (!jobId || typeof jobId !== 'string') {
          throw new Error('Crawl start response did not contain a job ID');
        }

        const deadline = Date.now() + input.maxWaitMs;

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        while (Date.now() < deadline) {
          const statusResponse = await ctx.client.get(`${FIRECRAWL_API_BASE}/v2/crawl/${jobId}`);
          const statusData = statusResponse.data as { status?: string };
          const status = statusData?.status?.toLowerCase();

          if (status === 'completed' || status === 'failed') {
            return slimCrawlResult(statusResponse.data as Parameters<typeof slimCrawlResult>[0]);
          }

          await sleep(input.pollIntervalMs);
        }

        throw new Error(
          `Crawl did not complete within ${input.maxWaitMs / 1000}s; last job ID: ${jobId}`
        );
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
