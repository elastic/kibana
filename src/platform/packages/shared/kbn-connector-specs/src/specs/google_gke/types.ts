/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Google resource ids are bounded and charset-constrained by GCP itself. Mirroring those
 * constraints keeps an LLM- or workflow-supplied value from reaching a URL path segment as
 * something unexpected.
 */
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
/** A Compute Engine zone (`us-central1-a`) or region (`us-central1`), or `-` for "everywhere". */
const LOCATION_PATTERN = /^(-|[a-z]+-[a-z]+[0-9]+(-[a-z])?)$/;
/** GKE cluster and node pool names: lowercase, start with a letter, at most 40 characters. */
const RESOURCE_NAME_PATTERN = /^[a-z]([-a-z0-9]{0,38}[a-z0-9])?$/;
/** Operation ids look like `operation-1756880000000-3f2a1b4c-...`. */
const OPERATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,127}$/;
/** Kubernetes versions as GKE reports them, e.g. `1.31.5-gke.1023000`, or a `latest`/`-` alias. */
const VERSION_PATTERN = /^(-|latest|[0-9]+(\.[0-9]+){0,2}(-gke\.[0-9]+)?)$/;
const CIDR_PATTERN = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const LABEL_KEY_PATTERN = /^[a-z][a-z0-9_-]{0,62}$/;

const projectId = () =>
  z
    .string()
    .max(30)
    .regex(PROJECT_ID_PATTERN, {
      message: 'Must be a valid Google Cloud project id, for example my-project-123',
    })
    .optional()
    .describe(
      'Google Cloud project id, for example "my-project-123". Optional: defaults to the connector\'s default project, then to the project of the service account key.'
    );

const location = () =>
  z
    .string()
    .max(64)
    .regex(LOCATION_PATTERN, {
      message: 'Must be a zone like us-central1-a, a region like us-central1, or -',
    })
    .optional()
    .describe(
      'Cluster location: a zone for a zonal cluster (e.g. "us-central1-a") or a region for a regional cluster (e.g. "us-central1"). Take it from the "location" field returned by listClusters. Optional only when the connector has a default location.'
    );

const listLocation = () =>
  z
    .string()
    .max(64)
    .regex(LOCATION_PATTERN, {
      message: 'Must be a zone like us-central1-a, a region like us-central1, or -',
    })
    .optional()
    .describe(
      'Zone or region to list, or "-" for every location in the project. Defaults to the connector\'s default location, then to "-".'
    );

const clusterId = () =>
  z
    .string()
    .max(40)
    .regex(RESOURCE_NAME_PATTERN, {
      message:
        'Must be a GKE cluster name: lowercase letters, digits and hyphens, starting with a letter',
    })
    .describe('Cluster name, for example "prod-web". Obtain it from listClusters.');

const nodePoolId = () =>
  z
    .string()
    .max(40)
    .regex(RESOURCE_NAME_PATTERN, {
      message:
        'Must be a node pool name: lowercase letters, digits and hyphens, starting with a letter',
    })
    .describe('Node pool name, for example "default-pool". Obtain it from listNodePools.');

const operationId = () =>
  z
    .string()
    .max(128)
    .regex(OPERATION_ID_PATTERN, { message: 'Must be a GKE operation id' })
    .describe(
      'Operation id, for example "operation-1756880000000-3f2a1b4c-9d8e-4f7a-b6c5-1a2b3c4d5e6f". Returned as "operationId" by every mutating action and by listOperations.'
    );

const gkeVersion = () =>
  z
    .string()
    .max(64)
    .regex(VERSION_PATTERN, {
      message: 'Must be a GKE version such as 1.31.5-gke.1023000, or "latest"',
    })
    .describe(
      'A GKE version. Full form "1.31.5-gke.1023000", a prefix such as "1.31" (picks the default patch), "latest", or "-" for the cluster default. Valid values come from getServerConfig.'
    );

const nodeCount = (what: string) => z.number().int().min(0).max(15000).describe(what);

const resourceLabels = () =>
  z
    .record(
      z.string().max(63).regex(LABEL_KEY_PATTERN, {
        message:
          'Label keys are lowercase letters, digits, underscores and hyphens, starting with a letter',
      }),
      z.string().max(63)
    )
    .refine((value) => Object.keys(value).length <= 64, {
      message: 'At most 64 labels are allowed',
    });

/**
 * Resource Manager tags bound to the node VMs, keyed by namespaced tag key
 * (`ORG_ID/env` or `PROJECT_ID/env`) or by `tagKeys/123` id, with the matching namespaced or
 * `tagValues/456` value. Organizations that enforce a "tagged instances only" policy reject
 * node creation without them.
 */
const resourceManagerTags = () =>
  z
    .record(z.string().max(256), z.string().max(256))
    .refine((value) => Object.keys(value).length <= 50, {
      message: 'At most 50 resource manager tags are allowed',
    })
    .describe(
      'Resource Manager tags for the node VMs as {"ORG_OR_PROJECT/key": "value"} (namespaced) or {"tagKeys/123": "tagValues/456"}. Required where an organization policy denies untagged Compute Engine instances.'
    );

const clusterRef = {
  projectId: projectId(),
  location: location(),
  clusterId: clusterId(),
};

const nodePoolRef = {
  ...clusterRef,
  nodePoolId: nodePoolId(),
};

/**
 * Autoscaling bounds as GKE models them: either per-location (`minNodeCount`/`maxNodeCount`,
 * multiplied by the number of zones for a regional cluster) or cluster-wide
 * (`totalMinNodeCount`/`totalMaxNodeCount`). The two families are mutually exclusive.
 */
const autoscalingFields = {
  minNodeCount: nodeCount(
    'Minimum nodes PER ZONE. For a regional cluster the pool spans several zones, so the real floor is this number times the zone count. Mutually exclusive with totalMinNodeCount.'
  ).optional(),
  maxNodeCount: nodeCount(
    'Maximum nodes PER ZONE. Must be >= minNodeCount. Mutually exclusive with totalMaxNodeCount.'
  ).optional(),
  totalMinNodeCount: nodeCount(
    'Minimum nodes across ALL zones of the pool. Mutually exclusive with minNodeCount.'
  ).optional(),
  totalMaxNodeCount: nodeCount(
    'Maximum nodes across ALL zones of the pool. Must be >= totalMinNodeCount. Mutually exclusive with maxNodeCount.'
  ).optional(),
  locationPolicy: z
    .enum(['BALANCED', 'ANY'])
    .optional()
    .describe(
      'How the autoscaler spreads new nodes across zones: "BALANCED" keeps zones even (default), "ANY" prefers whichever zone has capacity (recommended with Spot VMs).'
    ),
};

const hasPerZoneBounds = (v: { minNodeCount?: number; maxNodeCount?: number }) =>
  v.minNodeCount !== undefined && v.maxNodeCount !== undefined;
const hasTotalBounds = (v: { totalMinNodeCount?: number; totalMaxNodeCount?: number }) =>
  v.totalMinNodeCount !== undefined && v.totalMaxNodeCount !== undefined;
const mixesBoundFamilies = (v: {
  minNodeCount?: number;
  maxNodeCount?: number;
  totalMinNodeCount?: number;
  totalMaxNodeCount?: number;
}) =>
  (v.minNodeCount !== undefined || v.maxNodeCount !== undefined) &&
  (v.totalMinNodeCount !== undefined || v.totalMaxNodeCount !== undefined);
const boundsOrdered = (v: {
  minNodeCount?: number;
  maxNodeCount?: number;
  totalMinNodeCount?: number;
  totalMaxNodeCount?: number;
}) =>
  (v.minNodeCount === undefined ||
    v.maxNodeCount === undefined ||
    v.minNodeCount <= v.maxNodeCount) &&
  (v.totalMinNodeCount === undefined ||
    v.totalMaxNodeCount === undefined ||
    v.totalMinNodeCount <= v.totalMaxNodeCount);

const autoscalingObject = () =>
  z
    .object({
      enabled: z.boolean().describe('Whether the cluster autoscaler manages this pool.'),
      ...autoscalingFields,
    })
    .refine((v) => !v.enabled || hasPerZoneBounds(v) || hasTotalBounds(v), {
      message:
        'When enabled, provide either minNodeCount and maxNodeCount, or totalMinNodeCount and totalMaxNodeCount',
    })
    .refine((v) => !mixesBoundFamilies(v), {
      message:
        'Use either the per-zone (min/maxNodeCount) or the total (totalMin/MaxNodeCount) bounds, not both',
    })
    .refine(boundsOrdered, { message: 'The minimum node count must not exceed the maximum' });

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export const ListClustersInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    location: listLocation(),
  })
);
export type ListClustersInput = z.infer<typeof ListClustersInputSchema>;

export const GetClusterInputSchema = lazySchema(() => z.object(clusterRef));
export type GetClusterInput = z.infer<typeof GetClusterInputSchema>;

export const ListNodePoolsInputSchema = lazySchema(() => z.object(clusterRef));
export type ListNodePoolsInput = z.infer<typeof ListNodePoolsInputSchema>;

export const GetNodePoolInputSchema = lazySchema(() => z.object(nodePoolRef));
export type GetNodePoolInput = z.infer<typeof GetNodePoolInputSchema>;

export const GetServerConfigInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    location: location(),
  })
);
export type GetServerConfigInput = z.infer<typeof GetServerConfigInputSchema>;

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const GetOperationInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    location: location(),
    operationId: operationId(),
  })
);
export type GetOperationInput = z.infer<typeof GetOperationInputSchema>;

export const ListOperationsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    location: listLocation(),
  })
);
export type ListOperationsInput = z.infer<typeof ListOperationsInputSchema>;

export const CancelOperationInputSchema = GetOperationInputSchema;
export type CancelOperationInput = z.infer<typeof CancelOperationInputSchema>;

// ---------------------------------------------------------------------------
// Node pools
// ---------------------------------------------------------------------------

export const SetNodePoolSizeInputSchema = lazySchema(() =>
  z.object({
    ...nodePoolRef,
    nodeCount: nodeCount(
      'Target node count PER ZONE of the pool. A zonal cluster has one zone, so this is the total; a regional pool spanning three zones ends up with three times this number. Use 0 to drain the pool without deleting it.'
    ),
  })
);
export type SetNodePoolSizeInput = z.infer<typeof SetNodePoolSizeInputSchema>;

export const SetNodePoolAutoscalingInputSchema = lazySchema(() =>
  z
    .object({
      ...nodePoolRef,
      enabled: z
        .boolean()
        .describe(
          'true to enable or adjust autoscaling, false to disable it (the pool then keeps its current size).'
        ),
      ...autoscalingFields,
    })
    .refine((v) => !v.enabled || hasPerZoneBounds(v) || hasTotalBounds(v), {
      message:
        'When enabled, provide either minNodeCount and maxNodeCount, or totalMinNodeCount and totalMaxNodeCount',
    })
    .refine((v) => !mixesBoundFamilies(v), {
      message:
        'Use either the per-zone (min/maxNodeCount) or the total (totalMin/MaxNodeCount) bounds, not both',
    })
    .refine(boundsOrdered, { message: 'The minimum node count must not exceed the maximum' })
);
export type SetNodePoolAutoscalingInput = z.infer<typeof SetNodePoolAutoscalingInputSchema>;

export const SetNodePoolManagementInputSchema = lazySchema(() =>
  z
    .object({
      ...nodePoolRef,
      autoRepair: z
        .boolean()
        .optional()
        .describe(
          'Whether GKE automatically repairs unhealthy nodes. Omit to keep the current setting.'
        ),
      autoUpgrade: z
        .boolean()
        .optional()
        .describe(
          'Whether GKE automatically upgrades nodes to the control plane version. Cannot be disabled on clusters enrolled in a release channel. Omit to keep the current setting.'
        ),
    })
    .refine((v) => v.autoRepair !== undefined || v.autoUpgrade !== undefined, {
      message: 'Provide autoRepair, autoUpgrade, or both',
    })
);
export type SetNodePoolManagementInput = z.infer<typeof SetNodePoolManagementInputSchema>;

export const RollbackNodePoolUpgradeInputSchema = lazySchema(() =>
  z.object({
    ...nodePoolRef,
    respectPdb: z
      .boolean()
      .optional()
      .describe(
        'true to honour PodDisruptionBudgets while rolling nodes back (slower, safer). Default false: GKE ignores them.'
      ),
  })
);
export type RollbackNodePoolUpgradeInput = z.infer<typeof RollbackNodePoolUpgradeInputSchema>;

export const CreateNodePoolInputSchema = lazySchema(() =>
  z.object({
    ...clusterRef,
    nodePoolId: nodePoolId().describe(
      'Name for the new pool, for example "highmem-pool". Must be unique within the cluster.'
    ),
    initialNodeCount: nodeCount(
      'Nodes to create PER ZONE. For a regional cluster multiply by the zone count to get the total.'
    ),
    machineType: z
      .string()
      .max(64)
      .regex(/^[a-z0-9-]+$/, {
        message: 'Must be a Compute Engine machine type such as e2-standard-4',
      })
      .optional()
      .describe('Compute Engine machine type, for example "e2-standard-4". Defaults to e2-medium.'),
    diskSizeGb: z
      .number()
      .int()
      .min(10)
      .max(65536)
      .optional()
      .describe('Boot disk size in GB (10-65536). Defaults to 100.'),
    diskType: z
      .enum(['pd-standard', 'pd-balanced', 'pd-ssd', 'hyperdisk-balanced'])
      .optional()
      .describe('Boot disk type. Defaults to pd-balanced.'),
    imageType: z
      .string()
      .max(64)
      .regex(/^[A-Za-z0-9_]+$/, { message: 'Must be a GKE image type such as COS_CONTAINERD' })
      .optional()
      .describe(
        'Node image type, for example "COS_CONTAINERD" or "UBUNTU_CONTAINERD". Valid values come from getServerConfig. Defaults to the cluster default.'
      ),
    spot: z
      .boolean()
      .optional()
      .describe('true to use Spot VMs (cheap, preemptible at any time). Default false.'),
    version: gkeVersion().optional(),
    locations: z
      .array(z.string().max(64).regex(LOCATION_PATTERN, { message: 'Must be a zone' }))
      .max(10)
      .optional()
      .describe(
        'Zones the pool runs in, for example ["us-central1-a","us-central1-b"]. Must be zones within the cluster\'s region. Defaults to the cluster\'s zones.'
      ),
    labels: resourceLabels()
      .optional()
      .describe(
        'Kubernetes node labels applied to every node in the pool, for example {"workload":"batch"}.'
      ),
    taints: z
      .array(
        z.object({
          key: z.string().max(253).describe('Taint key, for example "dedicated".'),
          value: z.string().max(63).describe('Taint value, for example "batch".'),
          effect: z
            .enum(['NO_SCHEDULE', 'PREFER_NO_SCHEDULE', 'NO_EXECUTE'])
            .describe('Taint effect.'),
        })
      )
      .max(20)
      .optional()
      .describe('Kubernetes taints applied to every node, so only tolerating pods schedule there.'),
    serviceAccount: z
      .string()
      .max(320)
      .regex(/^[a-zA-Z0-9-_.]+@[a-zA-Z0-9-.]+\.gserviceaccount\.com$/, {
        message: 'Must be a service account email',
      })
      .optional()
      .describe(
        'Service account the node VMs run as, for example "gke-nodes@my-project.iam.gserviceaccount.com". Defaults to the Compute Engine default service account.'
      ),
    resourceManagerTags: resourceManagerTags().optional(),
    autoscaling: autoscalingObject()
      .optional()
      .describe('Autoscaler configuration for the new pool. Omit for a fixed-size pool.'),
    autoRepair: z
      .boolean()
      .optional()
      .describe('Whether GKE auto-repairs unhealthy nodes. Defaults to true.'),
    autoUpgrade: z
      .boolean()
      .optional()
      .describe(
        'Whether GKE auto-upgrades the pool. Defaults to true; GKE expects it to stay enabled on release-channel clusters.'
      ),
    maxSurge: z
      .number()
      .int()
      .min(0)
      .max(20)
      .optional()
      .describe('Upgrade setting: extra nodes GKE may add during an upgrade (default 1).'),
    maxUnavailable: z
      .number()
      .int()
      .min(0)
      .max(20)
      .optional()
      .describe(
        'Upgrade setting: nodes that may be unavailable at once during an upgrade (default 0).'
      ),
  })
);
export type CreateNodePoolInput = z.infer<typeof CreateNodePoolInputSchema>;

export const DeleteNodePoolInputSchema = lazySchema(() => z.object(nodePoolRef));
export type DeleteNodePoolInput = z.infer<typeof DeleteNodePoolInputSchema>;

// ---------------------------------------------------------------------------
// Cluster configuration
// ---------------------------------------------------------------------------

const RELEASE_CHANNELS = ['UNSPECIFIED', 'RAPID', 'REGULAR', 'STABLE', 'EXTENDED'] as const;

export const UpdateClusterInputSchema = lazySchema(() =>
  z
    .object({
      ...clusterRef,
      desiredMasterVersion: gkeVersion()
        .optional()
        .describe(
          "Upgrade the control plane to this version. Pick it from getServerConfig validMasterVersions (or the cluster's release channel validVersions). Only one minor version step at a time."
        ),
      desiredNodeVersion: gkeVersion()
        .optional()
        .describe(
          'Upgrade node pools to this version, at most the control plane version. Pair with desiredNodePoolId unless the cluster has a single pool.'
        ),
      desiredNodePoolId: nodePoolId()
        .optional()
        .describe(
          'Restricts desiredNodeVersion and desiredImageType to this pool. Required when the cluster has more than one pool.'
        ),
      desiredImageType: z
        .string()
        .max(64)
        .regex(/^[A-Za-z0-9_]+$/, { message: 'Must be a GKE image type' })
        .optional()
        .describe('Change the node image type of the pool named in desiredNodePoolId.'),
      desiredLocations: z
        .array(z.string().max(64).regex(LOCATION_PATTERN, { message: 'Must be a zone' }))
        .min(1)
        .max(10)
        .optional()
        .describe(
          "Replace the set of zones the cluster's nodes run in. The control plane zone of a zonal cluster is always kept."
        ),
      desiredReleaseChannel: z
        .enum(RELEASE_CHANNELS)
        .optional()
        .describe(
          'Enroll the cluster in a release channel ("RAPID", "REGULAR", "STABLE", "EXTENDED") or "UNSPECIFIED" to leave channels.'
        ),
      desiredMonitoringService: z
        .enum(['monitoring.googleapis.com/kubernetes', 'none'])
        .optional()
        .describe('Enable Cloud Monitoring for the cluster, or "none" to disable it.'),
      desiredLoggingService: z
        .enum(['logging.googleapis.com/kubernetes', 'none'])
        .optional()
        .describe('Enable Cloud Logging for the cluster, or "none" to disable it.'),
      etag: z
        .string()
        .max(256)
        .optional()
        .describe(
          'Optimistic-concurrency etag from getCluster. When set, the update fails if the cluster changed in the meantime.'
        ),
    })
    .refine(
      (v) =>
        [
          v.desiredMasterVersion,
          v.desiredNodeVersion,
          v.desiredImageType,
          v.desiredLocations,
          v.desiredReleaseChannel,
          v.desiredMonitoringService,
          v.desiredLoggingService,
        ].some((field) => field !== undefined),
      { message: 'Provide at least one desired* field to change' }
    )
    .refine(
      (v) =>
        v.desiredNodePoolId === undefined ||
        v.desiredNodeVersion !== undefined ||
        v.desiredImageType !== undefined,
      {
        message:
          'desiredNodePoolId only makes sense together with desiredNodeVersion or desiredImageType',
      }
    )
);
export type UpdateClusterInput = z.infer<typeof UpdateClusterInputSchema>;

export const SetNetworkPolicyInputSchema = lazySchema(() =>
  z.object({
    ...clusterRef,
    enabled: z
      .boolean()
      .describe(
        'true to enforce Kubernetes NetworkPolicy objects in the cluster, false to stop enforcing them.'
      ),
    provider: z
      .enum(['CALICO'])
      .optional()
      .describe('Network policy provider. Only "CALICO" exists; it is the default.'),
  })
);
export type SetNetworkPolicyInput = z.infer<typeof SetNetworkPolicyInputSchema>;

export const SetBinaryAuthorizationInputSchema = lazySchema(() =>
  z.object({
    ...clusterRef,
    evaluationMode: z
      .enum(['DISABLED', 'PROJECT_SINGLETON_POLICY_ENFORCE'])
      .describe(
        '"PROJECT_SINGLETON_POLICY_ENFORCE" makes the cluster enforce the project\'s Binary Authorization policy on every image; "DISABLED" turns enforcement off.'
      ),
  })
);
export type SetBinaryAuthorizationInput = z.infer<typeof SetBinaryAuthorizationInputSchema>;

export const SetMasterAuthorizedNetworksInputSchema = lazySchema(() =>
  z
    .object({
      ...clusterRef,
      enabled: z
        .boolean()
        .describe(
          'true to restrict control-plane access to cidrBlocks (plus Google Cloud internal ranges), false to allow any source address.'
        ),
      cidrBlocks: z
        .array(
          z.object({
            cidrBlock: z
              .string()
              .max(18)
              .regex(CIDR_PATTERN, { message: 'Must be an IPv4 CIDR such as 203.0.113.0/24' })
              .describe('IPv4 CIDR allowed to reach the API server, for example "203.0.113.0/24".'),
            displayName: z
              .string()
              .max(64)
              .optional()
              .describe('Human-readable label for the range, for example "office-vpn".'),
          })
        )
        .max(100)
        .optional()
        .describe(
          'The complete allowlist. This REPLACES the current list, so read it from getCluster first and re-send every range you want to keep. Required (non-empty) when enabled is true.'
        ),
      gcpPublicCidrsAccessEnabled: z
        .boolean()
        .optional()
        .describe(
          'Whether Google Cloud public IP ranges may reach the API server in addition to cidrBlocks. Omit to keep the current setting.'
        ),
    })
    .refine((v) => !v.enabled || (v.cidrBlocks !== undefined && v.cidrBlocks.length > 0), {
      message: 'Provide at least one cidrBlock when enabling authorized networks',
    })
);
export type SetMasterAuthorizedNetworksInput = z.infer<
  typeof SetMasterAuthorizedNetworksInputSchema
>;

// ---------------------------------------------------------------------------
// Cluster lifecycle
// ---------------------------------------------------------------------------

export const CreateClusterInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      location: location().describe(
        'Where to create the cluster: a zone (e.g. "us-central1-a") for a single-zone control plane or a region (e.g. "us-central1") for a regional, highly available one. Optional only when the connector has a default location.'
      ),
      clusterId: clusterId().describe(
        'Name for the new cluster: lowercase letters, digits and hyphens, at most 40 characters, unique within the location.'
      ),
      description: z.string().max(1024).optional().describe('Free-text description.'),
      autopilot: z
        .boolean()
        .optional()
        .describe(
          'true for an Autopilot cluster (GKE manages nodes; node pool actions do not apply). Default false: a Standard cluster with one node pool.'
        ),
      initialNodeCount: nodeCount(
        'Standard clusters only: nodes PER ZONE in the default pool (default 1).'
      ).optional(),
      machineType: z
        .string()
        .max(64)
        .regex(/^[a-z0-9-]+$/, {
          message: 'Must be a Compute Engine machine type such as e2-standard-4',
        })
        .optional()
        .describe(
          'Standard clusters only: machine type of the default pool, e.g. "e2-standard-4".'
        ),
      diskSizeGb: z
        .number()
        .int()
        .min(10)
        .max(65536)
        .optional()
        .describe('Standard clusters only: boot disk size in GB of the default pool.'),
      nodeLocations: z
        .array(z.string().max(64).regex(LOCATION_PATTERN, { message: 'Must be a zone' }))
        .min(1)
        .max(10)
        .optional()
        .describe(
          'Zones for the nodes, for example ["us-central1-a","us-central1-b"]. Defaults to all zones of a regional cluster or the single zone of a zonal one.'
        ),
      initialClusterVersion: gkeVersion()
        .optional()
        .describe(
          'Kubernetes version to start on. Defaults to the channel default from getServerConfig.'
        ),
      releaseChannel: z
        .enum(RELEASE_CHANNELS)
        .optional()
        .describe('Release channel to enroll in. Defaults to REGULAR.'),
      network: z
        .string()
        .max(128)
        .regex(/^[a-z0-9-]+$/, { message: 'Must be a VPC network name' })
        .optional()
        .describe('VPC network name, for example "default".'),
      subnetwork: z
        .string()
        .max(128)
        .regex(/^[a-z0-9-]+$/, { message: 'Must be a subnetwork name' })
        .optional()
        .describe('Subnetwork name in the cluster region.'),
      enableWorkloadIdentity: z
        .boolean()
        .optional()
        .describe(
          'true to enable Workload Identity Federation for GKE (workload pool "PROJECT.svc.id.goog"). Always on for Autopilot.'
        ),
      enableNetworkPolicy: z
        .boolean()
        .optional()
        .describe(
          'true to enable Calico network policy enforcement from the start (Standard only).'
        ),
      resourceLabels: resourceLabels()
        .optional()
        .describe('Google Cloud labels on the cluster resource, for example {"env":"staging"}.'),
      resourceManagerTags: resourceManagerTags()
        .optional()
        .describe(
          'Standard clusters only: Resource Manager tags for the default pool\'s node VMs, as {"ORG_OR_PROJECT/key": "value"} or {"tagKeys/123": "tagValues/456"}. Required where an organization policy denies untagged Compute Engine instances.'
        ),
    })
    .refine(
      (v) =>
        !v.autopilot ||
        (v.initialNodeCount === undefined &&
          v.machineType === undefined &&
          v.diskSizeGb === undefined &&
          v.resourceManagerTags === undefined &&
          v.enableNetworkPolicy === undefined),
      {
        message:
          'initialNodeCount, machineType, diskSizeGb, resourceManagerTags and enableNetworkPolicy do not apply to Autopilot clusters',
      }
    )
);
export type CreateClusterInput = z.infer<typeof CreateClusterInputSchema>;

export const DeleteClusterInputSchema = lazySchema(() =>
  z
    .object({
      ...clusterRef,
      confirmClusterId: z
        .string()
        .max(40)
        .describe(
          'Safety check: repeat the exact cluster name here. The action refuses to run unless it matches clusterId.'
        ),
    })
    .refine((v) => v.confirmClusterId === v.clusterId, {
      message: 'confirmClusterId must match clusterId exactly',
      path: ['confirmClusterId'],
    })
);
export type DeleteClusterInput = z.infer<typeof DeleteClusterInputSchema>;

// ---------------------------------------------------------------------------
// GKE API response shapes (only the fields the connector reads)
// ---------------------------------------------------------------------------

export interface GkeStatusCondition {
  code?: string;
  canonicalCode?: string;
  message?: string;
}

export interface GkeNodePoolAutoscaling {
  enabled?: boolean;
  minNodeCount?: number;
  maxNodeCount?: number;
  totalMinNodeCount?: number;
  totalMaxNodeCount?: number;
  locationPolicy?: string;
  autoprovisioned?: boolean;
}

export interface GkeNodeManagement {
  autoUpgrade?: boolean;
  autoRepair?: boolean;
  upgradeOptions?: { autoUpgradeStartTime?: string; description?: string };
}

export interface GkeNodeConfig {
  machineType?: string;
  diskSizeGb?: number;
  diskType?: string;
  imageType?: string;
  preemptible?: boolean;
  spot?: boolean;
  serviceAccount?: string;
  labels?: Record<string, string>;
  taints?: Array<{ key?: string; value?: string; effect?: string }>;
  tags?: string[];
  oauthScopes?: string[];
}

export interface GkeNodePool {
  name?: string;
  status?: string;
  statusMessage?: string;
  version?: string;
  initialNodeCount?: number;
  locations?: string[];
  config?: GkeNodeConfig;
  autoscaling?: GkeNodePoolAutoscaling;
  management?: GkeNodeManagement;
  upgradeSettings?: { maxSurge?: number; maxUnavailable?: number; strategy?: string };
  maxPodsConstraint?: { maxPodsPerNode?: string };
  instanceGroupUrls?: string[];
  conditions?: GkeStatusCondition[];
  podIpv4CidrSize?: number;
  etag?: string;
  selfLink?: string;
}

export interface GkeMasterAuthorizedNetworksConfig {
  enabled?: boolean;
  cidrBlocks?: Array<{ cidrBlock?: string; displayName?: string }>;
  gcpPublicCidrsAccessEnabled?: boolean;
  privateEndpointEnforcementEnabled?: boolean;
}

export interface GkeCluster {
  name?: string;
  description?: string;
  location?: string;
  zone?: string;
  locations?: string[];
  status?: string;
  statusMessage?: string;
  conditions?: GkeStatusCondition[];
  currentMasterVersion?: string;
  currentNodeVersion?: string;
  initialClusterVersion?: string;
  currentNodeCount?: number;
  endpoint?: string;
  masterAuth?: { clusterCaCertificate?: string };
  controlPlaneEndpointsConfig?: {
    dnsEndpointConfig?: { endpoint?: string; allowExternalTraffic?: boolean };
    ipEndpointsConfig?: {
      enabled?: boolean;
      enablePublicEndpoint?: boolean;
      publicEndpoint?: string;
      privateEndpoint?: string;
    };
  };
  privateClusterConfig?: {
    enablePrivateNodes?: boolean;
    enablePrivateEndpoint?: boolean;
    publicEndpoint?: string;
    privateEndpoint?: string;
  };
  network?: string;
  subnetwork?: string;
  clusterIpv4Cidr?: string;
  servicesIpv4Cidr?: string;
  releaseChannel?: { channel?: string };
  autopilot?: { enabled?: boolean };
  nodePools?: GkeNodePool[];
  networkPolicy?: { provider?: string; enabled?: boolean };
  addonsConfig?: { networkPolicyConfig?: { disabled?: boolean } };
  masterAuthorizedNetworksConfig?: GkeMasterAuthorizedNetworksConfig;
  binaryAuthorization?: { enabled?: boolean; evaluationMode?: string };
  workloadIdentityConfig?: { workloadPool?: string };
  autoscaling?: {
    enableNodeAutoprovisioning?: boolean;
    resourceLimits?: Array<{ resourceType?: string; minimum?: string; maximum?: string }>;
  };
  maintenancePolicy?: { window?: Record<string, unknown> };
  loggingService?: string;
  monitoringService?: string;
  resourceLabels?: Record<string, string>;
  createTime?: string;
  expireTime?: string;
  etag?: string;
  selfLink?: string;
  id?: string;
}

export interface GkeOperation {
  name?: string;
  operationType?: string;
  status?: string;
  detail?: string;
  statusMessage?: string;
  error?: { code?: number; message?: string; details?: unknown[] };
  location?: string;
  zone?: string;
  targetLink?: string;
  selfLink?: string;
  startTime?: string;
  endTime?: string;
  progress?: {
    name?: string;
    status?: string;
    metrics?: Array<{
      name?: string;
      intValue?: string;
      doubleValue?: number;
      stringValue?: string;
    }>;
    stages?: unknown[];
  };
  clusterConditions?: GkeStatusCondition[];
  nodepoolConditions?: GkeStatusCondition[];
}

export interface GkeReleaseChannelConfig {
  channel?: string;
  defaultVersion?: string;
  validVersions?: string[];
  upgradeTargetVersion?: string;
}

export interface GkeServerConfig {
  defaultClusterVersion?: string;
  validMasterVersions?: string[];
  validNodeVersions?: string[];
  defaultImageType?: string;
  validImageTypes?: string[];
  channels?: GkeReleaseChannelConfig[];
}
