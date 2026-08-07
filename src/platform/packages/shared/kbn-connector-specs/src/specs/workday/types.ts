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
    .max(100)
    .optional()
    .describe(
      'Filter workers by name. Passed as the search parameter (case-insensitive, min 3 chars). ' +
        'Space-delimited terms are OR-matched — prefer a single token, e.g. "Erik" or "Currin". ' +
        'Omit to list all workers (subject to limit).'
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

export const WhoAmIInputSchema = z.object({});
export type WhoAmIInput = z.infer<typeof WhoAmIInputSchema>;

export const GetWorkerInputSchema = z.object({
  workerId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Workday worker ID (the WID), returned in the id field of searchWorkers results. ' +
        "Omit to retrieve the current authenticated user's own profile. " +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetWorkerInput = z.infer<typeof GetWorkerInputSchema>;

export const GetDirectReportsInputSchema = z.object({
  workerId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Workday worker ID (WID) of the manager whose direct reports to retrieve. ' +
        'Omit to retrieve direct reports for the current authenticated user. ' +
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
    .max(256)
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
    .max(256)
    .describe('Workday job posting ID (WID), returned in the id field of listJobPostings results.'),
});
export type GetJobPostingInput = z.infer<typeof GetJobPostingInputSchema>;

export const GetTimeOffBalanceInputSchema = z.object({
  workerId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'WID of the worker whose balances to retrieve. ' +
        "Omit to retrieve the current authenticated user's own balances. " +
        "Managers may pass a direct report's WID if their Workday security policy permits it."
    ),
  effective: z
    .string()
    .max(10)
    .optional()
    .describe(
      'Return balances as of this date (ISO 8601 format, e.g. "2025-06-01"). Omit for current balances.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of balance entries to return (1–100, default 20).'),
  offset: z.number().int().min(0).optional().describe('Zero-based offset for pagination.'),
});
export type GetTimeOffBalanceInput = z.infer<typeof GetTimeOffBalanceInputSchema>;

export const ListTimeOffEntriesInputSchema = z.object({
  workerId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'WID of the worker whose time off entries to retrieve. ' +
        "Omit to retrieve the current authenticated user's own entries."
    ),
  fromDate: z
    .string()
    .max(10)
    .optional()
    .describe(
      'Start of the date range (ISO 8601 date, e.g. "2025-01-01"). Omit for no lower bound.'
    ),
  toDate: z
    .string()
    .max(10)
    .optional()
    .describe('End of the date range (ISO 8601 date, e.g. "2025-12-31"). Omit for no upper bound.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of time off entries to return (1–100, default 20).'),
  offset: z.number().int().min(0).optional().describe('Zero-based offset for pagination.'),
});
export type ListTimeOffEntriesInput = z.infer<typeof ListTimeOffEntriesInputSchema>;

export const ListAbsenceTypesInputSchema = z.object({
  workerId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'WID of the worker whose eligible absence types to retrieve. ' +
        "Omit to retrieve the current authenticated user's own eligible types."
    ),
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
  workerId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'WID of the worker whose inbox tasks to retrieve. ' +
        "Omit to retrieve the current authenticated user's own tasks."
    ),
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

// =============================================================================
// Recruiting (v4) — scope: Recruiting
// =============================================================================

export const ListCandidatesInputSchema = z.object({
  jobRequisitionId: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Filter candidates by job requisition WID. ' +
        'Omit to return candidates across all requisitions.'
    ),
  status: z
    .enum(['Active', 'Hired', 'Declined'])
    .optional()
    .describe(
      'Filter candidates by status: "Active" (currently in process), ' +
        '"Hired" (offer accepted), or "Declined" (rejected or withdrew). ' +
        'Omit to return candidates in all stages.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of candidates to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListCandidatesInput = z.infer<typeof ListCandidatesInputSchema>;

// =============================================================================
// Holiday — scopes: Time Off and Leave, Time Tracking
// =============================================================================

export const ListHolidaysInputSchema = z.object({
  workerIds: z
    .array(z.string().max(256))
    .min(1)
    .max(100)
    .describe(
      'One or more worker WIDs to retrieve holidays for. Required — omitting returns empty results. ' +
        'Obtain WIDs from whoAmI (current user) or searchWorkers.'
    ),
  fromDate: z
    .string()
    .max(10)
    .describe('Start of the date range (ISO 8601 date, e.g. "2025-01-01").'),
  toDate: z.string().max(10).describe('End of the date range (ISO 8601 date, e.g. "2025-12-31").'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of holiday entries to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListHolidaysInput = z.infer<typeof ListHolidaysInputSchema>;
