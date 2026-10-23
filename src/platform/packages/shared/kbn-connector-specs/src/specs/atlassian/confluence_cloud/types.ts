/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 200;
// Page and space IDs are int64 in the Confluence v2 spec: at most 19 digits.
const NUMERIC_ID_REGEX = /^\d{1,19}$/;
const MAX_CURSOR_LENGTH = 2048;
// Confluence v2 accepts up to 100 `space-id` values on GET /pages, and up to 250 `ids` or `keys` on GET /spaces.
const MAX_FILTER_VALUES = 100;
const MAX_SPACE_LOOKUP_VALUES = 250;
// GET /pages and GET /spaces accept a `limit` of 1 to 250.
const MAX_LIST_LIMIT = 250;

export const PAGE_STATUSES = ['current', 'archived', 'deleted', 'trashed'] as const;
export const LIST_PAGES_BODY_FORMATS = ['storage', 'atlas_doc_format'] as const;
export const GET_PAGE_BODY_FORMATS = [
  'storage',
  'atlas_doc_format',
  'view',
  'export_view',
  'anonymous_export_view',
  'styled_view',
  'editor',
] as const;
export const SPACE_TYPES = [
  'global',
  'collaboration',
  'knowledge_base',
  'personal',
  'system',
  'onboarding',
  'xflow_sample_space',
] as const;
export const SPACE_STATUSES = ['current', 'archived', 'trashed'] as const;

const numericId = () => z.string().trim().regex(NUMERIC_ID_REGEX);

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListPagesInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIST_LIMIT)
      .default(25)
      .describe(
        'Maximum number of pages to return per request (1-250). Defaults to 25 if omitted.'
      ),
    cursor: z
      .string()
      .max(MAX_CURSOR_LENGTH)
      .optional()
      .describe(
        'Opaque pagination cursor returned by a previous listPages response. Pass this to retrieve the next page of results.'
      ),
    spaceId: z
      .union([numericId(), z.array(numericId()).max(MAX_FILTER_VALUES)])
      .optional()
      .describe(
        'Numeric space ID or array of space IDs to restrict results to pages in those spaces. Obtain space IDs from listSpaces or getSpace.'
      ),
    title: z
      .string()
      .max(1000)
      .optional()
      .describe('Filter pages whose title contains this string (partial, case-insensitive match).'),
    status: z
      .union([z.enum(PAGE_STATUSES), z.array(z.enum(PAGE_STATUSES)).max(PAGE_STATUSES.length)])
      .optional()
      .describe(
        'Filter by page status: "current" (published), "archived", "deleted" or "trashed". Accepts a single value or an array. Defaults to current and archived.'
      ),
    bodyFormat: z
      .enum(LIST_PAGES_BODY_FORMATS)
      .optional()
      .describe(
        'Format to use for page body content in the response: "atlas_doc_format" (Atlassian Document Format JSON) or "storage" (XML storage format). Omit to exclude body content from the response.'
      ),
  })
);
export type ListPagesInput = z.infer<typeof ListPagesInputSchema>;

export const GetPageInputSchema = lazySchema(() =>
  z.object({
    id: numericId().describe(
      'The numeric ID of the Confluence page to retrieve (for example, "123456"). Obtain this from a listPages call or from the page URL.'
    ),
    bodyFormat: z
      .enum(GET_PAGE_BODY_FORMATS)
      .optional()
      .describe(
        'Format to use for page body content in the response. Common values: "atlas_doc_format" (Atlassian Document Format JSON), "storage" (XML storage format), "view" (rendered HTML). Omit to exclude body content from the response.'
      ),
  })
);
export type GetPageInput = z.infer<typeof GetPageInputSchema>;

export const ListSpacesInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIST_LIMIT)
      .default(25)
      .describe(
        'Maximum number of spaces to return per request (1-250). Defaults to 25 if omitted.'
      ),
    cursor: z
      .string()
      .max(MAX_CURSOR_LENGTH)
      .optional()
      .describe(
        'Opaque pagination cursor returned by a previous listSpaces response. Pass this to retrieve the next page of results.'
      ),
    ids: z
      .union([numericId(), z.array(numericId()).max(MAX_SPACE_LOOKUP_VALUES)])
      .optional()
      .describe(
        'Numeric space ID or array of space IDs to retrieve specific spaces. Use when you already know the space IDs.'
      ),
    keys: z
      .union([
        z.string().max(MAX_ID_LENGTH),
        z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_SPACE_LOOKUP_VALUES),
      ])
      .optional()
      .describe(
        'Space key or array of space keys to filter by (for example, "DEMO" or ["DEMO", "TEAM"]). Space keys are the short uppercase identifiers shown in Confluence URLs.'
      ),
    type: z
      .enum(SPACE_TYPES)
      .optional()
      .describe(
        'Filter spaces by type, for example "global" (team or project spaces) or "personal" (user personal spaces).'
      ),
    status: z
      .enum(SPACE_STATUSES)
      .optional()
      .describe('Filter spaces by status: "current" (active), "archived" or "trashed".'),
  })
);
export type ListSpacesInput = z.infer<typeof ListSpacesInputSchema>;

export const GetSpaceInputSchema = lazySchema(() =>
  z.object({
    id: numericId().describe(
      'The numeric ID of the Confluence space to retrieve (for example, "98304"). Obtain this from a listSpaces call or from the space URL.'
    ),
  })
);
export type GetSpaceInput = z.infer<typeof GetSpaceInputSchema>;
