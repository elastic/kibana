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

export const ListPagesInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .default(25)
      .describe('Maximum number of pages to return per request. Defaults to 25 if omitted.'),
    cursor: z
      .string()
      .optional()
      .describe(
        'Opaque pagination cursor returned by a previous listPages response. Pass this to retrieve the next page of results.'
      ),
    spaceId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Numeric space ID or array of space IDs to restrict results to pages in those spaces. Obtain space IDs from listSpaces or getSpace.'
      ),
    title: z
      .string()
      .optional()
      .describe('Filter pages whose title contains this string (partial, case-insensitive match).'),
    status: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Filter by page status. Accepted values: "current" (published), "archived", "draft". Accepts a single value or an array.'
      ),
    bodyFormat: z
      .string()
      .optional()
      .describe(
        'Format to use for page body content in the response. Common values: "atlas_doc_format" (Atlassian Document Format JSON), "storage" (XML storage format). Omit to exclude body content from the response.'
      ),
  })
);
export type ListPagesInput = z.infer<typeof ListPagesInputSchema>;

export const GetPageInputSchema = lazySchema(() =>
  z.object({
    id: z
      .string()
      .trim()
      .min(1)
      .describe(
        'The numeric ID of the Confluence page to retrieve (for example, "123456"). Obtain this from a listPages call or from the page URL.'
      ),
    bodyFormat: z
      .string()
      .optional()
      .describe(
        'Format to use for page body content in the response. Common values: "atlas_doc_format" (Atlassian Document Format JSON), "storage" (XML storage format). Omit to exclude body content from the response.'
      ),
  })
);
export type GetPageInput = z.infer<typeof GetPageInputSchema>;

export const ListSpacesInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .default(25)
      .describe('Maximum number of spaces to return per request. Defaults to 25 if omitted.'),
    cursor: z
      .string()
      .optional()
      .describe(
        'Opaque pagination cursor returned by a previous listSpaces response. Pass this to retrieve the next page of results.'
      ),
    ids: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Numeric space ID or array of space IDs to retrieve specific spaces. Use when you already know the space IDs.'
      ),
    keys: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Space key or array of space keys to filter by (for example, "DEMO" or ["DEMO", "TEAM"]). Space keys are the short uppercase identifiers shown in Confluence URLs.'
      ),
    type: z
      .string()
      .optional()
      .describe(
        'Filter spaces by type. Accepted values: "global" (team or project spaces), "personal" (user personal spaces).'
      ),
    status: z
      .string()
      .optional()
      .describe('Filter spaces by status. Accepted values: "current" (active), "archived".'),
  })
);
export type ListSpacesInput = z.infer<typeof ListSpacesInputSchema>;

export const GetSpaceInputSchema = lazySchema(() =>
  z.object({
    id: z
      .string()
      .trim()
      .min(1)
      .describe(
        'The numeric ID of the Confluence space to retrieve (for example, "98304"). Obtain this from a listSpaces call or from the space URL.'
      ),
  })
);
export type GetSpaceInput = z.infer<typeof GetSpaceInputSchema>;
