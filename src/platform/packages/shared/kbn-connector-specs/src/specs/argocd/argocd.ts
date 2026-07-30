/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Argo CD Connector
 *
 * A GitOps connector for the Argo CD REST API so agents and workflows can list
 * applications, inspect sync/health state, trigger syncs, and diagnose failed
 * deploys via resource trees, events, and pod logs.
 *
 * Complementary to the Kubernetes connector: use Argo CD for desired-vs-live
 * GitOps lifecycle, and Kubernetes for direct cluster API operations.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  RequestInputSchema,
  ListApplicationsInputSchema,
  GetApplicationInputSchema,
  GetResourceTreeInputSchema,
  ListApplicationEventsInputSchema,
  GetPodLogsInputSchema,
  SyncApplicationInputSchema,
  ListClustersInputSchema,
  GetProjectInputSchema,
} from './types';
import type {
  RequestInput,
  HttpMethod,
  ListApplicationsInput,
  GetApplicationInput,
  GetResourceTreeInput,
  ListApplicationEventsInput,
  GetPodLogsInput,
  SyncApplicationInput,
  ListClustersInput,
  GetProjectInput,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Cap pod log output so it stays within an agent-safe context size. */
const MAX_LOG_CHARS = 20000;

/** How many history entries to keep on getApplication. */
const MAX_HISTORY_ENTRIES = 10;

/** Paths that must never be proxied via the generic request escape hatch. */
const BLOCKED_PATH_PREFIXES = [
  '/api/v1/stream/',
  '/api/v1/account/password',
  '/api/v1/certificates',
] as const;

const BLOCKED_PATH_SUFFIXES = ['/rotate-auth'] as const;

// =============================================================================
// Lightweight Argo CD shapes (only the fields we read)
// =============================================================================

interface ArgoMetadata {
  name?: string;
  namespace?: string;
  labels?: Record<string, string>;
}

interface ArgoSource {
  repoURL?: string;
  path?: string;
  chart?: string;
  targetRevision?: string;
}

interface ArgoDestination {
  server?: string;
  name?: string;
  namespace?: string;
}

interface ArgoApplication {
  metadata?: ArgoMetadata;
  spec?: {
    project?: string;
    source?: ArgoSource;
    sources?: ArgoSource[];
    destination?: ArgoDestination;
    [key: string]: unknown;
  };
  status?: {
    sync?: { status?: string };
    health?: { status?: string };
    operationState?: {
      phase?: string;
      message?: string;
      syncResult?: { resources?: unknown };
      [key: string]: unknown;
    };
    history?: unknown[];
    resources?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ArgoApplicationList {
  items?: ArgoApplication[];
  metadata?: unknown;
}

interface ArgoCluster {
  name?: string;
  server?: string;
  connectionState?: unknown;
  info?: unknown;
  namespaces?: string[];
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ArgoClusterList {
  items?: ArgoCluster[];
}

interface ArgoRequestOptions {
  method: HttpMethod;
  path: string;
  params?: Record<string, string | string[]>;
  data?: unknown;
}

// =============================================================================
// Security guardrails
// =============================================================================

/**
 * Validates that `path` cannot repoint the request host and does not target
 * streaming or credential-management endpoints.
 */
const assertPathAllowed = (path: string): void => {
  if (!path.startsWith('/')) {
    throw new Error('Argo CD API path must start with "/"');
  }

  const pathOnly = path.split(/[?#]/, 1)[0] ?? path;
  let decodedPath = pathOnly;
  try {
    decodedPath = decodeURIComponent(pathOnly);
  } catch {
    throw new Error('Argo CD API path contains invalid percent-encoding');
  }
  const normalized = decodedPath.toLowerCase();

  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      throw new Error(`Requests to "${prefix}" are not permitted via this connector`);
    }
  }

  for (const suffix of BLOCKED_PATH_SUFFIXES) {
    if (normalized.endsWith(suffix) || normalized.includes(`${suffix}/`)) {
      throw new Error(`Requests targeting "${suffix}" are not permitted via this connector`);
    }
  }
};

const assertRequestAllowed = (method: HttpMethod, path: string): void => {
  assertPathAllowed(path);
  const pathOnly = (path.split(/[?#]/, 1)[0] ?? path).toLowerCase();

  if (method !== 'GET') {
    if (
      pathOnly.startsWith('/api/v1/repositories') ||
      pathOnly.startsWith('/api/v1/repocreds') ||
      pathOnly.startsWith('/api/v1/writerepositories') ||
      pathOnly.startsWith('/api/v1/clusters')
    ) {
      throw new Error(
        `Mutating requests to "${pathOnly}" are not permitted via this connector (secrets-heavy)`
      );
    }
  }
};

/** Removes credential fields from cluster config objects. */
const scrubClusterConfig = (cluster: ArgoCluster): ArgoCluster => {
  if (!cluster.config || typeof cluster.config !== 'object') {
    return cluster;
  }
  const config = { ...cluster.config };
  delete config.bearerToken;
  delete config.password;
  delete config.username;
  delete config.tlsClientConfig;
  delete config.awsAuthConfig;
  delete config.execProviderConfig;
  return { ...cluster, config };
};

/**
 * Defensive secret scrubbing across Argo CD responses — strip bearer tokens,
 * passwords, and private keys even when RBAC is misconfigured.
 */
const scrubSecrets = (response: unknown): unknown => {
  if (response === null || response === undefined) {
    return response;
  }
  if (typeof response !== 'object') {
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
      lower === 'bearertoken' ||
      lower === 'password' ||
      lower === 'privatekey' ||
      lower === 'sshprivatekey' ||
      lower === 'tlsclientconfig' ||
      lower === 'githubappprivatekey'
    ) {
      continue;
    }
    scrubbed[key] = scrubSecrets(value);
  }

  return scrubbed;
};

// =============================================================================
// Helpers
// =============================================================================

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

/**
 * Turns an Axios / Argo CD (grpc-gateway) error into a readable Error.
 */
const normalizeArgoError = (error: unknown): Error => {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const data = response?.data;
  const status = response?.status;

  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: unknown; code?: unknown };
    const message =
      typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
        ? body.error
        : undefined;
    if (message) {
      const code =
        typeof body.code === 'number'
          ? ` (${body.code})`
          : typeof status === 'number'
          ? ` (${status})`
          : '';
      return new Error(`Argo CD API error${code}: ${message}`);
    }
  }

  if (typeof status === 'number') {
    const fallback = error instanceof Error ? error.message : String(error);
    return new Error(`Argo CD API error (${status}): ${fallback}`);
  }

  return error instanceof Error ? error : new Error(String(error));
};

/** Central request helper: resolves the URL, applies headers, normalizes errors. */
const argoRequest = async (ctx: ActionContext, options: ArgoRequestOptions): Promise<unknown> => {
  assertRequestAllowed(options.method, options.path);
  const { apiUrl } = ctx.config as { apiUrl: string };
  const client = ctx.client as AxiosInstance;
  try {
    const response = await client.request({
      method: options.method,
      url: `${stripTrailingSlash(apiUrl)}${options.path}`,
      ...(options.params ? { params: options.params } : {}),
      ...(options.data !== undefined ? { data: options.data } : {}),
    });
    return scrubSecrets(response.data);
  } catch (error) {
    throw normalizeArgoError(error);
  }
};

const summarizeSource = (source?: ArgoSource) => {
  if (!source) {
    return undefined;
  }
  return {
    repoURL: source.repoURL,
    ...(source.path ? { path: source.path } : {}),
    ...(source.chart ? { chart: source.chart } : {}),
    ...(source.targetRevision ? { targetRevision: source.targetRevision } : {}),
  };
};

/** Projects a list response into a compact, agent-friendly summary. */
const slimApplication = (app: ArgoApplication) => {
  const sources = app.spec?.sources?.length
    ? app.spec.sources.map(summarizeSource)
    : summarizeSource(app.spec?.source)
    ? [summarizeSource(app.spec?.source)]
    : undefined;

  return {
    metadata: {
      name: app.metadata?.name,
      namespace: app.metadata?.namespace,
      labels: app.metadata?.labels,
    },
    spec: {
      project: app.spec?.project,
      ...(sources ? { sources } : {}),
      destination: app.spec?.destination
        ? {
            server: app.spec.destination.server,
            name: app.spec.destination.name,
            namespace: app.spec.destination.namespace,
          }
        : undefined,
    },
    status: {
      sync: app.status?.sync?.status,
      health: app.status?.health?.status,
      operationState: app.status?.operationState
        ? {
            phase: app.status.operationState.phase,
            message: app.status.operationState.message,
          }
        : undefined,
    },
  };
};

const slimApplicationDetail = (app: ArgoApplication) => {
  const slim = slimApplication(app);
  const history = Array.isArray(app.status?.history) ? app.status.history : [];
  const truncatedHistory = history.slice(-MAX_HISTORY_ENTRIES);

  const rawOperationState = app.status?.operationState;
  const operationState = rawOperationState
    ? (() => {
        const { syncResult, ...rest } = rawOperationState;
        // Drop oversized syncResult.resources; keep other operationState fields.
        const condensedSyncResult =
          syncResult && typeof syncResult === 'object'
            ? {
                ...(syncResult as Record<string, unknown>),
                resources: Array.isArray((syncResult as { resources?: unknown }).resources)
                  ? {
                      count: (syncResult as { resources: unknown[] }).resources.length,
                      truncated: true,
                    }
                  : (syncResult as { resources?: unknown }).resources,
              }
            : syncResult;
        return {
          ...rest,
          ...(condensedSyncResult !== undefined ? { syncResult: condensedSyncResult } : {}),
        };
      })()
    : undefined;

  return {
    ...slim,
    spec: app.spec,
    status: {
      ...slim.status,
      ...(operationState ? { operationState } : {}),
      history: truncatedHistory,
      historyTruncated: history.length > MAX_HISTORY_ENTRIES,
      // Omit raw status.resources[] — use getResourceTree / managed-resources instead.
    },
  };
};

const stringParams = (
  entries: Record<string, string | string[] | undefined>
): Record<string, string | string[]> => {
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      params[key] = value;
    }
  }
  return params;
};

// =============================================================================
// Connector spec
// =============================================================================

export const ArgocdConnector: ConnectorSpec = {
  metadata: {
    id: '.argocd',
    displayName: 'Argo CD',
    description: i18n.translate('core.kibanaConnectorSpecs.argocd.metadata.description', {
      defaultMessage: 'Manage GitOps applications in Argo CD — sync, inspect health and resources',
    }),
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
          label: i18n.translate('core.kibanaConnectorSpecs.argocd.auth.bearerWithTls.label', {
            defaultMessage: 'API token',
          }),
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.argocd.auth.bearerWithTls.tokenLabel',
                { defaultMessage: 'Token' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.argocd.auth.bearerWithTls.tokenHelpText',
                {
                  defaultMessage:
                    'A long-lived Argo CD account or project-role API token. Do not use short-lived session JWTs from username/password login.',
                }
              ),
            },
            caCert: {
              label: i18n.translate('core.kibanaConnectorSpecs.argocd.auth.bearerWithTls.caLabel', {
                defaultMessage: 'Server CA certificate (PEM)',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.argocd.auth.bearerWithTls.caHelpText',
                {
                  defaultMessage:
                    'Paste the PEM-encoded certificate authority used to verify the Argo CD server. Leave empty to rely on the system trust store or to disable verification.',
                }
              ),
            },
            verificationMode: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.argocd.auth.bearerWithTls.verificationModeHelpText',
                {
                  defaultMessage:
                    'How to verify the Argo CD server TLS certificate. "full" verifies the certificate and hostname, "certificate" verifies the certificate only, and "none" disables verification (not recommended).',
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
        .describe('Argo CD API server URL (e.g., https://argocd.example.com)')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.argocd.config.apiUrl.label', {
            defaultMessage: 'API server URL',
          }),
          widget: 'text',
          placeholder: 'https://argocd.example.com',
          validate: { allowedHosts: true },
        }),
    })
  ),

  actions: {
    request: {
      isTool: true,
      description:
        'Make an authenticated request to any Argo CD API path. Prefer the typed actions ' +
        '(listApplications, getApplication, syncApplication, getResourceTree, listApplicationEvents, ' +
        'getPodLogs, listClusters, getProject) when they fit. Streaming and secrets-heavy write ' +
        'endpoints are blocked.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        return argoRequest(ctx, {
          method: input.method,
          path: input.path,
          params: input.query,
          data: input.body,
        });
      },
    },

    listApplications: {
      isTool: true,
      description:
        'List Argo CD applications with optional filters (project, selector, name, repo). ' +
        'Returns a slim summary per app (name, project, source, destination, sync/health status). ' +
        'Use getApplication for detail, or getResourceTree for per-resource health.',
      input: ListApplicationsInputSchema,
      handler: async (ctx, input: ListApplicationsInput) => {
        const data = (await argoRequest(ctx, {
          method: 'GET',
          path: '/api/v1/applications',
          params: stringParams({
            projects: input.projects,
            project: input.project,
            selector: input.selector,
            name: input.name,
            repo: input.repo,
            appNamespace: input.appNamespace,
          }),
        })) as ArgoApplicationList;

        const items = Array.isArray(data.items) ? data.items : [];
        return {
          itemCount: items.length,
          items: items.map(slimApplication),
        };
      },
    },

    getApplication: {
      isTool: true,
      description:
        'Get a single Argo CD application by name. Returns condensed status (history capped to ' +
        `the last ${MAX_HISTORY_ENTRIES} entries; oversized syncResult.resources stripped). ` +
        'Optional refresh=normal|hard refreshes from Git without syncing. Always pass project ' +
        'when using a project-scoped token.',
      input: GetApplicationInputSchema,
      handler: async (ctx, input: GetApplicationInput) => {
        const data = (await argoRequest(ctx, {
          method: 'GET',
          path: `/api/v1/applications/${encodeURIComponent(input.name)}`,
          params: stringParams({
            project: input.project,
            appNamespace: input.appNamespace,
            refresh: input.refresh,
          }),
        })) as ArgoApplication;
        return slimApplicationDetail(data);
      },
    },

    getResourceTree: {
      isTool: true,
      description:
        'Get the resource tree for an application — health and sync state per managed Kubernetes ' +
        'object. Primary diagnostic tool when an app is Degraded or OutOfSync.',
      input: GetResourceTreeInputSchema,
      handler: async (ctx, input: GetResourceTreeInput) => {
        return argoRequest(ctx, {
          method: 'GET',
          path: `/api/v1/applications/${encodeURIComponent(input.name)}/resource-tree`,
          params: stringParams({ appNamespace: input.appNamespace }),
        });
      },
    },

    listApplicationEvents: {
      isTool: true,
      description:
        'List Kubernetes events related to an Argo CD application (or a specific managed resource). ' +
        'Useful for diagnosing why sync or hooks failed.',
      input: ListApplicationEventsInputSchema,
      handler: async (ctx, input: ListApplicationEventsInput) => {
        return argoRequest(ctx, {
          method: 'GET',
          path: `/api/v1/applications/${encodeURIComponent(input.name)}/events`,
          params: stringParams({
            resourceNamespace: input.resourceNamespace,
            resourceName: input.resourceName,
            resourceUID: input.resourceUID,
            appNamespace: input.appNamespace,
          }),
        });
      },
    },

    getPodLogs: {
      isTool: true,
      description:
        'Retrieve logs for a pod managed by an Argo CD application. Output is capped to the last ' +
        `${MAX_LOG_CHARS} characters. Prefer finite query params (tailLines, sinceSeconds); ` +
        'streaming/watch log APIs are not exposed.',
      input: GetPodLogsInputSchema,
      output: lazySchema(() =>
        z.object({
          logs: z.string().describe('The (possibly truncated) log output.'),
          truncated: z.boolean().describe('Whether the output was truncated to fit the size cap.'),
        })
      ),
      handler: async (ctx, input: GetPodLogsInput) => {
        const data = await argoRequest(ctx, {
          method: 'GET',
          path: `/api/v1/applications/${encodeURIComponent(input.name)}/pods/${encodeURIComponent(
            input.podName
          )}/logs`,
          params: stringParams({
            namespace: input.namespace,
            container: input.container,
            tailLines: input.tailLines !== undefined ? String(input.tailLines) : undefined,
            sinceSeconds: input.sinceSeconds !== undefined ? String(input.sinceSeconds) : undefined,
            appNamespace: input.appNamespace,
          }),
        });
        const raw = typeof data === 'string' ? data : JSON.stringify(data);
        const truncated = raw.length > MAX_LOG_CHARS;
        return {
          logs: truncated ? raw.slice(raw.length - MAX_LOG_CHARS) : raw,
          truncated,
        };
      },
    },

    syncApplication: {
      isTool: true,
      description:
        'Trigger a sync of an Argo CD application to reconcile the live cluster state with Git. ' +
        'prune defaults to false (does not delete resources removed from Git). Prefer dryRun: true ' +
        'before a real sync. Pass project when using a project-scoped token.',
      input: SyncApplicationInputSchema,
      handler: async (ctx, input: SyncApplicationInput) => {
        const body: Record<string, unknown> = {
          prune: input.prune ?? false,
          ...(input.revision !== undefined ? { revision: input.revision } : {}),
          ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
          ...(input.syncOptions ? { syncOptions: { items: input.syncOptions } } : {}),
          ...(input.resources ? { resources: input.resources } : {}),
          ...(input.strategy ? { strategy: input.strategy } : {}),
          ...(input.appNamespace ? { appNamespace: input.appNamespace } : {}),
        };

        return argoRequest(ctx, {
          method: 'POST',
          path: `/api/v1/applications/${encodeURIComponent(input.name)}/sync`,
          params: stringParams({ project: input.project }),
          data: body,
        });
      },
    },

    listClusters: {
      isTool: true,
      description:
        'List clusters registered with Argo CD. Credential fields (bearerToken, tlsClientConfig, ' +
        'etc.) are scrubbed from the response.',
      input: ListClustersInputSchema,
      handler: async (ctx, input: ListClustersInput) => {
        const data = (await argoRequest(ctx, {
          method: 'GET',
          path: '/api/v1/clusters',
          params: stringParams({ id: input.id, name: input.name }),
        })) as ArgoClusterList;

        const items = Array.isArray(data.items) ? data.items : [];
        return {
          itemCount: items.length,
          items: items.map((cluster) => scrubClusterConfig(cluster)),
        };
      },
    },

    getProject: {
      isTool: true,
      description:
        'Get an Argo CD AppProject by name. Defaults to the detailed endpoint for richer agent ' +
        'context (destinations, source repos, roles).',
      input: GetProjectInputSchema,
      handler: async (ctx, input: GetProjectInput) => {
        const detailed = input.detailed ?? true;
        const suffix = detailed ? '/detailed' : '';
        return argoRequest(ctx, {
          method: 'GET',
          path: `/api/v1/projects/${encodeURIComponent(input.name)}${suffix}`,
        });
      },
    },
  },

  skill: [
    'Argo CD connector — usage guidance for LLMs.',
    '',
    '## Choosing an action',
    'Prefer typed actions; use `request` only for API paths they do not cover.',
    'Streaming (`/api/v1/stream/...`), password changes, and repository/cluster credential writes are blocked.',
    '',
    '## Auth',
    'The connector must be configured with a long-lived account or project-role API token.',
    'Session JWTs from username/password login expire quickly and should never be stored in the connector.',
    '',
    '## Diagnose loop',
    '1. listApplications (filter by project or look for Degraded / OutOfSync health/sync)',
    '2. getApplication for condensed status and recent history',
    '3. getResourceTree / listApplicationEvents for per-resource failures',
    '4. getPodLogs for container output',
    '5. syncApplication with dryRun: true, then a real sync if appropriate',
    '',
    '## Sync vs refresh',
    '`refresh` on getApplication re-reads Git into Argo CD caches without applying to the cluster.',
    '`syncApplication` applies the desired state to the cluster. Prefer dryRun before a real sync.',
    'prune: true deletes cluster resources removed from Git — confirm before using it.',
    '',
    '## Project-scoped tokens',
    'Always pass `project` on get/sync when the token is scoped to an AppProject (correct 404 vs 403).',
    '',
    '## Hand-off to Kubernetes',
    'Use this connector for GitOps lifecycle (desired vs live, sync, Application CR).',
    'Hand off to the Kubernetes connector for direct cluster API work (RBAC, secrets scrubbing at',
    'the k8s layer, pod remediation beyond Argo CD-managed resources).',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.argocd.test.description', {
      defaultMessage: 'Verifies connectivity by requesting Argo CD userinfo',
    }),
    handler: async (ctx) => {
      const data = (await argoRequest(ctx, {
        method: 'GET',
        path: '/api/v1/session/userinfo',
      })) as { loggedIn?: boolean; username?: string };

      const username = data?.username ? ` as ${data.username}` : '';
      return { message: `Successfully connected to Argo CD${username}` };
    },
    enabled: true,
  },
};
