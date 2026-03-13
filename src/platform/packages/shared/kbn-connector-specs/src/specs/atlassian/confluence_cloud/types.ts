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

export const ListPagesInputSchema = z.object({
  limit: z.number().optional().describe('Maximum number of pages to return'),
  cursor: z.string().optional().describe('Pagination cursor from a previous response'),
  spaceId: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Space ID or list of space IDs to filter pages by'),
  title: z.string().optional().describe('Filter pages by title (partial match)'),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Page status filter (e.g. current, archived, draft)'),
  bodyFormat: z
    .string()
    .optional()
    .describe('Format for page body in the response (e.g. atlas_doc_format, storage)'),
});
export type ListPagesInput = z.infer<typeof ListPagesInputSchema>;

export const GetPageInputSchema = z.object({
  id: z.string().trim().min(1).describe('The ID of the page to retrieve'),
  bodyFormat: z
    .string()
    .optional()
    .describe('Format for page body in the response (e.g. atlas_doc_format, storage)'),
});
export type GetPageInput = z.infer<typeof GetPageInputSchema>;

export const ListSpacesInputSchema = z.object({
  limit: z.number().optional().describe('Maximum number of spaces to return'),
  cursor: z.string().optional().describe('Pagination cursor from a previous response'),
  ids: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Space ID or list of space IDs to filter by'),
  keys: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Space key or list of space keys to filter by (e.g. DEMO, TEAM)'),
  type: z.string().optional().describe('Space type filter (e.g. global, personal)'),
  status: z.string().optional().describe('Space status filter (e.g. current, archived)'),
});
export type ListSpacesInput = z.infer<typeof ListSpacesInputSchema>;

export const GetSpaceInputSchema = z.object({
  id: z.string().trim().min(1).describe('The ID of the space to retrieve'),
});
export type GetSpaceInput = z.infer<typeof GetSpaceInputSchema>;
