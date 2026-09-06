/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Google Kubernetes Engine (GKE) Connector
 *
 * Control-plane actions against GKE through the Kubernetes Engine API
 * (container.googleapis.com/v1): discover clusters and node pools, scale and
 * autoscale node pools, upgrade and roll back, toggle network and security
 * policy, and track the asynchronous Operation every mutation returns.
 *
 * Workloads (pods, deployments, logs, kubectl-style apply/scale) are out of
 * scope: they belong to the core Kubernetes connector, which accepts the same
 * service account key through its GKE auth type. getCluster returns the API
 * server endpoint and CA certificate that connector needs.
 *
 * Auth: the shared `gcp_service_account` auth type (service account JSON key,
 * exchanged for a short-lived access token with the cloud-platform scope).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { parseServiceAccountKey } from '../../auth_types/gcp_jwt_helpers';
import type {
  CancelOperationInput,
  CreateClusterInput,
  CreateNodePoolInput,
  DeleteClusterInput,
  DeleteNodePoolInput,
  GetClusterInput,
  GetNodePoolInput,
  GetOperationInput,
  GetServerConfigInput,
  GkeCluster,
  GkeNodePool,
  GkeOperation,
  GkeServerConfig,
  ListClustersInput,
  ListNodePoolsInput,
  ListOperationsInput,
  RollbackNodePoolUpgradeInput,
  SetBinaryAuthorizationInput,
  SetMasterAuthorizedNetworksInput,
  SetNetworkPolicyInput,
  SetNodePoolAutoscalingInput,
  SetNodePoolManagementInput,
  SetNodePoolSizeInput,
  UpdateClusterInput,
} from './types';
import {
  CancelOperationInputSchema,
  CreateClusterInputSchema,
  CreateNodePoolInputSchema,
  DeleteClusterInputSchema,
  DeleteNodePoolInputSchema,
  GetClusterInputSchema,
  GetNodePoolInputSchema,
  GetOperationInputSchema,
  GetServerConfigInputSchema,
  ListClustersInputSchema,
  ListNodePoolsInputSchema,
  ListOperationsInputSchema,
  RollbackNodePoolUpgradeInputSchema,
  SetBinaryAuthorizationInputSchema,
  SetMasterAuthorizedNetworksInputSchema,
  SetNetworkPolicyInputSchema,
  SetNodePoolAutoscalingInputSchema,
  SetNodePoolManagementInputSchema,
  SetNodePoolSizeInputSchema,
  UpdateClusterInputSchema,
} from './types';

const GKE_API = 'https://container.googleapis.com/v1';
const ALL_LOCATIONS = '-';

// =============================================================================
// Target resolution
// =============================================================================

/**
 * The project comes from the action input, then the connector's default, then the service
 * account key itself. A key is always minted inside one project, so a connector that only
 * manages that project needs no configuration at all.
 */
const resolveProjectId = (ctx: ActionContext, requested?: string): string => {
  const configured = ctx.config?.defaultProjectId as string | undefined;
  const fromInput = requested?.trim();
  const fromConfig = configured?.trim();
  if (fromInput) return fromInput;
  if (fromConfig) return fromConfig;

  const serviceAccountJson = ctx.secrets?.serviceAccountJson as string | undefined;
  if (serviceAccountJson) {
    const { project_id: projectId } = parseServiceAccountKey(serviceAccountJson);
    if (projectId) return projectId;
  }
  throw new Error(
    'No Google Cloud project id available: pass projectId, or set a default project on the connector.'
  );
};

/**
 * Cluster-scoped actions need a concrete zone or region; list actions accept the `-`
 * wildcard, which the API expands to every location in the project.
 */
const resolveLocation = (
  ctx: ActionContext,
  requested: string | undefined,
  { allowWildcard }: { allowWildcard: boolean }
): string => {
  const configured = ctx.config?.defaultLocation as string | undefined;
  const location = requested?.trim() || configured?.trim();
  if (location) {
    if (location === ALL_LOCATIONS && !allowWildcard) {
      throw new Error(
        'This action needs a concrete zone or region, not "-". Use the "location" returned by listClusters.'
      );
    }
    return location;
  }
  if (allowWildcard) return ALL_LOCATIONS;
  throw new Error(
    'No location available: pass location (a zone such as us-central1-a or a region such as us-central1), or set a default location on the connector.'
  );
};

const parentPath = (projectId: string, location: string): string =>
  `${GKE_API}/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}`;

const clusterPath = (projectId: string, location: string, clusterId: string): string =>
  `${parentPath(projectId, location)}/clusters/${encodeURIComponent(clusterId)}`;

const nodePoolPath = (
  projectId: string,
  location: string,
  clusterId: string,
  nodePoolId: string
): string =>
  `${clusterPath(projectId, location, clusterId)}/nodePools/${encodeURIComponent(nodePoolId)}`;

const operationPath = (projectId: string, location: string, operationId: string): string =>
  `${parentPath(projectId, location)}/operations/${encodeURIComponent(operationId)}`;

interface ClusterTarget {
  projectId?: string;
  location?: string;
  clusterId: string;
}

const resolveCluster = (ctx: ActionContext, input: ClusterTarget) => {
  const projectId = resolveProjectId(ctx, input.projectId);
  const location = resolveLocation(ctx, input.location, { allowWildcard: false });
  return { projectId, location, url: clusterPath(projectId, location, input.clusterId) };
};

const resolveNodePool = (ctx: ActionContext, input: ClusterTarget & { nodePoolId: string }) => {
  const projectId = resolveProjectId(ctx, input.projectId);
  const location = resolveLocation(ctx, input.location, { allowWildcard: false });
  return {
    projectId,
    location,
    url: nodePoolPath(projectId, location, input.clusterId, input.nodePoolId),
  };
};

// =============================================================================
// Errors
// =============================================================================

/**
 * Surface Google's own error payload. Its `status` and `message` carry the actionable detail
 * (a missing permission, a cluster that is mid-operation, an invalid version); an unwrapped
 * axios message says only "Request failed with status code 400".
 */
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  const data = axiosError.response?.data as
    | { error?: { message?: string; status?: string } }
    | undefined;
  if (data?.error?.message) {
    const status = data.error.status ? ` [${data.error.status}]` : '';
    throw new Error(
      `Google Kubernetes Engine API error (${axiosError.response?.status})${status}: ${data.error.message}`
    );
  }
  if (axiosError.response?.data !== undefined) {
    throw new Error(
      `Google Kubernetes Engine API error (${axiosError.response?.status}): ${JSON.stringify(
        axiosError.response.data
      )}`
    );
  }
  throw error;
};

// =============================================================================
// Output shaping
// =============================================================================

// GKE resources are large (a Cluster runs to hundreds of fields). Every action returns a
// curated shape so an agent or workflow sees what it needs to act on, and nothing it does not.

const lastSegment = (resourceName?: string): string | undefined => resourceName?.split('/').pop();

/** The API returns the CA certificate base64-encoded; the Kubernetes connector wants PEM. */
const decodeCaCertificate = (encoded?: string): string | undefined => {
  if (!encoded) return undefined;
  try {
    return atob(encoded);
  } catch {
    return undefined;
  }
};

const trimConditions = (conditions?: GkeCluster['conditions']) =>
  (conditions ?? []).map((condition) => ({
    code: condition.code,
    canonicalCode: condition.canonicalCode,
    message: condition.message,
  }));

const trimNodePool = (pool: GkeNodePool) => ({
  name: pool.name,
  status: pool.status,
  statusMessage: pool.statusMessage,
  version: pool.version,
  // GKE reports the per-zone node count it was told to run, not a live count. It is updated by
  // setNodePoolSize, so it does reflect the last requested size.
  nodeCountPerZone: pool.initialNodeCount,
  locations: pool.locations ?? [],
  totalNodeCount:
    pool.initialNodeCount !== undefined
      ? pool.initialNodeCount * Math.max(pool.locations?.length ?? 1, 1)
      : undefined,
  machineType: pool.config?.machineType,
  diskSizeGb: pool.config?.diskSizeGb,
  diskType: pool.config?.diskType,
  imageType: pool.config?.imageType,
  spot: pool.config?.spot === true,
  preemptible: pool.config?.preemptible === true,
  serviceAccount: pool.config?.serviceAccount,
  labels: pool.config?.labels ?? {},
  taints: pool.config?.taints ?? [],
  // The API drops zero-valued minimums from the payload; restore them so a workflow comparing
  // bounds sees 0 rather than a missing field.
  autoscaling: {
    enabled: pool.autoscaling?.enabled === true,
    minNodeCount:
      pool.autoscaling?.maxNodeCount !== undefined ? pool.autoscaling.minNodeCount ?? 0 : undefined,
    maxNodeCount: pool.autoscaling?.maxNodeCount,
    totalMinNodeCount:
      pool.autoscaling?.totalMaxNodeCount !== undefined
        ? pool.autoscaling.totalMinNodeCount ?? 0
        : undefined,
    totalMaxNodeCount: pool.autoscaling?.totalMaxNodeCount,
    locationPolicy: pool.autoscaling?.locationPolicy,
  },
  management: {
    autoRepair: pool.management?.autoRepair === true,
    autoUpgrade: pool.management?.autoUpgrade === true,
  },
  upgradeSettings: pool.upgradeSettings,
  maxPodsPerNode: pool.maxPodsConstraint?.maxPodsPerNode,
  instanceGroupUrls: pool.instanceGroupUrls ?? [],
  conditions: trimConditions(pool.conditions),
  etag: pool.etag,
  selfLink: pool.selfLink,
});

const trimClusterSummary = (cluster: GkeCluster) => ({
  name: cluster.name,
  // `location` is the zone or region the control plane lives in; it is the value every other
  // action needs. `zone` is the legacy field and mirrors it for zonal clusters.
  location: cluster.location ?? cluster.zone,
  nodeLocations: cluster.locations ?? [],
  status: cluster.status,
  statusMessage: cluster.statusMessage,
  autopilot: cluster.autopilot?.enabled === true,
  currentMasterVersion: cluster.currentMasterVersion,
  currentNodeVersion: cluster.currentNodeVersion,
  currentNodeCount: cluster.currentNodeCount,
  releaseChannel: cluster.releaseChannel?.channel,
  endpoint: cluster.endpoint,
  network: cluster.network,
  subnetwork: cluster.subnetwork,
  nodePoolCount: cluster.nodePools?.length ?? 0,
  resourceLabels: cluster.resourceLabels ?? {},
  createTime: cluster.createTime,
  selfLink: cluster.selfLink,
});

const trimClusterDetail = (cluster: GkeCluster) => {
  const dnsEndpoint = cluster.controlPlaneEndpointsConfig?.dnsEndpointConfig?.endpoint;
  const ipEndpoints = cluster.controlPlaneEndpointsConfig?.ipEndpointsConfig;
  const caCertificatePem = decodeCaCertificate(cluster.masterAuth?.clusterCaCertificate);
  return {
    ...trimClusterSummary(cluster),
    description: cluster.description,
    initialClusterVersion: cluster.initialClusterVersion,
    conditions: trimConditions(cluster.conditions),
    clusterIpv4Cidr: cluster.clusterIpv4Cidr,
    servicesIpv4Cidr: cluster.servicesIpv4Cidr,
    controlPlane: {
      publicEndpoint: ipEndpoints?.publicEndpoint ?? cluster.privateClusterConfig?.publicEndpoint,
      privateEndpoint:
        ipEndpoints?.privateEndpoint ?? cluster.privateClusterConfig?.privateEndpoint,
      dnsEndpoint,
      privateNodes: cluster.privateClusterConfig?.enablePrivateNodes === true,
      privateEndpointOnly: cluster.privateClusterConfig?.enablePrivateEndpoint === true,
    },
    // Everything the core Kubernetes connector needs to reach this cluster. The same service
    // account JSON key authenticates there through its "Google Kubernetes Engine (GKE)" auth
    // type, so no separate credential is minted or returned here.
    kubernetesConnector: cluster.endpoint
      ? {
          apiUrl: `https://${cluster.endpoint}`,
          dnsApiUrl: dnsEndpoint ? `https://${dnsEndpoint}` : undefined,
          caCertificatePem,
          authType: 'kubernetes_gke',
        }
      : undefined,
    networkPolicy: {
      enabled: cluster.networkPolicy?.enabled === true,
      provider: cluster.networkPolicy?.provider,
    },
    masterAuthorizedNetworks: {
      enabled: cluster.masterAuthorizedNetworksConfig?.enabled === true,
      cidrBlocks: cluster.masterAuthorizedNetworksConfig?.cidrBlocks ?? [],
      gcpPublicCidrsAccessEnabled:
        cluster.masterAuthorizedNetworksConfig?.gcpPublicCidrsAccessEnabled === true,
    },
    binaryAuthorization: {
      evaluationMode:
        cluster.binaryAuthorization?.evaluationMode ??
        (cluster.binaryAuthorization?.enabled ? 'PROJECT_SINGLETON_POLICY_ENFORCE' : 'DISABLED'),
    },
    workloadIdentityPool: cluster.workloadIdentityConfig?.workloadPool,
    nodeAutoprovisioning: cluster.autoscaling?.enableNodeAutoprovisioning === true,
    loggingService: cluster.loggingService,
    monitoringService: cluster.monitoringService,
    maintenanceWindow: cluster.maintenancePolicy?.window,
    nodePools: (cluster.nodePools ?? []).map(trimNodePool),
    expireTime: cluster.expireTime,
    etag: cluster.etag,
  };
};

/**
 * Every mutation returns an Operation. The trimmed shape carries `operationId` and `location`
 * exactly as getOperation and cancelOperation expect them, so a workflow can poll without
 * parsing resource names.
 */
const trimOperation = (operation: GkeOperation) => ({
  operationId: operation.name,
  operationType: operation.operationType,
  status: operation.status,
  done: operation.status === 'DONE',
  location: operation.location ?? operation.zone,
  targetLink: operation.targetLink,
  target: lastSegment(operation.targetLink),
  detail: operation.detail,
  statusMessage: operation.statusMessage,
  error: operation.error
    ? { code: operation.error.code, message: operation.error.message }
    : undefined,
  progress: operation.progress
    ? {
        status: operation.progress.status,
        metrics: (operation.progress.metrics ?? []).map((metric) => ({
          name: metric.name,
          value: metric.intValue ?? metric.doubleValue ?? metric.stringValue,
        })),
      }
    : undefined,
  clusterConditions: trimConditions(operation.clusterConditions),
  nodepoolConditions: trimConditions(operation.nodepoolConditions),
  startTime: operation.startTime,
  endTime: operation.endTime,
  selfLink: operation.selfLink,
});

const trimServerConfig = (config: GkeServerConfig) => ({
  defaultClusterVersion: config.defaultClusterVersion,
  validMasterVersions: config.validMasterVersions ?? [],
  validNodeVersions: config.validNodeVersions ?? [],
  defaultImageType: config.defaultImageType,
  validImageTypes: config.validImageTypes ?? [],
  channels: (config.channels ?? []).map((channel) => ({
    channel: channel.channel,
    defaultVersion: channel.defaultVersion,
    upgradeTargetVersion: channel.upgradeTargetVersion,
    validVersions: channel.validVersions ?? [],
  })),
});

const startOperation = async (
  ctx: ActionContext,
  request: () => Promise<{ data: unknown }>
): Promise<ReturnType<typeof trimOperation>> => {
  try {
    const response = await request();
    return trimOperation(response.data as GkeOperation);
  } catch (error) {
    return throwWithApiError(error);
  }
};

const buildAutoscaling = (input: {
  enabled: boolean;
  minNodeCount?: number;
  maxNodeCount?: number;
  totalMinNodeCount?: number;
  totalMaxNodeCount?: number;
  locationPolicy?: string;
}) => ({
  enabled: input.enabled,
  ...(input.enabled
    ? {
        minNodeCount: input.minNodeCount,
        maxNodeCount: input.maxNodeCount,
        totalMinNodeCount: input.totalMinNodeCount,
        totalMaxNodeCount: input.totalMaxNodeCount,
        locationPolicy: input.locationPolicy,
      }
    : {}),
});

// =============================================================================
// Connector spec
// =============================================================================

export const GoogleGke: ConnectorSpec = {
  metadata: {
    id: '.google_gke',
    displayName: 'Google Kubernetes Engine',
    description: i18n.translate('core.kibanaConnectorSpecs.googleGke.metadata.description', {
      defaultMessage:
        'List clusters and node pools, scale and autoscale node pools, upgrade, roll back, and harden GKE clusters, and track the resulting operations',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features; 'workflows' is added in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['gcp_service_account'],
  },

  schema: lazySchema(() =>
    z.object({
      defaultProjectId: z
        .string()
        .max(30)
        .optional()
        .describe('Optional default Google Cloud project id used when an action omits one')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.googleGke.config.defaultProjectId', {
            defaultMessage: 'Default project ID',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.googleGke.config.defaultProjectIdHelp',
            {
              defaultMessage:
                'Optional. The project used when an action does not specify one, for example my-project-123. Defaults to the project the service account key belongs to. Actions that take an explicit project id always win.',
            }
          ),
          placeholder: 'my-project-123',
        }),
      defaultLocation: z
        .string()
        .max(64)
        .optional()
        .describe('Optional default zone or region used when an action omits one')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.googleGke.config.defaultLocation', {
            defaultMessage: 'Default location',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.googleGke.config.defaultLocationHelp',
            {
              defaultMessage:
                'Optional. The zone (for example us-central1-a) or region (for example us-central1) used when an action does not specify one. Leave empty to list across every location and require a location on cluster actions.',
            }
          ),
          placeholder: 'us-central1',
        }),
    })
  ),

  skill: [
    '## Google Kubernetes Engine connector',
    '',
    'Control-plane operations on GKE: the managed infrastructure around a cluster (clusters, node pools, versions, cluster-level policy). It does NOT touch workloads: pods, deployments, logs, apply, and rollouts belong to the Kubernetes connector.',
    '',
    '### Addressing',
    '- Every cluster action takes `location` (zone for a zonal cluster, region for a regional one) plus `clusterId`. Start with `listClusters` (location "-" scans the whole project) and copy `location` and `name` from a result rather than guessing.',
    '- `projectId` is optional everywhere: it falls back to the connector default and then to the project of the service account key.',
    '',
    '### Everything mutating is asynchronous',
    '- `setNodePoolSize`, `setNodePoolAutoscaling`, `updateCluster`, `createNodePool`, `deleteNodePool`, `setNetworkPolicy`, `setNodePoolManagement`, `rollbackNodePoolUpgrade`, `setBinaryAuthorization`, `setMasterAuthorizedNetworks`, `createCluster`, and `deleteCluster` return an Operation, not the finished resource.',
    '- Poll `getOperation` with the returned `operationId` and `location` until `done` is true, then check `error`. Node pool resizes take a few minutes; upgrades and cluster creation can take 10-30 minutes.',
    '- GKE allows one operation per cluster at a time. A second mutation fails with FAILED_PRECONDITION "cluster is currently being operated on" or similar: call `listOperations` (or `getOperation`) and wait, do not retry blindly.',
    '',
    '### Sizing semantics',
    '- `nodeCount`, `initialNodeCount`, `minNodeCount`, and `maxNodeCount` are PER ZONE. A regional pool spanning three zones with nodeCount 2 runs six nodes. Use `totalMinNodeCount`/`totalMaxNodeCount` when you want cluster-wide autoscaler bounds.',
    '- `setNodePoolSize` on a pool with autoscaling enabled works, but the autoscaler may immediately scale it again. For a lasting change on an autoscaled pool, adjust bounds with `setNodePoolAutoscaling` instead.',
    '- Autopilot clusters (`autopilot: true` in listClusters) have GKE-managed node pools: node pool actions are rejected or meaningless there, and capacity follows the workloads.',
    '',
    '### Typical flows',
    '- Capacity incident: `listNodePools` -> `getNodePool` (check `autoscaling` and `nodeCountPerZone`) -> `setNodePoolSize` or `setNodePoolAutoscaling` -> `getOperation` until done -> `getNodePool` to confirm.',
    "- Safe upgrade: `getServerConfig` (valid versions for the location and the cluster's channel) -> `updateCluster` with `desiredMasterVersion` -> poll -> `updateCluster` with `desiredNodeVersion` + `desiredNodePoolId` -> poll. If a node upgrade fails or is cancelled, `rollbackNodePoolUpgrade` reverts the nodes that already moved.",
    '- Pool rotation: `createNodePool` with the new shape -> poll -> (move workloads with the Kubernetes connector) -> `deleteNodePool` on the old pool.',
    '- Hand-off to the Kubernetes connector: `getCluster` returns `kubernetesConnector.apiUrl` and `caCertificatePem`; create a Kubernetes connector with that URL, the "Google Kubernetes Engine (GKE)" auth type, and the same service account JSON key.',
    '',
    '### Gotchas',
    '- `setMasterAuthorizedNetworks` replaces the whole CIDR allowlist; read `masterAuthorizedNetworks.cidrBlocks` from `getCluster` first and re-send the ranges you keep, or you will lock out existing operators.',
    '- `setNetworkPolicy` is a two-call sequence: the first call enables the addon (phase "addon"), the second, after that Operation is done, enforces it on the nodes (phase "nodes"). Disabling runs the same steps in reverse. Both re-create nodes.',
    '- Expect long waits. Node pool resizes take 1-4 minutes; upgrades, rollbacks, logging/monitoring or Binary Authorization changes, and network policy steps re-create nodes and take 5-15 minutes; cluster creation 5-15 minutes. Never block a single step waiting for an Operation: return the operationId and poll `getOperation` in later steps (with a wait in between) so an agent turn or workflow step does not time out.',
    '- `deleteCluster` is terminal and removes every workload; it requires `confirmClusterId` to equal `clusterId`, and it is not offered as an agent tool.',
    '- `autoUpgrade` cannot be disabled on clusters enrolled in a release channel; `updateCluster` with `desiredReleaseChannel: "UNSPECIFIED"` leaves the channel first.',
    '- `createCluster` and `createNodePool` need the connector\'s service account to hold roles/iam.serviceAccountUser on the node service account (by default PROJECT_NUMBER-compute@developer.gserviceaccount.com) in addition to roles/container.clusterAdmin; otherwise GKE answers "The user does not have access to service account". Organizations that deny untagged Compute Engine instances also need `resourceManagerTags`.',
  ].join('\n'),

  actions: {
    // =========================================================================
    // Discovery
    // =========================================================================

    listClusters: {
      isTool: true,
      scope: 'read',
      description:
        "List the GKE clusters in a project, across every location by default or in one zone/region. Returns each cluster's name, location, status, versions, node count, release channel, whether it is Autopilot, and its endpoint. The discovery entry point: every other action needs the location and name returned here.",
      input: ListClustersInputSchema,
      handler: async (ctx, input: ListClustersInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const location = resolveLocation(ctx, input.location, { allowWildcard: true });
        try {
          const response = await ctx.client.get(`${parentPath(projectId, location)}/clusters`);
          const data = response.data as { clusters?: GkeCluster[]; missingZones?: string[] };
          return {
            projectId,
            location,
            clusters: (data.clusters ?? []).map(trimClusterSummary),
            // Zones the API could not reach; a non-empty list means the result is partial.
            missingZones: data.missingZones ?? [],
          };
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    getCluster: {
      isTool: true,
      scope: 'read',
      description:
        'Get one cluster in full: status and conditions, control-plane and node versions, node pools with their sizes and autoscaling, network and security policy (network policy, authorized networks, Binary Authorization), release channel, endpoints, and the etag for optimistic updates. Also returns `kubernetesConnector` (API server URL and PEM CA certificate) for wiring the Kubernetes connector to this cluster with the same service account key.',
      input: GetClusterInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        const { url } = resolveCluster(ctx, input);
        try {
          const response = await ctx.client.get(url);
          return trimClusterDetail(response.data as GkeCluster);
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    listNodePools: {
      isTool: true,
      scope: 'read',
      description:
        'List the node pools of a cluster with status, version, per-zone and total node count, machine type, autoscaling bounds, and management settings. The prerequisite for any node pool remediation: use the returned name as nodePoolId.',
      input: ListNodePoolsInputSchema,
      handler: async (ctx, input: ListNodePoolsInput) => {
        const { url } = resolveCluster(ctx, input);
        try {
          const response = await ctx.client.get(`${url}/nodePools`);
          const data = response.data as { nodePools?: GkeNodePool[] };
          return { nodePools: (data.nodePools ?? []).map(trimNodePool) };
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    getNodePool: {
      isTool: true,
      scope: 'read',
      description:
        'Get one node pool: status and conditions, version, per-zone node count and zones, machine and disk configuration, labels and taints, autoscaling bounds, auto-repair/auto-upgrade, upgrade settings, and etag. Use it before and after a scaling or upgrade action to decide and to confirm.',
      input: GetNodePoolInputSchema,
      handler: async (ctx, input: GetNodePoolInput) => {
        const { url } = resolveNodePool(ctx, input);
        try {
          const response = await ctx.client.get(url);
          return trimNodePool(response.data as GkeNodePool);
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    getServerConfig: {
      isTool: true,
      scope: 'read',
      description:
        'Get the GKE versions and image types available in a zone or region: the default cluster version, valid control-plane and node versions, valid image types, and per release channel (RAPID, REGULAR, STABLE, EXTENDED) the default and valid versions. Call it before updateCluster or createCluster so the version you request is one GKE will accept.',
      input: GetServerConfigInputSchema,
      handler: async (ctx, input: GetServerConfigInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const location = resolveLocation(ctx, input.location, { allowWildcard: false });
        try {
          const response = await ctx.client.get(`${parentPath(projectId, location)}/serverConfig`);
          return { location, ...trimServerConfig(response.data as GkeServerConfig) };
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    // =========================================================================
    // Operations
    // =========================================================================

    getOperation: {
      isTool: true,
      scope: 'read',
      description:
        'Get the status of a long-running Operation returned by any mutating action: status (PENDING, RUNNING, DONE, ABORTING), a `done` flag, the error if it failed, progress metrics, and cluster/node pool conditions. Poll it until done is true before treating a scale, upgrade, create, or delete as finished.',
      input: GetOperationInputSchema,
      handler: async (ctx, input: GetOperationInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const location = resolveLocation(ctx, input.location, { allowWildcard: false });
        try {
          const response = await ctx.client.get(
            operationPath(projectId, location, input.operationId)
          );
          return trimOperation(response.data as GkeOperation);
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    listOperations: {
      isTool: true,
      scope: 'read',
      description:
        'List recent and in-flight control-plane Operations in a project, across every location by default. Shows what is currently changing (upgrades, resizes, repairs, auto-upgrades) and which cluster each targets. Check it before starting a mutation on a busy cluster, since GKE runs one operation per cluster at a time.',
      input: ListOperationsInputSchema,
      handler: async (ctx, input: ListOperationsInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const location = resolveLocation(ctx, input.location, { allowWildcard: true });
        try {
          const response = await ctx.client.get(`${parentPath(projectId, location)}/operations`);
          const data = response.data as { operations?: GkeOperation[]; missingZones?: string[] };
          return {
            operations: (data.operations ?? []).map(trimOperation),
            missingZones: data.missingZones ?? [],
          };
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    cancelOperation: {
      isTool: true,
      scope: 'destroy',
      description:
        'Cancel an in-progress node upgrade Operation (operationType UPGRADE_NODES, as started by updateCluster with desiredNodeVersion or by auto-upgrade). GKE rejects cancellation of every other operation type (resizes, node pool creation, cluster updates) with "cannot be cancelled". Poll getOperation afterwards: the operation ends DONE with an "aborted" error, and rollbackNodePoolUpgrade reverts the nodes that already moved.',
      input: CancelOperationInputSchema,
      handler: async (ctx, input: CancelOperationInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const location = resolveLocation(ctx, input.location, { allowWildcard: false });
        try {
          await ctx.client.post(
            `${operationPath(projectId, location, input.operationId)}:cancel`,
            {}
          );
          return { cancelRequested: true, operationId: input.operationId, location };
        } catch (error) {
          return throwWithApiError(error);
        }
      },
    },

    // =========================================================================
    // Node pools
    // =========================================================================

    setNodePoolSize: {
      isTool: true,
      scope: 'destroy',
      description:
        'Scale a node pool to an exact per-zone node count. The primary capacity remediation: scale up to absorb load, or down (even to 0) to shed cost or drain a pool. Returns an Operation to poll with getOperation. On an autoscaled pool the autoscaler may resize again; adjust bounds with setNodePoolAutoscaling for a lasting change.',
      input: SetNodePoolSizeInputSchema,
      handler: async (ctx, input: SetNodePoolSizeInput) => {
        const { url } = resolveNodePool(ctx, input);
        return startOperation(ctx, () =>
          ctx.client.post(`${url}:setSize`, { nodeCount: input.nodeCount })
        );
      },
    },

    setNodePoolAutoscaling: {
      isTool: true,
      scope: 'destroy',
      description:
        'Enable, adjust, or disable cluster-autoscaler management of a node pool. Provide per-zone bounds (minNodeCount/maxNodeCount) or cluster-wide bounds (totalMinNodeCount/totalMaxNodeCount). The standing fix for recurring capacity pressure. Returns an Operation to poll with getOperation.',
      input: SetNodePoolAutoscalingInputSchema,
      handler: async (ctx, input: SetNodePoolAutoscalingInput) => {
        const { url } = resolveNodePool(ctx, input);
        return startOperation(ctx, () =>
          ctx.client.post(`${url}:setAutoscaling`, { autoscaling: buildAutoscaling(input) })
        );
      },
    },

    setNodePoolManagement: {
      isTool: true,
      scope: 'destroy',
      description:
        'Turn node auto-repair and/or auto-upgrade on or off for a node pool. Fields you omit keep their current value (the connector reads the pool first, because the API replaces both flags at once). Returns an Operation to poll with getOperation.',
      input: SetNodePoolManagementInputSchema,
      handler: async (ctx, input: SetNodePoolManagementInput) => {
        const { url } = resolveNodePool(ctx, input);
        let current: GkeNodePool;
        try {
          current = (await ctx.client.get(url)).data as GkeNodePool;
        } catch (error) {
          return throwWithApiError(error);
        }
        const management = {
          autoRepair: input.autoRepair ?? current.management?.autoRepair === true,
          autoUpgrade: input.autoUpgrade ?? current.management?.autoUpgrade === true,
        };
        return startOperation(ctx, () => ctx.client.post(`${url}:setManagement`, { management }));
      },
    },

    rollbackNodePoolUpgrade: {
      isTool: true,
      scope: 'destroy',
      description:
        'Roll back a node pool whose upgrade was aborted or failed, returning already-upgraded nodes to the previous version. A no-op if the last upgrade completed successfully. The error-handling step for upgrade automations. Returns an Operation to poll with getOperation.',
      input: RollbackNodePoolUpgradeInputSchema,
      handler: async (ctx, input: RollbackNodePoolUpgradeInput) => {
        const { url } = resolveNodePool(ctx, input);
        return startOperation(ctx, () =>
          ctx.client.post(`${url}:rollback`, {
            ...(input.respectPdb !== undefined ? { respectPdb: input.respectPdb } : {}),
          })
        );
      },
    },

    createNodePool: {
      isTool: true,
      scope: 'write',
      description:
        'Add a node pool to a Standard cluster with its own machine type, disk, image, Spot setting, labels, taints, zones, autoscaling, and management options. Use it to rotate to a differently shaped pool (create, move workloads, then deleteNodePool the old one) or to add dedicated capacity. Returns an Operation to poll with getOperation.',
      input: CreateNodePoolInputSchema,
      handler: async (ctx, input: CreateNodePoolInput) => {
        const { url } = resolveCluster(ctx, input);
        const config = {
          machineType: input.machineType,
          diskSizeGb: input.diskSizeGb,
          diskType: input.diskType,
          imageType: input.imageType,
          spot: input.spot,
          serviceAccount: input.serviceAccount,
          labels: input.labels,
          taints: input.taints,
          resourceManagerTags: input.resourceManagerTags
            ? { tags: input.resourceManagerTags }
            : undefined,
        };
        const upgradeSettings =
          input.maxSurge !== undefined || input.maxUnavailable !== undefined
            ? { maxSurge: input.maxSurge, maxUnavailable: input.maxUnavailable }
            : undefined;
        // GKE defaults both flags to true when `management` is omitted, but treats a missing
        // flag inside a supplied `management` as false (verified live: a pool created with only
        // autoRepair came back with autoUpgrade disabled). Fill the omitted one with the default.
        const management =
          input.autoRepair !== undefined || input.autoUpgrade !== undefined
            ? { autoRepair: input.autoRepair ?? true, autoUpgrade: input.autoUpgrade ?? true }
            : undefined;
        return startOperation(ctx, () =>
          ctx.client.post(`${url}/nodePools`, {
            nodePool: {
              name: input.nodePoolId,
              initialNodeCount: input.initialNodeCount,
              version: input.version,
              locations: input.locations,
              config,
              autoscaling: input.autoscaling ? buildAutoscaling(input.autoscaling) : undefined,
              management,
              upgradeSettings,
            },
          })
        );
      },
    },

    deleteNodePool: {
      isTool: true,
      scope: 'destroy',
      description:
        'Delete a node pool. GKE cordons and drains its nodes first, so pods are rescheduled onto other pools if capacity exists; pods that fit nowhere else stay Pending. The remove half of a pool rotation. Returns an Operation to poll with getOperation.',
      input: DeleteNodePoolInputSchema,
      handler: async (ctx, input: DeleteNodePoolInput) => {
        const { url } = resolveNodePool(ctx, input);
        return startOperation(ctx, () => ctx.client.delete(url));
      },
    },

    // =========================================================================
    // Cluster configuration
    // =========================================================================

    updateCluster: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update cluster configuration or version: upgrade the control plane (desiredMasterVersion), upgrade a node pool (desiredNodeVersion + desiredNodePoolId), change node image type or node zones, switch release channel, or toggle Cloud Logging/Monitoring. Pick versions from getServerConfig. Upgrades move one minor version at a time and nodes cannot run a newer version than the control plane. Returns an Operation to poll with getOperation.',
      input: UpdateClusterInputSchema,
      handler: async (ctx, input: UpdateClusterInput) => {
        const { url } = resolveCluster(ctx, input);
        let desiredLoggingService: string | undefined = input.desiredLoggingService;
        let desiredMonitoringService: string | undefined = input.desiredMonitoringService;
        // GKE rejects a change to one of the two services without the other ("Request would
        // implicitly change monitoring service", verified live), so the omitted one is read from
        // the cluster and sent back unchanged.
        if ((desiredLoggingService === undefined) !== (desiredMonitoringService === undefined)) {
          try {
            const current = (await ctx.client.get(url)).data as GkeCluster;
            desiredLoggingService = desiredLoggingService ?? current.loggingService;
            desiredMonitoringService = desiredMonitoringService ?? current.monitoringService;
          } catch (error) {
            return throwWithApiError(error);
          }
        }
        return startOperation(ctx, () =>
          ctx.client.put(url, {
            update: {
              desiredMasterVersion: input.desiredMasterVersion,
              desiredNodeVersion: input.desiredNodeVersion,
              desiredNodePoolId: input.desiredNodePoolId,
              desiredImageType: input.desiredImageType,
              desiredLocations: input.desiredLocations,
              desiredReleaseChannel: input.desiredReleaseChannel
                ? { channel: input.desiredReleaseChannel }
                : undefined,
              desiredMonitoringService,
              desiredLoggingService,
              etag: input.etag,
            },
          })
        );
      },
    },

    setNetworkPolicy: {
      isTool: true,
      scope: 'destroy',
      description:
        'Enable or disable Kubernetes NetworkPolicy enforcement (Calico) on a Standard cluster, so that NetworkPolicy objects actually restrict pod traffic. GKE does this in two steps, each a long Operation that re-creates nodes: first the network policy addon on the cluster, then enforcement on the nodes. Each call performs the next outstanding step and returns its Operation with a `phase` of "addon" or "nodes" plus `nextStep`; poll getOperation until done, then call setNetworkPolicy again with the same input until it reports `phase: "done"`.',
      input: SetNetworkPolicyInputSchema,
      handler: async (ctx, input: SetNetworkPolicyInput) => {
        const { url } = resolveCluster(ctx, input);
        let cluster: GkeCluster;
        try {
          cluster = (await ctx.client.get(url)).data as GkeCluster;
        } catch (error) {
          return throwWithApiError(error);
        }
        // The addon reports `disabled: true` when off and an empty object when on.
        const addonConfig = cluster.addonsConfig?.networkPolicyConfig;
        const addonEnabled = addonConfig !== undefined && addonConfig.disabled !== true;
        const enforced = cluster.networkPolicy?.enabled === true;
        const provider = input.provider ?? 'CALICO';
        const networkPolicy = { enabled: input.enabled, provider };

        const enableAddon = () =>
          ctx.client.put(url, {
            update: { desiredAddonsConfig: { networkPolicyConfig: { disabled: !input.enabled } } },
          });
        const enforceOnNodes = () => ctx.client.post(`${url}:setNetworkPolicy`, { networkPolicy });

        // Enabling: addon first, then nodes. Disabling: nodes first, then addon. Anything already
        // in the desired state is skipped, so repeated calls converge.
        if (input.enabled) {
          if (!addonEnabled) {
            return {
              ...(await startOperation(ctx, enableAddon)),
              phase: 'addon',
              nextStep:
                'Poll getOperation until done, then call setNetworkPolicy again to enforce the policy on the nodes.',
            };
          }
          if (!enforced) {
            return { ...(await startOperation(ctx, enforceOnNodes)), phase: 'nodes' };
          }
        } else {
          if (enforced) {
            return {
              ...(await startOperation(ctx, enforceOnNodes)),
              phase: 'nodes',
              nextStep:
                'Poll getOperation until done, then call setNetworkPolicy again to disable the addon.',
            };
          }
          if (addonEnabled) {
            return { ...(await startOperation(ctx, enableAddon)), phase: 'addon' };
          }
        }
        return { phase: 'done', enabled: input.enabled, done: true };
      },
    },

    setBinaryAuthorization: {
      isTool: true,
      scope: 'destroy',
      description:
        "Enable or disable Binary Authorization on a cluster. PROJECT_SINGLETON_POLICY_ENFORCE makes the cluster admit only container images that satisfy the project's Binary Authorization policy; DISABLED turns enforcement off. Returns an Operation to poll with getOperation.",
      input: SetBinaryAuthorizationInputSchema,
      handler: async (ctx, input: SetBinaryAuthorizationInput) => {
        const { url } = resolveCluster(ctx, input);
        return startOperation(ctx, () =>
          ctx.client.put(url, {
            update: { desiredBinaryAuthorization: { evaluationMode: input.evaluationMode } },
          })
        );
      },
    },

    setMasterAuthorizedNetworks: {
      isTool: true,
      scope: 'destroy',
      description:
        'Restrict which IPv4 CIDR ranges may reach the cluster API server (control plane authorized networks), or lift the restriction. The cidrBlocks list REPLACES the current allowlist: read it from getCluster first and include every range you want to keep, or operators lose access. Returns an Operation to poll with getOperation.',
      input: SetMasterAuthorizedNetworksInputSchema,
      handler: async (ctx, input: SetMasterAuthorizedNetworksInput) => {
        const { url } = resolveCluster(ctx, input);
        let gcpPublicCidrsAccessEnabled = input.gcpPublicCidrsAccessEnabled;
        if (gcpPublicCidrsAccessEnabled === undefined) {
          // The API replaces the whole config, so an omitted flag would silently flip to false.
          try {
            const current = (await ctx.client.get(url)).data as GkeCluster;
            gcpPublicCidrsAccessEnabled =
              current.masterAuthorizedNetworksConfig?.gcpPublicCidrsAccessEnabled;
          } catch (error) {
            return throwWithApiError(error);
          }
        }
        return startOperation(ctx, () =>
          ctx.client.put(url, {
            update: {
              desiredMasterAuthorizedNetworksConfig: {
                enabled: input.enabled,
                cidrBlocks: input.enabled ? input.cidrBlocks ?? [] : [],
                ...(gcpPublicCidrsAccessEnabled !== undefined
                  ? { gcpPublicCidrsAccessEnabled }
                  : {}),
              },
            },
          })
        );
      },
    },

    // =========================================================================
    // Cluster lifecycle
    // =========================================================================

    createCluster: {
      // Provisioning infrastructure is an IaC-style step, not something an agent should
      // improvise; it stays a workflow-only action.
      isTool: false,
      scope: 'write',
      description:
        'Provision a new GKE cluster: Autopilot, or Standard with one default node pool sized by initialNodeCount and machineType. Optional release channel, initial version, VPC network/subnetwork, node zones, Workload Identity, network policy, and labels. Creation takes 5-15 minutes; returns an Operation to poll with getOperation, then getCluster for the endpoint.',
      input: CreateClusterInputSchema,
      handler: async (ctx, input: CreateClusterInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const location = resolveLocation(ctx, input.location, { allowWildcard: false });
        const cluster: Record<string, unknown> = {
          name: input.clusterId,
          description: input.description,
          locations: input.nodeLocations,
          initialClusterVersion: input.initialClusterVersion,
          releaseChannel: input.releaseChannel ? { channel: input.releaseChannel } : undefined,
          network: input.network,
          subnetwork: input.subnetwork,
          resourceLabels: input.resourceLabels,
          ...(input.enableWorkloadIdentity
            ? { workloadIdentityConfig: { workloadPool: `${projectId}.svc.id.goog` } }
            : {}),
        };
        if (input.autopilot) {
          cluster.autopilot = { enabled: true };
        } else {
          cluster.nodePools = [
            {
              name: 'default-pool',
              initialNodeCount: input.initialNodeCount ?? 1,
              config: {
                machineType: input.machineType,
                diskSizeGb: input.diskSizeGb,
                resourceManagerTags: input.resourceManagerTags
                  ? { tags: input.resourceManagerTags }
                  : undefined,
              },
            },
          ];
          if (input.enableNetworkPolicy) {
            cluster.networkPolicy = { enabled: true, provider: 'CALICO' };
            cluster.addonsConfig = { networkPolicyConfig: { disabled: false } };
          }
        }
        return startOperation(ctx, () =>
          ctx.client.post(`${parentPath(projectId, location)}/clusters`, { cluster })
        );
      },
    },

    deleteCluster: {
      // Terminal: every workload, node, and the control plane are gone. Workflow-only, and the
      // input must repeat the cluster name as a confirmation.
      isTool: false,
      scope: 'destroy',
      description:
        'Delete a cluster and everything running in it. Irreversible. Fails unless confirmClusterId repeats the cluster name exactly, and fails on clusters with deletion protection or an in-flight operation. Returns an Operation to poll with getOperation.',
      input: DeleteClusterInputSchema,
      handler: async (ctx, input: DeleteClusterInput) => {
        const { url } = resolveCluster(ctx, input);
        return startOperation(ctx, () => ctx.client.delete(url));
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.googleGke.test.description', {
      defaultMessage:
        'Verifies the Google Kubernetes Engine connection by listing the clusters the service account can see',
    }),
    handler: async (ctx) => {
      const projectId = resolveProjectId(ctx);
      const location = resolveLocation(ctx, undefined, { allowWildcard: true });
      try {
        const response = await ctx.client.get(`${parentPath(projectId, location)}/clusters`);
        const data = response.data as { clusters?: GkeCluster[] };
        // Resolving is what signals success; ConnectorTestHandlerResult declares `ok?: never`,
        // so a failure must throw rather than return an ok flag.
        return {
          message: `Connected to Google Kubernetes Engine: ${
            data.clusters?.length ?? 0
          } cluster(s) visible in project ${projectId} (location ${location}).`,
        };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
