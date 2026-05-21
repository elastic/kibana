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
 * Integrates with Workday's REST API (v1) to expose HR and workforce data to AI agents.
 * Scoped to low-sensitivity, read-only operations only — no compensation, payroll, or personal contact data.
 *
 * Requires OAuth 2.0 Authorization Code authentication with scopes:
 *   Worker Profile and Skills, Organizations and Roles, Time Off and Leave, Staffing, Tenant Non-Configurable
 * Base URL format: https://<tenant>.workday.com/ccx/api/v1/<tenant>/
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import {
  SearchWorkersInputSchema,
  GetWorkerInputSchema,
  GetDirectReportsInputSchema,
  ListOrganizationsInputSchema,
  GetOrganizationInputSchema,
  ListJobPostingsInputSchema,
  GetJobPostingInputSchema,
  GetTimeOffBalanceInputSchema,
  ListAbsenceTypesInputSchema,
  ListInboxTasksInputSchema,
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
  ListInboxTasksInput,
} from './types';

export const Workday: ConnectorSpec = {
  metadata: {
    id: '.workday',
    displayName: 'Workday',
    description: i18n.translate('core.kibanaConnectorSpecs.workday.metadata.description', {
      defaultMessage:
        'Search workers, browse org hierarchy, list job postings, and retrieve time off balances and inbox tasks in Workday',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          scope:
            'Worker Profile and Skills Organizations and Roles Time Off and Leave Staffing Tenant Non-Configurable',
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://wd2-impl-services1.workday.com/ccx/oauth2/<tenant>/authorize',
              helpText:
                "Replace '<tenant>' with your Workday tenant name (e.g. mycompany). Found in your Workday OAuth client registration.",
            },
            tokenUrl: {
              placeholder: 'https://wd2-impl-services1.workday.com/ccx/oauth2/<tenant>/token',
              helpText:
                "Replace '<tenant>' with your Workday tenant name (e.g. mycompany). Found in your Workday OAuth client registration.",
            },
            scope: { hidden: true },
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
          'https://<tenant>.workday.com/ccx/api/v1/<tenantName>/...'
      )
      .meta({
        label: 'Tenant URL',
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
    searchWorkers: {
      isTool: true,
      description:
        'Search for workers (employees and contingent workers) in Workday by name. ' +
        'Returns a list of matching worker summaries including IDs, names, and titles. ' +
        'Use the returned id (WID) with getWorker to retrieve the full worker profile.',
      input: SearchWorkersInputSchema,
      handler: async (ctx, input: SearchWorkersInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/workers`;

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
        'Use the WID returned by the searchWorkers action.',
      input: GetWorkerInputSchema,
      handler: async (ctx, input: GetWorkerInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/workers/${encodeURIComponent(
          input.workerId
        )}`;

        const response = await ctx.client.get(url, {});

        return response.data;
      },
    },

    getDirectReports: {
      isTool: true,
      description:
        'Get the list of direct reports for a given worker or manager in Workday. ' +
        'Returns worker summaries (name, job title, WID) for everyone who reports directly to the specified worker. ' +
        'Use the WID returned by searchWorkers or getWorker to look up a manager.',
      input: GetDirectReportsInputSchema,
      handler: async (ctx, input: GetDirectReportsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/workers/${encodeURIComponent(
          input.workerId
        )}/directReports`;

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
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/organizations`;

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
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/organizations/${encodeURIComponent(
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
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/jobPostings`;

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
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/jobPostings/${encodeURIComponent(
          input.jobPostingId
        )}`;

        const response = await ctx.client.get(url, {});

        return response.data;
      },
    },

    getTimeOffBalance: {
      isTool: true,
      description:
        "Retrieve the authenticated worker's own time off balances by their WID. " +
        'Returns days available and days used per absence plan (e.g. vacation, sick leave). ' +
        "Only returns data for the authenticated user — cannot query another worker's balances.",
      input: GetTimeOffBalanceInputSchema,
      handler: async (ctx, input: GetTimeOffBalanceInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/workers/${encodeURIComponent(
          input.workerId
        )}/timeOffBalance`;

        const response = await ctx.client.get(url, {});

        return response.data;
      },
    },

    listAbsenceTypes: {
      isTool: true,
      description:
        'List all available time off and absence plan types defined in Workday. ' +
        'Returns reference data including plan name, type (vacation, sick, personal, etc.), and description. ' +
        'Use this to understand what absence plans are available before calling getTimeOffBalance.',
      input: ListAbsenceTypesInputSchema,
      handler: async (ctx, input: ListAbsenceTypesInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/absenceTypes`;

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
        "Retrieve the authenticated worker's own Workday inbox tasks and action items. " +
        'Returns up to 100 tasks in descending order (most recent first), including title, subject, ' +
        'business process, status, step type, assigned date, and due date. ' +
        'Only returns tasks for the authenticated user. Requires Staffing and Tenant Non-Configurable scopes.',
      input: ListInboxTasksInputSchema,
      handler: async (ctx, input: ListInboxTasksInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/inbox_tasks`;

        const response = await ctx.client.get(url, {
          params: {
            limit: Math.min(input.limit ?? 100, 100),
            ...(input.offset !== undefined && { offset: input.offset }),
          },
        });

        return response.data;
      },
    },
  },

  skill: [
    '## Workday Connector — LLM usage guidance',
    '',
    '### Finding employees',
    'Use `searchWorkers` with a name string to locate employees. The response includes a worker `id` (WID) and summary fields.',
    'Call `getWorker` with that WID for the full professional profile (job title, department, work location, hire date, work email, manager).',
    'Call `getDirectReports` with a manager WID to list who reports to them.',
    '',
    '### Navigating the org hierarchy',
    'Call `listOrganizations` with `type: "supervisory"` to list departments and reporting teams.',
    'Use `getOrganization` with the returned WID to get hierarchy and manager details.',
    '',
    '### Job postings',
    'Use `listJobPostings` with `status: "open"` to find active internal requisitions.',
    'Use `getJobPosting` with the returned WID to get the full job description and requirements.',
    '',
    '### Time off',
    'Call `listAbsenceTypes` first to discover what absence plans are configured in the tenant.',
    "Call `getTimeOffBalance` with the authenticated worker's WID to see their available and used days per plan.",
    "Note: `getTimeOffBalance` only returns data for the authenticated user — it cannot be used to query another worker's balances.",
    '',
    '### Inbox tasks',
    "Call `listInboxTasks` to retrieve the authenticated worker's pending action items and approvals in Workday.",
    'Returns up to 100 tasks (most recent first). Use `offset` to page if needed.',
    '',
    '### Pagination',
    'All list actions support `limit` (max 100) and `offset` for paging through results.',
    'If results appear truncated, increment `offset` by the `limit` value to fetch the next page.',
    '',
    '### Authentication & tenant setup',
    'This connector uses OAuth 2.0 Authorization Code flow. Register an API client in Workday with:',
    '  - Grant type: Authorization Code',
    '  - Scopes: Worker Profile and Skills, Organizations and Roles, Time Off and Leave, Staffing, Tenant Non-Configurable',
    'The authorization and token URLs follow the pattern:',
    '  https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/authorize',
    '  https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/token',
    'Replace <tenantName> with the same value entered in the "Tenant Name" connector field.',
    '',
    '### Data safety',
    'This connector is intentionally scoped to work-safe, read-only fields.',
    'Compensation, payroll, personal contact info, performance ratings, and medical data are not accessible.',
    '',
    '### Common gotchas',
    '- WIDs are opaque identifiers — always obtain them from a prior search/list action.',
    '- `listInboxTasks` and `getTimeOffBalance` only return data for the authenticated OAuth user.',
    '- The Workday REST API is read-only for the operations exposed by this connector.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.workday.test.description', {
      defaultMessage: 'Verifies Workday connection by listing up to one worker',
    }),
    handler: async (ctx) => {
      try {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = (tenantUrl as string).replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/workers`;

        await ctx.client.get(url, { params: { limit: 1 } });

        return {
          ok: true,
          message: 'Successfully connected to Workday',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
