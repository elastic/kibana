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
import {
  ScrapeInputSchema,
  SearchInputSchema,
  MapInputSchema,
  CrawlInputSchema,
  CrawlAndWaitInputSchema,
  GetCrawlStatusInputSchema,
} from './types';
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
      defaultMessage: 'Scrape, search, map, and crawl the web via the Firecrawl API',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['bearer'],
  },

  schema: z.object({}),

  actions: {
    scrape: {
      isTool: true,
      description:
        'Scrape a single URL and extract content (for example, markdown). Markdown is truncated to maxMarkdownLength (default 100000 chars) to avoid context overflow; only set a lower value if a previous scrape returned truncated output and you need to fit within a smaller context.',
      input: ScrapeInputSchema,
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
      description:
        'Search the web and get full page content from results. Use when you need to find information across the web by keyword or natural-language query.',
      input: SearchInputSchema,
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
      description:
        'Map a website to discover all indexed URLs. Use when you need to list or explore URLs on a site before deciding which pages to scrape or crawl.',
      input: MapInputSchema,
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
      description:
        'Start an asynchronous crawl of a website; returns a job ID immediately without waiting for results. Use getCrawlStatus with that ID to check progress and retrieve results. Prefer this over crawlAndWait when the site may be large or the crawl duration is unpredictable.',
      input: CrawlInputSchema,
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
      description:
        'Synchronously crawl a website and block until the crawl is complete or fails; returns final status and results (url, title, and a markdown snippet per page, up to 30 pages). Use for small or well-known sites where the crawl is expected to finish quickly. For large or unpredictably sized sites, use crawl (async) and getCrawlStatus instead.',
      input: CrawlAndWaitInputSchema,
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
      description:
        'Get the current status and results of an existing crawl job. Pass the job ID returned by a previous crawl call. Returns a slimmed result set (url, title, markdownSnippet per page). Poll this until status is "completed" or "failed".',
      input: GetCrawlStatusInputSchema,
      handler: async (ctx, input) => {
        const response = await ctx.client.get(`${FIRECRAWL_API_BASE}/v2/crawl/${input.id}`);
        const data = response.data as Parameters<typeof slimCrawlResult>[0];
        return slimCrawlResult(data);
      },
    },
  },

  skill: [
    'Common pattern: **map** a site to find relevant URLs, then **scrape** the specific ones you need.',
    'Choose **crawlAndWait** for small or well-known sites; choose **crawl** + **getCrawlStatus** for large or unknown sites where duration is unpredictable.',
  ].join('\n'),

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
