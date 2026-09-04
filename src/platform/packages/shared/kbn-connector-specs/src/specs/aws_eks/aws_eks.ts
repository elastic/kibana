/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Amazon EKS Connector
 *
 * Control-plane reads and writes for managed Kubernetes on AWS through the
 * Amazon EKS API (eks.{region}.amazonaws.com, REST-JSON, SigV4), plus the auth
 * bridge EKS uniquely needs: minting the short-lived Kubernetes bearer token
 * (`aws eks get-token`) so the core Kubernetes connector can act on workloads.
 *
 * Workloads (pods, deployments, logs, apply/scale) are out of scope: they
 * belong to the core Kubernetes connector, which accepts the same AWS access
 * key through its EKS auth type. getCluster and getToken return the endpoint,
 * CA certificate, and token that connector needs.
 *
 * Auth: the shared `aws_credentials` auth type (access key id + secret access
 * key, SigV4-signed by the platform's axios interceptor). getToken signs the
 * STS presigned request with the same credentials.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { buildEksBearerToken } from '../../auth_types/eks_token_helpers';
import type {
  AssociateAccessPolicyInput,
  CreateAccessEntryInput,
  DeleteAccessEntryInput,
  DescribeAccessEntryInput,
  DescribeNodegroupInput,
  DescribeUpdateInput,
  DisassociateAccessPolicyInput,
  EksAccessEntry,
  EksAssociatedAccessPolicy,
  EksCluster,
  EksNodegroup,
  EksUpdate,
  GetClusterInput,
  GetTokenInput,
  ListAccessEntriesInput,
  ListAccessPoliciesInput,
  ListAssociatedAccessPoliciesInput,
  ListClustersInput,
  ListNodegroupsInput,
  ListTagsForResourceInput,
  ListUpdatesInput,
  UpdateAccessEntryInput,
  UpdateClusterConfigInput,
  UpdateNodegroupConfigInput,
} from './types';
import {
  AssociateAccessPolicyInputSchema,
  CreateAccessEntryInputSchema,
  DeleteAccessEntryInputSchema,
  DescribeAccessEntryInputSchema,
  DescribeNodegroupInputSchema,
  DescribeUpdateInputSchema,
  DisassociateAccessPolicyInputSchema,
  GetClusterInputSchema,
  GetTokenInputSchema,
  ListAccessEntriesInputSchema,
  ListAccessPoliciesInputSchema,
  ListAssociatedAccessPoliciesInputSchema,
  ListClustersInputSchema,
  ListNodegroupsInputSchema,
  ListTagsForResourceInputSchema,
  ListUpdatesInputSchema,
  UpdateAccessEntryInputSchema,
  UpdateClusterConfigInputSchema,
  UpdateNodegroupConfigInputSchema,
} from './types';

/** The API server accepts a presigned token for 15 minutes from its X-Amz-Date. */
const TOKEN_LIFETIME_SECONDS = 15 * 60;
/** Reported to callers with a safety margin so a token is never handed over about to expire. */
const TOKEN_REPORTED_LIFETIME_SECONDS = 14 * 60;

// =============================================================================
// Target resolution
// =============================================================================

const resolveRegion = (ctx: ActionContext, requested?: string): string => {
  const region = requested?.trim() || (ctx.config?.region as string | undefined)?.trim();
  if (!region) {
    throw new Error(
      'No AWS Region available: pass region (for example us-east-1) or set one on the connector.'
    );
  }
  return region;
};

const eksBase = (region: string): string => `https://eks.${region}.amazonaws.com`;

const clusterPath = (region: string, clusterName: string): string =>
  `${eksBase(region)}/clusters/${encodeURIComponent(clusterName)}`;

const nodegroupPath = (region: string, clusterName: string, nodegroupName: string): string =>
  `${clusterPath(region, clusterName)}/node-groups/${encodeURIComponent(nodegroupName)}`;

const accessEntryPath = (region: string, clusterName: string, principalArn: string): string =>
  `${clusterPath(region, clusterName)}/access-entries/${encodeURIComponent(principalArn)}`;

const resolveCluster = (ctx: ActionContext, input: { region?: string; clusterName: string }) => {
  const region = resolveRegion(ctx, input.region);
  return { region, url: clusterPath(region, input.clusterName) };
};

// =============================================================================
// Errors
// =============================================================================

/**
 * Surface the EKS error type and message. REST-JSON errors carry the type in the
 * `x-amzn-ErrorType` header (`ResourceNotFoundException:http://…`) or a `__type` body field,
 * and the detail in `message`; an unwrapped axios error says only "status code 404".
 */
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
    message?: string;
  };
  const response = axiosError.response;
  if (!response) {
    throw error;
  }
  const body =
    typeof response.data === 'object' && response.data !== null
      ? (response.data as Record<string, unknown>)
      : {};
  const headerType = response.headers?.['x-amzn-errortype'];
  const rawType =
    (typeof headerType === 'string' ? headerType : undefined) ??
    (body.__type as string | undefined) ??
    (body.code as string | undefined);
  const type = rawType?.split(':')[0]?.split('#').pop();
  const message =
    (body.message as string | undefined) ??
    (body.Message as string | undefined) ??
    (typeof response.data === 'string' ? response.data : undefined) ??
    axiosError.message;
  throw new Error(
    `Amazon EKS API error (${response.status})${type ? ` [${type}]` : ''}: ${message}`
  );
};

const request = async <T>(fn: () => Promise<{ data: unknown }>): Promise<T> => {
  try {
    return (await fn()).data as T;
  } catch (error) {
    return throwWithApiError(error);
  }
};

// =============================================================================
// Output shaping
// =============================================================================

/** EKS returns the CA base64-encoded; the Kubernetes connector wants PEM. */
const decodeCaCertificate = (encoded?: string): string | undefined => {
  if (!encoded) return undefined;
  try {
    return atob(encoded);
  } catch {
    return undefined;
  }
};

const trimIssues = (issues?: Array<{ code?: string; message?: string; resourceIds?: string[] }>) =>
  (issues ?? []).map((issue) => ({
    code: issue.code,
    message: issue.message,
    resourceIds: issue.resourceIds ?? [],
  }));

/** Everything the core Kubernetes connector needs to target this cluster. */
const kubernetesConnectorTarget = (region: string, cluster: EksCluster) =>
  cluster.endpoint
    ? {
        apiUrl: cluster.endpoint,
        caCertificatePem: decodeCaCertificate(cluster.certificateAuthority?.data),
        authType: 'kubernetes_eks',
        region,
        clusterName: cluster.name,
      }
    : undefined;

const trimCluster = (region: string, cluster: EksCluster) => {
  const enabledLogTypes = (cluster.logging?.clusterLogging ?? [])
    .filter((setup) => setup.enabled === true)
    .flatMap((setup) => setup.types ?? []);
  return {
    name: cluster.name,
    arn: cluster.arn,
    region,
    status: cluster.status,
    version: cluster.version,
    platformVersion: cluster.platformVersion,
    endpoint: cluster.endpoint,
    certificateAuthorityData: cluster.certificateAuthority?.data,
    kubernetesConnector: kubernetesConnectorTarget(region, cluster),
    roleArn: cluster.roleArn,
    authenticationMode: cluster.accessConfig?.authenticationMode,
    bootstrapClusterCreatorAdminPermissions:
      cluster.accessConfig?.bootstrapClusterCreatorAdminPermissions,
    enabledLogTypes,
    vpc: {
      vpcId: cluster.resourcesVpcConfig?.vpcId,
      subnetIds: cluster.resourcesVpcConfig?.subnetIds ?? [],
      securityGroupIds: cluster.resourcesVpcConfig?.securityGroupIds ?? [],
      clusterSecurityGroupId: cluster.resourcesVpcConfig?.clusterSecurityGroupId,
      endpointPublicAccess: cluster.resourcesVpcConfig?.endpointPublicAccess === true,
      endpointPrivateAccess: cluster.resourcesVpcConfig?.endpointPrivateAccess === true,
      publicAccessCidrs: cluster.resourcesVpcConfig?.publicAccessCidrs ?? [],
    },
    serviceIpv4Cidr: cluster.kubernetesNetworkConfig?.serviceIpv4Cidr,
    ipFamily: cluster.kubernetesNetworkConfig?.ipFamily,
    supportType: cluster.upgradePolicy?.supportType,
    autoMode: cluster.computeConfig?.enabled === true,
    deletionProtection: cluster.deletionProtection === true,
    healthIssues: trimIssues(cluster.health?.issues),
    tags: cluster.tags ?? {},
    createdAt: cluster.createdAt,
  };
};

const trimNodegroup = (nodegroup: EksNodegroup) => ({
  nodegroupName: nodegroup.nodegroupName,
  nodegroupArn: nodegroup.nodegroupArn,
  clusterName: nodegroup.clusterName,
  status: nodegroup.status,
  version: nodegroup.version,
  releaseVersion: nodegroup.releaseVersion,
  capacityType: nodegroup.capacityType,
  amiType: nodegroup.amiType,
  instanceTypes: nodegroup.instanceTypes ?? [],
  diskSize: nodegroup.diskSize,
  scalingConfig: {
    minSize: nodegroup.scalingConfig?.minSize,
    maxSize: nodegroup.scalingConfig?.maxSize,
    desiredSize: nodegroup.scalingConfig?.desiredSize,
  },
  subnets: nodegroup.subnets ?? [],
  nodeRole: nodegroup.nodeRole,
  labels: nodegroup.labels ?? {},
  taints: nodegroup.taints ?? [],
  updateConfig: nodegroup.updateConfig,
  nodeRepairEnabled: nodegroup.nodeRepairConfig?.enabled === true,
  launchTemplate: nodegroup.launchTemplate,
  autoScalingGroups: (nodegroup.resources?.autoScalingGroups ?? []).map((group) => group.name),
  healthIssues: trimIssues(nodegroup.health?.issues),
  tags: nodegroup.tags ?? {},
  createdAt: nodegroup.createdAt,
  modifiedAt: nodegroup.modifiedAt,
});

/**
 * Every mutation returns an Update. `done` and `succeeded` are derived so a workflow can branch
 * without knowing the status vocabulary (InProgress, Successful, Failed, Cancelled).
 */
const trimUpdate = (update: EksUpdate) => ({
  id: update.id,
  status: update.status,
  done: update.status !== undefined && update.status !== 'InProgress',
  succeeded: update.status === 'Successful',
  type: update.type,
  params: (update.params ?? []).map((param) => ({ type: param.type, value: param.value })),
  errors: (update.errors ?? []).map((detail) => ({
    errorCode: detail.errorCode,
    errorMessage: detail.errorMessage,
    resourceIds: detail.resourceIds ?? [],
  })),
  createdAt: update.createdAt,
});

const trimAccessEntry = (entry: EksAccessEntry) => ({
  principalArn: entry.principalArn,
  accessEntryArn: entry.accessEntryArn,
  clusterName: entry.clusterName,
  type: entry.type,
  username: entry.username,
  kubernetesGroups: entry.kubernetesGroups ?? [],
  tags: entry.tags ?? {},
  createdAt: entry.createdAt,
  modifiedAt: entry.modifiedAt,
});

const trimAssociatedPolicy = (policy: EksAssociatedAccessPolicy) => ({
  policyArn: policy.policyArn,
  policyName: policy.policyArn?.split('/').pop(),
  accessScope: {
    type: policy.accessScope?.type,
    namespaces: policy.accessScope?.namespaces ?? [],
  },
  associatedAt: policy.associatedAt,
  modifiedAt: policy.modifiedAt,
});

const awsCredentials = (ctx: ActionContext) => {
  const accessKeyId = ctx.secrets?.accessKeyId as string | undefined;
  const secretAccessKey = ctx.secrets?.secretAccessKey as string | undefined;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('The connector has no AWS access key configured; cannot mint a cluster token.');
  }
  return { accessKeyId, secretAccessKey };
};

// =============================================================================
// Connector spec
// =============================================================================

export const AwsEks: ConnectorSpec = {
  metadata: {
    id: '.aws_eks',
    displayName: 'Amazon EKS',
    description: i18n.translate('core.kibanaConnectorSpecs.awsEks.metadata.description', {
      defaultMessage:
        'Discover EKS clusters and node groups, scale node groups, manage cluster access entries, and mint Kubernetes tokens for the Kubernetes connector',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features; 'workflows' is added in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['aws_credentials'],
  },

  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[a-z]{2}(-[a-z]+)+-\d$/, 'Must be a valid AWS Region name, e.g. "us-east-1".')
        .describe('Default AWS Region for every action, for example us-east-1')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsEks.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsEks.config.region.helpText', {
            defaultMessage:
              'The AWS Region the clusters live in, for example us-east-1 or eu-north-1. Actions can override it per call.',
          }),
          placeholder: 'us-east-1',
        }),
    })
  ),

  skill: [
    '## Amazon EKS connector',
    '',
    'Control-plane operations on Amazon EKS and the auth bridge to the Kubernetes connector. It does NOT touch workloads: pods, deployments, logs, apply, and rollouts belong to the Kubernetes connector.',
    '',
    '### Addressing',
    '- Every cluster action takes `clusterName` and an optional `region` (defaults to the connector region). Start with `listClusters`, then `getCluster`. Node group actions add `nodegroupName` from `listNodegroups`.',
    '',
    '### Mutations are asynchronous updates',
    '- `updateNodegroupConfig` and `updateClusterConfig` return an Update with `id`, `status` (InProgress, Successful, Failed, Cancelled), `done`, and `succeeded`. Poll `describeUpdate` with that `id` (and `nodegroupName` for node group updates) until `done`. Scaling a node group takes 1-5 minutes; cluster config changes such as logging or endpoint access take 5-25 minutes. Do not wait inside a single step: keep the update id and poll from later steps with a wait in between, so an agent turn or workflow step does not time out.',
    '- EKS allows one update per node group at a time, and one cluster-level update at a time; a second one fails with ResourceInUseException until the first completes.',
    '',
    '### Scaling semantics',
    '- `scalingConfig` is per node group across all its subnets (not per zone): `desiredSize` is the total node count. `desiredSize` must stay within `minSize`..`maxSize`, so widen `maxSize` in the same call when scaling beyond the current maximum.',
    '- If the Cluster Autoscaler or Karpenter manages the group, a manual `desiredSize` change is temporary; adjust `minSize`/`maxSize` instead. EKS Auto Mode clusters (`autoMode: true` in getCluster) have no managed node groups.',
    '',
    '### Reaching the Kubernetes API',
    "- `getToken` mints a Kubernetes bearer token (the `aws eks get-token` exchange) for the connector's own IAM identity, valid about 15 minutes, together with the cluster endpoint and CA certificate. Hand `endpoint`, `caCertificatePem`, and `token` to a step that talks to the Kubernetes API, and mint a fresh token per run rather than storing one.",
    '- For a standing Kibana Kubernetes connector, `getToken` is not needed: create it with the "Amazon EKS" auth type, the same access key, the region and cluster name, and the `apiUrl`/`caCertificatePem` from `getCluster`; it mints its own token on every call.',
    "- Either way the IAM identity must be allowed into the cluster: `createAccessEntry` for the connector's user/role ARN, then `associateAccessPolicy` (for example AmazonEKSViewPolicy cluster-wide, or AmazonEKSEditPolicy scoped to a namespace). Discover policy ARNs with `listAccessPolicies` and existing grants with `listAccessEntries`/`listAssociatedAccessPolicies`. Access entries require the cluster `authenticationMode` to be API or API_AND_CONFIG_MAP (`updateClusterConfig` can move it forward, never back).",
    '',
    '### Gotchas',
    '- `updateAccessEntry` REPLACES the Kubernetes group list; `updateClusterConfig.publicAccessCidrs` REPLACES the public CIDR allowlist. Read the current values first and re-send what you keep.',
    '- Access entries and policy associations apply immediately and are not Updates; there is nothing to poll. `deleteAccessEntry` and `disassociateAccessPolicy` are the rollbacks.',
    '- Node group version upgrades are not covered here; only scaling, labels, taints, update strategy, and node repair.',
  ].join('\n'),

  actions: {
    // =========================================================================
    // Discovery and auth bridge
    // =========================================================================

    listClusters: {
      isTool: true,
      scope: 'read',
      description:
        'List the EKS cluster names in a Region, with pagination. The discovery entry point: every other action needs a clusterName from here. Returns names only; call getCluster for details.',
      input: ListClustersInputSchema,
      handler: async (ctx, input: ListClustersInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{ clusters?: string[]; nextToken?: string }>(() =>
          ctx.client.get(`${eksBase(region)}/clusters`, {
            params: {
              maxResults: input.maxResults,
              nextToken: input.nextToken,
              include: input.includeConnectedClusters ? 'all' : undefined,
            },
          })
        );
        return { region, clusters: data.clusters ?? [], nextToken: data.nextToken };
      },
    },

    getCluster: {
      isTool: true,
      scope: 'read',
      description:
        'Describe one cluster: status, Kubernetes version, platform version, API server endpoint, CA certificate, authentication mode, enabled control-plane log types, VPC and endpoint access settings, health issues, and tags. Also returns `kubernetesConnector` (API URL, PEM CA, region, cluster name) for wiring the Kubernetes connector to this cluster with the same access key.',
      input: GetClusterInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        const { region, url } = resolveCluster(ctx, input);
        const data = await request<{ cluster?: EksCluster }>(() => ctx.client.get(url));
        return trimCluster(region, data.cluster ?? {});
      },
    },

    getToken: {
      // The result is a live credential for the cluster's Kubernetes API. It belongs in a
      // workflow step that immediately uses it, not in an agent transcript.
      isTool: false,
      scope: 'read',
      description:
        "Mint a short-lived Kubernetes bearer token for the cluster (the `aws eks get-token` exchange: an STS GetCallerIdentity request presigned with the connector's access key and bound to the cluster name). Returns the token, its expiry (about 15 minutes), and by default the cluster endpoint and PEM CA certificate, ready to hand to a step that calls the Kubernetes API. The IAM identity must already have an access entry (createAccessEntry) or aws-auth mapping on the cluster.",
      input: GetTokenInputSchema,
      handler: async (ctx, input: GetTokenInput) => {
        const { region, url } = resolveCluster(ctx, input);
        const { accessKeyId, secretAccessKey } = awsCredentials(ctx);
        const cluster =
          input.includeClusterDetails === false
            ? undefined
            : (await request<{ cluster?: EksCluster }>(() => ctx.client.get(url))).cluster;
        const mintedAt = Date.now();
        const token = await buildEksBearerToken({
          accessKeyId,
          secretAccessKey,
          region,
          clusterName: input.clusterName,
        });
        return {
          clusterName: input.clusterName,
          region,
          tokenType: 'Bearer',
          token,
          expiresAt: new Date(mintedAt + TOKEN_REPORTED_LIFETIME_SECONDS * 1000).toISOString(),
          tokenLifetimeSeconds: TOKEN_LIFETIME_SECONDS,
          ...(cluster
            ? {
                endpoint: cluster.endpoint,
                caCertificatePem: decodeCaCertificate(cluster.certificateAuthority?.data),
                clusterStatus: cluster.status,
              }
            : {}),
        };
      },
    },

    // =========================================================================
    // Node groups
    // =========================================================================

    listNodegroups: {
      isTool: true,
      scope: 'read',
      description:
        'List the managed node group names of a cluster, with pagination. The prerequisite for describeNodegroup and updateNodegroupConfig. Self-managed nodes, Fargate, and EKS Auto Mode pools do not appear here.',
      input: ListNodegroupsInputSchema,
      handler: async (ctx, input: ListNodegroupsInput) => {
        const { url } = resolveCluster(ctx, input);
        const data = await request<{ nodegroups?: string[]; nextToken?: string }>(() =>
          ctx.client.get(`${url}/node-groups`, {
            params: { maxResults: input.maxResults, nextToken: input.nextToken },
          })
        );
        return { nodegroups: data.nodegroups ?? [], nextToken: data.nextToken };
      },
    },

    describeNodegroup: {
      isTool: true,
      scope: 'read',
      description:
        'Describe a managed node group: status, scaling config (minSize, maxSize, desiredSize), capacity type (ON_DEMAND, SPOT, CAPACITY_BLOCK), instance types, AMI type, Kubernetes version, labels, taints, update strategy, node repair, Auto Scaling group names, and health issues. The read that precedes and confirms a scale remediation.',
      input: DescribeNodegroupInputSchema,
      handler: async (ctx, input: DescribeNodegroupInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{ nodegroup?: EksNodegroup }>(() =>
          ctx.client.get(nodegroupPath(region, input.clusterName, input.nodegroupName))
        );
        return trimNodegroup(data.nodegroup ?? {});
      },
    },

    updateNodegroupConfig: {
      isTool: true,
      scope: 'destroy',
      description:
        'Change a managed node group: scale it (minSize, maxSize, desiredSize), add or remove node labels and taints, tune the rolling-update settings, or toggle node auto repair. The primary capacity remediation: raise desiredSize (and maxSize if needed) to absorb load, lower it to drain. Returns an Update; poll describeUpdate with its id and the nodegroupName until done.',
      input: UpdateNodegroupConfigInputSchema,
      handler: async (ctx, input: UpdateNodegroupConfigInput) => {
        const region = resolveRegion(ctx, input.region);
        const scalingConfig =
          input.minSize !== undefined ||
          input.maxSize !== undefined ||
          input.desiredSize !== undefined
            ? { minSize: input.minSize, maxSize: input.maxSize, desiredSize: input.desiredSize }
            : undefined;
        const labels =
          input.labelsToAdd || input.labelsToRemove
            ? { addOrUpdateLabels: input.labelsToAdd, removeLabels: input.labelsToRemove }
            : undefined;
        const taints =
          input.taintsToAdd || input.taintsToRemove
            ? { addOrUpdateTaints: input.taintsToAdd, removeTaints: input.taintsToRemove }
            : undefined;
        const updateConfig =
          input.maxUnavailable !== undefined ||
          input.maxUnavailablePercentage !== undefined ||
          input.updateStrategy !== undefined
            ? {
                maxUnavailable: input.maxUnavailable,
                maxUnavailablePercentage: input.maxUnavailablePercentage,
                updateStrategy: input.updateStrategy,
              }
            : undefined;
        const nodeRepairConfig =
          input.nodeRepairEnabled !== undefined ? { enabled: input.nodeRepairEnabled } : undefined;
        const data = await request<{ update?: EksUpdate }>(() =>
          ctx.client.post(
            `${nodegroupPath(region, input.clusterName, input.nodegroupName)}/update-config`,
            { scalingConfig, labels, taints, updateConfig, nodeRepairConfig }
          )
        );
        return { nodegroupName: input.nodegroupName, ...trimUpdate(data.update ?? {}) };
      },
    },

    // =========================================================================
    // Updates
    // =========================================================================

    describeUpdate: {
      isTool: true,
      scope: 'read',
      description:
        'Get the status of an asynchronous Update started by updateNodegroupConfig (pass nodegroupName too) or updateClusterConfig: status (InProgress, Successful, Failed, Cancelled), a done flag, the parameters it changed, and any errors. Poll it until done before treating a scale or config change as finished.',
      input: DescribeUpdateInputSchema,
      handler: async (ctx, input: DescribeUpdateInput) => {
        const { url } = resolveCluster(ctx, input);
        const data = await request<{ update?: EksUpdate }>(() =>
          ctx.client.get(`${url}/updates/${encodeURIComponent(input.updateId)}`, {
            params: { nodegroupName: input.nodegroupName },
          })
        );
        return trimUpdate(data.update ?? {});
      },
    },

    listUpdates: {
      isTool: true,
      scope: 'read',
      description:
        'List the ids of past and in-flight Updates on a cluster, or on one node group when nodegroupName is given. Feed the ids to describeUpdate; use it to find an update still running before starting another.',
      input: ListUpdatesInputSchema,
      handler: async (ctx, input: ListUpdatesInput) => {
        const { url } = resolveCluster(ctx, input);
        const data = await request<{ updateIds?: string[]; nextToken?: string }>(() =>
          ctx.client.get(`${url}/updates`, {
            params: {
              nodegroupName: input.nodegroupName,
              maxResults: input.maxResults,
              nextToken: input.nextToken,
            },
          })
        );
        return { updateIds: data.updateIds ?? [], nextToken: data.nextToken };
      },
    },

    // =========================================================================
    // Cluster configuration and tags
    // =========================================================================

    updateClusterConfig: {
      isTool: true,
      scope: 'destroy',
      description:
        'Change cluster control-plane settings: enable or disable control-plane log types, move the authentication mode forward (CONFIG_MAP -> API_AND_CONFIG_MAP -> API), toggle public/private API endpoint access and its public CIDR allowlist, set the upgrade support type, or deletion protection. One category per call (EKS rejects mixed logging + access + VPC changes). Returns an Update; poll describeUpdate until done (5-25 minutes).',
      input: UpdateClusterConfigInputSchema,
      handler: async (ctx, input: UpdateClusterConfigInput) => {
        const { url } = resolveCluster(ctx, input);
        const clusterLogging = [
          ...(input.enableLogTypes?.length ? [{ types: input.enableLogTypes, enabled: true }] : []),
          ...(input.disableLogTypes?.length
            ? [{ types: input.disableLogTypes, enabled: false }]
            : []),
        ];
        const resourcesVpcConfig =
          input.endpointPublicAccess !== undefined ||
          input.endpointPrivateAccess !== undefined ||
          input.publicAccessCidrs !== undefined
            ? {
                endpointPublicAccess: input.endpointPublicAccess,
                endpointPrivateAccess: input.endpointPrivateAccess,
                publicAccessCidrs: input.publicAccessCidrs,
              }
            : undefined;
        const data = await request<{ update?: EksUpdate }>(() =>
          ctx.client.post(`${url}/update-config`, {
            logging: clusterLogging.length ? { clusterLogging } : undefined,
            accessConfig: input.authenticationMode
              ? { authenticationMode: input.authenticationMode }
              : undefined,
            resourcesVpcConfig,
            upgradePolicy: input.supportType ? { supportType: input.supportType } : undefined,
            deletionProtection: input.deletionProtection,
          })
        );
        return trimUpdate(data.update ?? {});
      },
    },

    listTagsForResource: {
      isTool: true,
      scope: 'read',
      description:
        'Read the AWS tags on an EKS cluster or node group by ARN (from getCluster "arn" or describeNodegroup "nodegroupArn"), for inventory and routing decisions such as owner, environment, or cost center.',
      input: ListTagsForResourceInputSchema,
      handler: async (ctx, input: ListTagsForResourceInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{ tags?: Record<string, string> }>(() =>
          ctx.client.get(`${eksBase(region)}/tags/${encodeURIComponent(input.resourceArn)}`)
        );
        return { resourceArn: input.resourceArn, tags: data.tags ?? {} };
      },
    },

    // =========================================================================
    // Access entries and policies
    // =========================================================================

    listAccessPolicies: {
      isTool: true,
      scope: 'read',
      description:
        'List the EKS-managed access policies that can be associated with an access entry (AmazonEKSClusterAdminPolicy, AmazonEKSAdminPolicy, AmazonEKSEditPolicy, AmazonEKSViewPolicy, and others) with their ARNs. Use it to pick a policyArn for associateAccessPolicy.',
      input: ListAccessPoliciesInputSchema,
      handler: async (ctx, input: ListAccessPoliciesInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{
          accessPolicies?: Array<{ name?: string; arn?: string }>;
          nextToken?: string;
        }>(() =>
          ctx.client.get(`${eksBase(region)}/access-policies`, {
            params: { maxResults: input.maxResults, nextToken: input.nextToken },
          })
        );
        return {
          accessPolicies: (data.accessPolicies ?? []).map((policy) => ({
            name: policy.name,
            arn: policy.arn,
          })),
          nextToken: data.nextToken,
        };
      },
    },

    listAccessEntries: {
      isTool: true,
      scope: 'read',
      description:
        'List the IAM principal ARNs that have an access entry on a cluster, optionally only those with a given access policy associated. Use it to audit who can reach the Kubernetes API before granting or revoking access.',
      input: ListAccessEntriesInputSchema,
      handler: async (ctx, input: ListAccessEntriesInput) => {
        const { url } = resolveCluster(ctx, input);
        const data = await request<{ accessEntries?: string[]; nextToken?: string }>(() =>
          ctx.client.get(`${url}/access-entries`, {
            params: {
              associatedPolicyArn: input.associatedPolicyArn,
              maxResults: input.maxResults,
              nextToken: input.nextToken,
            },
          })
        );
        return { principalArns: data.accessEntries ?? [], nextToken: data.nextToken };
      },
    },

    describeAccessEntry: {
      isTool: true,
      scope: 'read',
      description:
        "Describe one principal's access entry on a cluster: type, Kubernetes username and groups, tags, and timestamps. Pair with listAssociatedAccessPolicies to see the policies that actually grant permissions.",
      input: DescribeAccessEntryInputSchema,
      handler: async (ctx, input: DescribeAccessEntryInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{ accessEntry?: EksAccessEntry }>(() =>
          ctx.client.get(accessEntryPath(region, input.clusterName, input.principalArn))
        );
        return trimAccessEntry(data.accessEntry ?? {});
      },
    },

    listAssociatedAccessPolicies: {
      isTool: true,
      scope: 'read',
      description:
        "List the access policies associated with a principal's access entry, each with its scope (cluster-wide or a namespace list). The read half of cluster RBAC: check it before associateAccessPolicy or disassociateAccessPolicy.",
      input: ListAssociatedAccessPoliciesInputSchema,
      handler: async (ctx, input: ListAssociatedAccessPoliciesInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{
          associatedAccessPolicies?: EksAssociatedAccessPolicy[];
          nextToken?: string;
        }>(() =>
          ctx.client.get(
            `${accessEntryPath(region, input.clusterName, input.principalArn)}/access-policies`,
            { params: { maxResults: input.maxResults, nextToken: input.nextToken } }
          )
        );
        return {
          principalArn: input.principalArn,
          associatedAccessPolicies: (data.associatedAccessPolicies ?? []).map(trimAssociatedPolicy),
          nextToken: data.nextToken,
        };
      },
    },

    createAccessEntry: {
      // Grants an IAM identity a foothold in the cluster; workflow-only like other IAM grants.
      isTool: false,
      scope: 'write',
      description:
        "Create an access entry so an IAM user or role can authenticate to the cluster's Kubernetes API. On its own it grants no permissions: follow with associateAccessPolicy (EKS-managed policy) or map kubernetesGroups to RBAC bindings. The onboarding step for a workflow identity before getToken. Requires authenticationMode API or API_AND_CONFIG_MAP. Applies immediately; no Update to poll.",
      input: CreateAccessEntryInputSchema,
      handler: async (ctx, input: CreateAccessEntryInput) => {
        const { url } = resolveCluster(ctx, input);
        const data = await request<{ accessEntry?: EksAccessEntry }>(() =>
          ctx.client.post(`${url}/access-entries`, {
            principalArn: input.principalArn,
            kubernetesGroups: input.kubernetesGroups,
            username: input.username,
            type: input.type,
            tags: input.tags,
          })
        );
        return trimAccessEntry(data.accessEntry ?? {});
      },
    },

    updateAccessEntry: {
      isTool: false,
      scope: 'destroy',
      description:
        "Change an access entry's Kubernetes groups or username. kubernetesGroups REPLACES the current list (read it with describeAccessEntry first); pass [] to strip every group as a containment step. Applies immediately.",
      input: UpdateAccessEntryInputSchema,
      handler: async (ctx, input: UpdateAccessEntryInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{ accessEntry?: EksAccessEntry }>(() =>
          ctx.client.post(accessEntryPath(region, input.clusterName, input.principalArn), {
            kubernetesGroups: input.kubernetesGroups,
            username: input.username,
          })
        );
        return trimAccessEntry(data.accessEntry ?? {});
      },
    },

    deleteAccessEntry: {
      isTool: false,
      scope: 'destroy',
      description:
        "Delete a principal's access entry, revoking its ability to authenticate to the cluster (its policy associations go with it). The rollback for createAccessEntry and the containment move for a compromised IAM identity. Applies immediately.",
      input: DeleteAccessEntryInputSchema,
      handler: async (ctx, input: DeleteAccessEntryInput) => {
        const region = resolveRegion(ctx, input.region);
        await request<unknown>(() =>
          ctx.client.delete(accessEntryPath(region, input.clusterName, input.principalArn))
        );
        return { deleted: true, principalArn: input.principalArn, clusterName: input.clusterName };
      },
    },

    associateAccessPolicy: {
      isTool: false,
      scope: 'write',
      description:
        "Bind an EKS access policy to a principal's access entry, cluster-wide or scoped to namespaces: the RBAC half of cluster auth. For example AmazonEKSViewPolicy cluster-wide for read-only automation, or AmazonEKSEditPolicy on one namespace for a remediation workflow. Requires an existing access entry (createAccessEntry). Applies immediately.",
      input: AssociateAccessPolicyInputSchema,
      handler: async (ctx, input: AssociateAccessPolicyInput) => {
        const region = resolveRegion(ctx, input.region);
        const data = await request<{
          clusterName?: string;
          principalArn?: string;
          associatedAccessPolicy?: EksAssociatedAccessPolicy;
        }>(() =>
          ctx.client.post(
            `${accessEntryPath(region, input.clusterName, input.principalArn)}/access-policies`,
            {
              policyArn: input.policyArn,
              accessScope: {
                type: input.accessScopeType,
                ...(input.namespaces ? { namespaces: input.namespaces } : {}),
              },
            }
          )
        );
        return {
          principalArn: input.principalArn,
          clusterName: input.clusterName,
          associatedAccessPolicy: trimAssociatedPolicy(data.associatedAccessPolicy ?? {}),
        };
      },
    },

    disassociateAccessPolicy: {
      isTool: false,
      scope: 'destroy',
      description:
        "Remove an access policy from a principal's access entry, revoking the permissions it granted while keeping the entry itself. The rollback for associateAccessPolicy. Applies immediately.",
      input: DisassociateAccessPolicyInputSchema,
      handler: async (ctx, input: DisassociateAccessPolicyInput) => {
        const region = resolveRegion(ctx, input.region);
        await request<unknown>(() =>
          ctx.client.delete(
            `${accessEntryPath(
              region,
              input.clusterName,
              input.principalArn
            )}/access-policies/${encodeURIComponent(input.policyArn)}`
          )
        );
        return {
          disassociated: true,
          principalArn: input.principalArn,
          policyArn: input.policyArn,
          clusterName: input.clusterName,
        };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.awsEks.test.description', {
      defaultMessage:
        'Verifies the Amazon EKS connection by listing the clusters in the configured Region',
    }),
    handler: async (ctx) => {
      const region = resolveRegion(ctx);
      const data = await request<{ clusters?: string[] }>(() =>
        ctx.client.get(`${eksBase(region)}/clusters`, { params: { maxResults: 100 } })
      );
      // Resolving is what signals success; ConnectorTestHandlerResult declares `ok?: never`,
      // so a failure must throw rather than return an ok flag.
      return {
        message: `Connected to Amazon EKS: ${
          data.clusters?.length ?? 0
        } cluster(s) visible in ${region}.`,
      };
    },
  },
};
