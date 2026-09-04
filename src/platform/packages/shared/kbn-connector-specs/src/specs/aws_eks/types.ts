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
 * EKS bounds these identifiers itself (see the EKS API reference); mirroring them keeps an
 * LLM- or workflow-supplied value from reaching a URL path segment as something unexpected.
 */
const REGION_PATTERN = /^[a-z]{2}(-[a-z]+)+-\d$/;
/** Cluster names: 1-100 characters, alphanumeric start, then alphanumerics, `-` and `_`. */
const CLUSTER_NAME_PATTERN = /^[0-9A-Za-z][A-Za-z0-9\-_]{0,99}$/;
/** Node group names: 1-63 characters, same charset as cluster names. */
const NODEGROUP_NAME_PATTERN = /^[0-9A-Za-z][A-Za-z0-9\-_]{0,62}$/;
const UPDATE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** An IAM user or role ARN (roles may carry a path), as EKS access entries expect. */
const IAM_PRINCIPAL_ARN_PATTERN = /^arn:aws[a-z-]*:iam::\d{12}:(user|role)\/[\w+=,.@/-]{1,512}$/;
/** An EKS access policy ARN, e.g. `arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy`. */
const ACCESS_POLICY_ARN_PATTERN =
  /^arn:aws[a-z-]*:eks::aws:cluster-access-policy\/[A-Za-z0-9]{1,128}$/;
/** An EKS resource ARN (cluster, node group, add-on, Fargate profile, ...). */
const EKS_RESOURCE_ARN_PATTERN =
  /^arn:aws[a-z-]*:eks:[a-z0-9-]+:\d{12}:[a-z-]+\/[\w+=,.@/-]{1,400}$/;
const CIDR_PATTERN = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const KUBERNETES_NAME_PATTERN = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;
/** Kubernetes label/taint keys: optional DNS prefix, then a 1-63 character name. */
const LABEL_KEY_PATTERN =
  /^([a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*\/)?[A-Za-z0-9]([-A-Za-z0-9_.]{0,61}[A-Za-z0-9])?$/;
const LABEL_VALUE_PATTERN = /^([A-Za-z0-9]([-A-Za-z0-9_.]{0,61}[A-Za-z0-9])?)?$/;

const region = () =>
  z
    .string()
    .max(32)
    .regex(REGION_PATTERN, { message: 'Must be an AWS Region such as us-east-1 or eu-north-1' })
    .optional()
    .describe(
      'AWS Region of the cluster, for example "us-east-1". Optional: defaults to the region configured on the connector.'
    );

const clusterName = () =>
  z
    .string()
    .max(100)
    .regex(CLUSTER_NAME_PATTERN, {
      message:
        'Must be an EKS cluster name: 1-100 letters, digits, hyphens and underscores, starting with a letter or digit',
    })
    .describe('EKS cluster name, for example "prod-eu". Obtain it from listClusters.');

const nodegroupName = () =>
  z
    .string()
    .max(63)
    .regex(NODEGROUP_NAME_PATTERN, {
      message:
        'Must be a managed node group name: 1-63 letters, digits, hyphens and underscores, starting with a letter or digit',
    })
    .describe(
      'Managed node group name, for example "workers-general". Obtain it from listNodegroups.'
    );

const updateId = () =>
  z
    .string()
    .max(36)
    .regex(UPDATE_ID_PATTERN, { message: 'Must be an EKS update id (UUID)' })
    .describe(
      'Update id (UUID) returned as "id" by updateNodegroupConfig or updateClusterConfig, or listed by listUpdates.'
    );

const principalArn = () =>
  z
    .string()
    .max(600)
    .regex(IAM_PRINCIPAL_ARN_PATTERN, {
      message:
        'Must be an IAM user or role ARN, for example arn:aws:iam::123456789012:role/kibana-workflows',
    })
    .describe(
      'IAM principal ARN of the identity to grant or inspect, for example "arn:aws:iam::123456789012:role/kibana-workflows" or "arn:aws:iam::123456789012:user/automation". Use the user or role ARN, not an assumed-role session ARN.'
    );

const policyArn = () =>
  z
    .string()
    .max(200)
    .regex(ACCESS_POLICY_ARN_PATTERN, {
      message:
        'Must be an EKS access policy ARN, for example arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy',
    })
    .describe(
      'EKS access policy ARN, for example "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy", "…/AmazonEKSAdminPolicy", "…/AmazonEKSEditPolicy", or "…/AmazonEKSViewPolicy". Discover the full list with listAccessPolicies.'
    );

const pagination = () => ({
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Page size, 1-100. Defaults to the API default (100).'),
  nextToken: z
    .string()
    .max(4096)
    .optional()
    .describe(
      'Pagination token returned as nextToken by the previous call. Omit for the first page.'
    ),
});

const kubernetesGroups = () =>
  z
    .array(
      z
        .string()
        .min(1)
        .max(253)
        .regex(/^[^\s]+$/, { message: 'Group names must not contain whitespace' })
    )
    .max(20)
    .describe(
      'Kubernetes group names the principal is mapped to inside the cluster, for example ["system:masters"] or ["viewers"]. RBAC bindings on these groups (or an associated access policy) decide what the principal can do.'
    );

const kubernetesUsername = () =>
  z
    .string()
    .min(1)
    .max(253)
    .regex(/^[^\s]+$/, { message: 'The username must not contain whitespace' })
    .describe(
      'Kubernetes username the principal appears as in audit logs and RBAC. Leave unset to let EKS derive it from the ARN (the default and recommended choice).'
    );

const labelsMap = () =>
  z
    .record(
      z.string().max(253).regex(LABEL_KEY_PATTERN, { message: 'Invalid Kubernetes label key' }),
      z.string().max(63).regex(LABEL_VALUE_PATTERN, { message: 'Invalid Kubernetes label value' })
    )
    .refine((value) => Object.keys(value).length <= 50, {
      message: 'At most 50 labels are allowed per call',
    });

const taint = () =>
  z.object({
    key: z
      .string()
      .min(1)
      .max(63)
      .regex(LABEL_KEY_PATTERN, { message: 'Invalid taint key' })
      .describe('Taint key, for example "dedicated".'),
    value: z
      .string()
      .max(63)
      .regex(LABEL_VALUE_PATTERN, { message: 'Invalid taint value' })
      .optional()
      .describe('Taint value, for example "batch". Optional.'),
    effect: z.enum(['NO_SCHEDULE', 'NO_EXECUTE', 'PREFER_NO_SCHEDULE']).describe('Taint effect.'),
  });

const tagsMap = () =>
  z
    .record(z.string().min(1).max(128), z.string().max(256))
    .refine((value) => Object.keys(value).length <= 50, {
      message: 'At most 50 tags are allowed',
    });

const capacity = (what: string) => z.number().int().min(0).max(100000).describe(what);

// ---------------------------------------------------------------------------
// Discovery and auth bridge
// ---------------------------------------------------------------------------

export const ListClustersInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    ...pagination(),
    includeConnectedClusters: z
      .boolean()
      .optional()
      .describe(
        'true to also list external clusters registered through the EKS Connector. Default false: only EKS-managed clusters.'
      ),
  })
);
export type ListClustersInput = z.infer<typeof ListClustersInputSchema>;

export const GetClusterInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
  })
);
export type GetClusterInput = z.infer<typeof GetClusterInputSchema>;

export const GetTokenInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    includeClusterDetails: z
      .boolean()
      .optional()
      .describe(
        'true (default) to also describe the cluster and return its endpoint and CA certificate alongside the token, so one call yields a complete Kubernetes connector target. false to mint the token only.'
      ),
  })
);
export type GetTokenInput = z.infer<typeof GetTokenInputSchema>;

// ---------------------------------------------------------------------------
// Node groups
// ---------------------------------------------------------------------------

export const ListNodegroupsInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    ...pagination(),
  })
);
export type ListNodegroupsInput = z.infer<typeof ListNodegroupsInputSchema>;

export const DescribeNodegroupInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    nodegroupName: nodegroupName(),
  })
);
export type DescribeNodegroupInput = z.infer<typeof DescribeNodegroupInputSchema>;

export const UpdateNodegroupConfigInputSchema = lazySchema(() =>
  z
    .object({
      region: region(),
      clusterName: clusterName(),
      nodegroupName: nodegroupName(),
      minSize: capacity(
        'Minimum node count the group may scale down to (0 or more). Omit to keep the current value.'
      ).optional(),
      maxSize: capacity(
        'Maximum node count the group may scale up to (1 or more). Omit to keep the current value.'
      ).optional(),
      desiredSize: capacity(
        'Node count to run right now. Must stay within minSize and maxSize. The scale-up/scale-down lever: raise it to absorb load, lower it (down to minSize) to drain capacity.'
      ).optional(),
      labelsToAdd: labelsMap()
        .optional()
        .describe(
          'Kubernetes node labels to add or update on every node in the group, for example {"workload":"batch"}.'
        ),
      labelsToRemove: z
        .array(z.string().max(253).regex(LABEL_KEY_PATTERN, { message: 'Invalid label key' }))
        .max(50)
        .optional()
        .describe('Kubernetes node label keys to remove from the group.'),
      taintsToAdd: z
        .array(taint())
        .max(50)
        .optional()
        .describe('Kubernetes taints to add or update on every node in the group.'),
      taintsToRemove: z
        .array(taint())
        .max(50)
        .optional()
        .describe('Kubernetes taints to remove (key, value, and effect must match).'),
      maxUnavailable: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Rolling-update setting: number of nodes that may be unavailable at once. Mutually exclusive with maxUnavailablePercentage.'
        ),
      maxUnavailablePercentage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Rolling-update setting: percentage of nodes that may be unavailable at once. Mutually exclusive with maxUnavailable.'
        ),
      updateStrategy: z
        .enum(['DEFAULT', 'MINIMAL'])
        .optional()
        .describe(
          'Rolling-update strategy: "DEFAULT" launches replacement nodes before draining, "MINIMAL" keeps extra capacity to a minimum.'
        ),
      nodeRepairEnabled: z
        .boolean()
        .optional()
        .describe('Turn EKS node auto repair for the group on or off.'),
    })
    .refine(
      (v) =>
        [
          v.minSize,
          v.maxSize,
          v.desiredSize,
          v.labelsToAdd,
          v.labelsToRemove,
          v.taintsToAdd,
          v.taintsToRemove,
          v.maxUnavailable,
          v.maxUnavailablePercentage,
          v.updateStrategy,
          v.nodeRepairEnabled,
        ].some((field) => field !== undefined),
      { message: 'Provide at least one field to change' }
    )
    .refine((v) => !(v.maxUnavailable !== undefined && v.maxUnavailablePercentage !== undefined), {
      message: 'Use either maxUnavailable or maxUnavailablePercentage, not both',
    })
    .refine((v) => v.minSize === undefined || v.maxSize === undefined || v.minSize <= v.maxSize, {
      message: 'minSize must not exceed maxSize',
    })
    .refine(
      (v) =>
        v.desiredSize === undefined ||
        ((v.minSize === undefined || v.minSize <= v.desiredSize) &&
          (v.maxSize === undefined || v.desiredSize <= v.maxSize)),
      { message: 'desiredSize must lie within minSize and maxSize' }
    )
);
export type UpdateNodegroupConfigInput = z.infer<typeof UpdateNodegroupConfigInputSchema>;

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

export const DescribeUpdateInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    updateId: updateId(),
    nodegroupName: nodegroupName()
      .optional()
      .describe(
        'Node group the update belongs to. Required for updates started by updateNodegroupConfig; omit for cluster-level updates.'
      ),
  })
);
export type DescribeUpdateInput = z.infer<typeof DescribeUpdateInputSchema>;

export const ListUpdatesInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    nodegroupName: nodegroupName()
      .optional()
      .describe('List updates of this node group instead of cluster-level updates.'),
    ...pagination(),
  })
);
export type ListUpdatesInput = z.infer<typeof ListUpdatesInputSchema>;

// ---------------------------------------------------------------------------
// Cluster configuration
// ---------------------------------------------------------------------------

const LOG_TYPES = ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'] as const;

export const UpdateClusterConfigInputSchema = lazySchema(() =>
  z
    .object({
      region: region(),
      clusterName: clusterName(),
      enableLogTypes: z
        .array(z.enum(LOG_TYPES))
        .max(5)
        .optional()
        .describe(
          'Control-plane log types to ship to CloudWatch Logs: "api", "audit", "authenticator", "controllerManager", "scheduler". Types not listed here or in disableLogTypes keep their current state.'
        ),
      disableLogTypes: z
        .array(z.enum(LOG_TYPES))
        .max(5)
        .optional()
        .describe('Control-plane log types to stop shipping.'),
      authenticationMode: z
        .enum(['API', 'API_AND_CONFIG_MAP', 'CONFIG_MAP'])
        .optional()
        .describe(
          'Cluster authentication mode. Only moves forward: CONFIG_MAP -> API_AND_CONFIG_MAP -> API. Access entries (createAccessEntry) need API or API_AND_CONFIG_MAP; switching to API disables the aws-auth ConfigMap and cannot be undone.'
        ),
      endpointPublicAccess: z
        .boolean()
        .optional()
        .describe('Whether the Kubernetes API server is reachable from the public internet.'),
      endpointPrivateAccess: z
        .boolean()
        .optional()
        .describe('Whether the Kubernetes API server is reachable from inside the VPC.'),
      publicAccessCidrs: z
        .array(
          z
            .string()
            .max(18)
            .regex(CIDR_PATTERN, { message: 'Must be an IPv4 CIDR such as 203.0.113.0/24' })
        )
        .min(1)
        .max(40)
        .optional()
        .describe(
          'IPv4 CIDRs allowed to reach the public API server endpoint. REPLACES the current list; read it from getCluster first and include every range to keep. Requires endpointPublicAccess true.'
        ),
      supportType: z
        .enum(['STANDARD', 'EXTENDED'])
        .optional()
        .describe(
          'Upgrade policy: "EXTENDED" keeps the cluster on a Kubernetes version past standard support (at extra cost), "STANDARD" auto-upgrades when support ends.'
        ),
      deletionProtection: z
        .boolean()
        .optional()
        .describe('Whether the cluster is protected from deletion.'),
    })
    .refine(
      (v) =>
        [
          v.enableLogTypes,
          v.disableLogTypes,
          v.authenticationMode,
          v.endpointPublicAccess,
          v.endpointPrivateAccess,
          v.publicAccessCidrs,
          v.supportType,
          v.deletionProtection,
        ].some((field) => field !== undefined),
      { message: 'Provide at least one field to change' }
    )
    .refine(
      (v) =>
        !v.enableLogTypes ||
        !v.disableLogTypes ||
        !v.enableLogTypes.some((type) => v.disableLogTypes?.includes(type)),
      { message: 'A log type cannot be both enabled and disabled' }
    )
);
export type UpdateClusterConfigInput = z.infer<typeof UpdateClusterConfigInputSchema>;

export const ListTagsForResourceInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    resourceArn: z
      .string()
      .max(512)
      .regex(EKS_RESOURCE_ARN_PATTERN, {
        message:
          'Must be an EKS resource ARN, for example arn:aws:eks:us-east-1:123456789012:cluster/prod',
      })
      .describe(
        'ARN of the EKS cluster or node group, as returned by getCluster ("arn") or describeNodegroup ("nodegroupArn").'
      ),
  })
);
export type ListTagsForResourceInput = z.infer<typeof ListTagsForResourceInputSchema>;

// ---------------------------------------------------------------------------
// Access entries and policies
// ---------------------------------------------------------------------------

export const ListAccessEntriesInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    associatedPolicyArn: policyArn()
      .optional()
      .describe('Only list principals that have this access policy associated.'),
    ...pagination(),
  })
);
export type ListAccessEntriesInput = z.infer<typeof ListAccessEntriesInputSchema>;

export const DescribeAccessEntryInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    principalArn: principalArn(),
  })
);
export type DescribeAccessEntryInput = z.infer<typeof DescribeAccessEntryInputSchema>;

export const CreateAccessEntryInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    principalArn: principalArn(),
    kubernetesGroups: kubernetesGroups().optional(),
    username: kubernetesUsername().optional(),
    type: z
      .enum(['STANDARD', 'EC2_LINUX', 'EC2_WINDOWS', 'FARGATE_LINUX', 'HYBRID_LINUX'])
      .optional()
      .describe(
        'Access entry type. "STANDARD" (default) for humans and automation such as this connector; the EC2/FARGATE/HYBRID types are for node roles and cannot carry kubernetesGroups or policies.'
      ),
    tags: tagsMap()
      .optional()
      .describe('AWS tags for the access entry, e.g. {"managed-by":"kibana"}.'),
  })
);
export type CreateAccessEntryInput = z.infer<typeof CreateAccessEntryInputSchema>;

export const UpdateAccessEntryInputSchema = lazySchema(() =>
  z
    .object({
      region: region(),
      clusterName: clusterName(),
      principalArn: principalArn(),
      kubernetesGroups: kubernetesGroups()
        .optional()
        .describe(
          'Replacement list of Kubernetes groups for the principal. REPLACES the current list; pass [] to remove every group.'
        ),
      username: kubernetesUsername().optional(),
    })
    .refine((v) => v.kubernetesGroups !== undefined || v.username !== undefined, {
      message: 'Provide kubernetesGroups, username, or both',
    })
);
export type UpdateAccessEntryInput = z.infer<typeof UpdateAccessEntryInputSchema>;

export const DeleteAccessEntryInputSchema = DescribeAccessEntryInputSchema;
export type DeleteAccessEntryInput = z.infer<typeof DeleteAccessEntryInputSchema>;

export const AssociateAccessPolicyInputSchema = lazySchema(() =>
  z
    .object({
      region: region(),
      clusterName: clusterName(),
      principalArn: principalArn(),
      policyArn: policyArn(),
      accessScopeType: z
        .enum(['cluster', 'namespace'])
        .describe(
          '"cluster" grants the policy across the whole cluster; "namespace" limits it to the namespaces listed in namespaces.'
        ),
      namespaces: z
        .array(
          z
            .string()
            .max(63)
            .regex(KUBERNETES_NAME_PATTERN, { message: 'Must be a Kubernetes namespace name' })
        )
        .min(1)
        .max(50)
        .optional()
        .describe(
          'Namespaces the policy applies to. Required when accessScopeType is "namespace".'
        ),
    })
    .refine((v) => v.accessScopeType !== 'namespace' || (v.namespaces?.length ?? 0) > 0, {
      message: 'Provide at least one namespace for a namespace-scoped policy',
    })
    .refine((v) => v.accessScopeType !== 'cluster' || v.namespaces === undefined, {
      message: 'namespaces only apply to a namespace-scoped policy',
    })
);
export type AssociateAccessPolicyInput = z.infer<typeof AssociateAccessPolicyInputSchema>;

export const DisassociateAccessPolicyInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    principalArn: principalArn(),
    policyArn: policyArn(),
  })
);
export type DisassociateAccessPolicyInput = z.infer<typeof DisassociateAccessPolicyInputSchema>;

export const ListAssociatedAccessPoliciesInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    clusterName: clusterName(),
    principalArn: principalArn(),
    ...pagination(),
  })
);
export type ListAssociatedAccessPoliciesInput = z.infer<
  typeof ListAssociatedAccessPoliciesInputSchema
>;

export const ListAccessPoliciesInputSchema = lazySchema(() =>
  z.object({
    region: region(),
    ...pagination(),
  })
);
export type ListAccessPoliciesInput = z.infer<typeof ListAccessPoliciesInputSchema>;

// ---------------------------------------------------------------------------
// EKS API response shapes (only the fields the connector reads)
// ---------------------------------------------------------------------------

export interface EksIssue {
  code?: string;
  message?: string;
  resourceIds?: string[];
}

export interface EksCluster {
  name?: string;
  arn?: string;
  createdAt?: string;
  version?: string;
  platformVersion?: string;
  endpoint?: string;
  roleArn?: string;
  status?: string;
  certificateAuthority?: { data?: string };
  resourcesVpcConfig?: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
    clusterSecurityGroupId?: string;
    endpointPublicAccess?: boolean;
    endpointPrivateAccess?: boolean;
    publicAccessCidrs?: string[];
  };
  kubernetesNetworkConfig?: {
    serviceIpv4Cidr?: string;
    serviceIpv6Cidr?: string;
    ipFamily?: string;
  };
  logging?: { clusterLogging?: Array<{ types?: string[]; enabled?: boolean }> };
  accessConfig?: { authenticationMode?: string; bootstrapClusterCreatorAdminPermissions?: boolean };
  upgradePolicy?: { supportType?: string };
  computeConfig?: { enabled?: boolean; nodePools?: string[]; nodeRoleArn?: string };
  deletionProtection?: boolean;
  health?: { issues?: EksIssue[] };
  tags?: Record<string, string>;
}

export interface EksNodegroup {
  nodegroupName?: string;
  nodegroupArn?: string;
  clusterName?: string;
  version?: string;
  releaseVersion?: string;
  createdAt?: string;
  modifiedAt?: string;
  status?: string;
  capacityType?: string;
  scalingConfig?: { minSize?: number; maxSize?: number; desiredSize?: number };
  instanceTypes?: string[];
  subnets?: string[];
  amiType?: string;
  nodeRole?: string;
  labels?: Record<string, string>;
  taints?: Array<{ key?: string; value?: string; effect?: string }>;
  resources?: { autoScalingGroups?: Array<{ name?: string }>; remoteAccessSecurityGroup?: string };
  diskSize?: number;
  health?: { issues?: EksIssue[] };
  updateConfig?: {
    maxUnavailable?: number;
    maxUnavailablePercentage?: number;
    updateStrategy?: string;
  };
  nodeRepairConfig?: { enabled?: boolean };
  launchTemplate?: { name?: string; version?: string; id?: string };
  tags?: Record<string, string>;
}

export interface EksUpdate {
  id?: string;
  status?: string;
  type?: string;
  params?: Array<{ type?: string; value?: string }>;
  createdAt?: string;
  errors?: Array<{ errorCode?: string; errorMessage?: string; resourceIds?: string[] }>;
}

export interface EksAccessEntry {
  clusterName?: string;
  principalArn?: string;
  kubernetesGroups?: string[];
  accessEntryArn?: string;
  createdAt?: string;
  modifiedAt?: string;
  tags?: Record<string, string>;
  username?: string;
  type?: string;
}

export interface EksAssociatedAccessPolicy {
  policyArn?: string;
  accessScope?: { type?: string; namespaces?: string[] };
  associatedAt?: string;
  modifiedAt?: string;
}
