/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ============================================================================
// search
// ============================================================================

export const SearchInputSchema = lazySchema(() =>
  z.object({
    index: z
      .union([z.string().min(1).max(512), z.array(z.string().min(1).max(512)).min(1).max(10)])
      .describe(
        'Index name, comma-separated index names, or an array of index names. Wildcards and aliases are supported.'
      ),
    query: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length <= 30, { message: 'At most 30 top-level query keys.' })
      .default({})
      .describe('Elasticsearch Query DSL object. Defaults to match_all.'),
    size: z
      .number()
      .int()
      .min(0)
      .max(500)
      .default(10)
      .describe('Maximum number of hits to return (0–500).'),
    from: z.number().int().min(0).max(10000).default(0).describe('Offset for pagination.'),
    sort: z
      .array(z.record(z.string(), z.unknown()))
      .max(5)
      .optional()
      .describe('Sort clauses, e.g. [{ "@timestamp": { "order": "desc" } }].'),
    _source: z
      .union([z.array(z.string().max(200)).max(50), z.boolean()])
      .optional()
      .describe('Fields to include in _source, or false to suppress _source entirely.'),
    aggs: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length <= 50, { message: 'At most 50 aggregations.' })
      .optional()
      .describe('Aggregations object. Results appear under "aggregations" in the response.'),
    runtimeMappings: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length <= 50, { message: 'At most 50 runtime mappings.' })
      .optional()
      .describe('Runtime field definitions to apply at query time.'),
    timeout: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default('30s')
      .describe('ES-side query timeout, e.g. "30s". Partial results are returned on timeout.'),
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
      .max(65536)
      .describe(
        'ES|QL query string, e.g. "FROM logs-* | WHERE @timestamp > NOW() - 1 hour | STATS count = COUNT(*) BY host.name | SORT count DESC | LIMIT 10". Requires remote ES 8.11+.'
      ),
    params: z
      .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .max(100)
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
  z.object({
    path: z
      .string()
      .min(1)
      .max(2048)
      .describe(
        'ES REST API path, starting with /. E.g. "/my-index/_doc/abc123", "/_aliases", "/_cat/health?v". The base cluster URL is prepended automatically — do not repeat it here.'
      ),
    queryParams: z
      .record(z.string().max(200), z.union([z.string(), z.number(), z.boolean()]))
      .refine((v) => Object.keys(v).length <= 50, { message: 'At most 50 query parameters.' })
      .optional()
      .describe('Query string parameters as key-value pairs, merged with any params in the path.'),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

// ============================================================================
// getClusterInfo
// ============================================================================

export const GetClusterInfoInputSchema = lazySchema(() => z.object({}));
export type GetClusterInfoInput = z.infer<typeof GetClusterInfoInputSchema>;
