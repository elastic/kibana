/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// listSubscriptions
// =============================================================================

export const ListSubscriptionsInputSchema = lazySchema(() => z.object({}));
export type ListSubscriptionsInput = z.infer<typeof ListSubscriptionsInputSchema>;

// =============================================================================
// listResourceGroups
// =============================================================================

export const ListResourceGroupsInputSchema = lazySchema(() => z.object({}));
export type ListResourceGroupsInput = z.infer<typeof ListResourceGroupsInputSchema>;

// =============================================================================
// listClusters
// =============================================================================

export const ListClustersInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z
      .string()
      .max(90)
      .optional()
      .describe(
        'Limit results to a single resource group. Omit to list all clusters in the subscription.'
      ),
  })
);
export type ListClustersInput = z.infer<typeof ListClustersInputSchema>;

// =============================================================================
// getCluster
// =============================================================================

export const GetClusterInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z.string().min(1).max(90).describe('Resource group containing the cluster.'),
    clusterName: z.string().min(1).max(63).describe('Name of the AKS managed cluster.'),
  })
);
export type GetClusterInput = z.infer<typeof GetClusterInputSchema>;

// =============================================================================
// listNodePools
// =============================================================================

export const ListNodePoolsInputSchema = GetClusterInputSchema;
export type ListNodePoolsInput = GetClusterInput;

// =============================================================================
// getNodePool
// =============================================================================

export const GetNodePoolInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z.string().min(1).max(90).describe('Resource group containing the cluster.'),
    clusterName: z.string().min(1).max(63).describe('Name of the AKS managed cluster.'),
    nodePoolName: z.string().min(1).max(12).describe('Name of the agent pool.'),
  })
);
export type GetNodePoolInput = z.infer<typeof GetNodePoolInputSchema>;

// =============================================================================
// scaleNodePool
// =============================================================================

export const ScaleNodePoolInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z.string().min(1).max(90).describe('Resource group containing the cluster.'),
    clusterName: z.string().min(1).max(63).describe('Name of the AKS managed cluster.'),
    nodePoolName: z.string().min(1).max(12).describe('Name of the agent pool to scale.'),
    count: z
      .number()
      .int()
      .min(0)
      .max(1000)
      .describe(
        'Desired node count for the pool (0 to stop all nodes, up to 1000). Applies immediately as a manual scale operation.'
      ),
  })
);
export type ScaleNodePoolInput = z.infer<typeof ScaleNodePoolInputSchema>;

// =============================================================================
// stopCluster / startCluster
// =============================================================================

export const StopClusterInputSchema = GetClusterInputSchema;
export type StopClusterInput = GetClusterInput;

export const StartClusterInputSchema = GetClusterInputSchema;
export type StartClusterInput = GetClusterInput;

// =============================================================================
// getClusterCredentials
// =============================================================================

export const GetClusterCredentialsInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z.string().min(1).max(90).describe('Resource group containing the cluster.'),
    clusterName: z.string().min(1).max(63).describe('Name of the AKS managed cluster.'),
    format: z
      .enum(['exec', 'azure'])
      .optional()
      .default('azure')
      .describe(
        '"azure" (default) returns an AKS-specific kubeconfig; "exec" returns credentials using the exec auth plugin format.'
      ),
  })
);
export type GetClusterCredentialsInput = z.infer<typeof GetClusterCredentialsInputSchema>;

// =============================================================================
// runCommand
// =============================================================================

export const RunCommandInputSchema = lazySchema(() =>
  z.object({
    resourceGroupName: z.string().min(1).max(90).describe('Resource group containing the cluster.'),
    clusterName: z.string().min(1).max(63).describe('Name of the AKS managed cluster.'),
    command: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Shell command to execute inside the cluster via a temporary privileged pod (e.g. "kubectl get pods -A" or "helm list -A"). Requires the "run-command" RBAC permission on the cluster.'
      ),
  })
);
export type RunCommandInput = z.infer<typeof RunCommandInputSchema>;
