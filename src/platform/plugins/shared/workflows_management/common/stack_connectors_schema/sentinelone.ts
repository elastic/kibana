/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/sentinelone/sentinelone.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// SentinelOne connector parameter schemas for different sub-actions

export const SentinelOneGetAgentsParamsSchema = z.object({
  accountIds: z.string().optional(),
  activeThreats: z.string().optional(),
  adComputerMember: z.string().optional(),
  adComputerName: z.string().optional(),
  adComputerQuery: z.string().optional(),
  adQuery: z.string().optional(),
  adUserMember: z.string().optional(),
  adUserName: z.string().optional(),
  adUserQuery: z.string().optional(),
  agentContentUpdateId: z.string().optional(),
  agentNamespace: z.string().optional(),
  agentPodName: z.string().optional(),
  agentVersions: z.string().optional(),
  agentVersionsNin: z.string().optional(),
  appsVulnerabilityStatuses: z.string().optional(),
  awsRole: z.string().optional(),
  awsSecurityGroups: z.string().optional(),
  awsSubnetIds: z.string().optional(),
  azureResourceGroup: z.string().optional(),
  cloudAccount: z.string().optional(),
  cloudImage: z.string().optional(),
  cloudInstanceId: z.string().optional(),
  cloudInstanceSize: z.string().optional(),
  cloudLocation: z.string().optional(),
  cloudNetwork: z.string().optional(),
  cloudProvider: z.string().optional(),
  cloudProviderNin: z.string().optional(),
  cloudTags: z.string().optional(),
  clusterName: z.string().optional(),
  computerName: z.string().optional(),
  consoleMigrationStatuses: z.string().optional(),
  coreCount: z.string().optional(),
  cpuCount: z.string().optional(),
  cpuId: z.string().optional(),
  createdAt: z.string().optional(),
  csvFilterId: z.string().optional(),
  cursor: z.string().optional(),
  decommissionedAt: z.string().optional(),
  domains: z.string().optional(),
  encryptedApplications: z.string().optional(),
  externalId: z.string().optional(),
  externalIp: z.string().optional(),
  filteredGroupIds: z.string().optional(),
  filteredSiteIds: z.string().optional(),
  filterId: z.string().optional(),
  firewallEnabled: z.string().optional(),
  gatewayIp: z.string().optional(),
  gcpServiceAccount: z.string().optional(),
  groupIds: z.string().optional(),
  hasLocalConfiguration: z.string().optional(),
  hasTags: z.string().optional(),
  ids: z.string().optional(),
  infected: z.string().optional(),
  installerTypes: z.string().optional(),
  isActive: z.string().optional(),
  isDecommissioned: z.string().optional(),
  isPendingUninstall: z.string().optional(),
  isUninstalled: z.string().optional(),
  isUpToDate: z.string().optional(),
  k8sNodeLabels: z.string().optional(),
  k8sNodeName: z.string().optional(),
  k8sType: z.string().optional(),
  k8sVersion: z.string().optional(),
  lastActiveDate: z.string().optional(),
  lastLoggedInUserName: z.string().optional(),
  limit: z.number().optional(),
  locationEnabled: z.string().optional(),
  locationIds: z.string().optional(),
  locationIdsNin: z.string().optional(),
  machineTypes: z.string().optional(),
  machineTypesNin: z.string().optional(),
  migrationStatus: z.string().optional(),
  mitigationMode: z.string().optional(),
  mitigationModeSuspicious: z.string().optional(),
  networkInterfaceGatewayMacAddress: z.string().optional(),
  networkInterfaceInet: z.string().optional(),
  networkInterfacePhysical: z.string().optional(),
  networkQuarantineEnabled: z.string().optional(),
  networkStatuses: z.string().optional(),
  networkStatusesNin: z.string().optional(),
  operationalStates: z.string().optional(),
  operationalStatesNin: z.string().optional(),
  osArch: z.string().optional(),
  osTypes: z.string().optional(),
  osTypesNin: z.string().optional(),
  osVersion: z.string().optional(),
  query: z.string().optional(),
  rangerStatuses: z.string().optional(),
  rangerStatusesNin: z.string().optional(),
  rangerVersions: z.string().optional(),
  rangerVersionsNin: z.string().optional(),
  registeredAt: z.string().optional(),
  remoteProfilingStates: z.string().optional(),
  remoteProfilingStatesNin: z.string().optional(),
  scanAbortedAt: z.string().optional(),
  scanFinishedAt: z.string().optional(),
  scanStartedAt: z.string().optional(),
  scanStatuses: z.string().optional(),
  scanStatusesNin: z.string().optional(),
  serialNumber: z.string().optional(),
  siteIds: z.string().optional(),
  skip: z.number().optional(),
  skipCount: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  tagsData: z.string().optional(),
  threatContentHash: z.string().optional(),
  threatCreatedAt: z.string().optional(),
  threatHidden: z.string().optional(),
  threatMitigationStatus: z.string().optional(),
  threatRebootRequired: z.string().optional(),
  threatResolved: z.string().optional(),
  totalMemory: z.string().optional(),
  updatedAt: z.string().optional(),
  userActionsNeeded: z.string().optional(),
  userActionsNeededNin: z.string().optional(),
  uuid: z.string().optional(),
  uuids: z.string().optional(),
});

export const SentinelOneIsolateHostParamsSchema = SentinelOneGetAgentsParamsSchema;

export const SentinelOneReleaseHostParamsSchema = SentinelOneGetAgentsParamsSchema;

export const SentinelOneGetRemoteScriptsParamsSchema = z.object({
  accountIds: z.string().optional(),
  cursor: z.string().optional(),
  groupIds: z.string().optional(),
  ids: z.string().optional(),
  isAvailableForArs: z.boolean().optional(),
  limit: z.number().optional(),
  osTypes: z.string().optional(),
  query: z.string().optional(),
  scriptType: z.string().optional(),
  siteIds: z.string().optional(),
  skip: z.number().optional(),
  skipCount: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const SentinelOneFetchAgentFilesParamsSchema = z.object({
  agentId: z.string(),
  files: z.array(z.string()),
  zipPassCode: z.string().optional(),
});

export const SentinelOneDownloadAgentFileParamsSchema = z.object({
  agentId: z.string(),
  activityId: z.string(),
});

export const SentinelOneGetActivitiesParamsSchema = z.object({
  accountIds: z.string().optional(),
  activityTypes: z.string().optional(),
  activityUuids: z.string().optional(),
  agentIds: z.string().optional(),
  countOnly: z.boolean().optional(),
  createdAt: z.string().optional(),
  cursor: z.string().optional(),
  groupIds: z.string().optional(),
  ids: z.string().optional(),
  includeHidden: z.boolean().optional(),
  limit: z.number().optional(),
  siteIds: z.string().optional(),
  skip: z.number().optional(),
  skipCount: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  threatIds: z.string().optional(),
  userEmails: z.string().optional(),
  userIds: z.string().optional(),
});

export const SentinelOneExecuteScriptParamsSchema = z.object({
  filter: z.object({
    ids: z.array(z.string()).optional(),
    groupIds: z.array(z.string()).optional(),
    siteIds: z.array(z.string()).optional(),
    accountIds: z.array(z.string()).optional(),
  }),
  scriptId: z.string(),
  outputDestination: z.enum(['SentinelCloud', 'Local', 'None']).optional(),
  outputDirectory: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  scriptRuntimeTimeoutSeconds: z.number().optional(),
  singularityCloudUserId: z.string().optional(),
  taskDescription: z.string().optional(),
});

export const SentinelOneGetRemoteScriptStatusParamsSchema = z.object({
  parentTaskId: z.string(),
});

export const SentinelOneGetRemoteScriptResultsParamsSchema = z.object({
  parentTaskId: z.string(),
});

export const SentinelOneDownloadRemoteScriptResultsParamsSchema = z.object({
  taskId: z.string(),
});

// SentinelOne connector response schemas

export const SentinelOneGetAgentsResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z
    .object({
      nextCursor: z.string().optional(),
      totalItems: z.number().optional(),
    })
    .optional(),
});

export const SentinelOneIsolateHostResponseSchema = z.object({
  data: z.object({
    affected: z.number(),
  }),
});

export const SentinelOneReleaseHostResponseSchema = SentinelOneIsolateHostResponseSchema;

export const SentinelOneGetRemoteScriptsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      scriptName: z.string(),
      osType: z.string().optional(),
      scriptType: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  pagination: z
    .object({
      nextCursor: z.string().optional(),
      totalItems: z.number().optional(),
    })
    .optional(),
});

export const SentinelOneFetchAgentFilesResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
  errors: z.array(z.any()).nullable(),
});

export const SentinelOneDownloadAgentFileResponseSchema = z.any();

export const SentinelOneGetActivitiesResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z
    .object({
      nextCursor: z.string().optional(),
      totalItems: z.number().optional(),
    })
    .optional(),
});

export const SentinelOneExecuteScriptResponseSchema = z.object({
  data: z.object({
    parentTaskId: z.string(),
    affected: z.number(),
  }),
});

export const SentinelOneGetRemoteScriptStatusResponseSchema = z.object({
  data: z.array(
    z.object({
      taskId: z.string(),
      status: z.string(),
    })
  ),
});

export const SentinelOneGetRemoteScriptResultsResponseSchema = z.object({
  data: z.object({
    download_links: z.array(z.string()),
  }),
});

export const SentinelOneDownloadRemoteScriptResultsResponseSchema = z.any();
