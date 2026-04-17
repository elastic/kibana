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
  query: z
    .string()
    .min(1)
    .describe(
      'The search query to execute. Example: "latest AI research 2025" or "how to configure Elasticsearch index mappings".'
    ),
  max_results: z
    .number()
    .optional()
    .default(10)
    .describe(
      'Maximum number of search results to return. Defaults to 10. Increase for broader coverage; decrease for faster, more focused results.'
    ),
  search_depth: z
    .enum(['basic', 'advanced', 'fast', 'ultra-fast'])
    .optional()
    .default('basic')
    .describe(
      'Search depth controls thoroughness vs. latency. Use "basic" (default) for general queries, "advanced" for in-depth research requiring comprehensive results, "fast" or "ultra-fast" when low latency is critical and some result quality can be sacrificed.'
    ),
  include_raw_content: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, includes the full cleaned and parsed HTML content of each search result page. Significantly increases response size — only use when you need the full page text rather than the snippet summary.'
    ),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const ExtractInputSchema = z.object({
  urls: z
    .array(z.string())
    .min(1)
    .describe(
      'List of one or more URLs to extract content from. Example: ["https://example.com/article", "https://docs.elastic.co/guide"]. At least one URL is required.'
    ),
  extract_depth: z
    .enum(['basic', 'advanced'])
    .optional()
    .default('basic')
    .describe(
      'Depth of extraction. "basic" (default) works for most public web pages. Use "advanced" for LinkedIn profiles, paywalled or protected sites, pages with tables, or pages with embedded/dynamic content that basic extraction misses.'
    ),
  include_images: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, includes image URLs extracted from the pages. Defaults to false. Enable when visual content such as diagrams or screenshots is relevant to the task.'
    ),
});
export type ExtractInput = z.infer<typeof ExtractInputSchema>;

export const CrawlInputSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe(
      'The root URL to begin the crawl. The crawler will start here and follow links outward. Example: "https://docs.elastic.co/kibana".'
    ),
  max_depth: z
    .number()
    .optional()
    .default(1)
    .describe(
      'Maximum depth of the crawl tree from the root URL. Depth 1 means only pages directly linked from the root; depth 2 includes pages linked from those; and so on. Defaults to 1. Higher values increase coverage but also time and cost.'
    ),
  max_breadth: z
    .number()
    .optional()
    .default(20)
    .describe(
      'Maximum number of links to follow per page (per level of the tree). Defaults to 20. Lower values narrow the crawl to the most prominent links on each page.'
    ),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe(
      'Total number of pages the crawler will process before stopping, regardless of depth or breadth settings. Defaults to 50. Prefer low limits (5-20 pages) to avoid overwhelming the context window. Acts as a hard cap to control cost and response size.'
    ),
  instructions: z
    .string()
    .optional()
    .describe(
      'Optional natural language instructions guiding which types of pages to include or exclude. Example: "Only return pages about API reference documentation" or "Skip blog posts and focus on product pages."'
    ),
  extract_depth: z
    .enum(['basic', 'advanced'])
    .optional()
    .default('basic')
    .describe(
      'Depth of content extraction per crawled page. "basic" (default) works for most pages. Use "advanced" to retrieve richer data including tables and embedded content.'
    ),
});
export type CrawlInput = z.infer<typeof CrawlInputSchema>;

export const MapInputSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe(
      'The root URL to begin the site mapping. The mapper will discover links starting here. Example: "https://docs.elastic.co/kibana".'
    ),
  max_depth: z
    .number()
    .optional()
    .default(1)
    .describe(
      'Maximum depth of link traversal from the root URL. Depth 1 returns only URLs directly linked from the root page; depth 2 adds URLs linked from those; and so on. Defaults to 1.'
    ),
  max_breadth: z
    .number()
    .optional()
    .default(20)
    .describe(
      'Maximum number of links to follow per page (per level of the tree). Defaults to 20. Lower values focus on the most prominent links on each page.'
    ),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe(
      'Total number of URLs to discover before stopping. Defaults to 50. Acts as a hard cap regardless of depth or breadth settings.'
    ),
  instructions: z
    .string()
    .optional()
    .describe(
      'Optional natural language instructions guiding which types of URLs to include or exclude during mapping. Example: "Only include URLs under the /api/ path" or "Skip any URLs containing /blog/".'
    ),
});
export type MapInput = z.infer<typeof MapInputSchema>;

export const CallToolInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      'Name of the MCP tool to call on the Tavily MCP server. Use the listTools action first to discover available tool names if you are unsure. Example: "tavily_search".'
    ),
  arguments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Arguments to pass to the tool as a key-value object. The required and optional keys depend on the specific tool being called. Use listTools to see each tool\'s parameter schema. Example: { "query": "AI news", "max_results": 5 }.'
    ),
});
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
