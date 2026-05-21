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

export const SearchWorkersInputSchema = z.object({
  search: z
    .string()
    .optional()
    .describe(
      'Free-text search string to filter workers by name (first, last, or full name). ' +
        'Example: "Jane Smith" or "Jane". Omit to list all workers (subject to limit).'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of workers to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type SearchWorkersInput = z.infer<typeof SearchWorkersInputSchema>;

export const GetWorkerInputSchema = z.object({
  workerId: z
    .string()
    .describe(
      'Workday worker ID (the WID), returned in the id field of searchWorkers results. ' +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetWorkerInput = z.infer<typeof GetWorkerInputSchema>;

export const GetDirectReportsInputSchema = z.object({
  workerId: z
    .string()
    .describe(
      'Workday worker ID (WID) of the manager whose direct reports to retrieve. ' +
        'Returned in the id field of searchWorkers or getWorker results.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of direct reports to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type GetDirectReportsInput = z.infer<typeof GetDirectReportsInputSchema>;

export const ListOrganizationsInputSchema = z.object({
  type: z
    .enum(['supervisory', 'company', 'cost_center', 'team', 'region'])
    .optional()
    .describe(
      'Filter organizations by type: ' +
        '"supervisory" (management hierarchy / departments), ' +
        '"company" (legal entities), ' +
        '"cost_center" (financial cost centers), ' +
        '"team" (cross-functional teams), ' +
        '"region" (geographic regions). ' +
        'Omit to return all organization types.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of organizations to return (1–100, default 20).'),
  offset: z.number().int().min(0).optional().describe('Zero-based offset for pagination.'),
});
export type ListOrganizationsInput = z.infer<typeof ListOrganizationsInputSchema>;

export const GetOrganizationInputSchema = z.object({
  organizationId: z
    .string()
    .describe(
      'Workday organization ID (WID), returned in the id field of listOrganizations results.'
    ),
});
export type GetOrganizationInput = z.infer<typeof GetOrganizationInputSchema>;

export const ListJobPostingsInputSchema = z.object({
  status: z
    .enum(['open', 'closed'])
    .optional()
    .describe(
      'Filter job postings by status: "open" (actively accepting applications) or ' +
        '"closed" (no longer accepting applications). Omit to return all postings.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of job postings to return (1–100, default 20).'),
  offset: z.number().int().min(0).optional().describe('Zero-based offset for pagination.'),
});
export type ListJobPostingsInput = z.infer<typeof ListJobPostingsInputSchema>;

export const GetJobPostingInputSchema = z.object({
  jobPostingId: z
    .string()
    .describe('Workday job posting ID (WID), returned in the id field of listJobPostings results.'),
});
export type GetJobPostingInput = z.infer<typeof GetJobPostingInputSchema>;

export const GetTimeOffBalanceInputSchema = z.object({
  workerId: z
    .string()
    .describe(
      'Workday worker ID (WID) of the authenticated worker whose time off balances to retrieve. ' +
        'Must be the WID of the currently authenticated OAuth user — cross-user queries are not permitted.'
    ),
});
export type GetTimeOffBalanceInput = z.infer<typeof GetTimeOffBalanceInputSchema>;

export const ListAbsenceTypesInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of absence types to return (1–100, default 20).'),
  offset: z.number().int().min(0).optional().describe('Zero-based offset for pagination.'),
});
export type ListAbsenceTypesInput = z.infer<typeof ListAbsenceTypesInputSchema>;

export const ListInboxTasksInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(100)
    .describe(
      'Maximum number of inbox tasks to return (1–100, default 100). ' +
        'Tasks are returned in descending order (most recent first).'
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListInboxTasksInput = z.infer<typeof ListInboxTasksInputSchema>;
