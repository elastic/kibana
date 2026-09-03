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

/** Reads the configured subscription ID, throwing a descriptive error if absent. */
function requireSubscriptionId(ctx: ActionContext): string {
  const subscriptionId = ctx.config?.subscriptionId as string | undefined;
  if (!subscriptionId) {
    throw new Error(
      'This action requires a Subscription ID. Set it in the connector configuration.'
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
    } catch {
      // Continue polling on transient errors; the 202 result location
      // may 404 briefly while Azure sets up the result.
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
                'The Azure subscription that contains your AKS clusters. Required for all actions except listSubscriptions.',
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
        'List all Azure subscriptions accessible to the service principal. Use this first when the connector has no Subscription ID configured, or to discover which subscriptions contain AKS clusters.',
      input: ListSubscriptionsInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(`${ARM_BASE}/subscriptions`, {
            params: { 'api-version': SUBSCRIPTIONS_API_VERSION },
          });
          return response.data;
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
        'List all resource groups in the configured subscription. Use this to discover which resource groups contain AKS clusters before calling listClusters with a specific group.',
      input: ListResourceGroupsInputSchema,
      handler: async (ctx) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx);
          const response = await ctx.client.get(
            `${ARM_BASE}/subscriptions/${subscriptionId}/resourcegroups`,
            { params: { 'api-version': RESOURCE_GROUPS_API_VERSION } }
          );
          return response.data;
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
        'List AKS managed clusters in the subscription, optionally scoped to a resource group. Returns cluster names, resource groups, Kubernetes version, power state, and provisioning state.',
      input: ListClustersInputSchema,
      handler: async (ctx, input: ListClustersInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx);
          const path = input?.resourceGroupName
            ? `/subscriptions/${subscriptionId}/resourceGroups/${encodeURIComponent(
                input.resourceGroupName
              )}/providers/Microsoft.ContainerService/managedClusters`
            : `/subscriptions/${subscriptionId}/providers/Microsoft.ContainerService/managedClusters`;
          const response = await ctx.client.get(`${ARM_BASE}${path}`, {
            params: { 'api-version': AKS_API_VERSION },
          });
          return response.data;
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
          const subscriptionId = requireSubscriptionId(ctx);
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
        'List all node pools (agent pools) in an AKS cluster. Returns pool names, VM size, current node count, min/max autoscaler bounds, OS type, and provisioning state.',
      input: ListNodePoolsInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx);
          const response = await ctx.client.get(
            `${ARM_BASE}${clusterBasePath(
              subscriptionId,
              input.resourceGroupName,
              input.clusterName
            )}/agentPools`,
            { params: { 'api-version': AKS_API_VERSION } }
          );
          return response.data;
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
          const subscriptionId = requireSubscriptionId(ctx);
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
        'Set the node count of an AKS node pool. Use count=0 to drain and stop all nodes in the pool, or increase the count to scale out. This is a manual scale override; if autoscaler is enabled on the pool, it may override the count after scaling completes.',
      input: ScaleNodePoolInputSchema,
      handler: async (ctx, input: ScaleNodePoolInput) => {
        try {
          const subscriptionId = requireSubscriptionId(ctx);
          const poolPath = `${clusterBasePath(
            subscriptionId,
            input.resourceGroupName,
            input.clusterName
          )}/agentPools/${encodeURIComponent(input.nodePoolName)}`;

          // PATCH only the count; Azure merges the rest of the pool properties.
          const response = await ctx.client.patch(
            `${ARM_BASE}${poolPath}`,
            { properties: { count: input.count } },
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
          const subscriptionId = requireSubscriptionId(ctx);
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
          const subscriptionId = requireSubscriptionId(ctx);
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
          const subscriptionId = requireSubscriptionId(ctx);
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
          const subscriptionId = requireSubscriptionId(ctx);
          const basePath = clusterBasePath(
            subscriptionId,
            input.resourceGroupName,
            input.clusterName
          );

          const postResp = await ctx.client.post(
            `${ARM_BASE}${basePath}/runCommand`,
            { properties: { command: input.command, context: '' } },
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
