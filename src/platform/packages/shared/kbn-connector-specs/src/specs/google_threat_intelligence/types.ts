/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const pagingLimitSchema = (noun: string) =>
  z
    .number()
    .int()
    .min(0)
    .max(40)
    .optional()
    .describe(
      `Maximum number of ${noun} to retrieve. Minimum 0, maximum 40. Defaults to 10 if omitted.`
    );

const CURSOR_SCHEMA = z
  .string()
  .max(2048)
  .optional()
  .describe(
    'Continuation cursor from a previous response, used to retrieve the next page of results.'
  );

const COLLECTION_FILTER_SCHEMA = z
  .string()
  .max(2000)
  .optional()
  .describe(
    'Collection filter. Supports fields such as collection_type, last_modification_date, origin, targeted_region, and targeted_industry, combined with AND, OR, or NOT.'
  );

const COLLECTION_ORDER_SCHEMA = z
  .string()
  .max(100)
  .optional()
  .describe('Collection sort expression, for example "last_modification_date-" or "relevance-".');

const IOC_SEARCH_ORDER_SCHEMA = z
  .string()
  .max(100)
  .optional()
  .describe(
    'IOC sort expression supported by the selected entity type, for example "last_submission_date-" or "positives-".'
  );

const QUERY_SCHEMA = z
  .string()
  .min(1)
  .max(2000)
  .describe(
    'GTI intelligence query. Use GTI search modifiers, for example "entity:domain positives:5+".'
  );

const COLLECTION_ID_SCHEMA = z
  .string()
  .min(1)
  .max(200)
  .describe(
    'GTI collection object ID returned by searchCollections, for example "threat-actor--bcaaad6f-0597-4b89-b69b-84a6be2b7bc3".'
  );

const FILE_HASH_RE = /^([a-fA-F0-9]{64}|[a-fA-F0-9]{40}|[a-fA-F0-9]{32})$/;

export const FILE_HASH_SCHEMA = z
  .string()
  .max(64)
  .regex(FILE_HASH_RE, {
    message:
      'Must be a SHA-256 (64 hex chars), SHA-1 (40 hex chars), or MD5 (32 hex chars) file hash',
  })
  .describe(
    'SHA-256, SHA-1, or MD5 hash identifying the file, e.g. a 64-character SHA-256 hex string'
  );

export const GetFileMitreAttackTechniquesInputSchema = lazySchema(() =>
  z.object({
    fileHash: FILE_HASH_SCHEMA,
  })
);
export type GetFileMitreAttackTechniquesInput = z.infer<
  typeof GetFileMitreAttackTechniquesInputSchema
>;

export const SearchCollectionsInputSchema = lazySchema(() =>
  z.object({
    filter: COLLECTION_FILTER_SCHEMA,
    order: COLLECTION_ORDER_SCHEMA,
    limit: pagingLimitSchema('collections'),
    cursor: CURSOR_SCHEMA,
  })
);
export type SearchCollectionsInput = z.infer<typeof SearchCollectionsInputSchema>;

export const GetCollectionInputSchema = lazySchema(() =>
  z.object({
    id: COLLECTION_ID_SCHEMA,
  })
);
export type GetCollectionInput = z.infer<typeof GetCollectionInputSchema>;

export const GetRelatedObjectsInputSchema = lazySchema(() =>
  z.object({
    id: COLLECTION_ID_SCHEMA,
    relationship: z
      .string()
      .min(1)
      .max(100)
      .describe(
        'Relationship name supported by this collection type, for example "files" or "associations".'
      ),
    limit: pagingLimitSchema('related objects'),
    cursor: CURSOR_SCHEMA,
  })
);
export type GetRelatedObjectsInput = z.infer<typeof GetRelatedObjectsInputSchema>;

export const SearchCollectionIocsInputSchema = lazySchema(() =>
  z.object({
    id: COLLECTION_ID_SCHEMA,
    query: QUERY_SCHEMA,
    order: IOC_SEARCH_ORDER_SCHEMA,
    limit: pagingLimitSchema('IOCs'),
    cursor: CURSOR_SCHEMA,
    attributes: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Comma-separated IOC attributes to return, for example "names,last_analysis_stats".'
      ),
    relationships: z
      .string()
      .max(2000)
      .optional()
      .describe('Comma-separated IOC relationship descriptors to return.'),
  })
);
export type SearchCollectionIocsInput = z.infer<typeof SearchCollectionIocsInputSchema>;

export const GetIocStreamInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'IOC stream filter. Supports date, origin, entity_id, entity_type, source_type, source_id, and notification_tag.'
      ),
    order: z
      .enum(['date-', 'date+'])
      .optional()
      .describe('Sort notifications by newest first ("date-") or oldest first ("date+").'),
    limit: pagingLimitSchema('IOC stream objects'),
    cursor: CURSOR_SCHEMA,
    descriptorsOnly: z
      .boolean()
      .optional()
      .describe('Return only object descriptors to reduce response size. Defaults to false.'),
  })
);
export type GetIocStreamInput = z.infer<typeof GetIocStreamInputSchema>;

export const AdvancedSearchInputSchema = lazySchema(() =>
  z.object({
    query: QUERY_SCHEMA,
    order: IOC_SEARCH_ORDER_SCHEMA,
    limit: pagingLimitSchema('search results'),
    cursor: CURSOR_SCHEMA,
    descriptorsOnly: z
      .boolean()
      .optional()
      .describe('Return only object descriptors to reduce response size. Defaults to false.'),
  })
);
export type AdvancedSearchInput = z.infer<typeof AdvancedSearchInputSchema>;

export const GetReportMitreAttackTechniquesInputSchema = lazySchema(() =>
  z.object({
    reportId: z
      .string()
      .max(200)
      .regex(/^report--[A-Za-z0-9-]+$/, {
        message: 'Must be a GTI report ID that starts with "report--"',
      })
      .describe('GTI report ID returned by searchCollections, for example "report--24-10074013".'),
    mitreNamespace: z
      .enum(['enterprise', 'mobile', 'ics'])
      .optional()
      .describe('MITRE ATT&CK matrix to return. Defaults to "enterprise".'),
    ttpSource: z
      .enum(['all', 'operational', 'seen_in_iocs'])
      .optional()
      .describe(
        'TTP source to return: analyst-linked, observed in related IOCs, or all. Defaults to "all".'
      ),
  })
);
export type GetReportMitreAttackTechniquesInput = z.infer<
  typeof GetReportMitreAttackTechniquesInputSchema
>;
