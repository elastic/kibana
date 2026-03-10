/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

const MAX_MARKDOWN_LENGTH_DESCRIBE =
  'Maximum characters of markdown to return. Default 100000; max 500000 to avoid context overflow. Only set a lower value if you already got truncated output and need to fit within a smaller context.';

export const ScrapeInputSchema = z.object({
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
    .describe(MAX_MARKDOWN_LENGTH_DESCRIBE),
});
export type ScrapeInput = z.infer<typeof ScrapeInputSchema>;

export const SearchInputSchema = z.object({
  query: z.string().min(1).describe('Search query'),
  limit: z.number().int().min(1).max(100).optional().default(5),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const MapInputSchema = z.object({
  url: z.string().url().describe('Base URL to map'),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100_000).optional().default(5000),
  includeSubdomains: z.boolean().optional().default(true),
});
export type MapInput = z.infer<typeof MapInputSchema>;

export const CrawlInputSchema = z.object({
  url: z.string().url().describe('Base URL to start crawling from'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  maxDiscoveryDepth: z.number().int().min(0).optional(),
  allowExternalLinks: z.boolean().optional().default(false),
});
export type CrawlInput = z.infer<typeof CrawlInputSchema>;

export const CrawlAndWaitInputSchema = z.object({
  url: z.string().url().describe('Base URL to start crawling from'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  maxDiscoveryDepth: z.number().int().min(0).optional(),
  allowExternalLinks: z.boolean().optional().default(false),
  pollIntervalMs: z.number().int().min(1000).max(60_000).optional().default(3000),
  maxWaitMs: z.number().int().min(5000).max(3_600_000).optional().default(1_800_000),
});
export type CrawlAndWaitInput = z.infer<typeof CrawlAndWaitInputSchema>;

export const GetCrawlStatusInputSchema = z.object({
  id: z.string().uuid().describe('Crawl job ID (UUID) from the crawl action'),
});
export type GetCrawlStatusInput = z.infer<typeof GetCrawlStatusInputSchema>;
