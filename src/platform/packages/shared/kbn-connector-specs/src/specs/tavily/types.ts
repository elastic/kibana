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

export const ListToolsInputSchema = z.object({});
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const SearchInputSchema = z.object({
  query: z.string().min(1).describe('The search query to execute'),
  max_results: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of search results to return'),
  search_depth: z
    .enum(['basic', 'advanced', 'fast', 'ultra-fast'])
    .optional()
    .default('basic')
    .describe(
      'Search depth: basic for generic results, advanced for thorough search, fast/ultra-fast for low latency'
    ),
  include_raw_content: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Include the cleaned and parsed HTML content of each search result. Significantly increases response size.'
    ),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const ExtractInputSchema = z.object({
  urls: z.array(z.string()).min(1).describe('List of URLs to extract content from'),
  extract_depth: z
    .enum(['basic', 'advanced'])
    .optional()
    .default('basic')
    .describe(
      'Depth of extraction. Use advanced for LinkedIn, protected sites, or tables/embedded content.'
    ),
  include_images: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include images extracted from the pages'),
});
export type ExtractInput = z.infer<typeof ExtractInputSchema>;

export const CrawlInputSchema = z.object({
  url: z.string().min(1).describe('The root URL to begin the crawl'),
  max_depth: z
    .number()
    .optional()
    .default(1)
    .describe('Max depth of the crawl. Defines how far from the base URL the crawler can explore.'),
  max_breadth: z
    .number()
    .optional()
    .default(20)
    .describe('Max number of links to follow per level of the tree (i.e., per page)'),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Total number of links the crawler will process before stopping'),
  instructions: z
    .string()
    .optional()
    .describe(
      'Natural language instructions for the crawler specifying which types of pages to return'
    ),
  extract_depth: z
    .enum(['basic', 'advanced'])
    .optional()
    .default('basic')
    .describe(
      'Depth of extraction. Advanced retrieves more data including tables and embedded content.'
    ),
});
export type CrawlInput = z.infer<typeof CrawlInputSchema>;

export const MapInputSchema = z.object({
  url: z.string().min(1).describe('The root URL to begin the mapping'),
  max_depth: z
    .number()
    .optional()
    .default(1)
    .describe(
      'Max depth of the mapping. Defines how far from the base URL the crawler can explore.'
    ),
  max_breadth: z
    .number()
    .optional()
    .default(20)
    .describe('Max number of links to follow per level of the tree (i.e., per page)'),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Total number of links the crawler will process before stopping'),
  instructions: z.string().optional().describe('Natural language instructions for the crawler'),
});
export type MapInput = z.infer<typeof MapInputSchema>;

export const CallToolInputSchema = z.object({
  name: z.string().min(1).describe('Name of the MCP tool to call'),
  arguments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Arguments to pass to the tool (tool-specific)'),
});
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
