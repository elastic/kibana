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
import type { ConnectorSpec } from '../../connector_spec';
import { buildEksBearerToken } from '../../auth_types/eks_token_helpers';
import { accessEntryActions } from './access_entries';
import {
  awsCredentials,
  eksBase,
  nodegroupPath,
  request,
  resolveCluster,
  resolveRegion,
} from './client';
import { decodeCaCertificate, trimCluster, trimNodegroup, trimUpdate } from './format';
import {
  buildClusterUpdateBody,
  buildNodegroupUpdateBody,
  clusterUpdateNeedsCurrent,
  nodegroupUpdateNeedsCurrent,
} from './payloads';
import type {
  DescribeNodegroupInput,
  DescribeUpdateInput,
  EksCluster,
  EksNodegroup,
  EksUpdate,
  GetClusterInput,
  GetTokenInput,
  ListClustersInput,
  ListNodegroupsInput,
  ListTagsForResourceInput,
  ListUpdatesInput,
  UpdateClusterConfigInput,
  UpdateNodegroupConfigInput,
} from './types';
import {
  DescribeNodegroupInputSchema,
  DescribeUpdateInputSchema,
  GetClusterInputSchema,
  GetTokenInputSchema,
  ListClustersInputSchema,
  ListNodegroupsInputSchema,
  ListTagsForResourceInputSchema,
  ListUpdatesInputSchema,
  REGION_PATTERN,
  REGION_PATTERN_MESSAGE,
  UpdateClusterConfigInputSchema,
  UpdateNodegroupConfigInputSchema,
} from './types';

/** The API server accepts a presigned token for 15 minutes; report 14 so a caller never holds one about to expire. */
const TOKEN_LIFETIME_SECONDS = 14 * 60;

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
        .regex(REGION_PATTERN, REGION_PATTERN_MESSAGE)
        .describe('Default AWS Region for every action, for example us-east-1')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.awsEks.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.awsEks.config.region.helpText', {
            defaultMessage:
              'The AWS Region the clusters live in, for example us-east-1 or us-gov-west-1. Actions can override it per call. China and ISO Regions are not supported.',
          }),
          placeholder: 'us-east-1',
        }),
    })
  ),

  skill: [
    '## Amazon EKS connector',
    '',
    'Control-plane operations on Amazon EKS. It does NOT touch workloads: pods, deployments, logs, apply, and rollouts belong to the Kubernetes connector.',
    '',
    '### Addressing',
    '- Every cluster action takes `clusterName` and an optional `region` (defaults to the connector region). Start with `listClusters`, then `getCluster`. Node group actions add `nodegroupName` from `listNodegroups`.',
    '',
    '### Mutations are asynchronous updates',
    '- `updateNodegroupConfig` and `updateClusterConfig` return an Update with `id`, `status` (InProgress, Successful, Failed, Cancelled), `done`, and `succeeded`, plus the `clusterName`, `region` (and `nodegroupName`) to poll it with. Pass those unchanged to `describeUpdate` until `done`. Scaling a node group takes 1-5 minutes; cluster config changes such as logging or endpoint access take 5-25 minutes. Do not wait inside one turn: report the update id and check it again later.',
    '- EKS allows one update per node group at a time, and one cluster-level update at a time; a second one fails with ResourceInUseException until the first completes. Check `listUpdates` first.',
    '- Settings you omit keep their current values: the connector reads the node group or cluster first and re-sends them.',
    '',
    '### Scaling semantics',
    '- `scalingConfig` is per node group across all its subnets (not per zone): `desiredSize` is the total node count. `desiredSize` must stay within `minSize`..`maxSize`, so widen `maxSize` in the same call when scaling beyond the current maximum.',
    '- If the Cluster Autoscaler or Karpenter manages the group, a manual `desiredSize` change is temporary; adjust `minSize`/`maxSize` instead. EKS Auto Mode clusters (`autoMode: true` in getCluster) have no managed node groups.',
    '',
    '### Cluster access',
    "- Granting cluster access and minting Kubernetes tokens are not available to agents. To check who can reach a cluster's Kubernetes API, use `listAccessEntries` and `listAssociatedAccessPolicies`; if a principal is missing, tell the user an administrator has to grant it an access entry and an access policy.",
    '- Access entries require the cluster `authenticationMode` to be API or API_AND_CONFIG_MAP (`updateClusterConfig` can move it forward, never back).',
    '- A cluster registered through the EKS Connector has no `endpoint` and no `kubernetesConnector` block. A cluster with `vpc.endpointPublicAccess: false` is reachable only from inside its VPC.',
    '',
    '### Gotchas',
    '- `updateClusterConfig.publicAccessCidrs` REPLACES the public CIDR allowlist when given. Read the current list from getCluster first and re-send what you keep.',
    '- Node group version upgrades are not covered here; only scaling, labels, taints, update strategy, and node repair.',
  ].join('\n'),

  actions: {
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
        'Describe one cluster: status, Kubernetes version, platform version, API server endpoint, CA certificate, authentication mode, enabled control-plane log types, VPC and endpoint access settings, health issues, and tags. Also returns `kubernetesConnector` (API URL, PEM CA, region, cluster name) for wiring the Kubernetes connector to this cluster with the same access key. `kubernetesConnector` is absent for clusters registered through the EKS Connector, which have no endpoint; when `vpc.endpointPublicAccess` is false the endpoint is reachable only from inside the VPC.',
      input: GetClusterInputSchema,
      handler: async (ctx, input: GetClusterInput) => {
        const { region, url } = resolveCluster(ctx, input);
        const data = await request<{ cluster?: EksCluster }>(() => ctx.client.get(url));
        return trimCluster(region, data.cluster ?? {});
      },
    },

    getToken: {
      // The result is a live credential for the cluster's Kubernetes API. It belongs in a
      // step that immediately uses it, not in an agent transcript.
      isTool: false,
      scope: 'read',
      description:
        "Mint a short-lived Kubernetes bearer token for the cluster (the `aws eks get-token` exchange: an STS GetCallerIdentity request presigned with the connector's access key and bound to the cluster name). Returns the token, its expiry (about 14 minutes), and by default the cluster endpoint and PEM CA certificate, ready to hand to a call to the Kubernetes API. The IAM identity must already have an access entry (createAccessEntry) or aws-auth mapping on the cluster. Fails for a cluster without an API server endpoint.",
      input: GetTokenInputSchema,
      handler: async (ctx, input: GetTokenInput) => {
        const { region, url } = resolveCluster(ctx, input);
        const { accessKeyId, secretAccessKey } = awsCredentials(ctx);
        const cluster =
          input.includeClusterDetails === false
            ? undefined
            : (await request<{ cluster?: EksCluster }>(() => ctx.client.get(url))).cluster ?? {};
        if (cluster && !cluster.endpoint) {
          throw new Error(
            `Cluster ${input.clusterName} has no Kubernetes API server endpoint (for example a cluster registered through the EKS Connector), so there is nothing to mint a token for.`
          );
        }
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
          expiresAt: new Date(mintedAt + TOKEN_LIFETIME_SECONDS * 1000).toISOString(),
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
        'Change a managed node group: scale it (minSize, maxSize, desiredSize), add or remove node labels and taints, tune the rolling-update settings, or toggle node auto repair. The primary capacity remediation: raise desiredSize (and maxSize if needed) to absorb load, lower it to drain. Settings you omit keep their current values. Returns an Update with the clusterName, region, and nodegroupName to poll describeUpdate with until done.',
      input: UpdateNodegroupConfigInputSchema,
      handler: async (ctx, input: UpdateNodegroupConfigInput) => {
        const region = resolveRegion(ctx, input.region);
        const url = nodegroupPath(region, input.clusterName, input.nodegroupName);
        const current = nodegroupUpdateNeedsCurrent(input)
          ? (await request<{ nodegroup?: EksNodegroup }>(() => ctx.client.get(url))).nodegroup
          : undefined;
        const data = await request<{ update?: EksUpdate }>(() =>
          ctx.client.post(`${url}/update-config`, buildNodegroupUpdateBody(input, current))
        );
        return {
          clusterName: input.clusterName,
          region,
          nodegroupName: input.nodegroupName,
          ...trimUpdate(data.update ?? {}),
        };
      },
    },

    describeUpdate: {
      isTool: true,
      scope: 'read',
      description:
        'Get the status of an asynchronous Update started by updateNodegroupConfig or updateClusterConfig: status (InProgress, Successful, Failed, Cancelled), a done flag, the parameters it changed, and any errors. Pass the clusterName, region, and (for node group updates) nodegroupName returned with the update. Poll it until done before treating a scale or config change as finished.',
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

    updateClusterConfig: {
      isTool: true,
      scope: 'destroy',
      description:
        'Change cluster control-plane settings: enable or disable control-plane log types, move the authentication mode forward (CONFIG_MAP -> API_AND_CONFIG_MAP -> API), toggle public/private API endpoint access and its public CIDR allowlist, set the upgrade support type, or deletion protection. One category per call (EKS rejects mixed logging + access + VPC changes). Endpoint settings you omit keep their current values. Returns an Update with the clusterName and region to poll describeUpdate with until done (5-25 minutes).',
      input: UpdateClusterConfigInputSchema,
      handler: async (ctx, input: UpdateClusterConfigInput) => {
        const { region, url } = resolveCluster(ctx, input);
        const current = clusterUpdateNeedsCurrent(input)
          ? (await request<{ cluster?: EksCluster }>(() => ctx.client.get(url))).cluster
          : undefined;
        const data = await request<{ update?: EksUpdate }>(() =>
          ctx.client.post(`${url}/update-config`, buildClusterUpdateBody(input, current))
        );
        return { clusterName: input.clusterName, region, ...trimUpdate(data.update ?? {}) };
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

    ...accessEntryActions,
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.awsEks.test.description', {
      defaultMessage:
        'Verifies the Amazon EKS connection by listing the clusters in the configured Region',
    }),
    handler: async (ctx) => {
      const region = resolveRegion(ctx);
      const data = await request<{ clusters?: string[]; nextToken?: string }>(() =>
        ctx.client.get(`${eksBase(region)}/clusters`, { params: { maxResults: 100 } })
      );
      const count = `${data.clusters?.length ?? 0}${data.nextToken ? '+' : ''}`;
      // Resolving is what signals success; ConnectorTestHandlerResult declares `ok?: never`,
      // so a failure must throw rather than return an ok flag.
      return { message: `Connected to Amazon EKS: ${count} cluster(s) visible in ${region}.` };
    },
  },
};
