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

// =============================================================================
// Recruiting (v4) — scope: Recruiting
// =============================================================================

export const ListJobRequisitionsInputSchema = z.object({
  status: z
    .enum(['Open', 'Closed', 'Frozen'])
    .optional()
    .describe(
      'Filter job requisitions by status: "Open" (actively recruiting), ' +
        '"Closed" (no longer recruiting), or "Frozen" (paused). ' +
        'Omit to return all requisitions regardless of status.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of job requisitions to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListJobRequisitionsInput = z.infer<typeof ListJobRequisitionsInputSchema>;

export const GetJobRequisitionInputSchema = z.object({
  jobRequisitionId: z
    .string()
    .describe(
      'Workday job requisition ID (WID), returned in the id field of listJobRequisitions results. ' +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetJobRequisitionInput = z.infer<typeof GetJobRequisitionInputSchema>;

export const ListCandidatesInputSchema = z.object({
  jobRequisitionId: z
    .string()
    .optional()
    .describe(
      'Filter candidates by job requisition WID. ' +
        'Returned in the id field of listJobRequisitions results. ' +
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
// Learning (v1) — scope: Learning Core
// =============================================================================

export const ListCoursesInputSchema = z.object({
  search: z
    .string()
    .optional()
    .describe(
      'Optional keyword to filter courses by title. ' +
        'Example: "leadership" or "onboarding". Omit to list all available courses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of courses to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListCoursesInput = z.infer<typeof ListCoursesInputSchema>;

export const GetCourseInputSchema = z.object({
  courseId: z
    .string()
    .describe(
      'Workday course ID (WID), returned in the id field of listCourses results. ' +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetCourseInput = z.infer<typeof GetCourseInputSchema>;

export const ListEnrollmentsInputSchema = z.object({
  workerId: z
    .string()
    .describe(
      'Workday worker ID (WID) of the worker whose enrollments to retrieve. ' +
        'Returned in the id field of searchWorkers results. This field is required.'
    ),
  status: z
    .enum(['Enrolled', 'Completed', 'Withdrawn'])
    .optional()
    .describe(
      'Filter enrollments by status: "Enrolled" (in progress), ' +
        '"Completed" (finished), or "Withdrawn" (dropped). ' +
        'Omit to return enrollments in all statuses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of enrollments to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListEnrollmentsInput = z.infer<typeof ListEnrollmentsInputSchema>;

// =============================================================================
// Expense (v1) — scope: Expenses
// =============================================================================

export const ListExpenseReportsInputSchema = z.object({
  workerId: z
    .string()
    .optional()
    .describe(
      'Filter expense reports by worker WID. ' +
        'Returned in the id field of searchWorkers results. ' +
        'Omit to list expense reports across all workers (subject to access permissions).'
    ),
  status: z
    .enum(['Draft', 'In Progress', 'Approved', 'Paid'])
    .optional()
    .describe(
      'Filter expense reports by approval status: ' +
        '"Draft" (not yet submitted), "In Progress" (under review), ' +
        '"Approved" (approved for payment), "Paid" (reimbursed). ' +
        'Omit to return reports in all statuses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of expense reports to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListExpenseReportsInput = z.infer<typeof ListExpenseReportsInputSchema>;

export const GetExpenseReportInputSchema = z.object({
  expenseReportId: z
    .string()
    .describe(
      'Workday expense report ID (WID), returned in the id field of listExpenseReports results. ' +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetExpenseReportInput = z.infer<typeof GetExpenseReportInputSchema>;

// =============================================================================
// Requests (v2) — scopes: Tenant Non-Configurable, Benefits
// =============================================================================

export const ListRequestTypesInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of request types to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListRequestTypesInput = z.infer<typeof ListRequestTypesInputSchema>;

export const ListRequestsInputSchema = z.object({
  status: z
    .enum(['In Progress', 'Completed', 'Cancelled'])
    .optional()
    .describe(
      'Filter self-service requests by status: ' +
        '"In Progress" (awaiting completion), "Completed" (finished), ' +
        'or "Cancelled" (no longer active). ' +
        'Omit to return requests in all statuses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of requests to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListRequestsInput = z.infer<typeof ListRequestsInputSchema>;

// =============================================================================
// Journeys (v1) — scope: Journeys
// =============================================================================

export const ListJourneysInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of journeys to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListJourneysInput = z.infer<typeof ListJourneysInputSchema>;

// =============================================================================
// Holiday (v1) — scopes: Time Off and Leave, Time Tracking
// =============================================================================

export const ListHolidaysInputSchema = z.object({
  workerId: z
    .string()
    .optional()
    .describe(
      'Filter holiday calendar entries by worker WID. ' +
        'Returned in the id field of searchWorkers results. ' +
        'Omit to retrieve holiday calendars without filtering by worker.'
    ),
  year: z
    .number()
    .int()
    .optional()
    .describe(
      'Filter holiday entries by calendar year (e.g. 2025). ' +
        'Omit to return entries across all years.'
    ),
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

// =============================================================================
// Projects (v3) — scope: Projects
// =============================================================================

export const ListProjectsInputSchema = z.object({
  status: z
    .enum(['In Progress', 'Completed', 'Cancelled'])
    .optional()
    .describe(
      'Filter projects by status: "In Progress" (active), ' +
        '"Completed" (finished), or "Cancelled" (no longer active). ' +
        'Omit to return projects in all statuses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of projects to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const GetProjectInputSchema = z.object({
  projectId: z
    .string()
    .describe(
      'Workday project ID (WID), returned in the id field of listProjects results. ' +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

// =============================================================================
// Procurement (v5) — scope: Procurement
// =============================================================================

export const ListPurchaseRequisitionsInputSchema = z.object({
  status: z
    .enum(['Draft', 'In Progress', 'Approved', 'Cancelled'])
    .optional()
    .describe(
      'Filter purchase requisitions by status: ' +
        '"Draft" (not yet submitted), "In Progress" (under approval), ' +
        '"Approved" (approved for purchasing), or "Cancelled". ' +
        'Omit to return requisitions in all statuses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of purchase requisitions to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListPurchaseRequisitionsInput = z.infer<typeof ListPurchaseRequisitionsInputSchema>;

export const GetPurchaseRequisitionInputSchema = z.object({
  purchaseRequisitionId: z
    .string()
    .describe(
      'Workday purchase requisition ID (WID), returned in the id field of listPurchaseRequisitions results. ' +
        'Example: "3aa5550b7d6a10aed50a64b06f50c872".'
    ),
});
export type GetPurchaseRequisitionInput = z.infer<typeof GetPurchaseRequisitionInputSchema>;

export const ListPurchaseOrdersInputSchema = z.object({
  status: z
    .enum(['Open', 'Closed', 'Cancelled'])
    .optional()
    .describe(
      'Filter purchase orders by status: "Open" (active), ' +
        '"Closed" (fulfilled), or "Cancelled". ' +
        'Omit to return purchase orders in all statuses.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of purchase orders to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListPurchaseOrdersInput = z.infer<typeof ListPurchaseOrdersInputSchema>;

// =============================================================================
// Budgets (v1) — scope: Budgets
// =============================================================================

export const CheckBudgetInputSchema = z.object({
  budgetStructureId: z
    .string()
    .describe(
      'Workday budget structure ID (WID) against which to check availability. ' +
        'This is a required field identifying which budget to evaluate.'
    ),
  amount: z
    .number()
    .describe(
      'Proposed transaction amount to check against the budget. ' +
        'Must be a positive number representing the transaction value.'
    ),
  currencyCode: z
    .string()
    .optional()
    .describe(
      'ISO 4217 currency code for the amount (e.g. "USD", "EUR", "GBP"). ' +
        "Omit to use the budget structure's default currency."
    ),
  costCenterId: z
    .string()
    .optional()
    .describe(
      'Optional Workday cost center ID (WID) to scope the budget check to a specific cost center.'
    ),
});
export type CheckBudgetInput = z.infer<typeof CheckBudgetInputSchema>;

// =============================================================================
// Revenue (v1) — scopes: Project Billing, Project Tracking
// =============================================================================

export const ListProjectRevenueInputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(
      'Filter revenue data by project WID. ' +
        'Returned in the id field of listProjects results. ' +
        'Omit to return revenue data across all projects.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of revenue records to return (1–100, default 20).'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based offset for pagination. Use with limit to page through results.'),
});
export type ListProjectRevenueInput = z.infer<typeof ListProjectRevenueInputSchema>;
