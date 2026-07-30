/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Ansible Control Server Connector
 *
 * Talks to Ansible Automation Controller / AWX / Tower REST APIs so agents and
 * workflows can list job templates, launch jobs, and diagnose failures via
 * stdout and job events.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  RequestInputSchema,
  ListJobTemplatesInputSchema,
  GetJobTemplateInputSchema,
  GetJobTemplateLaunchOptionsInputSchema,
  LaunchJobTemplateInputSchema,
  ListJobsInputSchema,
  GetJobInputSchema,
  GetJobStdoutInputSchema,
  ListJobEventsInputSchema,
  CancelJobInputSchema,
  ListInventoriesInputSchema,
  ListHostsInputSchema,
  ListProjectsInputSchema,
  GetMeInputSchema,
  MAX_EXTRA_VARS_JSON_CHARS,
} from './types';
import type {
  RequestInput,
  HttpMethod,
  ListJobTemplatesInput,
  GetJobTemplateInput,
  GetJobTemplateLaunchOptionsInput,
  LaunchJobTemplateInput,
  ListJobsInput,
  GetJobInput,
  GetJobStdoutInput,
  ListJobEventsInput,
  CancelJobInput,
  ListInventoriesInput,
  ListHostsInput,
  ListProjectsInput,
} from './types';

const MAX_STDOUT_CHARS = 20000;
const MAX_DESCRIPTION_CHARS = 500;
const MAX_TRACEBACK_CHARS = 4000;
const MAX_EVENT_STDOUT_CHARS = 1000;

const BLOCKED_PATH_PREFIXES = [
  '/websocket',
  '/websocket/',
  '/api/v2/tokens',
  '/api/controller/v2/tokens',
] as const;

interface ControllerConfig {
  apiUrl: string;
  apiBasePath: '/api/v2' | '/api/controller/v2';
}

interface SummaryFieldRef {
  id?: number;
  name?: string;
}

interface ControllerListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Array<Record<string, unknown>>;
}

interface ControllerRequestOptions {
  method: HttpMethod;
  /** Path relative to apiBasePath, e.g. `/job_templates/`, or absolute-from-root `/api/...`. */
  path: string;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  /** When true, skip apiBasePath prefix (for absolute-from-root request paths). */
  absoluteFromRoot?: boolean;
  /** Override responseType (e.g. text for stdout). */
  responseType?: 'json' | 'text';
}

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

const assertRawPathValid = (path: string): void => {
  if (!path.startsWith('/')) {
    throw new Error('Ansible Controller API path must start with "/"');
  }
};

// NOTE: `path` here must already be resolved to its fully-qualified `/api/...` form (see
// `resolveApiPath`), not the connector's relative-to-`apiBasePath` input path. Matching against
// the raw input would let the relative-path convention (e.g. `/users/`, `/tokens/`) bypass these
// fully-qualified prefixes entirely.
const assertPathAllowed = (path: string): void => {
  const pathOnly = (path.split(/[?#]/, 1)[0] ?? path).toLowerCase();
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) {
      throw new Error(`Requests to "${prefix}" are not permitted via this connector`);
    }
  }
  if (pathOnly.includes('/websocket')) {
    throw new Error('WebSocket / streaming endpoints are not permitted via this connector');
  }
};

const assertRequestAllowed = (method: HttpMethod, path: string): void => {
  assertPathAllowed(path);
  const pathOnly = (path.split(/[?#]/, 1)[0] ?? path).toLowerCase();

  if (method !== 'GET') {
    if (
      pathOnly.includes('/credentials/') ||
      pathOnly.includes('/credential_types/') ||
      pathOnly.includes('/tokens/') ||
      // Blocks the whole users collection, not just `/password/` or `/tokens/` sub-paths: AWX/
      // Controller resets a password or escalates `is_superuser` via `PATCH` on the user object
      // itself (e.g. `PATCH /api/v2/users/5/`), and creates users via `POST /api/v2/users/`.
      pathOnly.includes('/users/')
    ) {
      throw new Error(
        `Mutating requests to credential/token/user paths are not permitted via this connector`
      );
    }
  }
};

const scrubSecrets = (response: unknown): unknown => {
  if (response === null || response === undefined || typeof response !== 'object') {
    return response;
  }
  if (Array.isArray(response)) {
    return response.map((item) => scrubSecrets(item));
  }
  const obj = response as Record<string, unknown>;
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (
      lower === 'inputs' ||
      lower === 'password' ||
      lower === 'secret' ||
      lower === 'ssh_key_data' ||
      lower === 'ssh_key_unlock' ||
      lower === 'become_password' ||
      lower === 'vault_password' ||
      lower === 'authorize_password' ||
      lower === 'security_token' ||
      lower === 'client_secret' ||
      lower === 'token'
    ) {
      continue;
    }
    scrubbed[key] = scrubSecrets(value);
  }
  return scrubbed;
};

const normalizeControllerError = (error: unknown): Error => {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const data = response?.data;
  const status = response?.status;

  if (data && typeof data === 'object') {
    const body = data as { detail?: unknown; message?: unknown; error?: unknown };
    const message =
      typeof body.detail === 'string'
        ? body.detail
        : typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
        ? body.error
        : JSON.stringify(body).slice(0, 500);
    const code = typeof status === 'number' ? ` (${status})` : '';
    return new Error(`Ansible Controller API error${code}: ${message}`);
  }

  if (typeof status === 'number') {
    const fallback = error instanceof Error ? error.message : String(error);
    return new Error(`Ansible Controller API error (${status}): ${fallback}`);
  }

  return error instanceof Error ? error : new Error(String(error));
};

const getConfig = (ctx: ActionContext): ControllerConfig => {
  const { apiUrl, apiBasePath } = ctx.config as {
    apiUrl: string;
    apiBasePath?: '/api/v2' | '/api/controller/v2';
  };
  return {
    apiUrl: stripTrailingSlash(apiUrl),
    apiBasePath: apiBasePath ?? '/api/v2',
  };
};

/** Resolves `path` to its fully-qualified `/api/...` form, applying `apiBasePath` when relative. */
const resolveApiPath = (
  config: ControllerConfig,
  path: string,
  absoluteFromRoot?: boolean
): string => {
  if (absoluteFromRoot || path.startsWith('/api/')) {
    return path;
  }
  return `${config.apiBasePath}${path}`;
};

const controllerRequest = async (
  ctx: ActionContext,
  options: ControllerRequestOptions
): Promise<unknown> => {
  assertRawPathValid(options.path);
  const config = getConfig(ctx);
  const apiPath = resolveApiPath(config, options.path, options.absoluteFromRoot);
  // Guard against the fully-qualified path so relative inputs (the connector's documented
  // convention) can't bypass prefix-based blocks meant for `/api/...` forms.
  assertRequestAllowed(options.method, apiPath);
  const client = ctx.client as AxiosInstance;
  try {
    const response = await client.request({
      method: options.method,
      url: `${config.apiUrl}${apiPath}`,
      ...(options.params ? { params: options.params } : {}),
      ...(options.data !== undefined ? { data: options.data } : {}),
      ...(options.responseType ? { responseType: options.responseType } : {}),
    });
    return scrubSecrets(response.data);
  } catch (error) {
    throw normalizeControllerError(error);
  }
};

const asId = (value: string | number): string => String(value);

const stringParams = (
  entries: Record<string, string | number | boolean | undefined>
): Record<string, string | number | boolean> => {
  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      params[key] = value;
    }
  }
  return params;
};

const truncate = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

const summaryRef = (fields: unknown, key: string): SummaryFieldRef | undefined => {
  if (!fields || typeof fields !== 'object') {
    return undefined;
  }
  const ref = (fields as Record<string, unknown>)[key];
  if (!ref || typeof ref !== 'object') {
    return undefined;
  }
  const { id, name } = ref as SummaryFieldRef;
  return { id, name };
};

const slimJobTemplate = (item: Record<string, unknown>) => ({
  id: item.id,
  name: item.name,
  description: truncate(item.description, MAX_DESCRIPTION_CHARS),
  playbook: item.playbook,
  scm_branch: item.scm_branch,
  limit: item.limit,
  ask_inventory_on_launch: item.ask_inventory_on_launch,
  ask_variables_on_launch: item.ask_variables_on_launch,
  ask_credential_on_launch: item.ask_credential_on_launch,
  ask_limit_on_launch: item.ask_limit_on_launch,
  ask_tags_on_launch: item.ask_tags_on_launch,
  ask_skip_tags_on_launch: item.ask_skip_tags_on_launch,
  ask_job_type_on_launch: item.ask_job_type_on_launch,
  ask_verbosity_on_launch: item.ask_verbosity_on_launch,
  ask_diff_mode_on_launch: item.ask_diff_mode_on_launch,
  survey_enabled: item.survey_enabled,
  inventory: summaryRef(item.summary_fields, 'inventory'),
  project: summaryRef(item.summary_fields, 'project'),
  organization: summaryRef(item.summary_fields, 'organization'),
});

const slimJob = (item: Record<string, unknown>) => ({
  id: item.id,
  name: item.name,
  status: item.status,
  failed: item.failed,
  started: item.started,
  finished: item.finished,
  playbook: item.playbook,
  scm_branch: item.scm_branch,
  limit: item.limit,
  job_template: summaryRef(item.summary_fields, 'job_template'),
  inventory: summaryRef(item.summary_fields, 'inventory'),
  project: summaryRef(item.summary_fields, 'project'),
  organization: summaryRef(item.summary_fields, 'organization'),
});

const slimInventory = (item: Record<string, unknown>) => ({
  id: item.id,
  name: item.name,
  description: truncate(item.description, MAX_DESCRIPTION_CHARS),
  kind: item.kind,
  total_hosts: item.total_hosts,
  hosts_with_active_failures: item.hosts_with_active_failures,
  organization: summaryRef(item.summary_fields, 'organization'),
});

const slimHost = (item: Record<string, unknown>) => ({
  id: item.id,
  name: item.name,
  description: truncate(item.description, MAX_DESCRIPTION_CHARS),
  enabled: item.enabled,
  inventory: summaryRef(item.summary_fields, 'inventory'),
});

const slimProject = (item: Record<string, unknown>) => ({
  id: item.id,
  name: item.name,
  description: truncate(item.description, MAX_DESCRIPTION_CHARS),
  scm_type: item.scm_type,
  scm_url: item.scm_url,
  scm_branch: item.scm_branch,
  status: item.status,
  organization: summaryRef(item.summary_fields, 'organization'),
});

const slimList = (
  data: unknown,
  mapItem: (item: Record<string, unknown>) => Record<string, unknown>
) => {
  const list = data as ControllerListResponse;
  const results = Array.isArray(list.results) ? list.results : [];
  return {
    count: list.count ?? results.length,
    next: list.next ?? null,
    previous: list.previous ?? null,
    results: results.map((item) => mapItem(item)),
  };
};

const pageParams = (input: { page?: number; pageSize?: number }) =>
  stringParams({
    page: input.page,
    page_size: input.pageSize,
  });

export const AnsibleControllerConnector: ConnectorSpec = {
  metadata: {
    id: '.ansible_controller',
    displayName: 'Ansible Control Server',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.ansibleController.metadata.description',
      {
        defaultMessage:
          'Launch and monitor Ansible Automation Controller / AWX jobs — templates, inventories, stdout, and remediation runs',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer_with_tls',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate(
            'core.kibanaConnectorSpecs.ansibleController.auth.bearerWithTls.label',
            { defaultMessage: 'API token' }
          ),
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.ansibleController.auth.bearerWithTls.tokenLabel',
                { defaultMessage: 'Token' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.ansibleController.auth.bearerWithTls.tokenHelpText',
                {
                  defaultMessage:
                    'A long-lived Ansible Automation Controller / AWX personal access token or OAuth2 token. Do not use session cookies.',
                }
              ),
            },
            caCert: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.ansibleController.auth.bearerWithTls.caLabel',
                { defaultMessage: 'Server CA certificate (PEM)' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.ansibleController.auth.bearerWithTls.caHelpText',
                {
                  defaultMessage:
                    'Paste the PEM-encoded certificate authority used to verify the Controller / AWX server. Leave empty to rely on the system trust store or to disable verification.',
                }
              ),
            },
            verificationMode: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.ansibleController.auth.bearerWithTls.verificationModeHelpText',
                {
                  defaultMessage:
                    'How to verify the server TLS certificate. "full" verifies the certificate and hostname, "certificate" verifies the certificate only, and "none" disables verification (not recommended).',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      apiUrl: z
        .string()
        .url()
        .describe('Ansible Controller / AWX base URL (e.g., https://controller.example.com)')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.ansibleController.config.apiUrl.label', {
            defaultMessage: 'API server URL',
          }),
          widget: 'text',
          placeholder: 'https://controller.example.com',
          validate: { allowedHosts: true },
        }),
      apiBasePath: z
        .enum(['/api/v2', '/api/controller/v2'])
        .default('/api/v2')
        .describe(
          'API root path. Use /api/v2 for AWX / Tower / AAP ≤2.4; use /api/controller/v2 for AAP 2.5+ platform gateway.'
        )
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.ansibleController.config.apiBasePath.label',
            { defaultMessage: 'API base path' }
          ),
        }),
    })
  ),

  actions: {
    request: {
      isTool: true,
      description:
        'Make an authenticated request to any Controller / AWX API path. Prefer typed actions when they fit. ' +
        'Paths under the configured apiBasePath are typical (e.g. /job_templates/). Streaming and ' +
        'credential/token write endpoints are blocked.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        const absoluteFromRoot = input.path.startsWith('/api/');
        return controllerRequest(ctx, {
          method: input.method,
          path: input.path,
          params: input.query,
          data: input.body,
          absoluteFromRoot,
        });
      },
    },

    listJobTemplates: {
      isTool: true,
      description:
        'List job templates with optional filters. Returns a slim summary per template (id, name, playbook, ask_* flags, org/inventory/project).',
      input: ListJobTemplatesInputSchema,
      handler: async (ctx, input: ListJobTemplatesInput) => {
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path: '/job_templates/',
          params: {
            ...pageParams(input),
            ...stringParams({
              search: input.search,
              name: input.name,
              organization: input.organization,
              inventory: input.inventory,
              project: input.project,
              playbook: input.playbook,
              order_by: input.orderBy,
            }),
          },
        });
        return slimList(data, slimJobTemplate);
      },
    },

    getJobTemplate: {
      isTool: true,
      description:
        'Get a job template by id, including ask_* / survey flags so you know what launch prompts are required.',
      input: GetJobTemplateInputSchema,
      handler: async (ctx, input: GetJobTemplateInput) => {
        const data = (await controllerRequest(ctx, {
          method: 'GET',
          path: `/job_templates/${asId(input.id)}/`,
        })) as Record<string, unknown>;
        return slimJobTemplate(data);
      },
    },

    getJobTemplateLaunchOptions: {
      isTool: true,
      description:
        'GET launch options for a job template (defaults, survey, ask_* prompts). Call this before launchJobTemplate.',
      input: GetJobTemplateLaunchOptionsInputSchema,
      handler: async (ctx, input: GetJobTemplateLaunchOptionsInput) => {
        return controllerRequest(ctx, {
          method: 'GET',
          path: `/job_templates/${asId(input.id)}/launch/`,
        });
      },
    },

    launchJobTemplate: {
      isTool: true,
      description:
        'Launch a job template (POST …/launch/). This mutates real infrastructure — confirm template id, inventory/limit, and extra_vars first. Prefer getJobTemplateLaunchOptions beforehand.',
      input: LaunchJobTemplateInputSchema,
      handler: async (ctx, input: LaunchJobTemplateInput) => {
        if (input.extraVars) {
          const serialized = JSON.stringify(input.extraVars);
          if (serialized.length > MAX_EXTRA_VARS_JSON_CHARS) {
            throw new Error(
              `extraVars JSON exceeds the ${MAX_EXTRA_VARS_JSON_CHARS} character limit`
            );
          }
        }
        const body = {
          ...(input.extraVars ? { extra_vars: input.extraVars } : {}),
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
          ...(input.inventory !== undefined ? { inventory: input.inventory } : {}),
          ...(input.credentials ? { credentials: input.credentials } : {}),
          ...(input.scmBranch !== undefined ? { scm_branch: input.scmBranch } : {}),
          ...(input.tags !== undefined ? { job_tags: input.tags } : {}),
          ...(input.skipTags !== undefined ? { skip_tags: input.skipTags } : {}),
          ...(input.jobType !== undefined ? { job_type: input.jobType } : {}),
          ...(input.verbosity !== undefined ? { verbosity: input.verbosity } : {}),
          ...(input.diffMode !== undefined ? { diff_mode: input.diffMode } : {}),
        };
        return controllerRequest(ctx, {
          method: 'POST',
          path: `/job_templates/${asId(input.id)}/launch/`,
          data: body,
        });
      },
    },

    listJobs: {
      isTool: true,
      description:
        'List jobs with optional status / template / inventory filters. Returns slim summaries suitable for diagnose loops.',
      input: ListJobsInputSchema,
      handler: async (ctx, input: ListJobsInput) => {
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path: '/jobs/',
          params: {
            ...pageParams(input),
            ...stringParams({
              status: input.status,
              job_template: input.jobTemplate,
              inventory: input.inventory,
              failed: input.failed,
              order_by: input.orderBy,
            }),
            ...(input.createdAfter ? { ['created__gt']: input.createdAfter } : {}),
          },
        });
        return slimList(data, slimJob);
      },
    },

    getJob: {
      isTool: true,
      description:
        'Get a job by id — status, timestamps, playbook, inventory/template summaries, and a capped result_traceback.',
      input: GetJobInputSchema,
      handler: async (ctx, input: GetJobInput) => {
        const data = (await controllerRequest(ctx, {
          method: 'GET',
          path: `/jobs/${asId(input.id)}/`,
        })) as Record<string, unknown>;
        return {
          ...slimJob(data),
          result_traceback: truncate(data.result_traceback, MAX_TRACEBACK_CHARS),
          job_explanation: truncate(data.job_explanation, MAX_DESCRIPTION_CHARS),
        };
      },
    },

    getJobStdout: {
      isTool: true,
      description: `Retrieve job stdout (format=txt by default). Output is capped to the last ${MAX_STDOUT_CHARS} characters. html format is not supported.`,
      input: GetJobStdoutInputSchema,
      output: lazySchema(() =>
        z.object({
          jobId: z.union([z.string(), z.number()]),
          content: z.string(),
          truncated: z.boolean(),
        })
      ),
      handler: async (ctx, input: GetJobStdoutInput) => {
        const format = input.format ?? 'txt';
        if (format === ('html' as string)) {
          throw new Error('Stdout format "html" is not supported');
        }
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path: `/jobs/${asId(input.id)}/stdout/`,
          params: { format },
          responseType: format === 'txt' ? 'text' : 'json',
        });
        const raw =
          typeof data === 'string'
            ? data
            : typeof (data as { content?: unknown })?.content === 'string'
            ? (data as { content: string }).content
            : JSON.stringify(data);
        const truncated = raw.length > MAX_STDOUT_CHARS;
        return {
          jobId: input.id,
          content: truncated ? raw.slice(raw.length - MAX_STDOUT_CHARS) : raw,
          truncated,
        };
      },
    },

    listJobEvents: {
      isTool: true,
      description:
        'List job events for a job. Prefer failed=true when diagnosing. Returns slim event payloads (task, host, event, short stdout).',
      input: ListJobEventsInputSchema,
      handler: async (ctx, input: ListJobEventsInput) => {
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path: `/jobs/${asId(input.id)}/job_events/`,
          params: {
            ...pageParams(input),
            ...stringParams({ failed: input.failed }),
          },
        });
        return slimList(data, (item) => ({
          id: item.id,
          event: item.event,
          event_display: item.event_display,
          host: item.host ?? summaryRef(item.summary_fields, 'host')?.name,
          task: item.task,
          failed: item.failed,
          changed: item.changed,
          stdout: truncate(item.stdout, MAX_EVENT_STDOUT_CHARS),
        }));
      },
    },

    cancelJob: {
      isTool: true,
      description: 'Cancel a running or pending job (POST …/cancel/).',
      input: CancelJobInputSchema,
      handler: async (ctx, input: CancelJobInput) => {
        return controllerRequest(ctx, {
          method: 'POST',
          path: `/jobs/${asId(input.id)}/cancel/`,
          data: {},
        });
      },
    },

    listInventories: {
      isTool: true,
      description: 'List inventories with optional organization / search filters. Slim response.',
      input: ListInventoriesInputSchema,
      handler: async (ctx, input: ListInventoriesInput) => {
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path: '/inventories/',
          params: {
            ...pageParams(input),
            ...stringParams({
              search: input.search,
              organization: input.organization,
            }),
          },
        });
        return slimList(data, slimInventory);
      },
    },

    listHosts: {
      isTool: true,
      description: 'List hosts, optionally filtered by inventory / name / enabled. Slim response.',
      input: ListHostsInputSchema,
      handler: async (ctx, input: ListHostsInput) => {
        const path = input.inventory ? `/inventories/${asId(input.inventory)}/hosts/` : '/hosts/';
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path,
          params: {
            ...pageParams(input),
            ...stringParams({
              search: input.search,
              enabled: input.enabled,
            }),
          },
        });
        return slimList(data, slimHost);
      },
    },

    listProjects: {
      isTool: true,
      description:
        'List projects (SCM type/url/branch summary). Credential secrets are scrubbed from the response.',
      input: ListProjectsInputSchema,
      handler: async (ctx, input: ListProjectsInput) => {
        const data = await controllerRequest(ctx, {
          method: 'GET',
          path: '/projects/',
          params: {
            ...pageParams(input),
            ...stringParams({
              search: input.search,
              organization: input.organization,
            }),
          },
        });
        return slimList(data, slimProject);
      },
    },

    getMe: {
      isTool: true,
      description:
        'Return the authenticated user (GET …/me/). Useful for connectivity checks and agent context.',
      input: GetMeInputSchema,
      handler: async (ctx) => {
        return controllerRequest(ctx, { method: 'GET', path: '/me/' });
      },
    },
  },

  skill: [
    'Ansible Control Server connector — usage guidance for LLMs.',
    '',
    '## Choosing an action',
    'Prefer typed actions; use `request` only for uncovered API paths.',
    'WebSockets/streaming and credential/token write endpoints are blocked.',
    '',
    '## Diagnose loop',
    '1. listJobs (status=failed) or listJobTemplates to find the relevant template',
    '2. getJob for status + traceback',
    '3. getJobStdout and/or listJobEvents with failed=true',
    '4. Only then consider launchJobTemplate for remediation — after getJobTemplateLaunchOptions',
    '',
    '## Launching jobs',
    'Launching mutates real infrastructure. Confirm template id/name, inventory/limit, and extra_vars.',
    'Call getJobTemplateLaunchOptions first to see required ask_* prompts / survey defaults.',
    'Prefer check mode (jobType=check) when the template allows it for a dry run.',
    '',
    '## API base path',
    'AWX / Tower / AAP ≤2.4 → /api/v2. AAP 2.5+ gateway → /api/controller/v2.',
    'If getMe/test returns 404, the wrong apiBasePath is the usual cause.',
    '',
    '## Auth',
    'Use a long-lived personal access token (PAT) or OAuth2 token — not a short-lived session cookie.',
    'Prefer least-privilege automation users scoped to specific templates/orgs.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.ansibleController.test.description', {
      defaultMessage: 'Verifies connectivity by requesting the authenticated Controller / AWX user',
    }),
    handler: async (ctx) => {
      const data = (await controllerRequest(ctx, { method: 'GET', path: '/me/' })) as {
        results?: Array<{ username?: string }>;
        username?: string;
      };
      const username =
        data?.username ?? (Array.isArray(data?.results) ? data.results[0]?.username : undefined);
      const who = username ? ` as ${username}` : '';
      return { message: `Successfully connected to Ansible Control Server${who}` };
    },
    enabled: true,
  },
};
