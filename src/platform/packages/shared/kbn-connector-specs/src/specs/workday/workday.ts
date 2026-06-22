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
 * Integrates with Workday's REST APIs to expose HR, workforce, recruiting, learning,
 * expense, project, procurement, budget, and revenue data to AI agents.
 * Scoped to low-sensitivity operations only — no compensation, payroll, or personal contact data.
 *
 * Supports OAuth 2.0 Authorization Code (per-user) and Client Credentials (machine-to-machine) authentication.
 * Required scopes for Authorization Code:
 *   Worker Profile and Skills, Organizations and Roles, Time Off and Leave, Staffing,
 *   Tenant Non-Configurable, Recruiting, Learning Core, Expenses, Benefits, Journeys,
 *   Time Tracking, Projects, Procurement, Budgets, Project Billing, Project Tracking
 * Base URL format: https://<tenant>.workday.com/ccx/api/v1/<tenant>/
 * Additional API base paths:
 *   Recruiting v4: /ccx/api/recruiting/v4/<tenant>/
 *   Learning v1:   /ccx/api/learning/v1/<tenant>/
 *   Expense v1:    /ccx/api/expense/v1/<tenant>/
 *   Requests v2:   /ccx/api/v2/<tenant>/
 *   Journeys v1:   /ccx/api/journeys/v1/<tenant>/
 *   Projects v3:   /ccx/api/project/v3/<tenant>/
 *   Procurement v5:/ccx/api/procurement/v5/<tenant>/
 *   Budgets v1:    /ccx/api/budget/v1/<tenant>/
 *   Revenue v1:    /ccx/api/revenue/v1/<tenant>/
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
  ListJobRequisitionsInputSchema,
  GetJobRequisitionInputSchema,
  ListCandidatesInputSchema,
  ListCoursesInputSchema,
  GetCourseInputSchema,
  ListEnrollmentsInputSchema,
  ListExpenseReportsInputSchema,
  GetExpenseReportInputSchema,
  ListRequestTypesInputSchema,
  ListRequestsInputSchema,
  ListJourneysInputSchema,
  ListHolidaysInputSchema,
  ListProjectsInputSchema,
  GetProjectInputSchema,
  ListPurchaseRequisitionsInputSchema,
  GetPurchaseRequisitionInputSchema,
  ListPurchaseOrdersInputSchema,
  CheckBudgetInputSchema,
  ListProjectRevenueInputSchema,
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
  ListJobRequisitionsInput,
  GetJobRequisitionInput,
  ListCandidatesInput,
  ListCoursesInput,
  GetCourseInput,
  ListEnrollmentsInput,
  ListExpenseReportsInput,
  GetExpenseReportInput,
  ListRequestTypesInput,
  ListRequestsInput,
  ListJourneysInput,
  ListHolidaysInput,
  ListProjectsInput,
  GetProjectInput,
  ListPurchaseRequisitionsInput,
  GetPurchaseRequisitionInput,
  ListPurchaseOrdersInput,
  CheckBudgetInput,
  ListProjectRevenueInput,
} from './types';

export const Workday: ConnectorSpec = {
  metadata: {
    id: '.workday',
    displayName: 'Workday',
    description: i18n.translate('core.kibanaConnectorSpecs.workday.metadata.description', {
      defaultMessage:
        'Search workers, browse org charts, manage recruiting, learning, expenses, and projects in Workday',
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
          scope: '',
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://wd2-impl-services1.workday.com/ccx/oauth2/<tenant>/authorize',
              helpText:
                "Replace '<tenant>' with your Workday tenant name, for example https://wd2-impl-services1.workday.com/ccx/oauth2/mycompany/authorize ",
            },
            tokenUrl: {
              placeholder: 'https://wd2-impl-services1.workday.com/ccx/oauth2/<tenant>/token',
              helpText:
                "Replace '<tenant>' with your Workday tenant name, for example https://wd2-impl-services1.workday.com/ccx/oauth2/mycompany/token",
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
              placeholder: 'https://wd2-impl-services1.workday.com/ccx/oauth2/<tenant>/token',
              helpText:
                "Replace '<tenant>' with your Workday tenant name, for example https://wd2-impl-services1.workday.com/ccx/oauth2/mycompany/token",
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

    // =========================================================================
    // Recruiting (v4) — scope: Recruiting
    // =========================================================================

    listJobRequisitions: {
      isTool: true,
      description:
        'List job requisitions in Workday from the Recruiting API. ' +
        'Returns requisition summaries including title, department, location, and requisition ID. ' +
        'Optionally filter by status (Open, Closed, Frozen). ' +
        'Use the returned id (WID) with getJobRequisition for full details.',
      input: ListJobRequisitionsInputSchema,
      handler: async (ctx, input: ListJobRequisitionsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/recruiting/v4/${tenantName}/jobRequisitions`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    getJobRequisition: {
      isTool: true,
      description:
        'Get full details of a single Workday job requisition by its WID. ' +
        'Returns title, hiring manager, department, location, opening count, and status. ' +
        'Use the WID returned by the listJobRequisitions action.',
      input: GetJobRequisitionInputSchema,
      handler: async (ctx, input: GetJobRequisitionInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/recruiting/v4/${tenantName}/jobRequisitions/${encodeURIComponent(
          input.jobRequisitionId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    listCandidates: {
      isTool: true,
      description:
        'List candidates in Workday from the Recruiting API. ' +
        'Returns candidate name, stage, and application date. ' +
        'Optionally filter by job requisition WID or candidate status (Active, Hired, Declined). ' +
        'Use the jobRequisitionId (WID) from listJobRequisitions to scope results to a specific role.',
      input: ListCandidatesInputSchema,
      handler: async (ctx, input: ListCandidatesInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/recruiting/v4/${tenantName}/candidates`;

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
    // Learning (v1) — scope: Learning Core
    // =========================================================================

    listCourses: {
      isTool: true,
      description:
        'List courses in the Workday learning catalog. ' +
        'Returns course title, description, duration, and ID. ' +
        'Optionally filter by a search keyword to find courses by title. ' +
        'Use the returned id (WID) with getCourse for full course details.',
      input: ListCoursesInputSchema,
      handler: async (ctx, input: ListCoursesInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/learning/v1/${tenantName}/courses`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.search !== undefined && { search: input.search }),
          },
        });

        return response.data;
      },
    },

    getCourse: {
      isTool: true,
      description:
        'Get full details of a single Workday learning course by its WID. ' +
        'Returns description, objectives, duration, and enrollment status. ' +
        'Use the WID returned by the listCourses action.',
      input: GetCourseInputSchema,
      handler: async (ctx, input: GetCourseInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/learning/v1/${tenantName}/courses/${encodeURIComponent(
          input.courseId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    listEnrollments: {
      isTool: true,
      description:
        'List course enrollments for a specific worker in Workday. ' +
        'Returns enrollment records including course title, status, and progress. ' +
        'Requires the worker WID (from searchWorkers). ' +
        'Optionally filter by enrollment status (Enrolled, Completed, Withdrawn).',
      input: ListEnrollmentsInputSchema,
      handler: async (ctx, input: ListEnrollmentsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/learning/v1/${tenantName}/learnerCourseEnrollments`;

        const response = await ctx.client.get(url, {
          params: {
            workerId: input.workerId,
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    // =========================================================================
    // Expense (v1) — scope: Expenses
    // =========================================================================

    listExpenseReports: {
      isTool: true,
      description:
        'List expense reports in Workday. ' +
        'Returns expense report summaries including submitter, total amount, and approval status. ' +
        'Optionally filter by worker WID or status (Draft, In Progress, Approved, Paid). ' +
        'Use the returned id (WID) with getExpenseReport for full details including line items.',
      input: ListExpenseReportsInputSchema,
      handler: async (ctx, input: ListExpenseReportsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/expense/v1/${tenantName}/expenseReports`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.workerId !== undefined && { workerId: input.workerId }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    getExpenseReport: {
      isTool: true,
      description:
        'Get full details of a single Workday expense report by its WID. ' +
        'Returns line items, amounts, currency, merchant details, and approval status. ' +
        'Use the WID returned by the listExpenseReports action.',
      input: GetExpenseReportInputSchema,
      handler: async (ctx, input: GetExpenseReportInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/expense/v1/${tenantName}/expenseReports/${encodeURIComponent(
          input.expenseReportId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    // =========================================================================
    // Requests (v2) — scopes: Tenant Non-Configurable, Benefits
    // =========================================================================

    listRequestTypes: {
      isTool: true,
      description:
        'List available self-service request types in Workday (e.g. address change, benefits enrollment). ' +
        'Returns the catalog of request types the authenticated worker can initiate. ' +
        'Use this to discover what kinds of requests are available before calling listRequests.',
      input: ListRequestTypesInputSchema,
      handler: async (ctx, input: ListRequestTypesInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v2/${tenantName}/requestTypes`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    listRequests: {
      isTool: true,
      description:
        'List self-service requests submitted by the authenticated worker in Workday. ' +
        'Returns request summaries including type, status, and submission date. ' +
        'Optionally filter by status (In Progress, Completed, Cancelled).',
      input: ListRequestsInputSchema,
      handler: async (ctx, input: ListRequestsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v2/${tenantName}/requests`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    // =========================================================================
    // Journeys (v1) — scope: Journeys
    // =========================================================================

    listJourneys: {
      isTool: true,
      description:
        'List available employee journeys and career/life events for the authenticated worker in Workday. ' +
        'Returns journey summaries including title, type, and current step. ' +
        'Journeys guide workers through multi-step HR processes such as onboarding, role changes, or life events.',
      input: ListJourneysInputSchema,
      handler: async (ctx, input: ListJourneysInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/journeys/v1/${tenantName}/journeys`;

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
    // Holiday (v1) — scopes: Time Off and Leave, Time Tracking
    // =========================================================================

    listHolidays: {
      isTool: true,
      description:
        'List holiday calendar entries for a worker in Workday. ' +
        'Returns holiday names, dates, and calendar details. ' +
        'Optionally filter by worker WID or year (e.g. 2025) to scope results.',
      input: ListHolidaysInputSchema,
      handler: async (ctx, input: ListHolidaysInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/v1/${tenantName}/holidayCalendars`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.workerId !== undefined && { workerId: input.workerId }),
            ...(input.year !== undefined && { year: input.year }),
          },
        });

        return response.data;
      },
    },

    // =========================================================================
    // Projects (v3) — scope: Projects
    // =========================================================================

    listProjects: {
      isTool: true,
      description:
        'List projects in Workday. ' +
        'Returns project summaries including name, status, start date, and end date. ' +
        'Optionally filter by status (In Progress, Completed, Cancelled). ' +
        'Use the returned id (WID) with getProject for full details including phases and resource assignments.',
      input: ListProjectsInputSchema,
      handler: async (ctx, input: ListProjectsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/project/v3/${tenantName}/projects`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    getProject: {
      isTool: true,
      description:
        'Get full details of a single Workday project by its WID. ' +
        'Returns phases, resource assignments, forecast data, budget, and status. ' +
        'Use the WID returned by the listProjects action.',
      input: GetProjectInputSchema,
      handler: async (ctx, input: GetProjectInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/project/v3/${tenantName}/projects/${encodeURIComponent(
          input.projectId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    // =========================================================================
    // Procurement (v5) — scope: Procurement
    // =========================================================================

    listPurchaseRequisitions: {
      isTool: true,
      description:
        'List purchase requisitions in Workday. ' +
        'Returns requisition summaries including requester, total amount, and approval status. ' +
        'Optionally filter by status (Draft, In Progress, Approved, Cancelled). ' +
        'Use the returned id (WID) with getPurchaseRequisition for full details including line items.',
      input: ListPurchaseRequisitionsInputSchema,
      handler: async (ctx, input: ListPurchaseRequisitionsInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/procurement/v5/${tenantName}/purchaseRequisitions`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    getPurchaseRequisition: {
      isTool: true,
      description:
        'Get full details of a single Workday purchase requisition by its WID. ' +
        'Returns line items, amounts, vendor details, and approval status. ' +
        'Use the WID returned by the listPurchaseRequisitions action.',
      input: GetPurchaseRequisitionInputSchema,
      handler: async (ctx, input: GetPurchaseRequisitionInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/procurement/v5/${tenantName}/purchaseRequisitions/${encodeURIComponent(
          input.purchaseRequisitionId
        )}`;

        const response = await ctx.client.get(url, {});
        return response.data;
      },
    },

    listPurchaseOrders: {
      isTool: true,
      description:
        'List purchase orders in Workday (read-only). ' +
        'Returns purchase order summaries including vendor, total amount, and status. ' +
        'Optionally filter by status (Open, Closed, Cancelled).',
      input: ListPurchaseOrdersInputSchema,
      handler: async (ctx, input: ListPurchaseOrdersInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/procurement/v5/${tenantName}/purchaseOrders`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.status !== undefined && { status: input.status }),
          },
        });

        return response.data;
      },
    },

    // =========================================================================
    // Budgets (v1) — scope: Budgets
    // =========================================================================

    checkBudget: {
      isTool: true,
      description:
        'Check budget availability for a proposed transaction in Workday. ' +
        'This is a read-only check — it does not create or modify any data. ' +
        'Requires a budget structure WID and a proposed amount. ' +
        'Optionally specify currency code (e.g. "USD") and a cost center WID to scope the check. ' +
        'Returns whether sufficient budget is available for the proposed amount.',
      input: CheckBudgetInputSchema,
      handler: async (ctx, input: CheckBudgetInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/budget/v1/${tenantName}/budgetChecks`;

        const response = await ctx.client.post(url, {
          budgetStructureId: input.budgetStructureId,
          amount: input.amount,
          ...(input.currencyCode !== undefined && { currencyCode: input.currencyCode }),
          ...(input.costCenterId !== undefined && { costCenterId: input.costCenterId }),
        });

        return response.data;
      },
    },

    // =========================================================================
    // Revenue (v1) — scopes: Project Billing, Project Tracking
    // =========================================================================

    listProjectRevenue: {
      isTool: true,
      description:
        'List revenue data tied to projects in Workday. ' +
        'Returns revenue records including project, amount, billing status, and period. ' +
        'Optionally filter by project WID (from listProjects) to scope results to a single project.',
      input: ListProjectRevenueInputSchema,
      handler: async (ctx, input: ListProjectRevenueInput) => {
        const { tenantUrl, tenantName } = ctx.config as {
          tenantUrl: string;
          tenantName: string;
        };
        const base = tenantUrl.replace(/\/+$/, '');
        const url = `${base}/ccx/api/revenue/v1/${tenantName}/revenue`;

        const response = await ctx.client.get(url, {
          params: {
            limit: input.limit,
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.projectId !== undefined && { projectId: input.projectId }),
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
    '### Recruiting',
    'Use `listJobRequisitions` to list open, closed, or frozen job requisitions.',
    'Use `getJobRequisition` with a WID to get full details (hiring manager, department, location, opening count).',
    'Use `listCandidates` with an optional `jobRequisitionId` WID to filter candidates for a specific role.',
    'Filter `listCandidates` by `status` ("Active", "Hired", "Declined") to narrow results.',
    '',
    '### Learning',
    'Use `listCourses` with an optional `search` keyword to find courses in the learning catalog.',
    'Use `getCourse` with the WID from `listCourses` to get full course details including objectives.',
    'Use `listEnrollments` with a worker WID (required) to see their course history and progress.',
    'Filter `listEnrollments` by `status` ("Enrolled", "Completed", "Withdrawn") to narrow results.',
    '',
    '### Expenses',
    'Use `listExpenseReports` to list reports; optionally filter by `workerId` or `status`.',
    'Use `getExpenseReport` with the WID from `listExpenseReports` to get full line-item details.',
    '',
    '### Self-service requests',
    'Call `listRequestTypes` to discover available request categories (e.g. address change, benefits enrollment).',
    "Call `listRequests` to see the authenticated worker's submitted requests and their status.",
    '',
    '### Journeys',
    'Call `listJourneys` to see employee journeys and career/life events available to the authenticated worker.',
    '',
    '### Holidays',
    'Call `listHolidays` to retrieve holiday calendar entries. Optionally filter by `workerId` or `year`.',
    '',
    '### Projects',
    'Use `listProjects` to list projects; optionally filter by `status` ("In Progress", "Completed", "Cancelled").',
    'Use `getProject` with a WID to get full project details including phases, resource assignments, and forecast.',
    'Use `listProjectRevenue` to list revenue data; optionally filter by `projectId` WID.',
    '',
    '### Procurement',
    'Use `listPurchaseRequisitions` to list requisitions; filter by `status` if needed.',
    'Use `getPurchaseRequisition` with a WID to get full line-item and approval details.',
    'Use `listPurchaseOrders` to list purchase orders (read-only); filter by `status` if needed.',
    'Note: the Workday Procurement REST API does not expose a GET-by-ID endpoint for purchase orders.',
    'If you need line-item details for a specific PO, reference the `listPurchaseOrders` summary fields — no drill-down action is available.',
    '',
    '### Budgets',
    'Use `checkBudget` to verify budget availability before proposing a transaction.',
    'Required inputs: `budgetStructureId` (WID) and `amount`. Optional: `currencyCode` and `costCenterId`.',
    '',
    '### Pagination',
    'All list actions support `limit` (max 100) and `offset` for paging through results.',
    'If results appear truncated, increment `offset` by the `limit` value to fetch the next page.',
    '',
    '### Authentication & tenant setup',
    'This connector supports two OAuth 2.0 grant types. Choose based on your use case:',
    '',
    '**Authorization Code (per-user)** — each user authenticates interactively; actions run as that user.',
    'In Workday, search for "Register API Client for Integrations" and create a client with:',
    '  - Grant type: Authorization Code Grant',
    '  - Non-Expiring Refresh Tokens: enabled',
    '  - Functional Areas (scopes): select the areas needed for your use case —',
    '    Worker Profile and Skills, Organizations and Roles, Time Off and Leave, Staffing,',
    '    Tenant Non-Configurable, Recruiting, Learning Core, Expenses, Benefits, Journeys,',
    '    Time Tracking, Projects, Procurement, Budgets, Project Billing, Project Tracking',
    'The authorization and token URLs follow the pattern:',
    '  https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/authorize',
    '  https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/token',
    '',
    '**Client Credentials (machine-to-machine)** — a single service account token; no user interaction required.',
    'In Workday, search for "Register API Client for Integrations" and create a client with:',
    '  - Grant type: Client Credentials Grant',
    '  - Functional Areas (scopes): same set as above',
    'Enter the Client ID and Client Secret from the registered API client into the connector secrets.',
    'The token URL follows the same pattern:',
    '  https://wd2-impl-services1.workday.com/ccx/oauth2/<tenantName>/token',
    '',
    'For both grant types, the OAuth scope field in the connector should be left blank — Workday grants',
    'all Functional Areas registered with the API client automatically. Do not set the scope field manually.',
    'Replace <tenantName> with the same value entered in the "Tenant Name" connector field.',
    '',
    '### Data safety',
    'This connector is intentionally scoped to work-safe, read-only fields.',
    'Compensation, payroll, personal contact info, performance ratings, and medical data are not accessible.',
    '',
    '### Common gotchas',
    '- WIDs are opaque identifiers — always obtain them from a prior search/list action.',
    '- `listInboxTasks` and `getTimeOffBalance` only return data for the authenticated OAuth user.',
    '- `listEnrollments` requires a `workerId` (WID) — it is a required parameter.',
    '- `checkBudget` is a POST action that checks availability without creating a transaction.',
    '- The Workday REST API is read-only for the operations exposed by this connector (except checkBudget which is a POST for query semantics).',
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
