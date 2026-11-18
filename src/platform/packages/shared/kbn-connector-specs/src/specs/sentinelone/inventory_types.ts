/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { idString } from './types';

// getSites
export const GetSitesInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Name search'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
    sortBy: z
      .enum(['id', 'name', 'createdAt', 'updatedAt', 'accountName', 'state'])
      .optional()
      .describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
  })
);
export type GetSitesInput = z.infer<typeof GetSitesInputSchema>;

// getGroups
export const GetGroupsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Name search'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    type: z.enum(['static', 'dynamic', 'pinned']).optional().describe('Group type'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type GetGroupsInput = z.infer<typeof GetGroupsInputSchema>;

// getAccounts
export const GetAccountsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Name search'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type GetAccountsInput = z.infer<typeof GetAccountsInputSchema>;
