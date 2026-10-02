/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Azure Kubernetes Service (AKS) Connector
 *
 * Provides read and control actions over AKS clusters via the Azure Resource
 * Manager (ARM) REST API. Authentication uses OAuth 2.0 Client Credentials
 * (a service principal / app registration) scoped to the ARM management
 * audience (`https://management.azure.com/.default`).
 *
 * The service principal must have at least the "Azure Kubernetes Service Cluster
 * User Role" for read actions and "Azure Kubernetes Service Contributor Role"
 * for control-plane actions (scale, stop, start, run-command).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  ListSubscriptionsInputSchema,
  ListResourceGroupsInputSchema,
  ListClustersInputSchema,
  GetClusterInputSchema,
  ListNodePoolsInputSchema,
  GetNodePoolInputSchema,
  ScaleNodePoolInputSchema,
  StopClusterInputSchema,
  StartClusterInputSchema,
  GetClusterCredentialsInputSchema,
  RunCommandInputSchema,
} from './types';
import type {
  ListResourceGroupsInput,
  ListClustersInput,
  GetClusterInput,
  GetNodePoolInput,
  ScaleNodePoolInput,
  GetClusterCredentialsInput,
  RunCommandInput,
} from './types';

const ARM_BASE = 'https://management.azure.com';
const AKS_API_VERSION = '2024-02-01';
const SUBSCRIPTIONS_API_VERSION = '2022-12-01';
const RESOURCE_GROUPS_API_VERSION = '2021-04-01';

/**
 * Upper bound on pages followed by {@link getAllPages}. ARM returns at most
 * this many `nextLink` hops before pagination is reported as truncated.
 */
const MAX_ARM_PAGES = 20;

interface ArmCollection {
  value?: unknown[];
  nextLink?: string;
}

/**
 * Fetch every page of an ARM collection, following `nextLink` until it is
 * absent. ARM paginates list routes without any caller-supplied page size, so
 * returning only the first page silently truncates the result — a
 * subscription with more clusters, node pools, or resource groups than fit in
 * one page would appear to have fewer.
 *
 * `nextLink` already carries api-version and an opaque skip token, so its
 * query string is preserved and no params of our own are re-applied.
 *
 * The link is server-supplied data and `ctx.client` carries the ARM bearer
 * token, so its origin is checked before it is requested. Axios strips a
 * standard authorization header when a redirect crosses to another host, but
 * an explicit request like this one gets no such protection, and a link
 * naming another host would hand the token over. Pagination stops instead,
 * reporting the result as truncated.
 *
 * The link is resolved against the URL axios actually requested, obtained
 * from `getUri`: axios concatenates `baseURL` and `url` rather than resolving
 * them the way the URL constructor does, so rebuilding that base by hand
 * would give the wrong path for a relative link.
 */
async function getAllPages(
  ctx: ActionContext,
  url: string,
  params: Record<string, unknown>
): Promise<{ value: unknown[]; truncated?: true }> {
  const first = await ctx.client.get<ArmCollection>(url, { params });
  const value = [...(first.data?.value ?? [])];
  let nextLink = first.data?.nextLink;

  const requested = new URL(ctx.client.getUri({ url, params }));

  let page = 1;
  while (nextLink && page < MAX_ARM_PAGES) {
    const nextUrl = new URL(nextLink, requested);
    if (nextUrl.origin !== requested.origin) {
      // Treat a cross-origin continuation link as the end of the collection: the
      // pages already collected are returned, flagged as incomplete.
      return { value, truncated: true };
    }

    const next = await ctx.client.get<ArmCollection>(nextUrl.href);
    value.push(...(next.data?.value ?? []));
    nextLink = next.data?.nextLink;
    page++;
  }

  // Report truncation rather than pretending the list is complete, so an agent
  // can narrow its query instead of acting on a partial inventory.
  return nextLink ? { value, truncated: true } : { value };
}

/**
 * Resolves the subscription ID for an action call: an explicit `input`
 * value takes precedence over the connector's configured one. This lets an
 * agent that just discovered a subscription via `listSubscriptions` pass it
 * straight into the next call, rather than requiring the user to set it in
 * the connector configuration first — the discovery loop the `skill` text
 * below documents does not work without this.
 */
function requireSubscriptionId(ctx: ActionContext, input?: { subscriptionId?: string }): string {
  const subscriptionId =
    input?.subscriptionId ?? (ctx.config?.subscriptionId as string | undefined);
  if (!subscriptionId) {
    throw new Error(
      'This action requires a Subscription ID. Pass one in as "subscriptionId", or set it in the connector configuration.'
    );
  }
  return subscriptionId;
}

function clusterBasePath(subscriptionId: string, resourceGroupName: string, clusterName: string) {
  return (
    `/subscriptions/${subscriptionId}` +
    `/resourceGroups/${encodeURIComponent(resourceGroupName)}` +
    `/providers/Microsoft.ContainerService/managedClusters/${encodeURIComponent(clusterName)}`
  );
}

function throwAzureError(error: unknown): never {
  const err = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: { error?: { code?: string; message?: string } } | string;
    };
    message?: string;
  };

  const azureError =
    err.response?.data && typeof err.response.data === 'object'
      ? (err.response.data as { error?: { code?: string; message?: string } }).error
      : undefined;

  if (azureError) {
    throw new Error(`Azure API error [${azureError.code}]: ${azureError.message}`);
  }

  const rawBody =
    typeof err.response?.data === 'string'
      ? err.response.data
      : err.response?.data
        ? JSON.stringify(err.response.data)
        : '';
  const detail = rawBody ? ` — ${rawBody}` : '';

  if (err.response?.status === 401) {
    throw new Error(`Authentication failed (401)${detail}`);
  } else if (err.response?.status === 403) {
    throw new Error(`Access denied (403)${detail}`);
  }
  throw new Error(`Azure API request failed: ${err.response?.statusText ?? err.message}${detail}`);
}

/**
 * Polls an async ARM operation (202 → Location header) until succeeded/failed.
 * Times out after ~60 seconds and returns the last-known state.
 */
async function pollAsyncOperation(
  ctx: ActionContext,
  locationUrl: string
): Promise<Record<string, unknown>> {
  const MAX_POLLS = 30;
  const POLL_INTERVAL_MS = 2000;

  // The Location header is server-supplied data, and `ctx.client` carries the
  // service principal's bearer token as a default header (see
  // `oauth_client_credentials`'s `configure`). Requesting an
  // attacker-influenced or otherwise off-origin Location with that client
  // would hand the token to whatever host it names, so the origin is
  // checked once, up front, before any polling begins.
  const targetUrl = new URL(locationUrl);
  if (targetUrl.protocol !== 'https:' || targetUrl.origin !== new URL(ARM_BASE).origin) {
    return {
      status: 'error',
      message: `Refusing to poll operation status at an unexpected origin: ${targetUrl.origin}`,
    };
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      const resp = await ctx.client.get(locationUrl);
      const state: string = resp.data?.properties?.provisioningState ?? resp.data?.status ?? '';
      if (
        state.toLowerCase() === 'succeeded' ||
        state.toLowerCase() === 'failed' ||
        state.toLowerCase() === 'canceled'
      ) {
        return resp.data as Record<string, unknown>;
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      // A transient 404 is expected while Azure sets up the result; anything
      // else (in particular 401/403) will not resolve by retrying, so it is
      // surfaced immediately instead of being masked as a generic timeout
      // after 60 seconds of fruitless polling.
      if (status !== 404) {
        throwAzureError(error);
      }
    }
  }
  return { status: 'timeout', message: 'Operation did not complete within 60 seconds.' };
}

export const AzureAks: ConnectorSpec = {
  metadata: {
    id: '.azure_aks',
    displayName: 'Azure Kubernetes Service (AKS)',
    description: i18n.translate('core.kibanaConnectorSpecs.azureAks.metadata.description', {
      defaultMessage: 'List, inspect, and manage Azure Kubernetes Service clusters and node pools',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        isRecommended: true,
        defaults: {
          scope: 'https://management.azure.com/.default',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              label: i18n.translate('core.kibanaConnectorSpecs.azureAks.auth.tokenUrl.label', {
                defaultMessage: 'Token URL',
              }),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.azureAks.auth.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenantId}' with your Azure AD tenant ID. The app registration must have at least the 'Azure Kubernetes Service Cluster User Role' on each cluster, and 'Azure Kubernetes Service Contributor Role' for scale/stop/start/run-command actions.",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
            clientId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.azureAks.auth.clientId.helpText',
                {
                  defaultMessage: 'The Application (client) ID of the Azure AD app registration.',
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
      subscriptionId: z
        .string()
        .max(100)
        .regex(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          'Must be a valid Azure subscription ID (GUID).'
        )
        .optional()
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.azureAks.config.subscriptionId', {
            defaultMessage: 'Azure subscription ID (optional — required for most actions)',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.azureAks.config.subscriptionId.label', {
            defaultMessage: 'Subscription ID',
          }),
          placeholder: '00000000-0000-0000-0000-000000000000',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.azureAks.config.subscriptionId.helpText',
            {
              defaultMessage:
                'The Azure subscription that contains your AKS clusters. Every action except listSubscriptions needs a subscription ID, either configured here or passed in as "subscriptionId" on the individual call.',
            }
          ),
        }),
    })
  ),

  actions: {
    // https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/list
    listSubscriptions: {
      isTool: true,
      scope: 'read',
      description:
        'List all Azure subscriptions accessible to the service principal. Use this first when the connector has no Subscription ID configured, or to discover which subscriptions contain AKS clusters. Every page of results is followed, so the list is complete unless "truncated" is true.',
      input: ListSubscriptionsInputSchema,
      handler: async (ctx) => {
        try {
          return await getAllPages(ctx, `${ARM_BASE}/subscriptions`, {
            'api-version': SUBSCRIPTIONS_API_VERSION,
          });
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/resources/resource-groups/list
    listResourceGroups: {
      isTool: true,
      scope: 'read',
      description:
        'List all resource groups in the subscription. Use this to discover which resource groups contain AKS clusters before calling listClusters with a specific group. Every page of results is followed, so the list is complete unless "truncated" is true.',
      input: ListResourceGroupsInputSchema,
      handler: async (ctx, input: ListResourceGroupsInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          return await getAllPages(
            ctx,
            `${ARM_BASE}/subscriptions/${subscriptionId}/resourcegroups`,
            { 'api-version': RESOURCE_GROUPS_API_VERSION }
          );
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/list
    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/list-by-resource-group
    listClusters: {
      isTool: true,
      scope: 'read',
      description:
        'List AKS managed clusters in the subscription, optionally scoped to a resource group. Returns cluster names, resource groups, Kubernetes version, power state, and provisioning state. Every page of results is followed, so the list is complete unless "truncated" is true.',
      input: ListClustersInputSchema,
      handler: async (ctx, input: ListClustersInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const path = input?.resourceGroupName
            ? `/subscriptions/${subscriptionId}/resourceGroups/${encodeURIComponent(
                input.resourceGroupName
              )}/providers/Microsoft.ContainerService/managedClusters`
            : `/subscriptions/${subscriptionId}/providers/Microsoft.ContainerService/managedClusters`;
          return await getAllPages(ctx, `${ARM_BASE}${path}`, {
            'api-version': AKS_API_VERSION,
          });
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/get
    getCluster: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for a single AKS cluster: Kubernetes version, power state, provisioning state, network profile, RBAC configuration, and add-on profiles. Use listClusters to discover cluster names.',
      input: GetClusterInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const response = await ctx.client.get(
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}`,
            { params: { 'api-version': AKS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/agent-pools/list
    listNodePools: {
      isTool: true,
      scope: 'read',
      description:
        'List all node pools (agent pools) in an AKS cluster. Returns pool names, VM size, current node count, min/max autoscaler bounds, OS type, and provisioning state. Every page of results is followed, so the list is complete unless "truncated" is true.',
      input: ListNodePoolsInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          return await getAllPages(
            ctx,
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}/agentPools`,
            { 'api-version': AKS_API_VERSION }
          );
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/agent-pools/get
    getNodePool: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for a single AKS node pool: current node count, autoscaler settings, VM size, OS disk size, node labels, taints, and upgrade settings. Use listNodePools to discover pool names.',
      input: GetNodePoolInputSchema,
      handler: async (ctx, input: GetNodePoolInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const response = await ctx.client.get(
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}/agentPools/${encodeURIComponent(input.nodePoolName)}`,
            { params: { 'api-version': AKS_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/agent-pools/create-or-update
    scaleNodePool: {
      isTool: true,
      scope: 'destroy',
      description:
        'Set the node count of an AKS node pool. Use count=0 to drain and stop all nodes in a User pool, or increase the count to scale out. This is a manual scale override; if autoscaler is enabled on the pool, it may override the count after scaling completes. count=0 is rejected for a System pool — AKS requires at least 1 node to keep running system-critical pods.',
      input: ScaleNodePoolInputSchema,
      handler: async (ctx, input: ScaleNodePoolInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const poolPath = `${clusterBasePath(
            subscriptionId,
            input.resourceGroupName,
            input.clusterName
          )}/agentPools/${encodeURIComponent(input.nodePoolName)}`;

          // The agent-pool route only supports GET/PUT/DELETE — there is no
          // PATCH. Confirmed against a live cluster: PATCH is rejected with a
          // misleading `InvalidAPIVersion` error regardless of API version.
          // PUT replaces the whole resource, so the current pool is read
          // first and only `count` is overridden in the body sent back.
          const current = await ctx.client.get(`${ARM_BASE}${poolPath}`, {
            params: { 'api-version': AKS_API_VERSION },
          });

          // ARM requires count >= 1 for a System pool (it must keep running
          // system-critical pods) and only allows count=0 on a User pool.
          // Sending 0 for a System pool is rejected by ARM, but with an error
          // that doesn't name the pool's mode as the reason, so this is
          // checked up front to give the agent an actionable message instead.
          if (input.count === 0 && current.data?.properties?.mode === 'System') {
            throw new Error(
              `Node pool '${input.nodePoolName}' is a System pool and cannot be scaled to 0. ` +
                'System pools must keep at least 1 node running system-critical pods; scale a User pool to 0 instead.'
            );
          }

          const response = await ctx.client.put(
            `${ARM_BASE}${poolPath}`,
            { properties: { ...current.data?.properties, count: input.count } },
            { params: { 'api-version': AKS_API_VERSION } }
          );
          // Scaling is async; return the initial response (provisioningState: "Updating").
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/stop
    stopCluster: {
      isTool: true,
      scope: 'destroy',
      description:
        'Stop an AKS cluster (deallocate all node VMs). Reduces costs when the cluster is not in use. The cluster can be restarted with startCluster. Returns immediately; the cluster transitions to Stopped state asynchronously.',
      input: StopClusterInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const response = await ctx.client.post(
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}/stop`,
            {},
            { params: { 'api-version': AKS_API_VERSION } }
          );
          return { status: 'accepted', message: 'Cluster stop initiated.', data: response.data };
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/start
    startCluster: {
      isTool: true,
      scope: 'destroy',
      description:
        'Start a previously stopped AKS cluster (provision node VMs and resume workloads). Returns immediately; the cluster transitions to Running state asynchronously.',
      input: StartClusterInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const response = await ctx.client.post(
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}/start`,
            {},
            { params: { 'api-version': AKS_API_VERSION } }
          );
          return { status: 'accepted', message: 'Cluster start initiated.', data: response.data };
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/list-cluster-user-credentials
    getClusterCredentials: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve kubeconfig credentials for a cluster. Returns a base64-encoded kubeconfig file in the `kubeconfigs[].value` field. Use this to inspect connection details or provide credentials to kubectl.',
      input: GetClusterCredentialsInputSchema,
      handler: async (ctx, input: GetClusterCredentialsInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const response = await ctx.client.post(
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}/listClusterUserCredential`,
            {},
            {
              params: {
                'api-version': AKS_API_VERSION,
                format: input.format ?? 'azure',
              },
            }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/run-command
    runCommand: {
      isTool: true,
      scope: 'destroy',
      description:
        'Run a shell command inside the AKS cluster via a temporary privileged pod (e.g. "kubectl get pods -A", "helm list -A"). Waits for the command to complete and returns the exit code and output. Requires the Azure Kubernetes Service Contributor role on the cluster.',
      input: RunCommandInputSchema,
      handler: async (ctx, input: RunCommandInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx, input);
          const basePath = clusterBasePath(
            subscriptionId,
            input.resourceGroupName,
            input.clusterName
          );

          // RunCommandRequest is a flat body ({ command, context, clusterToken }) —
          // not wrapped in a `properties` object like the cluster/agent-pool
          // resources. Confirmed against a live cluster: sending `properties`
          // fails with `UnmarshalError: unknown field "properties"`.
          const postResp = await ctx.client.post(
            `${ARM_BASE}${basePath}/runCommand`,
            { command: input.command },
            { params: { 'api-version': AKS_API_VERSION } }
          );

          // ARM returns 202 with a Location header pointing to the result.
          const locationUrl: string | undefined =
            postResp.headers?.location ?? postResp.headers?.Location;

          if (!locationUrl) {
            return postResp.data;
          }

          return pollAsyncOperation(ctx, locationUrl);
        } catch (error) {
          throwAzureError(error);
        }
      },
    },
  },

  skill: [
    'Azure Kubernetes Service (AKS) connector — usage guidance:',
    '',
    'DISCOVERY LOOP:',
    '- listSubscriptions (if no subscriptionId configured) → listResourceGroups → listClusters → getCluster or listNodePools.',
    '',
    'SCALING:',
    '- listNodePools to discover pool names → scaleNodePool with the desired count.',
    '- scaleNodePool returns immediately with provisioningState: "Updating"; use listNodePools again to confirm completion.',
    "- If the pool has autoscaler enabled, Azure may override the count after scaling — use getNodePool to check 'minCount'/'maxCount'.",
    '',
    'COST MANAGEMENT (stop/start):',
    '- stopCluster deallocates all VMs (no compute cost while stopped); workloads are suspended.',
    '- startCluster restores the cluster; workloads resume.',
    '- Both operations are async and return immediately. Poll getCluster for power state.',
    '',
    'CREDENTIALS:',
    '- getClusterCredentials returns a base64-encoded kubeconfig in kubeconfigs[].value.',
    '- Decode it with Buffer.from(value, "base64").toString() if you need to inspect or forward it.',
    '',
    'RUN-COMMAND:',
    '- runCommand blocks until the command exits (up to ~60 s) and returns logs + exit code.',
    '- Use for kubectl / helm / az aks queries that need live cluster data.',
    '- Requires the Azure Kubernetes Service Contributor role on the cluster.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.azureAks.test.description', {
      defaultMessage: 'Verifies Azure connectivity by listing accessible subscriptions',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(`${ARM_BASE}/subscriptions`, {
          params: { 'api-version': SUBSCRIPTIONS_API_VERSION },
        });
        const count = Array.isArray(response.data?.value) ? response.data.value.length : 0;
        return {
          message: `Successfully connected to Azure: found ${count} accessible subscription(s)`,
        };
      } catch (error) {
        throwAzureError(error);
      }
    },
  },
};
