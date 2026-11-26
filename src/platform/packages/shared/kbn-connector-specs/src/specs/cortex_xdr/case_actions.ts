/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  CortexXdrError,
  collectPages,
  pageInfo,
  pushFilter,
  remainingBudgetMs,
  xdrPost,
  xdrRequest,
} from './client';
import type { Filter } from './client';
import { MIN_REQUEST_BUDGET_MS, PAGE_SIZE } from './constants';
import {
  GetCaseDetailsInputSchema,
  GetCasesInputSchema,
  GetIssuesInputSchema,
  UpdateCaseInputSchema,
  UpdateIssueInputSchema,
} from './types';
import type {
  GetCaseDetailsInput,
  GetCasesInput,
  GetIssuesInput,
  UpdateCaseInput,
  UpdateIssueInput,
} from './types';

interface SearchBody {
  reply?: { TOTAL_COUNT?: number; FILTER_COUNT?: number; DATA?: unknown[] };
}

interface CaseRecord {
  case_id?: number;
  issue_ids?: number[];
  [key: string]: unknown;
}

const sortOf = (field?: string, order?: string) =>
  field ? { sort: { field, keyword: order ?? 'desc' } } : {};

const search = async (
  ctx: ActionContext,
  path: string,
  requestData: Record<string, unknown>,
  { searchFrom, maxResults }: { searchFrom: number; maxResults: number }
) => {
  const page = await collectPages<SearchBody>(ctx, {
    path,
    requestData,
    searchFrom,
    maxResults,
    itemsOf: (body) => body.reply?.DATA,
    totalOf: (body) => body.reply?.FILTER_COUNT,
  });
  return {
    reply: {
      TOTAL_COUNT: page.lastBody?.reply?.TOTAL_COUNT,
      FILTER_COUNT: page.lastBody?.reply?.FILTER_COUNT,
      DATA: page.items,
    },
    ...pageInfo(page),
  };
};

const getCaseDetails = async (ctx: ActionContext, { caseId }: GetCaseDetailsInput) => {
  const found = await xdrPost<SearchBody>(ctx, '/case/search', {
    filters: [{ field: 'case_id', operator: 'in', value: [caseId] }],
    search_from: 0,
    search_to: 1,
  });
  const caseRecord = found.reply?.DATA?.[0] as CaseRecord | undefined;
  if (!caseRecord) {
    return { found: false, caseId };
  }
  const errors: Array<{ part: 'artifacts' | 'issues'; message: string }> = [];
  let artifacts: unknown = null;
  try {
    const response = await xdrRequest(ctx, {
      method: 'GET',
      path: `/case/artifacts/${encodeURIComponent(String(caseId))}/`,
    });
    artifacts = Array.isArray(response.data) ? response.data[0] ?? null : response.data;
  } catch (error) {
    errors.push({ part: 'artifacts', message: (error as Error).message });
  }
  const issueIds = Array.isArray(caseRecord.issue_ids) ? caseRecord.issue_ids : [];
  let issues: unknown[] = [];
  if (issueIds.length > 0) {
    try {
      const body = await xdrPost<SearchBody>(ctx, '/issue/search', {
        filters: [{ field: 'id', operator: 'in', value: issueIds.slice(0, PAGE_SIZE) }],
        search_from: 0,
        search_to: PAGE_SIZE,
      });
      issues = body.reply?.DATA ?? [];
    } catch (error) {
      errors.push({ part: 'issues', message: (error as Error).message });
    }
  }
  return {
    found: true,
    case: caseRecord,
    artifacts,
    issues,
    issuesTruncated: issueIds.length > PAGE_SIZE,
    errors,
  };
};

const updateCase = async (ctx: ActionContext, input: UpdateCaseInput) => {
  const updateData = Object.fromEntries(
    Object.entries({
      status_progress: input.status,
      resolve_reason: input.resolveReason,
      resolve_comment: input.resolveComment,
      user_severity: input.userSeverity,
      assigned_user: input.assignedUser,
      notes: input.notes,
    }).filter(([, value]) => value !== undefined)
  );
  await xdrRequest(ctx, {
    path: `/case/update/${encodeURIComponent(String(input.caseId))}`,
    body: { request_data: { update_data: updateData } },
    stateChanging: true,
    notFoundMessage: `No Cortex XDR case with id ${input.caseId}`,
  });
  return { success: true, caseId: input.caseId, updatedFields: Object.keys(updateData) };
};

/** Statuses that fail every id alike: stop instead of repeating the same failure. */
const ACCOUNT_WIDE_STATUSES = [401, 402, 403];

const updateIssues = async (ctx: ActionContext, input: UpdateIssueInput) => {
  const updateData = Object.fromEntries(
    Object.entries({
      status: input.status,
      severity: input.severity,
      status_resolution_reason: input.resolutionReason,
      status_resolution_comment: input.resolutionComment,
    }).filter(([, value]) => value !== undefined)
  );
  const results: Array<{
    issueId: number;
    success: boolean;
    notFound?: boolean;
    error?: string;
  }> = [];
  const notAttempted: number[] = [];
  // One request per id, one after another: the API has no bulk route and allows 10 requests a second.
  for (const issueId of new Set(input.issueIds)) {
    // The time budget is checked before each id: an id sent and then cut may have been updated.
    if (notAttempted.length > 0 || remainingBudgetMs(ctx) < MIN_REQUEST_BUDGET_MS) {
      notAttempted.push(issueId);
      continue;
    }
    try {
      await xdrRequest(ctx, {
        path: `/issue/${encodeURIComponent(String(issueId))}`,
        body: { request_data: { update_data: updateData } },
        stateChanging: true,
        notFoundMessage: `No Cortex XDR issue with id ${issueId}`,
      });
      results.push({ issueId, success: true });
    } catch (error) {
      if (error instanceof CortexXdrError && ACCOUNT_WIDE_STATUSES.includes(error.status ?? 0)) {
        throw error;
      }
      results.push({
        issueId,
        success: false,
        notFound: error instanceof CortexXdrError && error.status === 404,
        error: (error as Error).message,
      });
    }
  }
  const succeeded = results.filter((result) => result.success).length;
  const timedOut = notAttempted.length > 0 ? { timedOut: true, notAttempted } : {};
  if (succeeded === 0 && results.length === 0) {
    throw new CortexXdrError(
      `The action's time budget was spent before any issue was updated; not sent: ${notAttempted.join(
        ', '
      )}.`
    );
  }
  if (succeeded === 0) {
    throw new CortexXdrError(
      results.every((result) => result.notFound)
        ? `Cortex XDR found none of the issue ids: ${results.map((r) => r.issueId).join(', ')}.`
        : `Cortex XDR updated none of the issues: ${results
            .map((result) => `${result.issueId}: ${result.error}`)
            .join('; ')}`
    );
  }
  return { results, succeeded, failed: results.length - succeeded, ...timedOut };
};

export const caseActions: ConnectorSpec['actions'] = {
  getCases: {
    isTool: true,
    scope: 'read',
    description:
      'Search cases by id, status, severity, creation or modification time. Returns reply.DATA[] (case_id, case_name, severity, status_progress, issue_ids, assigned_user_mail) with TOTAL_COUNT and FILTER_COUNT.',
    input: GetCasesInputSchema,
    handler: async (ctx, input: GetCasesInput) => {
      const filters: Filter[] = [];
      pushFilter(filters, 'case_id', 'in', input.caseId !== undefined ? [input.caseId] : undefined);
      pushFilter(filters, 'status_progress', 'in', input.status);
      pushFilter(filters, 'severity', 'in', input.severity);
      pushFilter(filters, 'creation_time', 'gte', input.createdAfter);
      pushFilter(filters, 'creation_time', 'lte', input.createdBefore);
      pushFilter(filters, 'modification_time', 'gte', input.modifiedAfter);
      pushFilter(filters, 'modification_time', 'lte', input.modifiedBefore);
      return search(
        ctx,
        '/case/search',
        { filters, ...sortOf(input.sortField, input.sortOrder) },
        input
      );
    },
  },
  getCaseDetails: {
    isTool: true,
    scope: 'read',
    description:
      'Get one case with its file and network artifacts and its issues (up to 100). found is false for an unknown case id; parts that could not be read are listed in errors.',
    input: GetCaseDetailsInputSchema,
    handler: async (ctx, input: GetCaseDetailsInput) => getCaseDetails(ctx, input),
  },
  getIssues: {
    isTool: true,
    scope: 'read',
    description:
      'Search issues by id, detection method, severity, status or insert time. Returns reply.DATA[] with TOTAL_COUNT and FILTER_COUNT.',
    input: GetIssuesInputSchema,
    handler: async (ctx, input: GetIssuesInput) => {
      const filters: Filter[] = [];
      pushFilter(filters, 'id', 'in', input.ids);
      pushFilter(filters, 'severity', 'in', input.severity);
      pushFilter(filters, 'detection.method', 'in', input.detectionMethod);
      pushFilter(filters, 'status.progress', 'in', input.status);
      pushFilter(filters, '_insert_time', 'gte', input.insertedAfter);
      pushFilter(filters, '_insert_time', 'lte', input.insertedBefore);
      return search(
        ctx,
        '/issue/search',
        {
          filters,
          include_evidences: input.includeEvidences,
          ...sortOf(input.sortField, input.sortOrder),
        },
        input
      );
    },
  },
  updateCase: {
    isTool: true,
    scope: 'destroy',
    description:
      'Update one case: status, manual severity, assignee email or notes; resolving needs a resolve reason. Returns success with the fields sent.',
    input: UpdateCaseInputSchema,
    handler: async (ctx, input: UpdateCaseInput) => updateCase(ctx, input),
  },
  updateIssue: {
    isTool: true,
    scope: 'destroy',
    description:
      'Update the status, severity or resolution of 1-50 issues. Each issue is updated on its own; returns results[] per issue (notFound true for an unknown id) with succeeded and failed counts. Fails when no issue was updated.',
    input: UpdateIssueInputSchema,
    handler: async (ctx, input: UpdateIssueInput) => updateIssues(ctx, input),
  },
};
