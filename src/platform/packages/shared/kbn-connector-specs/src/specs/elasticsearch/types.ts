/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// Default `http.max_initial_line_length` (4kb, `HttpTransportSettings`); the request line
// carries the path and query string.
const HTTP_MAX_INITIAL_LINE_LENGTH = 4096;
// The request line is `<METHOD> <request-target> HTTP/1.1`.
const REQUEST_LINE_OVERHEAD = 'POST  HTTP/1.1'.length;
// Default `index.max_result_window`, which bounds from + size.
// https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
const MAX_RESULT_WINDOW = 10_000;
// `EsqlParser.MAX_LENGTH`, in characters.
const ESQL_MAX_QUERY_LENGTH = 1_000_000;
// Elasticsearch documents no limit on the number of search targets, sort clauses, _source
// fields, aggregations, runtime mappings, or ES|QL params.
const MAX_SEARCH_TARGETS = 100;
const MAX_REQUEST_ITEMS = 1000;

const fitsRequestLine = (requestTarget: string): boolean =>
  requestTarget.length + REQUEST_LINE_OVERHEAD <= HTTP_MAX_INITIAL_LINE_LENGTH;

/** Builds the `_search` path for one or more search targets. */
export const toSearchPath = (index: string | readonly string[]): string => {
  const target = typeof index === 'string' ? index : index.join(',');
  return `/${encodeURIComponent(target)}/_search`;
};

/**
 * Approximates the percent-encoded request target the HTTP client sends for a path and its
 * query params. The path is appended to the base URL, so it is parsed the same way.
 */
export const toRequestTarget = (
  path: string,
  queryParams?: Record<string, string | number | boolean>
): string => {
  const { pathname, search } = new URL(`http://localhost${path}`);
  const query = new URLSearchParams(
    Object.entries(queryParams ?? {}).map(([key, value]) => [key, String(value)])
  ).toString();
  if (!query) return `${pathname}${search}`;
  return `${pathname}${search ? `${search}&` : '?'}${query}`;
};

// ============================================================================
// search
// ============================================================================

export const SearchInputSchema = lazySchema(() =>
  z
    .object({
      index: z
        .union([
          z.string().min(1).max(HTTP_MAX_INITIAL_LINE_LENGTH),
          z.array(z.string().min(1).max(512)).min(1).max(MAX_SEARCH_TARGETS),
        ])
        .refine((index) => fitsRequestLine(toSearchPath(index)), {
          message: `The URL-encoded search targets must fit the ${HTTP_MAX_INITIAL_LINE_LENGTH}-byte HTTP request line.`,
        })
        .describe(
          'Index name, comma-separated index names, or an array of index names. Wildcards and aliases are supported.'
        ),
      query: z
        .record(z.string().max(200), z.unknown())
        .refine((v) => Object.keys(v).length <= 30, { message: 'At most 30 top-level query keys.' })
        .default({ match_all: {} })
        .describe('Elasticsearch Query DSL object. Defaults to match_all.'),
      size: z
        .number()
        .int()
        .min(0)
        .max(MAX_RESULT_WINDOW)
        .default(10)
        .describe(
          `Maximum number of hits to return (0–${MAX_RESULT_WINDOW}; from + size must not exceed ${MAX_RESULT_WINDOW}). Keep this small (for example 10–50) to limit response size.`
        ),
      from: z
        .number()
        .int()
        .min(0)
        .max(MAX_RESULT_WINDOW)
        .default(0)
        .describe('Offset for pagination.'),
      sort: z
        .array(z.record(z.string().max(200), z.unknown()))
        .max(MAX_REQUEST_ITEMS)
        .optional()
        .describe('Sort clauses, e.g. [{ "@timestamp": { "order": "desc" } }].'),
      _source: z
        .union([z.array(z.string().max(200)).max(MAX_REQUEST_ITEMS), z.boolean()])
        .optional()
        .describe('Fields to include in _source, or false to suppress _source entirely.'),
      aggs: z
        .record(z.string().max(200), z.unknown())
        .refine((v) => Object.keys(v).length <= MAX_REQUEST_ITEMS, {
          message: `At most ${MAX_REQUEST_ITEMS} aggregations.`,
        })
        .optional()
        .describe('Aggregations object. Results appear under "aggregations" in the response.'),
      runtimeMappings: z
        .record(z.string().max(200), z.unknown())
        .refine((v) => Object.keys(v).length <= MAX_REQUEST_ITEMS, {
          message: `At most ${MAX_REQUEST_ITEMS} runtime mappings.`,
        })
        .optional()
        .describe('Runtime field definitions to apply at query time.'),
      timeout: z
        .string()
        .max(20)
        .regex(/^\d+[smhd]$/)
        .default('30s')
        .describe('ES-side query timeout, e.g. "30s". Partial results are returned on timeout.'),
    })
    .refine(({ from, size }) => from + size <= MAX_RESULT_WINDOW, {
      message: `from + size must not exceed ${MAX_RESULT_WINDOW}.`,
      path: ['size'],
    })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

// ============================================================================
// esql
// ============================================================================

export const EsqlInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(ESQL_MAX_QUERY_LENGTH)
      .describe(
        'ES|QL query string, e.g. "FROM logs-* | WHERE @timestamp > NOW() - 1 hour | STATS count = COUNT(*) BY host.name | SORT count DESC | LIMIT 10". Requires remote ES 8.11+.'
      ),
    params: z
      .array(z.union([z.string().max(ESQL_MAX_QUERY_LENGTH), z.number(), z.boolean(), z.null()]))
      .max(MAX_REQUEST_ITEMS)
      .optional()
      .describe('Positional parameter values for ? placeholders in the query.'),
    filter: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length <= 20, { message: 'At most 20 top-level filter keys.' })
      .optional()
      .describe('Additional Query DSL filter applied alongside the query.'),
    locale: z
      .string()
      .max(20)
      .optional()
      .describe('Locale for date formatting, e.g. "en-US". Defaults to cluster locale.'),
    dropNullColumns: z
      .boolean()
      .default(false)
      .describe('When true, columns where all values are null are omitted from the response.'),
  })
);
export type EsqlInput = z.infer<typeof EsqlInputSchema>;

// ============================================================================
// listIndices
// ============================================================================

export const ListIndicesInputSchema = lazySchema(() =>
  z.object({
    pattern: z
      .string()
      .max(512)
      .default('*')
      .describe('Index/data-stream name pattern. Defaults to * (all non-hidden).'),
    includeHidden: z
      .boolean()
      .default(false)
      .describe('When true, includes hidden and system indices (names starting with ".").'),
  })
);
export type ListIndicesInput = z.infer<typeof ListIndicesInputSchema>;

// ============================================================================
// getMapping
// ============================================================================

export const GetMappingInputSchema = lazySchema(() =>
  z.object({
    index: z.string().min(1).max(512).describe('Index name, alias, or data stream name.'),
    fields: z
      .array(z.string().max(200))
      .max(100)
      .default(['*'])
      .describe('Field patterns to include. Defaults to all fields.'),
  })
);
export type GetMappingInput = z.infer<typeof GetMappingInputSchema>;

// ============================================================================
// request (generic GET)
// ============================================================================

export const RequestInputSchema = lazySchema(() =>
  z
    .object({
      path: z
        .string()
        .min(1)
        .max(HTTP_MAX_INITIAL_LINE_LENGTH)
        .regex(/^\//, 'Path must start with "/".')
        .describe(
          'ES REST API path, starting with /. E.g. "/my-index/_doc/abc123", "/_aliases", "/_cat/health?v". The base cluster URL is prepended automatically — do not repeat it here.'
        ),
      queryParams: z
        .record(z.string().max(200), z.union([z.string().max(2048), z.number(), z.boolean()]))
        .refine((v) => Object.keys(v).length <= 50, { message: 'At most 50 query parameters.' })
        .optional()
        .describe(
          'Query string parameters as key-value pairs, merged with any params in the path.'
        ),
    })
    .refine(({ path, queryParams }) => fitsRequestLine(toRequestTarget(path, queryParams)), {
      message: `The path and URL-encoded query parameters must fit the ${HTTP_MAX_INITIAL_LINE_LENGTH}-byte HTTP request line.`,
      path: ['path'],
    })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

// ============================================================================
// getClusterInfo
// ============================================================================

export const GetClusterInfoInputSchema = lazySchema(() => z.object({}));
export type GetClusterInfoInput = z.infer<typeof GetClusterInfoInputSchema>;
