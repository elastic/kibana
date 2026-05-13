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

export const SearchCrmObjectsInputSchema = z.object({
  objectType: z
    .enum([
      'contacts',
      'companies',
      'deals',
      'tickets',
      'calls',
      'emails',
      'meetings',
      'notes',
      'tasks',
    ])
    .describe(
      'CRM object type to search or list (standard objects or engagements: calls, emails, meetings, notes, tasks). ' +
        'To search contacts, companies, deals, and tickets at once, use searchBroad.'
    ),
  query: z
    .string()
    .optional()
    .describe(
      'Search keyword for the given object type, or omit to list records (pagination via `after`).'
    ),
  properties: z
    .array(z.string())
    .optional()
    .describe(
      'Property internal names to return (e.g. ["firstname","email","phone"]). Omit to let HubSpot return default properties.'
    ),
  limit: z.number().optional().describe('Max results for this request (default: 10).'),
  after: z
    .string()
    .optional()
    .describe('Pagination cursor (`paging.next.after`) from a previous response.'),
  includeAssociatedDeals: z
    .boolean()
    .optional()
    .describe(
      'Only for objectType "contacts". When true, runs an extra associations read so the response includes `{ contacts, associated_deals }`.'
    ),
});
export type SearchCrmObjectsInput = z.infer<typeof SearchCrmObjectsInputSchema>;

export const GetCrmObjectInputSchema = z.object({
  objectType: z
    .enum([
      'contacts',
      'companies',
      'deals',
      'tickets',
      'calls',
      'emails',
      'meetings',
      'notes',
      'tasks',
    ])
    .describe('CRM object type to retrieve when you already have the record ID.'),
  objectId: z.string().describe('HubSpot internal object ID for the record.'),
  properties: z
    .array(z.string())
    .optional()
    .describe(
      'Property internal names to return (e.g. ["firstname","lastname","email"]). Omit for default properties.'
    ),
});
export type GetCrmObjectInput = z.infer<typeof GetCrmObjectInputSchema>;

export const ListOwnersInputSchema = z.object({
  limit: z
    .number()
    .optional()
    .describe(
      'Max owners to return (default: 20). Use for resolving names/emails to hubspot_owner_id.'
    ),
  after: z.string().optional().describe('Pagination cursor from a previous response.'),
});
export type ListOwnersInput = z.infer<typeof ListOwnersInputSchema>;

export const SearchDealsInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Keyword to match deal names or other indexed deal properties.'),
  pipeline: z
    .string()
    .optional()
    .describe(
      'Pipeline ID to match (e.g. "default"). Call listPipelines first to list valid pipeline and stage IDs.'
    ),
  dealStage: z
    .string()
    .optional()
    .describe(
      'Deal stage ID (e.g. "appointmentscheduled", "closedwon", "closedlost"). IDs are portal-specific; use listPipelines.'
    ),
  ownerId: z
    .string()
    .optional()
    .describe(
      'Numeric hubspot_owner_id. Use listOwners to map from an owner name or email when unknown.'
    ),
  limit: z.number().optional().describe('Max deals to return (default: 10).'),
  after: z.string().optional().describe('Pagination cursor from a previous response.'),
});
export type SearchDealsInput = z.infer<typeof SearchDealsInputSchema>;

export const SearchBroadInputSchema = z.object({
  query: z
    .string()
    .describe(
      'Single keyword or phrase applied in parallel to contacts, companies, deals, and tickets.'
    ),
  limit: z
    .number()
    .optional()
    .describe('Max hits per object type in the combined response (default: 5).'),
});
export type SearchBroadInput = z.infer<typeof SearchBroadInputSchema>;

export const ListPipelinesInputSchema = z.object({
  objectType: z
    .enum(['deals', 'tickets'])
    .optional()
    .describe(
      'Which pipeline family to return. Defaults to "deals"; use "tickets" for support ticket pipelines. Response includes stage IDs and labels needed for searchDeals filters.'
    ),
});
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;
