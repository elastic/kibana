/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Workday Connector
 *
 * Integrates with Workday's REST APIs to expose HR, workforce, recruiting, and absence data to AI agents.
 * Scoped to low-sensitivity operations only — no compensation, payroll, or personal contact data.
 *
 * Supports OAuth 2.0 Authorization Code (per-user) and Client Credentials (machine-to-machine) authentication.
 * Required scopes for Authorization Code:
 *   Worker Profile and Skills, Organizations and Roles, Time Off and Leave, Staffing,
 *   Tenant Non-Configurable, Recruiting
 */

// Bump these when Workday releases a newer module version.
const COMMON_API_VERSION = 'v1';
const RECRUITING_API_VERSION = 'v4';
const ABSENCE_API_VERSION = 'v5';
const HOLIDAY_API_VERSION = 'v1';

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import {
  SearchWorkersInputSchema,
  WhoAmIInputSchema,
  GetWorkerInputSchema,
  GetDirectReportsInputSchema,
  ListOrganizationsInputSchema,
  GetOrganizationInputSchema,
  ListJobPostingsInputSchema,
  GetJobPostingInputSchema,
  GetTimeOffBalanceInputSchema,
  ListAbsenceTypesInputSchema,
  ListTimeOffEntriesInputSchema,
  ListInboxTasksInputSchema,
  ListCandidatesInputSchema,
  ListHolidaysInputSchema,
} from './types';
import type {
  SearchWorkersInput,
  GetWorkerInput,
  GetDirectReportsInput,
  ListOrganizationsInput,
  GetOrganizationInput,
  ListJobPostingsInput,
  GetJobPostingInput,
  GetTimeOffBalanceInput,
  ListAbsenceTypesInput,
  ListTimeOffEntriesInput,
  ListInboxTasksInput,
  ListCandidatesInput,
  ListHolidaysInput,
} from './types';

export const Workday: ConnectorSpec = {
  metadata: {
    id: '.workday',
    displayName: 'Workday',
    description: i18n.translate('core.kibanaConnectorSpecs.workday.metadata.description', {
      defaultMessage:
        'Search workers, browse org charts, retrieve time off, and explore recruiting in Workday',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          scope: '',
          useBasicAuth: false,
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://<tenant>.workday.com/ccx/oauth2/<tenant>/authorize',
              helpText:
                "Replace '<tenant>' with your Workday tenant name, for example https://mycompany.workday.com/ccx/oauth2/mycompany/authorize",
            },
            tokenUrl: {
              placeholder: 'https://<tenant>.workday.com/ccx/oauth2/<tenant>/token',
              helpText:
                "Replace '<tenant>' with your Workday tenant name, for example https://mycompany.workday.com/ccx/oauth2/mycompany/token",
            },
            scope: {
              hidden: true,
              helpText:
                'Leave this field empty — the OAuth server grants all scopes registered with the client.',
            },
          },
        },
      },
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: '',
        },
        overrides: {
          meta: {
            tokenUrl: {
              placeholder: 'https://<tenant>.workday.com/ccx/oauth2/<tenant>/token',
              helpText:
                "Replace '<tenant>' with your Workday tenant name, for example https://mycompany.workday.com/ccx/oauth2/mycompany/token",
            },
            scope: {
              hidden: true,
              helpText:
                'Leave this field empty — the OAuth server grants all scopes registered with the client.',
            },
          },
        },
      },
    ],
  },

  schema: z.object({
    tenantUrl: UISchemas.url('https://<tenant>.workday.com')
      .describe(
        'Base URL of your Workday tenant, e.g. https://mycompany.workday.com. ' +
          'Used to construct API endpoint URLs in the form ' +
          'https://<tenant>.workday.com/ccx/api/<module>/<version>/<tenantName>/...'
      )
      .meta({
        label: 'Tenant URL',
        validate: { allowedHosts: true },
        placeholder: 'https://mycompany.workday.com',
        helpText: 'Your Workday tenant base URL. Find it in the URL when you log in to Workday.',
      }),
    tenantName: z
      .string()
      .describe(
        'Your Workday tenant name (the identifier that appears in the API path). ' +
          'Example: if your tenant URL is https://mycompany.workday.com, your tenant name is "mycompany".'
      )
      .meta({
        label: 'Tenant Name',
        placeholder: 'mycompany',
        helpText:
          'The tenant identifier used in API paths. Usually matches your company name in the Workday URL.',
      }),
  }),

  actions: {
    whoAmI: {
      isTool: true,
      description:
        "Retrieve the authenticated user's own Workday worker profile. " +
        'Returns job title, department, work location, hire date, and manager. ' +
        "Use this to get the current user's WID before calling other worker-scoped actions.",
      input: WhoAmIInputSchema,
      handler: async (ctx) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/workers/me`;
        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    searchWorkers: {
      isTool: true,
      description:
        'Search for workers (employees and contingent workers) in Workday by name. ' +
        'Returns a list of matching worker summaries including IDs, names, and titles. ' +
        'Pass the name (or partial name) in the `search` field  — Workday matches substrings. ' +
        'Use the returned id (WID) with getWorker to retrieve the full worker profile.',
      input: SearchWorkersInputSchema,
      handler: async (ctx, input: SearchWorkersInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/workers`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.search && { search: input.search }),
          },
        });

        return response.data;
      },
    },

    getWorker: {
      isTool: true,
      description:
        'Retrieve the full professional profile of a single Workday worker by their WID. ' +
        'Returns job title, department, work location, hire date, work email, and manager name. ' +
        'Excludes compensation, personal contact info, and performance data. ' +
        "Omit workerId to retrieve the current user's own profile. " +
        'Use the WID returned by the searchWorkers action.',
      input: GetWorkerInputSchema,
      handler: async (ctx, input: GetWorkerInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const workerSegment = resolvedWorkerId(input.workerId);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/workers/${workerSegment}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    getDirectReports: {
      isTool: true,
      description:
        'Get the list of direct reports for a given worker or manager in Workday. ' +
        'Returns worker summaries (name, job title, WID) for everyone who reports directly to the specified worker. ' +
        'Omit workerId to retrieve direct reports for the current authenticated user. ' +
        'Use the WID returned by searchWorkers or getWorker to look up a manager.',
      input: GetDirectReportsInputSchema,
      handler: async (ctx, input: GetDirectReportsInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const workerSegment = resolvedWorkerId(input.workerId);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/workers/${workerSegment}/directReports`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    listOrganizations: {
      isTool: true,
      description:
        'List Workday organizational units such as supervisory orgs (departments/teams), ' +
        'companies, cost centers, and regions. ' +
        'Returns organization summaries with IDs and names. ' +
        'Use the returned id (WID) with getOrganization for full details, or to look up members.',
      input: ListOrganizationsInputSchema,
      handler: async (ctx, input: ListOrganizationsInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/organizations`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.type && { type: input.type }),
          },
        });

        return response.data;
      },
    },

    getOrganization: {
      isTool: true,
      description:
        'Retrieve full details of a single Workday organization by its WID. ' +
        'Returns the organization name, type, hierarchy level, manager, and member count. ' +
        'Use the WID returned by the listOrganizations action.',
      input: GetOrganizationInputSchema,
      handler: async (ctx, input: GetOrganizationInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/organizations/${encodeURIComponent(
          input.organizationId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    listJobPostings: {
      isTool: true,
      description:
        'List active or closed job postings in Workday. ' +
        'Returns job posting summaries including title, requisition ID, location, ' +
        'and posting status. ' +
        'Use the returned id (WID) with getJobPosting for the full job description.',
      input: ListJobPostingsInputSchema,
      handler: async (ctx, input: ListJobPostingsInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/recruiting/${RECRUITING_API_VERSION}/${tenantName}/jobPostings`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    getJobPosting: {
      isTool: true,
      description:
        'Retrieve the full details of a single Workday job posting by its WID. ' +
        'Returns the job title, full description, requirements, location, hiring manager, and requisition ID. ' +
        'Use the WID returned by the listJobPostings action.',
      input: GetJobPostingInputSchema,
      handler: async (ctx, input: GetJobPostingInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/recruiting/${RECRUITING_API_VERSION}/${tenantName}/jobPostings/${encodeURIComponent(
          input.jobPostingId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    getTimeOffBalance: {
      isTool: true,
      description:
        'Retrieve absence plan balances for a worker (days available and accrued per plan). ' +
        'Returns current balances across all absence plans (vacation, sick, personal, etc.). ' +
        "Pass workerId to look up a specific worker; omit to get the authenticated user's own balances. " +
        'Use effective to get balances as of a past or future date.',
      input: GetTimeOffBalanceInputSchema,
      handler: async (ctx, input: GetTimeOffBalanceInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/absenceManagement/${ABSENCE_API_VERSION}/${tenantName}/balances`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            worker: input.workerId ?? 'me',
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.effective && { effective: input.effective }),
          },
        });

        return response.data;
      },
    },

    listTimeOffEntries: {
      isTool: true,
      description:
        'List time off entries (approved, submitted, or pending requests) for a worker. ' +
        'Returns individual time off bookings with dates, hours, and status. ' +
        'Omit workerId to retrieve entries for the current authenticated user. ' +
        'Use fromDate/toDate to scope to a date range.',
      input: ListTimeOffEntriesInputSchema,
      handler: async (ctx, input: ListTimeOffEntriesInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const workerSegment = resolvedWorkerId(input.workerId);
        const url = `${base}/ccx/api/absenceManagement/${ABSENCE_API_VERSION}/${tenantName}/workers/${workerSegment}/timeOffDetails`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.fromDate && { fromDate: input.fromDate }),
            ...(input.toDate && { toDate: input.toDate }),
          },
        });

        return response.data;
      },
    },

    listAbsenceTypes: {
      isTool: true,
      description:
        'List eligible absence plan types for a worker (vacation, sick leave, personal, etc.). ' +
        'Returns plan names and types the worker is eligible to use. ' +
        "Omit workerId to get the current user's own eligible types. " +
        'Use this to understand what absence plans are available before calling getTimeOffBalance.',
      input: ListAbsenceTypesInputSchema,
      handler: async (ctx, input: ListAbsenceTypesInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const workerSegment = resolvedWorkerId(input.workerId);
        const url = `${base}/ccx/api/absenceManagement/${ABSENCE_API_VERSION}/${tenantName}/workers/${workerSegment}/eligibleAbsenceTypes`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    listInboxTasks: {
      isTool: true,
      description:
        'Retrieve Workday inbox tasks and pending action items for a worker. ' +
        'Returns task summaries including title, subject, business process, and status. ' +
        'Omit workerId to retrieve tasks for the current authenticated user.',
      input: ListInboxTasksInputSchema,
      handler: async (ctx, input: ListInboxTasksInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const workerSegment = resolvedWorkerId(input.workerId);
        const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/workers/${workerSegment}/inboxTasks`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    // =========================================================================
    // Recruiting (v4) — scope: Recruiting
    // =========================================================================

    listCandidates: {
      isTool: true,
      description:
        'List candidates in Workday from the Recruiting API. ' +
        'Returns candidate name, stage, and application date. ' +
        'Optionally filter by job requisition WID or candidate status (Active, Hired, Declined). ' +
        'Pass a jobRequisitionId WID to scope results to a specific role.',
      input: ListCandidatesInputSchema,
      handler: async (ctx, input: ListCandidatesInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/recruiting/${RECRUITING_API_VERSION}/${tenantName}/candidates`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.jobRequisitionId !== undefined && {
              jobRequisitionId: input.jobRequisitionId,
            }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    // =========================================================================
    // Holiday (v1) — scopes: Time Off and Leave, Time Tracking
    // =========================================================================

    listHolidays: {
      isTool: true,
      description:
        'List holiday events for one or more workers in Workday. ' +
        'Returns holiday name, date, and calendar for each event. ' +
        'Both workerIds and a fromDate/toDate date range are required — omitting either returns empty results. ' +
        'Always call whoAmI first to obtain a WID for the current user.',
      input: ListHolidaysInputSchema,
      handler: async (ctx, input: ListHolidaysInput) => {
        const { base, tenantName } = getBaseUrl(ctx);
        const url = `${base}/ccx/api/holiday/${HOLIDAY_API_VERSION}/${tenantName}/holidayEvents`;

        // worker is collectionFormat:multi — build with URLSearchParams to get ?worker=a&worker=b
        const params = new URLSearchParams();
        params.set('limit', String(input.limit));
        if (input.offset !== undefined) params.set('offset', String(input.offset));
        params.set('fromDate', input.fromDate);
        params.set('toDate', input.toDate);
        for (const id of input.workerIds) params.append('worker', id);

        const response = await ctx.client.get(url, { params });

        return response.data;
      },
    },
  },

  skill: [
    'Action strategy:',
    '- Current user: call `whoAmI` to get your own WID and profile without needing to search.',
    "- Workers: call `searchWorkers` to get WIDs, then `getWorker` for a full profile or `getDirectReports` for a manager's direct reports.",
    '- Org hierarchy: `listOrganizations` returns WIDs; use `getOrganization` for hierarchy and member details.',
    '- Time off balances: call `getTimeOffBalance` with a workerId (or omit for the current user). All plan balances are returned.',
    '- Time off entries: call `listTimeOffEntries` for actual booked time off requests; filter by fromDate/toDate.',
    '- Recruiting: `listJobPostings` for open roles; use `listCandidates` with a known `jobRequisitionId` WID to scope to a role.',
    '- Inbox: call `listInboxTasks` to see pending action items for the current user.',
    '- Holidays: call `listHolidays` with workerIds and a fromDate/toDate range.',
    '',
    'Gotchas:',
    '- WIDs are opaque; always obtain them from a prior search/list call.',
    '- `searchWorkers` passes the search value as the `search` parameter; space-delimited terms are OR-matched, so prefer a single name token (e.g. "John").',
    '- All worker-scoped actions default to the currently authenticated OAuth user when workerId is omitted.',
    '- Pagination: all list actions support `limit` (max 100) and `offset`; increment `offset` by `limit` to page.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.workday.test.description', {
      defaultMessage: 'Verifies Workday connection by listing up to one worker',
    }),
    handler: async (ctx) => {
      const { base, tenantName } = getBaseUrl(ctx);
      const url = `${base}/ccx/api/common/${COMMON_API_VERSION}/${tenantName}/workers`;

      await ctx.client.get(url, { params: { limit: 1 } });

      return {
        message: 'Successfully connected to Workday',
      };
    },
  },
};

function getBaseUrl(ctx: ActionContext): { base: string; tenantName: string } {
  const { tenantUrl, tenantName } = ctx.config as { tenantUrl: string; tenantName: string };
  return {
    base: tenantUrl.replace(/\/+$/, ''),
    tenantName: encodeURIComponent(tenantName),
  };
}

function resolvedWorkerId(workerId: string | undefined) {
  return workerId ? encodeURIComponent(workerId) : 'me';
}
