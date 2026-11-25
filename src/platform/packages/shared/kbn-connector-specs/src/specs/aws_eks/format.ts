/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EksAccessEntry,
  EksAssociatedAccessPolicy,
  EksCluster,
  EksIssue,
  EksNodegroup,
  EksUpdate,
} from './types';

/** EKS returns the CA base64-encoded; the Kubernetes connector wants PEM. */
export const decodeCaCertificate = (encoded?: string): string | undefined => {
  if (!encoded) return undefined;
  try {
    return atob(encoded);
  } catch {
    return undefined;
  }
};

const trimIssues = (issues?: EksIssue[]) =>
  (issues ?? []).map((issue) => ({
    code: issue.code,
    message: issue.message,
    resourceIds: issue.resourceIds ?? [],
  }));

/**
 * Everything the core Kubernetes connector needs to target this cluster. Absent for a cluster
 * without an API server endpoint, such as one registered through the EKS Connector.
 */
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

export const trimCluster = (region: string, cluster: EksCluster) => {
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

export const trimNodegroup = (nodegroup: EksNodegroup) => ({
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
 * Every mutation returns an Update. `done` and `succeeded` are derived so a caller can branch
 * without knowing the status vocabulary (InProgress, Successful, Failed, Cancelled).
 */
export const trimUpdate = (update: EksUpdate) => ({
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

export const trimAccessEntry = (entry: EksAccessEntry) => ({
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

export const trimAssociatedPolicy = (policy: EksAssociatedAccessPolicy) => ({
  policyArn: policy.policyArn,
  policyName: policy.policyArn?.split('/').pop(),
  accessScope: {
    type: policy.accessScope?.type,
    namespaces: policy.accessScope?.namespaces ?? [],
  },
  associatedAt: policy.associatedAt,
  modifiedAt: policy.modifiedAt,
});
