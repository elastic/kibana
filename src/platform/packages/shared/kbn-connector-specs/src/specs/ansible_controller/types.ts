/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_STRING_LENGTH = 2048;
const MAX_PAGE_SIZE = 100;
const MAX_EXTRA_VARS_JSON_CHARS = 65536;

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

const paginationFields = {
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe('Page number for paginated results (default: 1).'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .default(25)
    .describe(`Page size (default: 25, max: ${MAX_PAGE_SIZE}).`),
};

export const RequestInputSchema = lazySchema(() =>
  z.object({
    method: HttpMethodSchema.describe('The HTTP method to use.'),
    path: z
      .string()
      .max(MAX_STRING_LENGTH)
      .startsWith('/')
      .describe(
        'API path starting with a slash. Relative to the configured apiBasePath for Controller resources ' +
          '(e.g. "/job_templates/", "/jobs/42/"). Absolute-from-root paths like "/api/gateway/v1/me/" are ' +
          'also allowed but stay host-bound to apiUrl.'
      ),
    query: z
      .record(z.string().max(MAX_STRING_LENGTH), z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe('Optional query parameters, e.g. { search: "remediate", page: "1" }.'),
    body: z.unknown().optional().describe('Optional request body for POST/PUT/PATCH.'),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

export const ListJobTemplatesInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Full-text search across templates.'),
    name: z.string().max(MAX_STRING_LENGTH).optional().describe('Filter by exact or partial name.'),
    organization: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by organization id.'),
    inventory: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by inventory id.'),
    project: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by project id.'),
    playbook: z.string().max(MAX_STRING_LENGTH).optional().describe('Filter by playbook filename.'),
    orderBy: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Order results by field, e.g. "name" or "-modified".'),
    ...paginationFields,
  })
);
export type ListJobTemplatesInput = z.infer<typeof ListJobTemplatesInputSchema>;

export const GetJobTemplateInputSchema = lazySchema(() =>
  z.object({
    id: z.union([z.number().int(), z.string().max(MAX_STRING_LENGTH)]).describe('Job template id.'),
  })
);
export type GetJobTemplateInput = z.infer<typeof GetJobTemplateInputSchema>;

export const GetJobTemplateLaunchOptionsInputSchema = lazySchema(() =>
  z.object({
    id: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .describe('Job template id whose launch options to retrieve (GET …/launch/).'),
  })
);
export type GetJobTemplateLaunchOptionsInput = z.infer<
  typeof GetJobTemplateLaunchOptionsInputSchema
>;

export const LaunchJobTemplateInputSchema = lazySchema(() =>
  z.object({
    id: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .describe('Job template id to launch.'),
    extraVars: z
      .record(z.string().max(MAX_STRING_LENGTH), z.unknown())
      .optional()
      .describe('extra_vars object passed to the playbook. Keep small; serialized size is capped.'),
    limit: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Host pattern limit, e.g. "web:&prod".'),
    inventory: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Override inventory id when the template asks for it.'),
    credentials: z
      .array(z.union([z.number().int(), z.string().max(MAX_STRING_LENGTH)]))
      .optional()
      .describe('Credential ids to use for this launch.'),
    scmBranch: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Override SCM branch when prompted.'),
    tags: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Comma-separated Ansible tags to run.'),
    skipTags: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Comma-separated Ansible tags to skip.'),
    jobType: z
      .enum(['run', 'check'])
      .optional()
      .describe('Job type override when the template allows it.'),
    verbosity: z.number().int().min(0).max(5).optional().describe('Verbosity 0–5 when prompted.'),
    diffMode: z.boolean().optional().describe('Enable diff mode when prompted.'),
  })
);
export type LaunchJobTemplateInput = z.infer<typeof LaunchJobTemplateInputSchema>;

export const ListJobsInputSchema = lazySchema(() =>
  z.object({
    status: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Filter by status, e.g. "failed", "successful", "running".'),
    jobTemplate: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by job template id.'),
    inventory: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by inventory id.'),
    failed: z.boolean().optional().describe('When true, only failed jobs.'),
    createdAfter: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('ISO timestamp; maps to created__gt.'),
    orderBy: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Order by field, e.g. "-created".'),
    ...paginationFields,
  })
);
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

export const GetJobInputSchema = lazySchema(() =>
  z.object({
    id: z.union([z.number().int(), z.string().max(MAX_STRING_LENGTH)]).describe('Job id.'),
  })
);
export type GetJobInput = z.infer<typeof GetJobInputSchema>;

export const GetJobStdoutInputSchema = lazySchema(() =>
  z.object({
    id: z.union([z.number().int(), z.string().max(MAX_STRING_LENGTH)]).describe('Job id.'),
    format: z
      .enum(['txt', 'json'])
      .optional()
      .default('txt')
      .describe('Stdout format. Defaults to txt. html is not supported.'),
  })
);
export type GetJobStdoutInput = z.infer<typeof GetJobStdoutInputSchema>;

export const ListJobEventsInputSchema = lazySchema(() =>
  z.object({
    id: z.union([z.number().int(), z.string().max(MAX_STRING_LENGTH)]).describe('Job id.'),
    failed: z
      .boolean()
      .optional()
      .describe('When true, only failed events (recommended for diagnose).'),
    ...paginationFields,
  })
);
export type ListJobEventsInput = z.infer<typeof ListJobEventsInputSchema>;

export const CancelJobInputSchema = lazySchema(() =>
  z.object({
    id: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .describe('Job id to cancel.'),
  })
);
export type CancelJobInput = z.infer<typeof CancelJobInputSchema>;

export const ListInventoriesInputSchema = lazySchema(() =>
  z.object({
    search: z.string().max(MAX_STRING_LENGTH).optional().describe('Full-text search.'),
    organization: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by organization id.'),
    ...paginationFields,
  })
);
export type ListInventoriesInput = z.infer<typeof ListInventoriesInputSchema>;

export const ListHostsInputSchema = lazySchema(() =>
  z.object({
    inventory: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by inventory id (preferred).'),
    search: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Full-text search / name filter.'),
    enabled: z.boolean().optional().describe('Filter by enabled flag.'),
    ...paginationFields,
  })
);
export type ListHostsInput = z.infer<typeof ListHostsInputSchema>;

export const ListProjectsInputSchema = lazySchema(() =>
  z.object({
    search: z.string().max(MAX_STRING_LENGTH).optional().describe('Full-text search.'),
    organization: z
      .union([z.number().int(), z.string().max(MAX_STRING_LENGTH)])
      .optional()
      .describe('Filter by organization id.'),
    ...paginationFields,
  })
);
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const GetMeInputSchema = lazySchema(() => z.object({}));
export type GetMeInput = z.infer<typeof GetMeInputSchema>;

export { MAX_EXTRA_VARS_JSON_CHARS, MAX_PAGE_SIZE };
