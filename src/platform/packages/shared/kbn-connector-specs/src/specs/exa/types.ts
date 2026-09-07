/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// Bounds shared across schemas. Exa itself caps numResults at 100 and
// includeDomains/excludeDomains at 1200 entries; the tighter caps here keep a
// single tool response inside a reasonable LLM context budget.
const MAX_QUERY_LENGTH = 2000;
const MAX_URLS = 25;
const MAX_URL_LENGTH = 2048;
const MAX_DOMAINS = 50;
const MAX_DOMAIN_LENGTH = 253;
const MAX_TEXT_FILTERS = 10;
const MAX_TEXT_FILTER_LENGTH = 1000;

const AGENT_RUN_ID_PATTERN = /^agent_run_[A-Za-z0-9_-]{1,128}$/;

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        'Natural-language description of the ideal page rather than bare keywords — Exa matches on meaning, so "blog post comparing React and Vue rendering performance" beats "react vs vue". Optionally prefix a category filter to narrow the corpus: "category:people" or "category:company", e.g. "category:company observability vendors in Berlin".'
      ),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe(
        'Number of search results to return, 1-100. Defaults to 10. Each result carries relevance highlights, so raising this materially increases response size — prefer 5-10 for focused questions.'
      ),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const FetchInputSchema = lazySchema(() =>
  z.object({
    urls: z
      .array(z.string().min(1).max(MAX_URL_LENGTH))
      .min(1)
      .max(MAX_URLS)
      .describe(
        'One or more page URLs to read, e.g. ["https://www.elastic.co/blog/some-post"]. Batch every URL you need into a single call rather than calling once per URL — up to 25 per call.'
      ),
    maxCharacters: z
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional()
      .default(3000)
      .describe(
        'Maximum characters of extracted text to return per page. Defaults to 3000, which covers most articles. Raise it only when you genuinely need the full body of a long document, since the cost is multiplied by the number of URLs.'
      ),
  })
);
export type FetchInput = z.infer<typeof FetchInputSchema>;

export const SearchAdvancedInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe('Search query — a question, a statement, or keywords.'),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe('Number of results to return, 1-100. Defaults to 10.'),
    type: z
      .enum(['auto', 'fast', 'instant'])
      .optional()
      .describe(
        'Search mode. "auto" (recommended, and the server default) gives the highest quality and is the only mode that honours every filter; "fast" trades some quality for speed; "instant" is the fastest and least thorough.'
      ),
    category: z
      .enum([
        'company',
        'publication',
        'news',
        'pdf',
        'github',
        'personal site',
        'people',
        'financial report',
      ])
      .optional()
      .describe(
        'Restrict results to one category of page. Use "news" for recent events, "github" for source repositories, "pdf" for papers and reports, "company"/"people" for entity lookups.'
      ),
    includeDomains: z
      .array(z.string().min(1).max(MAX_DOMAIN_LENGTH))
      .max(MAX_DOMAINS)
      .optional()
      .describe(
        'Return results only from these domains, e.g. ["elastic.co", "github.com"]. Bare domains, no scheme.'
      ),
    excludeDomains: z
      .array(z.string().min(1).max(MAX_DOMAIN_LENGTH))
      .max(MAX_DOMAINS)
      .optional()
      .describe('Drop results from these domains, e.g. ["reddit.com"]. Bare domains, no scheme.'),
    startPublishedDate: z
      .string()
      .max(64)
      .optional()
      .describe('Only pages published on or after this date. ISO 8601, e.g. "2026-01-01".'),
    endPublishedDate: z
      .string()
      .max(64)
      .optional()
      .describe('Only pages published on or before this date. ISO 8601, e.g. "2026-06-30".'),
    startCrawlDate: z
      .string()
      .max(64)
      .optional()
      .describe(
        'Only pages Exa crawled on or after this date. ISO 8601. Use this rather than the published-date filters when you care about when Exa last saw the page.'
      ),
    endCrawlDate: z
      .string()
      .max(64)
      .optional()
      .describe('Only pages Exa crawled on or before this date. ISO 8601.'),
    includeText: z
      .array(z.string().min(1).max(MAX_TEXT_FILTER_LENGTH))
      .max(MAX_TEXT_FILTERS)
      .optional()
      .describe('Keep only results whose text contains ALL of these strings.'),
    excludeText: z
      .array(z.string().min(1).max(MAX_TEXT_FILTER_LENGTH))
      .max(MAX_TEXT_FILTERS)
      .optional()
      .describe('Drop results whose text contains ANY of these strings.'),
    userLocation: z
      .string()
      .regex(/^[A-Za-z]{2}$/, 'Must be a two-letter ISO 3166-1 country code')
      .optional()
      .describe('Two-letter ISO country code for geo-targeted results, e.g. "US", "GB", "DE".'),
    moderation: z
      .boolean()
      .optional()
      .describe('When true, filters out unsafe or inappropriate content.'),
    textMaxCharacters: z
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional()
      .describe(
        'Maximum characters of page text to extract per result. Omit to let Exa return the full text it has.'
      ),
    enableSummary: z
      .boolean()
      .optional()
      .describe(
        'When true, Exa generates a short summary per result. Cheaper to read than full text when you only need the gist.'
      ),
    summaryQuery: z
      .string()
      .max(MAX_QUERY_LENGTH)
      .optional()
      .describe(
        'Focuses summary generation on a specific question, e.g. "what pricing tiers does this page mention?". Only has an effect when enableSummary is true.'
      ),
    enableHighlights: z
      .boolean()
      .optional()
      .describe('When true, Exa returns the passages of each page most relevant to the query.'),
    highlightsQuery: z
      .string()
      .max(MAX_QUERY_LENGTH)
      .optional()
      .describe(
        'Relevance query used to pick highlight passages, when it should differ from the main query. Only has an effect when enableHighlights is true.'
      ),
    highlightsMaxCharacters: z
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional()
      .describe(
        'Maximum total characters across all highlights for a single result. Only has an effect when enableHighlights is true.'
      ),
    maxAgeHours: z
      .number()
      .int()
      .min(0)
      .max(720)
      .optional()
      .describe(
        'Freshness bound on cached content, in hours, up to 720 (30 days). Use 0 to force a live fetch of every result. Omit to serve cached content with a live-fetch fallback, which is the fastest option.'
      ),
    subpages: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe(
        'Also crawl this many linked subpages per result, 1-10. Use when the landing page is an index and the substance lives one click deeper.'
      ),
    subpageTarget: z
      .array(z.string().min(1).max(200))
      .max(10)
      .optional()
      .describe(
        'Keywords steering which subpages get picked, e.g. ["pricing", "changelog"]. Only has an effect when subpages is set.'
      ),
  })
);
export type SearchAdvancedInput = z.infer<typeof SearchAdvancedInputSchema>;

export const AgentRunInputSchema = lazySchema(() =>
  z
    .object({
      query: z
        .string()
        .min(1)
        .max(MAX_QUERY_LENGTH)
        .optional()
        .describe(
          'Natural-language research or enrichment objective for a new run, e.g. "list observability vendors founded after 2020 with their funding rounds". Pass either query or runId, never both.'
        ),
      runId: z
        .string()
        .regex(AGENT_RUN_ID_PATTERN, 'Must be an Exa agent run id, e.g. "agent_run_abc123"')
        .optional()
        .describe(
          'An "agent_run_..." id returned by an earlier call that had not finished yet. Pass it to resume waiting on that run instead of starting a duplicate.'
        ),
      previousRunId: z
        .string()
        .regex(AGENT_RUN_ID_PATTERN, 'Must be an Exa agent run id, e.g. "agent_run_abc123"')
        .optional()
        .describe(
          'A completed "agent_run_..." id to feed in as prior context for a new run. Combine with query to ask a follow-up that builds on earlier findings.'
        ),
      systemPrompt: z
        .string()
        .max(10000)
        .optional()
        .describe('System-level guidance for the agent, e.g. output tone or sourcing rules.'),
      effort: z
        .enum(['minimal', 'low', 'medium', 'high', 'xhigh', 'auto'])
        .optional()
        .describe(
          'How much work the agent should do. Defaults to "low" server-side. Higher effort takes substantially longer and is much more likely to exceed the connector request timeout — stay at "minimal" or "low" unless the question genuinely needs deep research.'
        ),
    })
    .refine((input) => Boolean(input.query) !== Boolean(input.runId), {
      message: 'Provide exactly one of query (to start a run) or runId (to resume one)',
    })
);
export type AgentRunInput = z.infer<typeof AgentRunInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the MCP tool to call on the Exa MCP server. Run listTools first if you are unsure what is available. Example: "web_search_exa".'
      ),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe(
        'Arguments for the tool, as a key-value object. Which keys are required depends on the tool; listTools reports each tool\'s parameter schema. Example: { "query": "elastic observability", "numResults": 5 }.'
      ),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
