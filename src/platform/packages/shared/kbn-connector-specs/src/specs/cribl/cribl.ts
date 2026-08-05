/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cribl Connector
 *
 * Talks to the Cribl REST API (Stream/Edge Leader) so workflows and agents can
 * inspect and reshape a Cribl telemetry pipeline during an incident: read the
 * routing table, reroute or drop noisy data, edit pipelines/sources/destinations,
 * then commit and deploy the change so it takes effect on Worker Nodes.
 *
 * https://docs.cribl.io/api-reference/
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { omit, pick } from 'lodash';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { UISchemas } from '../../connector_spec_ui';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  RequestInputSchema,
  ListWorkerGroupsInputSchema,
  ListWorkersInputSchema,
  GetHealthInputSchema,
  ListRoutesInputSchema,
  UpdateRoutesInputSchema,
  CommitConfigInputSchema,
  DeployGroupInputSchema,
  ListPipelinesInputSchema,
  GetPipelineInputSchema,
  UpdatePipelineInputSchema,
  ListSourcesInputSchema,
  UpdateSourceInputSchema,
  ListDestinationsInputSchema,
  UpdateDestinationInputSchema,
  RestartWorkerGroupInputSchema,
  RunSearchInputSchema,
  GetSearchResultsInputSchema,
  UpdateLookupInputSchema,
} from './types';
import type {
  RequestInput,
  HttpMethod,
  ListWorkerGroupsInput,
  GetPipelineInput,
  UpdatePipelineInput,
  UpdateSourceInput,
  UpdateDestinationInput,
  ListRoutesInput,
  UpdateRoutesInput,
  CommitConfigInput,
  DeployGroupInput,
  ListPipelinesInput,
  ListSourcesInput,
  ListDestinationsInput,
  RestartWorkerGroupInput,
  RunSearchInput,
  GetSearchResultsInput,
  UpdateLookupInput,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Cap search result payloads so they stay within an agent-safe context size. */
const MAX_SEARCH_RESULT_CHARS = 50000;

/** Cap error body/detail text pulled from a failed response. */
const MAX_ERROR_DETAIL_CHARS = 500;

/**
 * Endpoints that must never be reachable via the generic `request` escape hatch,
 * regardless of the calling action: API credential management, local user
 * accounts/RBAC, the initial username/password login exchange, and the secrets/
 * certificate stores (which hold the passwords/tokens/keys and TLS private keys
 * that Sources and Destinations reference). Typed actions cover every other
 * read/write operation this connector supports.
 */
const BLOCKED_PATH_PREFIXES = [
  '/api-credentials',
  '/system/auth',
  '/system/users',
  '/system/rbac',
  '/auth/login',
  '/system/secrets',
  '/system/certificates',
] as const;

interface CriblRequestOptions {
  method: HttpMethod;
  /** Path appended after /api/v1 (or /api/v1/m/{group} when `group` is set). */
  path: string;
  /** Worker Group/Fleet id to scope the request to. Omit for Leader/global-context endpoints. */
  group?: string;
  params?: Record<string, string>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
}

// =============================================================================
// Security guardrails
// =============================================================================

const normalizePathSegments = (path: string): string[] => {
  const pathOnly = path.split(/[?#]/, 1)[0] ?? path;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    throw new Error('Cribl API path contains invalid percent-encoding');
  }
  const segments: string[] = [];
  for (const segment of decoded.toLowerCase().split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments;
};

const assertPathAllowed = (path: string): void => {
  if (!path.startsWith('/')) {
    throw new Error('Cribl API path must start with "/"');
  }
  const segments = normalizePathSegments(path);
  // A path can reach the same Leader-global endpoints scoped to a Worker Group via the
  // "/m/{group}/..." namespace (see criblRequest's own `group` option). Strip that prefix
  // before matching so the blocklist can't be bypassed by group-scoping a blocked path,
  // e.g. "/m/default/system/users" resolving to the same handler as "/system/users".
  const unscopedSegments =
    segments[0] === 'm' && segments.length > 1 ? segments.slice(2) : segments;
  const normalized = `/${unscopedSegments.join('/')}`;
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      throw new Error(`Requests to "${prefix}" are not permitted via this connector`);
    }
  }
};

// =============================================================================
// Helpers
// =============================================================================

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

/** Turns an Axios / Cribl API error into a readable Error. */
const normalizeCriblError = (error: unknown): Error => {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const status = response?.status;
  const data = response?.data;

  let detail: string | undefined;
  if (typeof data === 'string' && data.trim().length > 0) {
    detail = data.slice(0, MAX_ERROR_DETAIL_CHARS);
  } else if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: unknown };
    detail =
      typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
        ? body.error
        : undefined;
  }

  if (typeof status === 'number') {
    return new Error(`Cribl API error (${status})${detail ? `: ${detail}` : ''}`);
  }
  return error instanceof Error ? error : new Error(String(error));
};

/** Central request helper: resolves the URL, applies guards, normalizes errors. */
const criblRequest = async (
  ctx: ActionContext,
  options: CriblRequestOptions
): Promise<AxiosResponse> => {
  assertPathAllowed(options.path);
  const { serverUrl } = ctx.config as { serverUrl: string };
  const client = ctx.client as AxiosInstance;
  const root = `${stripTrailingSlash(serverUrl)}/api/v1`;
  const url = options.group
    ? `${root}/m/${encodeURIComponent(options.group)}${options.path}`
    : `${root}${options.path}`;

  try {
    return await client.request({
      method: options.method,
      url,
      ...(options.params ? { params: options.params } : {}),
      ...(options.data !== undefined ? { data: options.data } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.responseType ? { responseType: options.responseType } : {}),
    });
  } catch (error) {
    throw normalizeCriblError(error);
  }
};

/** Parses a newline-delimited JSON response body into an array of records. */
const parseNdjson = (raw: string): unknown[] =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

interface WorkerGroupList {
  items?: Array<Record<string, unknown>>;
  count?: number;
}

/**
 * Cribl's control-plane config endpoints (routes/pipelines/sources/destinations/lookups) require
 * the complete resource on PATCH — partial bodies cause Cribl to null out every omitted field, and
 * even a single-item GET wraps its result in `{ items: [...], count }` rather than returning it
 * bare. This fetches and unwraps that single item, stripping the server-computed `status` and
 * `notifications` fields so they aren't echoed back on the next PATCH. Returns `undefined` (rather
 * than throwing) when the resource doesn't exist yet, for callers that create-or-update.
 */
const fetchOptionalConfigItem = async (
  ctx: ActionContext,
  group: string,
  path: string
): Promise<Record<string, unknown> | undefined> => {
  const response = await criblRequest(ctx, { method: 'GET', group, path });
  const data = response.data as WorkerGroupList;
  const item = data.items?.[0];
  if (!item) {
    return undefined;
  }
  return omit(item, ['status', 'notifications']);
};

const fetchCurrentConfigItem = async (
  ctx: ActionContext,
  group: string,
  path: string
): Promise<Record<string, unknown>> => {
  const item = await fetchOptionalConfigItem(ctx, group, path);
  if (!item) {
    throw new Error(`Cribl API did not return an item for "${path}"`);
  }
  return item;
};

interface RouteTable {
  id?: string;
  routes?: unknown[];
  [key: string]: unknown;
}

interface CommitResponse {
  commit?: string;
  [key: string]: unknown;
}

interface LookupUploadResponse {
  filename?: string;
  [key: string]: unknown;
}

// =============================================================================
// Connector spec
// =============================================================================

export const Cribl: ConnectorSpec = {
  metadata: {
    id: '.cribl',
    displayName: 'Cribl',
    description: i18n.translate('core.kibanaConnectorSpecs.cribl.metadata.description', {
      defaultMessage:
        'Inspect and reshape Cribl telemetry pipelines — routes, pipelines, sources, and destinations',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first; 'workflows' follows in a
    // separate PR once this connector type has graduated.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer_with_tls',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.cribl.auth.bearerWithTls.label', {
            defaultMessage: 'API token',
          }),
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.cribl.auth.bearerWithTls.tokenLabel',
                {
                  defaultMessage: 'Bearer token',
                }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.cribl.auth.bearerWithTls.tokenHelpText',
                {
                  defaultMessage:
                    'A Cribl API Bearer token: for Cribl.Cloud/hybrid, exchange an API Credential ' +
                    '(Client ID/Secret) at https://login.cribl.cloud/oauth/token; for a customer-managed ' +
                    'Leader, call POST /api/v1/auth/login with a username and password. On-prem tokens ' +
                    'expire after the configured "Auth token TTL" (default 1 hour) and Cribl.Cloud tokens ' +
                    'after 24 hours — you are responsible for refreshing the token in this connector ' +
                    'before it expires.',
                }
              ),
            },
            caCert: {
              label: i18n.translate('core.kibanaConnectorSpecs.cribl.auth.bearerWithTls.caLabel', {
                defaultMessage: 'Server CA certificate (PEM)',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.cribl.auth.bearerWithTls.caHelpText',
                {
                  defaultMessage:
                    'Upload the PEM-encoded certificate authority used to verify the Leader, if it ' +
                    'presents a private/self-signed certificate. Leave empty to rely on the system trust store.',
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
      serverUrl: UISchemas.url('https://leader.example.com:9000')
        .describe(
          'The base URL of the Cribl Leader (Cribl.Cloud organization URL or customer-managed Leader), no trailing slash.'
        )
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.cribl.config.serverUrl.label', {
            defaultMessage: 'Leader URL',
          }),
          validate: { allowedHosts: true },
        }),
    })
  ),

  actions: {
    request: {
      isTool: true,
      description:
        'Make an authenticated request to any Cribl API path (relative to /api/v1). Prefer the ' +
        'typed actions (listWorkerGroups, listRoutes, updateRoutes, commitConfig, deployGroup, etc.) ' +
        'when they fit. API credential management, user accounts, RBAC, and the secrets/certificate ' +
        'stores are blocked.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        const response = await criblRequest(ctx, {
          method: input.method,
          path: input.path,
          params: input.query,
          data: input.body,
        });
        return response.data;
      },
    },

    listWorkerGroups: {
      isTool: true,
      description:
        'List Worker Groups (Stream) and Edge Fleets configured on the Leader, with their node ' +
        'counts and deployed config version. The primitive every group-scoped action needs to ' +
        'target the right group before reading or changing its config.',
      input: ListWorkerGroupsInputSchema,
      handler: async (ctx, input: ListWorkerGroupsInput) => {
        const response = await criblRequest(ctx, {
          method: 'GET',
          path: '/master/groups',
          params: input.product ? { product: input.product } : undefined,
        });
        const data = response.data as WorkerGroupList;
        return { count: data.count ?? data.items?.length ?? 0, items: data.items ?? [] };
      },
    },

    listWorkers: {
      isTool: true,
      description:
        'List Worker Nodes and Edge Nodes the Leader manages, with their group, connection status, ' +
        'version, and CPU/memory utilization. Use this to check pipeline capacity or connectivity ' +
        'during an incident.',
      input: ListWorkersInputSchema,
      handler: async (ctx) => {
        const response = await criblRequest(ctx, { method: 'GET', path: '/master/workers' });
        const data = response.data as WorkerGroupList;
        return { count: data.count ?? data.items?.length ?? 0, items: data.items ?? [] };
      },
    },

    getHealth: {
      isTool: true,
      description:
        'Check the health status, version, and build of the Cribl Leader. Use as a gate before a ' +
        'deploy, or as an incident signal a workflow branches on.',
      input: GetHealthInputSchema,
      handler: async (ctx) => {
        const response = await criblRequest(ctx, { method: 'GET', path: '/health' });
        return response.data;
      },
    },

    listRoutes: {
      isTool: true,
      description:
        'Read the routing table for a Worker Group/Fleet — the ordered list of routes that steer ' +
        'incoming events to pipelines and destinations. Call this before updateRoutes: the update ' +
        'replaces the whole table, so you need the current routes to build the new array from.',
      input: ListRoutesInputSchema,
      handler: async (ctx, input: ListRoutesInput) => {
        const response = await criblRequest(ctx, {
          method: 'GET',
          group: input.groupName,
          path: `/routes/${encodeURIComponent(input.routeId)}`,
        });
        const data = response.data as WorkerGroupList;
        return (data.items?.[0] as RouteTable | undefined) ?? { id: input.routeId, routes: [] };
      },
    },

    updateRoutes: {
      isTool: true,
      description:
        'Reroute, filter, or drop data by replacing the routing table for a Worker Group/Fleet — the ' +
        'core write action this connector exists to offer, e.g. to shed backpressured or low-value ' +
        'data during an incident. This REPLACES the entire table: call listRoutes first and pass the ' +
        'complete modified array (Cribl deletes any route you omit). Changes are pending until you ' +
        'call commitConfig and deployGroup.',
      input: UpdateRoutesInputSchema,
      handler: async (ctx, input: UpdateRoutesInput) => {
        const response = await criblRequest(ctx, {
          method: 'PATCH',
          group: input.groupName,
          path: `/routes/${encodeURIComponent(input.routeId)}`,
          data: { id: input.routeId, routes: input.routes },
        });
        const data = response.data as WorkerGroupList;
        return (
          (data.items?.[0] as RouteTable | undefined) ?? { id: input.routeId, routes: input.routes }
        );
      },
    },

    commitConfig: {
      isTool: true,
      description:
        'Git-commit pending configuration changes on the Leader — the first half of making any ' +
        'config edit (routes, pipelines, sources, destinations, lookups) live. Returns a commit hash ' +
        'to pass to deployGroup. In distributed deployments, call this once with `group` set to commit ' +
        "the Worker Group's pending changes, then again (without `group`) after deployGroup to keep " +
        'the Leader in sync.',
      input: CommitConfigInputSchema,
      handler: async (ctx, input: CommitConfigInput) => {
        const response = await criblRequest(ctx, {
          method: 'POST',
          path: '/version/commit',
          data: {
            message: input.message,
            ...(input.group ? { group: input.group } : {}),
            ...(input.effective !== undefined ? { effective: input.effective } : {}),
          },
        });
        return response.data as CommitResponse;
      },
    },

    deployGroup: {
      isTool: true,
      description:
        'Deploy a committed configuration version to a Worker Group/Fleet so the change takes ' +
        'effect on its Worker Nodes — the second half of the commit → deploy lifecycle, closing the ' +
        'loop started by commitConfig. Pass the commit hash returned by commitConfig as `version`.',
      input: DeployGroupInputSchema,
      handler: async (ctx, input: DeployGroupInput) => {
        const response = await criblRequest(ctx, {
          method: 'PATCH',
          path: `/master/groups/${encodeURIComponent(input.groupName)}/deploy`,
          data: { version: input.version },
        });
        return response.data;
      },
    },

    listPipelines: {
      isTool: true,
      description:
        'List the processing pipelines configured for a Worker Group/Fleet, so a workflow can pick ' +
        'one to inspect or change.',
      input: ListPipelinesInputSchema,
      handler: async (ctx, input: ListPipelinesInput) => {
        const response = await criblRequest(ctx, {
          method: 'GET',
          group: input.groupName,
          path: '/pipelines',
        });
        const data = response.data as WorkerGroupList;
        return { count: data.count ?? data.items?.length ?? 0, items: data.items ?? [] };
      },
    },

    getPipeline: {
      isTool: true,
      description:
        'Read a single pipeline definition — its functions and current configuration — so a ' +
        'workflow can inspect it before writing a change with updatePipeline.',
      input: GetPipelineInputSchema,
      handler: async (ctx, input: GetPipelineInput) => {
        return fetchCurrentConfigItem(
          ctx,
          input.groupName,
          `/pipelines/${encodeURIComponent(input.pipelineId)}`
        );
      },
    },

    updatePipeline: {
      isTool: true,
      description:
        'Reconfigure a pipeline (for example to sample or drop data, or disable one of its ' +
        "functions). Automatically fetches the current pipeline first (Cribl's PATCH requires the " +
        'complete resource, not just the changed fields) and merges your changes into it. Cribl ' +
        'pipelines have no whole-pipeline "disabled" flag — to stop a pipeline from processing data ' +
        'entirely, use updateRoutes to repoint its route elsewhere. Changes are pending until you ' +
        'call commitConfig and deployGroup.',
      input: UpdatePipelineInputSchema,
      handler: async (ctx, input: UpdatePipelineInput) => {
        const path = `/pipelines/${encodeURIComponent(input.pipelineId)}`;
        const current = await fetchCurrentConfigItem(ctx, input.groupName, path);
        const currentConf =
          current.conf && typeof current.conf === 'object'
            ? (current.conf as Record<string, unknown>)
            : {};
        const merged = {
          ...current,
          id: input.pipelineId,
          conf: { ...currentConf, ...input.conf },
        };
        const response = await criblRequest(ctx, {
          method: 'PATCH',
          group: input.groupName,
          path,
          data: merged,
        });
        return response.data;
      },
    },

    listSources: {
      isTool: true,
      description:
        'List the Sources (data inputs) configured for a Worker Group/Fleet, with their type and ' +
        'status, so a workflow can find one to throttle or disable during an incident.',
      input: ListSourcesInputSchema,
      handler: async (ctx, input: ListSourcesInput) => {
        const response = await criblRequest(ctx, {
          method: 'GET',
          group: input.groupName,
          path: '/system/inputs',
        });
        const data = response.data as WorkerGroupList;
        return { count: data.count ?? data.items?.length ?? 0, items: data.items ?? [] };
      },
    },

    updateSource: {
      isTool: true,
      description:
        'Reconfigure or disable a Source to stop or throttle an incoming feed during an incident. ' +
        "Automatically fetches the current Source first (Cribl's PATCH requires the complete " +
        'resource, not just the changed fields) and merges your changes into it. Changes are ' +
        'pending until you call commitConfig and deployGroup.',
      input: UpdateSourceInputSchema,
      handler: async (ctx, input: UpdateSourceInput) => {
        const path = `/system/inputs/${encodeURIComponent(input.sourceId)}`;
        const current = await fetchCurrentConfigItem(ctx, input.groupName, path);
        const merged = {
          ...current,
          id: input.sourceId,
          ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
          ...(input.conf ?? {}),
        };
        const response = await criblRequest(ctx, {
          method: 'PATCH',
          group: input.groupName,
          path,
          data: merged,
        });
        return response.data;
      },
    },

    listDestinations: {
      isTool: true,
      description:
        'List the Destinations (data outputs) configured for a Worker Group/Fleet, with their type ' +
        'and status, so a workflow can find one to reconfigure or fail over during an incident.',
      input: ListDestinationsInputSchema,
      handler: async (ctx, input: ListDestinationsInput) => {
        const response = await criblRequest(ctx, {
          method: 'GET',
          group: input.groupName,
          path: '/system/outputs',
        });
        const data = response.data as WorkerGroupList;
        return { count: data.count ?? data.items?.length ?? 0, items: data.items ?? [] };
      },
    },

    updateDestination: {
      isTool: true,
      description:
        'Reconfigure, pause, or fail over a Destination when the downstream system it points to is ' +
        "degraded. Automatically fetches the current Destination first (Cribl's PATCH requires the " +
        'complete resource, not just the changed fields) and merges your changes into it. Changes ' +
        'are pending until you call commitConfig and deployGroup.',
      input: UpdateDestinationInputSchema,
      handler: async (ctx, input: UpdateDestinationInput) => {
        const path = `/system/outputs/${encodeURIComponent(input.destinationId)}`;
        const current = await fetchCurrentConfigItem(ctx, input.groupName, path);
        const merged = {
          ...current,
          id: input.destinationId,
          ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
          ...(input.conf ?? {}),
        };
        const response = await criblRequest(ctx, {
          method: 'PATCH',
          group: input.groupName,
          path,
          data: merged,
        });
        return response.data;
      },
    },

    restartWorkerGroup: {
      isTool: true,
      description:
        'Restart the Worker Processes in a Worker Group/Fleet, so a workflow can recover a stuck ' +
        'data plane after a config change. Only needed for customer-managed (on-prem) deployments — ' +
        'Cribl.Cloud/hybrid groups pick up deployed changes without a restart. Commit and deploy any ' +
        'pending changes first.',
      input: RestartWorkerGroupInputSchema,
      handler: async (ctx, input: RestartWorkerGroupInput) => {
        await criblRequest(ctx, {
          method: 'POST',
          group: input.groupName,
          path: '/system/settings/restart',
        });
        return { message: `Restart requested for Worker Group "${input.groupName}"` };
      },
    },

    runSearch: {
      isTool: true,
      description:
        'Submit a Cribl Search query over live or stored data, so a workflow can investigate what is ' +
        'flowing through the pipeline during triage. Returns a job id — pass it to getSearchResults ' +
        'to read results once the job completes.',
      input: RunSearchInputSchema,
      handler: async (ctx, input: RunSearchInput) => {
        const response = await criblRequest(ctx, {
          method: 'POST',
          group: input.groupName ?? 'default_search',
          path: '/search/jobs',
          data: {
            query: input.query,
            ...(input.earliest ? { earliest: input.earliest } : {}),
            ...(input.latest ? { latest: input.latest } : {}),
            ...(input.sampleRate !== undefined ? { sampleRate: input.sampleRate } : {}),
          },
        });
        const data = response.data as WorkerGroupList;
        const job = data.items?.[0] ?? {};
        // The full job payload includes the compiled query plan, access policies, and dataset
        // catalog — none of which is useful to a workflow, and it can run into tens of KB.
        return pick(job, ['id', 'status', 'query', 'earliest', 'latest', 'group', 'timeCreated']);
      },
    },

    getSearchResults: {
      isTool: true,
      description:
        'Read results for a Cribl Search job started by runSearch. The job may still be running — ' +
        'if the returned records look incomplete, wait a moment and call again. Use `limit`/`offset` ' +
        `to paginate a large result set. Output is capped to ${MAX_SEARCH_RESULT_CHARS} characters.`,
      input: GetSearchResultsInputSchema,
      output: lazySchema(() =>
        z.object({
          records: z.array(z.unknown()).describe('The (possibly truncated) parsed result records.'),
          truncated: z.boolean().describe('Whether records were dropped to fit the size cap.'),
        })
      ),
      handler: async (ctx, input: GetSearchResultsInput) => {
        const response = await criblRequest(ctx, {
          method: 'GET',
          group: input.groupName ?? 'default_search',
          path: `/search/jobs/${encodeURIComponent(input.jobId)}/results`,
          params: {
            limit: String(input.limit ?? 100),
            offset: String(input.offset ?? 0),
          },
          headers: { Accept: 'application/x-ndjson' },
          responseType: 'text',
        });
        const raw =
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const records = parseNdjson(raw);

        let charCount = 0;
        const kept: unknown[] = [];
        for (const record of records) {
          const size = JSON.stringify(record).length;
          if (charCount + size > MAX_SEARCH_RESULT_CHARS) {
            return { records: kept, truncated: true };
          }
          charCount += size;
          kept.push(record);
        }
        return { records: kept, truncated: false };
      },
    },

    updateLookup: {
      isTool: true,
      description:
        'Create a new lookup file or replace the contents of an existing one (e.g. a blocklist or ' +
        'asset list) so pipelines that reference it pick up the change. Uploads the new content, then ' +
        'creates or updates the lookup to point at it. Changes are pending until you call commitConfig ' +
        'and deployGroup.',
      input: UpdateLookupInputSchema,
      handler: async (ctx, input: UpdateLookupInput) => {
        const uploadResponse = await criblRequest(ctx, {
          method: 'PUT',
          group: input.groupName,
          path: '/system/lookups',
          params: { filename: input.lookupId },
          data: input.content,
          headers: { 'Content-Type': input.contentType ?? 'text/csv' },
        });
        const uploaded = uploadResponse.data as LookupUploadResponse;
        const tempFilename = uploaded.filename ?? input.lookupId;

        // Cribl distinguishes creating a brand-new lookup (POST /system/lookups) from replacing an
        // existing one's content (PATCH /system/lookups/{id}) — reusing the wrong verb 404s.
        const singleItemPath = `/system/lookups/${encodeURIComponent(input.lookupId)}`;
        const current = await fetchOptionalConfigItem(ctx, input.groupName, singleItemPath);
        const updateResponse = await criblRequest(ctx, {
          method: current ? 'PATCH' : 'POST',
          group: input.groupName,
          path: current ? singleItemPath : '/system/lookups',
          data: { ...current, id: input.lookupId, fileInfo: { filename: tempFilename } },
        });
        return updateResponse.data;
      },
    },
  },

  skill: [
    'Cribl connector — usage guidance for LLMs.',
    '',
    '## Scope',
    'Cribl has no native alert or incident object. This connector is data-plane control: routes, ' +
      'pipelines, sources, destinations, plus the commit → deploy lifecycle and health/worker status.',
    '',
    '## Targeting',
    'Almost every action is scoped to a Worker Group (Stream) or Edge Fleet by `groupName`. Call ' +
      'listWorkerGroups first to discover valid group ids — do not guess one.',
    '',
    '## Commit → deploy: every write is a two-step (sometimes three-step) process',
    '1. Make the change: updateRoutes, updatePipeline, updateSource, updateDestination, or updateLookup.',
    '2. commitConfig with `group` set to the same Worker Group — commits the pending change on the Leader.',
    '3. deployGroup with the commit hash from step 2 — pushes the change to the Worker Nodes.',
    '4. In distributed deployments, call commitConfig again (without `group`) to keep the Leader in ' +
      'sync with the Worker Group. On customer-managed (on-prem) deployments only, follow with ' +
      'restartWorkerGroup if the change requires a process restart to take effect.',
    'A change is NOT live until deployGroup succeeds — commitConfig alone only records it in version history.',
    '',
    '## updateRoutes replaces the whole table',
    'Always call listRoutes first and pass back the complete routes array with your edits — any route ' +
      'you omit from `routes` is deleted, not left unchanged.',
    '',
    '## updatePipeline / updateSource / updateDestination / updateLookup only need the changed fields',
    'Unlike updateRoutes, these four actions fetch the current resource for you and merge your fields ' +
      '(`conf` for updatePipeline; `disabled`/`conf` for updateSource and updateDestination; ' +
      '`content` for updateLookup) into it before sending Cribl the complete object it requires — you ' +
      'do NOT need to call the corresponding list/get action first just to preserve unrelated fields. ' +
      'The one exception is `conf.functions` on updatePipeline: it is an array and is replaced ' +
      'wholesale, so call getPipeline first if you need to keep existing functions alongside new ones.',
    '',
    '## Pipelines cannot be disabled as a whole',
    'Cribl pipelines have no top-level `disabled` flag (unlike Sources, Destinations, and Routes) — ' +
      'only individual functions inside `conf.functions[]` can be disabled. To stop a pipeline from ' +
      'processing data entirely, use updateRoutes to repoint the relevant route at a different pipeline.',
    '',
    '## Search',
    'runSearch returns a job id immediately; the search itself completes asynchronously. Call ' +
      'getSearchResults with that id — if results look incomplete, the job may still be running, so ' +
      'wait briefly and call again.',
    '',
    '## Auth token lifetime',
    "This connector's Bearer token is not refreshed automatically. If actions start failing with 401 " +
      'errors, the configured token has likely expired and an administrator needs to obtain a new one ' +
      'and update the connector.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.cribl.test.description', {
      defaultMessage: 'Verifies connectivity and credentials by listing Worker Groups',
    }),
    handler: async (ctx) => {
      await criblRequest(ctx, { method: 'GET', path: '/master/groups' });
      return { message: 'Successfully connected to Cribl' };
    },
  },
};
