/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Kubernetes Connector
 *
 * A flexible connector for the Kubernetes API that lets agents and workflows
 * read and mutate resources in a cluster. It exposes:
 *
 * - `request`: a generic, authenticated call to any API path (the escape hatch)
 * - typed convenience actions (list/get/create/apply/patch/delete/scale/logs)
 *   that build the correct API paths and slim large responses for agent use
 *
 * Kibana enforces a blocklist of interactive subresources (exec, portforward,
 * attach, proxy) and scrubs secret data from all responses. Scope the service
 * account's RBAC accordingly.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  RequestInputSchema,
  ListResourcesInputSchema,
  GetResourceInputSchema,
  ListNamespacesInputSchema,
  GetPodLogsInputSchema,
  ListEventsInputSchema,
  CreateResourceInputSchema,
  ApplyResourceInputSchema,
  PatchResourceInputSchema,
  DeleteResourceInputSchema,
  ScaleWorkloadInputSchema,
} from './types';
import type {
  RequestInput,
  HttpMethod,
  ListResourcesInput,
  GetResourceInput,
  ListNamespacesInput,
  GetPodLogsInput,
  ListEventsInput,
  CreateResourceInput,
  ApplyResourceInput,
  PatchResourceInput,
  DeleteResourceInput,
  ScaleWorkloadInput,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const STRATEGIC_MERGE_PATCH = 'application/strategic-merge-patch+json';
const MERGE_PATCH = 'application/merge-patch+json';
const JSON_PATCH = 'application/json-patch+json';
const APPLY_PATCH = 'application/apply-patch+json';

/** Cap pod log output so it stays within an agent-safe context size. */
const MAX_LOG_CHARS = 20000;

// =============================================================================
// Lightweight Kubernetes object shapes (only the fields we read)
// =============================================================================

interface K8sMetadata {
  name?: string;
  namespace?: string;
  uid?: string;
  labels?: Record<string, string>;
  creationTimestamp?: string;
  managedFields?: unknown;
}

interface K8sObject {
  apiVersion?: string;
  kind?: string;
  metadata?: K8sMetadata;
  status?: Record<string, unknown>;
  [key: string]: unknown;
}

interface K8sList {
  apiVersion?: string;
  kind?: string;
  items?: K8sObject[];
  metadata?: { continue?: string; resourceVersion?: string };
}

// =============================================================================
// Security guardrails
// =============================================================================

/** Interactive subresources that must never be proxied, regardless of RBAC. */
const BLOCKED_SUBRESOURCES = new Set(['exec', 'portforward', 'attach', 'proxy']);

/**
 * Validates that `path` cannot repoint the request host and does not target
 * interactive subresources. Query/fragment suffixes are stripped before the
 * blocklist check so `.../exec?command=...` cannot bypass it.
 */
const assertPathAllowed = (path: string): void => {
  // Require a leading slash so `${apiUrl}${path}` cannot be rewritten via
  // userinfo (`@evil.com/...`), absolute URLs, or other host-repoint forms.
  if (!path.startsWith('/')) {
    throw new Error('Kubernetes API path must start with "/"');
  }

  const pathOnly = path.split(/[?#]/, 1)[0] ?? path;

  // Restrict to well-known Kubernetes API prefixes so the generic `request`
  // action cannot be pointed at arbitrary cluster endpoints.
  if (!/^\/(api|apis|version|openapi|healthz|livez|readyz)(\/|$)/.test(pathOnly)) {
    throw new Error(
      'Kubernetes API path must be under /api, /apis, /version, /openapi, /healthz, /livez, or /readyz'
    );
  }

  for (const segment of pathOnly.split('/')) {
    if (BLOCKED_SUBRESOURCES.has(segment)) {
      throw new Error(
        `Requests to the "${segment}" subresource are not permitted via this connector`
      );
    }
  }
};

/** Strips secret payload fields from a single object (kind-agnostic). */
const stripSecretPayload = (obj: K8sObject): K8sObject => {
  const scrubbed = { ...obj };
  delete scrubbed.data;
  delete scrubbed.stringData;
  return scrubbed;
};

/**
 * Removes secret payload fields so they are never forwarded to an LLM.
 * SecretList items omit `kind`/`apiVersion` in real Kubernetes responses, so
 * list items are scrubbed by envelope kind rather than per-item kind.
 */
const scrubSecrets = (response: unknown): unknown => {
  if (!response || typeof response !== 'object') return response;
  const obj = response as K8sObject;
  if (obj.kind === 'Secret') {
    return stripSecretPayload(obj);
  }
  if (obj.kind === 'SecretList') {
    const list = obj as K8sList;
    return {
      ...list,
      items: Array.isArray(list.items)
        ? list.items.map((item) => stripSecretPayload(item))
        : list.items,
    };
  }
  return response;
};

// =============================================================================
// Helpers
// =============================================================================

const buildApiBase = (apiVersion: string): string => {
  if (apiVersion.includes('/')) {
    const [group, version, ...rest] = apiVersion.split('/');
    // Reject malformed apiVersions with extra segments (e.g. "apps/v1/extra").
    if (!group || !version || rest.length > 0) {
      throw new Error(`Invalid apiVersion "${apiVersion}"`);
    }
    return `/apis/${encodeURIComponent(group)}/${encodeURIComponent(version)}`;
  }
  return `/api/${encodeURIComponent(apiVersion)}`;
};

const buildResourcePath = ({
  apiVersion,
  resource,
  namespace,
  name,
  subresource,
}: {
  apiVersion: string;
  resource: string;
  namespace?: string;
  name?: string;
  subresource?: string;
}): string => {
  const base = buildApiBase(apiVersion);
  const ns = namespace ? `/namespaces/${encodeURIComponent(namespace)}` : '';
  const nm = name ? `/${encodeURIComponent(name)}` : '';
  const sub = subresource ? `/${encodeURIComponent(subresource)}` : '';
  return `${base}${ns}/${encodeURIComponent(resource)}${nm}${sub}`;
};

interface K8sRequestOptions {
  method: HttpMethod;
  path: string;
  params?: Record<string, string>;
  data?: unknown;
  contentType?: string;
}

/**
 * Turns an Axios/Kubernetes error into a readable Error. Kubernetes returns a
 * `Status` object (with a human-readable `message` and numeric `code`) in the
 * response body for failures, which is far more useful than "Request failed
 * with status code 403".
 */
const normalizeK8sError = (error: unknown): Error => {
  const responseData = (
    error as { response?: { data?: { message?: unknown; code?: unknown; reason?: unknown } } }
  )?.response?.data;

  if (responseData && typeof responseData.message === 'string') {
    const code = typeof responseData.code === 'number' ? ` (${responseData.code})` : '';
    const reason = typeof responseData.reason === 'string' ? ` [${responseData.reason}]` : '';
    return new Error(`Kubernetes API error${code}${reason}: ${responseData.message}`);
  }

  return error instanceof Error ? error : new Error(String(error));
};

/** Central request helper: resolves the URL, applies headers, normalizes errors. */
const k8sRequest = async (ctx: ActionContext, options: K8sRequestOptions): Promise<unknown> => {
  assertPathAllowed(options.path);
  const { apiUrl } = ctx.config as { apiUrl: string };
  const client = ctx.client as AxiosInstance;
  try {
    const response = await client.request({
      method: options.method,
      url: `${apiUrl}${options.path}`,
      ...(options.params ? { params: options.params } : {}),
      ...(options.data !== undefined ? { data: options.data } : {}),
      ...(options.contentType ? { headers: { 'Content-Type': options.contentType } } : {}),
    });
    return scrubSecrets(response.data);
  } catch (error) {
    throw normalizeK8sError(error);
  }
};

/** Builds query params for mutating calls (dryRun / field manager / conflict resolution). */
const buildMutationParams = ({
  dryRun,
  fieldManager,
  force,
}: {
  dryRun?: boolean;
  fieldManager?: string;
  force?: boolean;
}): Record<string, string> => ({
  ...(dryRun ? { dryRun: 'All' } : {}),
  ...(fieldManager ? { fieldManager } : {}),
  ...(force ? { force: 'true' } : {}),
});

/** Removes verbose server-managed bookkeeping that is rarely useful to an agent. */
const stripManagedFields = (obj: unknown): unknown => {
  const candidate = obj as K8sObject | undefined;
  if (candidate?.metadata?.managedFields) {
    const restMeta = { ...candidate.metadata };
    delete restMeta.managedFields;
    return { ...candidate, metadata: restMeta };
  }
  return obj;
};

/** Picks the handful of status fields that are broadly useful across resource kinds. */
const summarizeStatus = (status?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!status) {
    return undefined;
  }
  const conditions = Array.isArray(status.conditions)
    ? (status.conditions as Array<Record<string, unknown>>).map((c) => ({
        type: c.type,
        status: c.status,
        reason: c.reason,
      }))
    : undefined;

  const summary: Record<string, unknown> = {
    ...(status.phase !== undefined ? { phase: status.phase } : {}),
    ...(status.replicas !== undefined ? { replicas: status.replicas } : {}),
    ...(status.readyReplicas !== undefined ? { readyReplicas: status.readyReplicas } : {}),
    ...(status.availableReplicas !== undefined
      ? { availableReplicas: status.availableReplicas }
      : {}),
    ...(conditions ? { conditions } : {}),
  };

  return Object.keys(summary).length > 0 ? summary : undefined;
};

/** Projects a list response into a compact, agent-friendly summary. */
const slimList = (data: unknown) => {
  const list = data as K8sList;
  const items = Array.isArray(list.items) ? list.items : [];
  return {
    apiVersion: list.apiVersion,
    kind: list.kind,
    itemCount: items.length,
    items: items.map((item) => ({
      name: item.metadata?.name,
      namespace: item.metadata?.namespace,
      labels: item.metadata?.labels,
      creationTimestamp: item.metadata?.creationTimestamp,
      status: summarizeStatus(item.status),
    })),
    ...(list.metadata?.continue ? { continue: list.metadata.continue } : {}),
  };
};

// =============================================================================
// Connector spec
// =============================================================================

export const KubernetesConnector: ConnectorSpec = {
  metadata: {
    id: '.kubernetes',
    displayName: 'Kubernetes',
    description: i18n.translate('core.kibanaConnectorSpecs.kubernetes.metadata.description', {
      defaultMessage: 'Read and modify resources in a Kubernetes cluster via its REST API',
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
          label: i18n.translate('core.kibanaConnectorSpecs.kubernetes.auth.bearerWithTls.label', {
            defaultMessage: 'Service account token',
          }),
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.kubernetes.auth.bearerWithTls.tokenLabel',
                { defaultMessage: 'Token' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.kubernetes.auth.bearerWithTls.tokenHelpText',
                {
                  defaultMessage:
                    'A Kubernetes service account bearer token. Prefer a least-privilege service account scoped to the namespaces and verbs the connector needs.',
                }
              ),
            },
            caCert: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.kubernetes.auth.bearerWithTls.caLabel',
                { defaultMessage: 'Cluster CA certificate (PEM)' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.kubernetes.auth.bearerWithTls.caHelpText',
                {
                  defaultMessage:
                    'Paste the PEM-encoded certificate authority used to verify the API server. Leave empty to rely on the system trust store or to disable verification.',
                }
              ),
            },
            verificationMode: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.kubernetes.auth.bearerWithTls.verificationModeHelpText',
                {
                  defaultMessage:
                    'How to verify the API server TLS certificate. "full" verifies the certificate and hostname, "certificate" verifies the certificate only, and "none" disables verification (not recommended).',
                }
              ),
            },
          },
        },
      },
      {
        type: 'kubernetes_gke',
        defaults: {},
      },
      {
        type: 'kubernetes_eks',
        defaults: {},
      },
      {
        type: 'kubernetes_aks',
        defaults: {},
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      apiUrl: z
        .string()
        .url()
        .describe('Kubernetes API server URL (e.g., https://my-cluster.example.com:6443)')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.kubernetes.config.apiUrl.label', {
            defaultMessage: 'API server URL',
          }),
          widget: 'text',
          placeholder: 'https://my-cluster.example.com:6443',
          validate: { allowedHosts: true },
        }),
    })
  ),

  actions: {
    request: {
      isTool: true,
      description:
        'Make an authenticated request to any Kubernetes API path. This is the flexible escape hatch — ' +
        'prefer the typed actions (listResources, getResource, createResource, applyResource, patchResource, ' +
        'deleteResource, scaleWorkload) when they fit, and use this for anything they do not cover. ' +
        'PATCH requests default to strategic-merge-patch+json unless a contentType is provided.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        const contentType =
          input.contentType ?? (input.method === 'PATCH' ? STRATEGIC_MERGE_PATCH : undefined);
        return k8sRequest(ctx, {
          method: input.method,
          path: input.path,
          params: input.query,
          data: input.body,
          contentType,
        });
      },
    },

    listResources: {
      isTool: true,
      description:
        'List resources of a given type, optionally filtered by namespace and label/field selectors. ' +
        'Returns a compact summary (name, namespace, labels, creation time, status highlights) per item. ' +
        'When more pages are available the response includes a `continue` token — pass it back to fetch ' +
        'the next page. Use getResource for the full object.',
      input: ListResourcesInputSchema,
      handler: async (ctx, input: ListResourcesInput) => {
        const data = await k8sRequest(ctx, {
          method: 'GET',
          path: buildResourcePath({
            apiVersion: input.apiVersion,
            resource: input.resource,
            namespace: input.namespace,
          }),
          params: {
            limit: String(input.limit),
            ...(input.labelSelector ? { labelSelector: input.labelSelector } : {}),
            ...(input.fieldSelector ? { fieldSelector: input.fieldSelector } : {}),
            ...(input.continue ? { continue: input.continue } : {}),
          },
        });
        return slimList(data);
      },
    },

    getResource: {
      isTool: true,
      description:
        'Retrieve the full manifest of a single resource by name. Server-managed metadata ' +
        '(managedFields) is stripped to reduce noise.',
      input: GetResourceInputSchema,
      handler: async (ctx, input: GetResourceInput) => {
        const data = await k8sRequest(ctx, {
          method: 'GET',
          path: buildResourcePath({
            apiVersion: input.apiVersion,
            resource: input.resource,
            namespace: input.namespace,
            name: input.name,
          }),
        });
        return stripManagedFields(data);
      },
    },

    listNamespaces: {
      isTool: true,
      description: 'List all namespaces in the cluster.',
      input: ListNamespacesInputSchema,
      handler: async (ctx, input: ListNamespacesInput) => {
        const data = await k8sRequest(ctx, {
          method: 'GET',
          path: '/api/v1/namespaces',
          params: {
            ...(input.labelSelector ? { labelSelector: input.labelSelector } : {}),
          },
        });
        return slimList(data);
      },
    },

    getPodLogs: {
      isTool: true,
      description:
        'Retrieve logs for a pod (optionally a specific container). Output is capped to the last ' +
        `${MAX_LOG_CHARS} characters to stay within context limits.`,
      input: GetPodLogsInputSchema,
      output: lazySchema(() =>
        z.object({
          logs: z.string().describe('The (possibly truncated) log output.'),
          truncated: z.boolean().describe('Whether the output was truncated to fit the size cap.'),
        })
      ),
      handler: async (ctx, input: GetPodLogsInput) => {
        const data = await k8sRequest(ctx, {
          method: 'GET',
          path: buildResourcePath({
            apiVersion: 'v1',
            resource: 'pods',
            namespace: input.namespace,
            name: input.name,
            subresource: 'log',
          }),
          params: {
            tailLines: String(input.tailLines),
            ...(input.container ? { container: input.container } : {}),
            ...(input.previous ? { previous: 'true' } : {}),
            ...(input.sinceSeconds !== undefined
              ? { sinceSeconds: String(input.sinceSeconds) }
              : {}),
          },
        });
        const raw = typeof data === 'string' ? data : JSON.stringify(data);
        const truncated = raw.length > MAX_LOG_CHARS;
        return {
          logs: truncated ? raw.slice(raw.length - MAX_LOG_CHARS) : raw,
          truncated,
        };
      },
    },

    listEvents: {
      isTool: true,
      description:
        'List recent cluster events, optionally scoped to a namespace and filtered by label/field ' +
        'selectors. Useful for diagnosing why a resource is failing to schedule, start, or become ready. ' +
        'When more pages are available the response includes a `continue` token — pass it back to fetch ' +
        'the next page.',
      input: ListEventsInputSchema,
      handler: async (ctx, input: ListEventsInput) => {
        const data = await k8sRequest(ctx, {
          method: 'GET',
          path: buildResourcePath({
            apiVersion: 'v1',
            resource: 'events',
            namespace: input.namespace,
          }),
          params: {
            limit: String(input.limit),
            ...(input.labelSelector ? { labelSelector: input.labelSelector } : {}),
            ...(input.fieldSelector ? { fieldSelector: input.fieldSelector } : {}),
            ...(input.continue ? { continue: input.continue } : {}),
          },
        });
        const list = data as K8sList;
        const items = Array.isArray(list.items) ? list.items : [];
        return {
          itemCount: items.length,
          items: items.map((event) => ({
            type: event.type,
            reason: event.reason,
            message: event.message,
            involvedObject: event.involvedObject,
            count: event.count,
            lastTimestamp: event.lastTimestamp ?? event.eventTime,
          })),
          ...(list.metadata?.continue ? { continue: list.metadata.continue } : {}),
        };
      },
    },

    createResource: {
      isTool: true,
      description:
        'Create a new resource from a manifest (POST to the collection). Use applyResource instead if ' +
        'the resource may already exist and you want create-or-update semantics.',
      input: CreateResourceInputSchema,
      handler: async (ctx, input: CreateResourceInput) => {
        const data = await k8sRequest(ctx, {
          method: 'POST',
          path: buildResourcePath({
            apiVersion: input.apiVersion,
            resource: input.resource,
            namespace: input.namespace,
          }),
          params: buildMutationParams({ dryRun: input.dryRun }),
          data: input.manifest,
        });
        return stripManagedFields(data);
      },
    },

    applyResource: {
      isTool: true,
      description:
        'Create or update a resource using server-side apply (PATCH with apply-patch semantics). ' +
        'This is the idempotent, declarative way to reconcile a resource to a desired manifest.',
      input: ApplyResourceInputSchema,
      handler: async (ctx, input: ApplyResourceInput) => {
        const data = await k8sRequest(ctx, {
          method: 'PATCH',
          path: buildResourcePath({
            apiVersion: input.apiVersion,
            resource: input.resource,
            namespace: input.namespace,
            name: input.name,
          }),
          params: buildMutationParams({
            dryRun: input.dryRun,
            fieldManager: input.fieldManager,
            force: input.force,
          }),
          data: input.manifest,
          contentType: APPLY_PATCH,
        });
        return stripManagedFields(data);
      },
    },

    patchResource: {
      isTool: true,
      description:
        'Apply a partial update to an existing resource. Supports strategic-merge (default), merge, ' +
        'and JSON Patch strategies.',
      input: PatchResourceInputSchema,
      handler: async (ctx, input: PatchResourceInput) => {
        const contentTypeByStrategy: Record<PatchResourceInput['patchType'], string> = {
          strategic: STRATEGIC_MERGE_PATCH,
          merge: MERGE_PATCH,
          json: JSON_PATCH,
        };
        const data = await k8sRequest(ctx, {
          method: 'PATCH',
          path: buildResourcePath({
            apiVersion: input.apiVersion,
            resource: input.resource,
            namespace: input.namespace,
            name: input.name,
          }),
          params: buildMutationParams({ dryRun: input.dryRun }),
          data: input.patch,
          contentType: contentTypeByStrategy[input.patchType],
        });
        return stripManagedFields(data);
      },
    },

    deleteResource: {
      isTool: true,
      description: 'Delete a resource by name.',
      input: DeleteResourceInputSchema,
      handler: async (ctx, input: DeleteResourceInput) => {
        return k8sRequest(ctx, {
          method: 'DELETE',
          path: buildResourcePath({
            apiVersion: input.apiVersion,
            resource: input.resource,
            namespace: input.namespace,
            name: input.name,
          }),
          params: buildMutationParams({ dryRun: input.dryRun }),
        });
      },
    },

    scaleWorkload: {
      isTool: true,
      description:
        'Scale a Deployment, StatefulSet, or ReplicaSet to a desired number of replicas via the ' +
        'scale subresource.',
      input: ScaleWorkloadInputSchema,
      handler: async (ctx, input: ScaleWorkloadInput) => {
        const data = await k8sRequest(ctx, {
          method: 'PATCH',
          path: buildResourcePath({
            apiVersion: 'apps/v1',
            resource: input.resource,
            namespace: input.namespace,
            name: input.name,
            subresource: 'scale',
          }),
          params: buildMutationParams({ dryRun: input.dryRun }),
          data: { spec: { replicas: input.replicas } },
          contentType: MERGE_PATCH,
        });
        return stripManagedFields(data);
      },
    },
  },

  skill: [
    'Kubernetes connector — usage guidance for LLMs.',
    '',
    '## Choosing an action',
    'Prefer the typed actions; fall back to `request` only for API paths they do not cover',
    '(subresources, custom resources with unusual paths, aggregated APIs, etc.).',
    '',
    '## apiVersion and resource',
    'Every typed action needs `apiVersion` (as written in a manifest) and `resource` (the lowercase',
    'plural path segment, NOT the Kind):',
    '  - core (v1): pods, services, configmaps, secrets, nodes, namespaces, persistentvolumeclaims, events',
    '  - apps/v1: deployments, statefulsets, daemonsets, replicasets',
    '  - batch/v1: jobs, cronjobs',
    '  - networking.k8s.io/v1: ingresses, networkpolicies',
    'Omit `namespace` for cluster-scoped resources (nodes, namespaces, persistentvolumes) and, on',
    'listResources, to list across all namespaces.',
    '',
    '## Mutations',
    'Use applyResource for idempotent create-or-update from a full manifest (server-side apply).',
    'Use createResource only when the object must not already exist. Use patchResource for small',
    'in-place edits. Every mutating action accepts `dryRun: true` to preview without persisting —',
    'prefer previewing a destructive change first.',
    '',
    '## Diagnostics',
    'When a workload is unhealthy: listResources to find it, getResource for its full status,',
    'listEvents (same namespace) for scheduling/startup errors, and getPodLogs for container output.',
  ].join('\n'),

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.kubernetes.test.description', {
      defaultMessage: 'Verifies connectivity by requesting the Kubernetes API server version',
    }),
    handler: async (ctx) => {
      const data = (await k8sRequest(ctx, { method: 'GET', path: '/version' })) as {
        gitVersion?: string;
      };
      const version = data?.gitVersion ? ` (${data.gitVersion})` : '';
      return { message: `Successfully connected to the Kubernetes API${version}` };
    },
    enabled: true,
  },
};
