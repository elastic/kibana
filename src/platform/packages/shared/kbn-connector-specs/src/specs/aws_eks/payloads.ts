/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EksCluster,
  EksNodegroup,
  UpdateClusterAccessConfigInput,
  UpdateClusterConfigInput,
  UpdateNodegroupConfigInput,
} from './types';

/*
 * EKS takes `scalingConfig`, `updateConfig`, `nodeRepairConfig` and `resourcesVpcConfig` as whole
 * sub-objects. The builders below fill every field the input leaves unset from the current
 * resource, so changing one field never resets its siblings to their defaults.
 */

const withoutUndefined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;

/** True when the node group update touches a sub-object that must be merged with current state. */
export const nodegroupUpdateNeedsCurrent = (input: UpdateNodegroupConfigInput): boolean =>
  [
    input.minSize,
    input.maxSize,
    input.desiredSize,
    input.maxUnavailable,
    input.maxUnavailablePercentage,
    input.updateStrategy,
    input.nodeRepairEnabled,
  ].some((field) => field !== undefined);

const mergeScalingConfig = (input: UpdateNodegroupConfigInput, current: EksNodegroup) => {
  if (
    input.minSize === undefined &&
    input.maxSize === undefined &&
    input.desiredSize === undefined
  ) {
    return undefined;
  }
  const minSize = input.minSize ?? current.scalingConfig?.minSize;
  const maxSize = input.maxSize ?? current.scalingConfig?.maxSize;
  const desiredSize = input.desiredSize ?? current.scalingConfig?.desiredSize;
  if (minSize !== undefined && maxSize !== undefined && minSize > maxSize) {
    throw new Error(
      `The resulting scaling config is invalid: minSize ${minSize} exceeds maxSize ${maxSize}. Change both in the same call.`
    );
  }
  if (
    desiredSize !== undefined &&
    ((minSize !== undefined && desiredSize < minSize) ||
      (maxSize !== undefined && desiredSize > maxSize))
  ) {
    throw new Error(
      `The resulting scaling config is invalid: desiredSize ${desiredSize} is outside minSize ${minSize} and maxSize ${maxSize}. Widen the bounds in the same call.`
    );
  }
  return withoutUndefined({ minSize, maxSize, desiredSize });
};

const mergeUpdateConfig = (input: UpdateNodegroupConfigInput, current: EksNodegroup) => {
  if (
    input.maxUnavailable === undefined &&
    input.maxUnavailablePercentage === undefined &&
    input.updateStrategy === undefined
  ) {
    return undefined;
  }
  const existing = current.updateConfig ?? {};
  // maxUnavailable and maxUnavailablePercentage are mutually exclusive: a new one replaces either.
  const limit =
    input.maxUnavailable !== undefined
      ? { maxUnavailable: input.maxUnavailable }
      : input.maxUnavailablePercentage !== undefined
      ? { maxUnavailablePercentage: input.maxUnavailablePercentage }
      : withoutUndefined({
          maxUnavailable: existing.maxUnavailable,
          maxUnavailablePercentage:
            existing.maxUnavailable === undefined ? existing.maxUnavailablePercentage : undefined,
        });
  return withoutUndefined({
    ...limit,
    updateStrategy: input.updateStrategy ?? existing.updateStrategy,
  });
};

/** Builds the `UpdateNodegroupConfig` body, merged with the node group's current settings. */
export const buildNodegroupUpdateBody = (
  input: UpdateNodegroupConfigInput,
  current: EksNodegroup = {}
) => ({
  scalingConfig: mergeScalingConfig(input, current),
  labels:
    input.labelsToAdd || input.labelsToRemove
      ? { addOrUpdateLabels: input.labelsToAdd, removeLabels: input.labelsToRemove }
      : undefined,
  taints:
    input.taintsToAdd || input.taintsToRemove
      ? { addOrUpdateTaints: input.taintsToAdd, removeTaints: input.taintsToRemove }
      : undefined,
  updateConfig: mergeUpdateConfig(input, current),
  nodeRepairConfig:
    input.nodeRepairEnabled !== undefined
      ? { ...current.nodeRepairConfig, enabled: input.nodeRepairEnabled }
      : undefined,
});

/** True when the cluster access update touches the VPC endpoint settings, which EKS takes whole. */
export const clusterAccessUpdateNeedsCurrent = (input: UpdateClusterAccessConfigInput): boolean =>
  input.endpointPublicAccess !== undefined ||
  input.endpointPrivateAccess !== undefined ||
  input.publicAccessCidrs !== undefined;

const mergeVpcConfig = (input: UpdateClusterAccessConfigInput, current: EksCluster) => {
  if (!clusterAccessUpdateNeedsCurrent(input)) {
    return undefined;
  }
  const existing = current.resourcesVpcConfig ?? {};
  const endpointPublicAccess = input.endpointPublicAccess ?? existing.endpointPublicAccess;
  return withoutUndefined({
    endpointPublicAccess,
    endpointPrivateAccess: input.endpointPrivateAccess ?? existing.endpointPrivateAccess,
    // The allowlist only applies to a public endpoint; re-send the current one to keep it.
    publicAccessCidrs:
      input.publicAccessCidrs ??
      (endpointPublicAccess === true ? existing.publicAccessCidrs : undefined),
  });
};

/** Builds the `UpdateClusterConfig` body for logging, upgrade policy, or deletion protection. */
export const buildClusterUpdateBody = (input: UpdateClusterConfigInput) => {
  const clusterLogging = [
    ...(input.enableLogTypes?.length ? [{ types: input.enableLogTypes, enabled: true }] : []),
    ...(input.disableLogTypes?.length ? [{ types: input.disableLogTypes, enabled: false }] : []),
  ];
  return {
    logging: clusterLogging.length ? { clusterLogging } : undefined,
    upgradePolicy: input.supportType ? { supportType: input.supportType } : undefined,
    deletionProtection: input.deletionProtection,
  };
};

/**
 * Builds the `UpdateClusterConfig` body for the authentication mode or endpoint access, merged
 * with the cluster's current endpoint settings.
 */
export const buildClusterAccessUpdateBody = (
  input: UpdateClusterAccessConfigInput,
  current: EksCluster = {}
) => ({
  accessConfig: input.authenticationMode
    ? { authenticationMode: input.authenticationMode }
    : undefined,
  resourcesVpcConfig: mergeVpcConfig(input, current),
});
