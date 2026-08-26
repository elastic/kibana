/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

const MAX_MARKDOWN_LENGTH_DESCRIBE =
  'Maximum characters of markdown to return. Default 100000; max 500000 to avoid context overflow. Only set a lower value if you already got truncated output and need to fit within a smaller context.';

export const ScrapeInputSchema = lazySchema(() =>
  z.object({
    url: z
      .string()
      .url()
      .describe('The URL of the webpage to scrape. e.g. https://example.com/page'),
    onlyMainContent: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'If true (default), extract only the main content of the page, stripping navigation and boilerplate. Set to false to include more of the page.'
      ),
    waitFor: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe(
        'Milliseconds to wait before scraping, to allow JavaScript-rendered content to load. e.g. 2000 to wait 2 seconds. Default 0.'
      ),
    maxMarkdownLength: z
      .number()
      .int()
      .min(1000)
      .max(500_000)
      .optional()
      .default(100_000)
      .describe(MAX_MARKDOWN_LENGTH_DESCRIBE),
  })
);
export type ScrapeInput = z.infer<typeof ScrapeInputSchema>;

export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .describe('Search query string. e.g. "elasticsearch query DSL tutorial"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(5)
      .describe('Maximum number of search results to return (1–100). Default 5.'),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const MapInputSchema = lazySchema(() =>
  z.object({
    url: z.string().url().describe('Base URL of the website to map. e.g. https://example.com'),
    search: z
      .string()
      .optional()
      .describe(
        'Optional keyword to filter discovered URLs. Only URLs matching this term will be returned. e.g. "blog" to find blog pages.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100_000)
      .optional()
      .default(5000)
      .describe('Maximum number of URLs to return (1–100000). Default 5000.'),
    includeSubdomains: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'If true (default), include URLs from subdomains of the base URL. e.g. docs.example.com when mapping example.com.'
      ),
  })
);
export type MapInput = z.infer<typeof MapInputSchema>;

export const CrawlInputSchema = lazySchema(() =>
  z.object({
    url: z.string().url().describe('Base URL to start crawling from. e.g. https://example.com'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe(
        'Maximum number of pages to crawl (1–100). Default 20. Keep this low (e.g. 5–20) to avoid context overflow.'
      ),
    maxDiscoveryDepth: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Maximum link depth to follow from the starting URL. 0 = only the start page, 1 = start page and directly linked pages, etc. Omit to use the Firecrawl default.'
      ),
    allowExternalLinks: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'If true, follow links to other domains during the crawl. Default false (only crawl the starting domain).'
      ),
  })
);
export type CrawlInput = z.infer<typeof CrawlInputSchema>;

export const CrawlAndWaitInputSchema = lazySchema(() =>
  z.object({
    url: z.string().url().describe('Base URL to start crawling from. e.g. https://example.com'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe(
        'Maximum number of pages to crawl (1–100). Default 20. Keep this low (e.g. 5–20) to avoid context overflow.'
      ),
    maxDiscoveryDepth: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Maximum link depth to follow from the starting URL. 0 = only the start page, 1 = start page and directly linked pages, etc. Omit to use the Firecrawl default.'
      ),
    allowExternalLinks: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'If true, follow links to other domains during the crawl. Default false (only crawl the starting domain).'
      ),
    pollIntervalMs: z
      .number()
      .int()
      .min(1000)
      .max(60_000)
      .optional()
      .default(3000)
      .describe(
        'How often to poll the crawl job for completion, in milliseconds (1000–60000). Default 3000 (3 seconds).'
      ),
    maxWaitMs: z
      .number()
      .int()
      .min(5000)
      .max(3_600_000)
      .optional()
      .default(1_800_000)
      .describe(
        'Maximum time to wait for the crawl to finish, in milliseconds (5000–3600000). Default 1800000 (30 minutes). If the crawl is still running after this duration, an error is thrown.'
      ),
  })
);
export type CrawlAndWaitInput = z.infer<typeof CrawlAndWaitInputSchema>;

export const GetCrawlStatusInputSchema = lazySchema(() =>
  z.object({
    id: z.string().uuid().describe('Crawl job ID (UUID) from the crawl action'),
  })
);
export type GetCrawlStatusInput = z.infer<typeof GetCrawlStatusInputSchema>;
