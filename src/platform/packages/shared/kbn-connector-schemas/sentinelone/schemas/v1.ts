/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable @typescript-eslint/naming-convention */
import { z } from '@kbn/zod';
import { SUB_ACTION } from '../constants';

// Connector schema
export const SentinelOneConfigSchema = z.object({ url: z.string() }).strict();
export const SentinelOneSecretsSchema = z
  .object({
    token: z.string(),
  })
  .strict();

export const SentinelOneApiDoNotValidateResponsesSchema = z.any();

export const SentinelOneBaseApiResponseSchema = z.object({}).passthrough().optional();

export const SentinelOneGetAgentsResponseSchema = z
  .object({
    pagination: z
      .object({
        totalItems: z.coerce.number(),
        nextCursor: z.string().nullable().default(null),
      })
      .strict(),
    errors: z.array(z.string()).nullable().default(null),
    data: z.array(
      z
        .object({
          modelName: z.string(),
          firewallEnabled: z.boolean(),
          totalMemory: z.coerce.number(),
          osName: z.string(),
          cloudProviders: z.record(z.string(), z.any()),
          siteName: z.string(),
          cpuId: z.string(),
          isPendingUninstall: z.boolean(),
          isUpToDate: z.boolean(),
          osArch: z.string(),
          accountId: z.string(),
          locationEnabled: z.boolean(),
          consoleMigrationStatus: z.string(),
          scanFinishedAt: z.string().nullable().default(null),
          operationalStateExpiration: z.string().nullable().default(null),
          agentVersion: z.string(),
          isActive: z.boolean(),
          locationType: z.string(),
          activeThreats: z.coerce.number(),
          inRemoteShellSession: z.boolean(),
          allowRemoteShell: z.boolean(),
          serialNumber: z.string().nullable().default(null),
          updatedAt: z.string(),
          lastActiveDate: z.string(),
          firstFullModeTime: z.string().nullable().default(null),
          operationalState: z.string(),
          externalId: z.string(),
          mitigationModeSuspicious: z.string(),
          licenseKey: z.string(),
          cpuCount: z.coerce.number(),
          mitigationMode: z.string(),
          networkStatus: z.string(),
          installerType: z.string(),
          uuid: z.string(),
          detectionState: z.string().nullable().default(null),
          infected: z.boolean(),
          registeredAt: z.string(),
          lastIpToMgmt: z.string(),
          storageName: z.string().nullable().default(null),
          osUsername: z.string().nullable().default(null),
          groupIp: z.string(),
          createdAt: z.string(),
          remoteProfilingState: z.string(),
          groupUpdatedAt: z.string().nullable().default(null),
          scanAbortedAt: z.string().nullable().default(null),
          isUninstalled: z.boolean(),
          networkQuarantineEnabled: z.boolean(),
          tags: z
            .object({
              sentinelone: z.array(
                z
                  .object({
                    assignedBy: z.string(),
                    assignedAt: z.string(),
                    assignedById: z.string(),
                    key: z.string(),
                    value: z.string(),
                    id: z.string(),
                  })
                  .strict()
              ),
            })
            .strict(),
          externalIp: z.string(),
          siteId: z.string(),
          machineType: z.string(),
          domain: z.string(),
          scanStatus: z.string(),
          osStartTime: z.string(),
          accountName: z.string(),
          lastLoggedInUserName: z.string(),
          showAlertIcon: z.boolean(),
          rangerStatus: z.string(),
          groupName: z.string(),
          threatRebootRequired: z.boolean(),
          remoteProfilingStateExpiration: z.string().nullable().default(null),
          policyUpdatedAt: z.string().nullable().default(null),
          activeDirectory: z
            .object({
              userPrincipalName: z.string().nullable().default(null),
              lastUserDistinguishedName: z.string().nullable().default(null),
              computerMemberOf: z.array(z.object({ type: z.string() }).passthrough()),
              lastUserMemberOf: z.array(z.object({ type: z.string() }).passthrough()),
              mail: z.string().nullable().default(null),
              computerDistinguishedName: z.string().nullable().default(null),
            })
            .passthrough(),
          isDecommissioned: z.boolean(),
          rangerVersion: z.string(),
          userActionsNeeded: z.array(
            z
              .object({
                type: z.string(),
                example: z.string(),
                enum: z.array(z.string()),
              })
              .passthrough()
          ),
          locations: z
            .array(z.object({ name: z.string(), scope: z.string(), id: z.string() }).passthrough())
            .nullable()
            .default(null),
          id: z.string(),
          coreCount: z.coerce.number(),
          osRevision: z.string(),
          osType: z.string(),
          groupId: z.string(),
          computerName: z.string(),
          scanStartedAt: z.string(),
          encryptedApplications: z.boolean(),
          storageType: z.string().nullable().default(null),
          networkInterfaces: z.array(
            z
              .object({
                gatewayMacAddress: z.string().nullable().default(null),
                inet6: z.array(z.string()),
                name: z.string(),
                inet: z.array(z.string()),
                physical: z.string(),
                gatewayIp: z.string().nullable().default(null),
                id: z.string(),
              })
              .passthrough()
          ),
          fullDiskScanLastUpdatedAt: z.string(),
          appsVulnerabilityStatus: z.string(),
        })
        .passthrough()
    ),
  })
  .passthrough();

export const SentinelOneIsolateHostResponseSchema = z
  .object({
    errors: z.array(z.string()).nullable().default(null),
    data: z.object({ affected: z.coerce.number() }).passthrough(),
  })
  .strict();

export const SentinelOneGetRemoteScriptsParamsSchema = z
  .object({
    query: z.string().nullable().default(null),
    // Possible values (multiples comma delimiter): `linux` or `macos` or `windows`
    osTypes: z.string().nullable().default(null),
    // possible values (multiples comma delimiter): `action` or `artifactCollection` or `dataCollection`
    scriptType: z.string().nullable().default(null),
    // Cursor position returned by the last request. Use to iterate over more than 1000 items. Example: "YWdlbnRfaWQ6NTgwMjkzODE=".
    cursor: z.string().nullable().default(null),
    // List of group IDs to filter by. Example: "225494730938493804,225494730938493915".
    groupIds: z.string().nullable().default(null),
    // A list of script IDs. Example: "225494730938493804,225494730938493915".
    ids: z.string().nullable().default(null),
    // Is the script runnable in Advanced Response Scripts
    isAvailableForArs: z.boolean().nullable().default(null),
    // Limit number of returned items (1-1000). Example: "10".
    limit: z.coerce.number().max(1000).min(1).default(10).nullable().default(null),
    // List of Site IDs to filter by. Example: "225494730938493804,225494730938493915".
    siteIds: z.string().nullable().default(null),
    // Skip first number of items (0-1000). To iterate over more than 1000 items, use "cursor". Example: "150".
    skip: z.coerce.number().nullable().default(null),
    // If true, total number of items will not be calculated, which speeds up execution time.
    skipCount: z.boolean().nullable().default(null),
    // The column to sort the results by. Example: "id".
    sortBy: z.string().nullable().default(null),
    // Sort direction. Example: "asc" or "desc"
    sortOrder: z.string().nullable().default(null),
  })
  .strict();

export const SentinelOneFetchAgentFilesParamsSchema = z
  .object({
    agentId: z.string().min(1),
    zipPassCode: z.string().min(10),
    files: z.array(z.string().min(1)),
  })
  .strict();

export const SentinelOneFetchAgentFilesResponseSchema = z
  .object({
    errors: z.array(z.string()).nullable().default(null),
    data: z
      .object({
        success: z.boolean(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const SentinelOneDownloadAgentFileParamsSchema = z
  .object({
    agentId: z.string().min(1),
    activityId: z.string().min(1),
  })
  .strict();

export const SentinelOneDownloadAgentFileResponseSchema = z.any();

export const SentinelOneGetActivitiesParamsSchema = z
  .object({
    accountIds: z.string().min(1).optional(),
    activityTypes: z.string().optional(),
    activityUuids: z.string().min(1).optional(),
    agentIds: z.string().min(1).optional(),
    alertIds: z.string().min(1).optional(),
    countOnly: z.boolean().optional(),
    createdAt__between: z.string().min(1).optional(),
    createdAt__gt: z.string().min(1).optional(),
    createdAt__gte: z.string().min(1).optional(),
    createdAt__lt: z.string().min(1).optional(),
    createdAt__lte: z.string().min(1).optional(),
    cursor: z.string().min(1).optional(),
    groupIds: z.string().min(1).optional(),
    ids: z.string().min(1).optional(),
    includeHidden: z.boolean().optional(),
    limit: z.coerce.number().optional(),
    ruleIds: z.string().min(1).optional(),
    siteIds: z.string().min(1).optional(),
    skip: z.coerce.number().optional(),
    skipCount: z.boolean().optional(),
    sortBy: z.string().min(1).optional(),
    sortOrder: z.string().min(1).optional(),
    threatIds: z.string().min(1).optional(),
    userEmails: z.string().min(1).optional(),
    userIds: z.string().min(1).optional(),
  })
  .strict()
  .optional();

export const SentinelOneGetActivitiesResponseDataSchema = z
  .object({
    accountId: z.string(),
    accountName: z.string(),
    activityType: z.coerce.number(),
    activityUuid: z.string(),
    agentId: z.string().nullable().default(null),
    agentUpdatedVersion: z.string().nullable().default(null),
    comments: z.string().nullable().default(null),
    createdAt: z.string(),
    data: z
      .object({
        // Empty by design.
        // The SentinelOne Activity Log can place any (unknown) data here
      })
      .passthrough(),
    description: z.string().nullable().default(null),
    groupId: z.string().nullable().default(null),
    groupName: z.string().nullable().default(null),
    hash: z.string().nullable().default(null),
    id: z.string(),
    osFamily: z.string().nullable().default(null),
    primaryDescription: z.string().nullable().default(null),
    secondaryDescription: z.string().nullable().default(null),
    siteId: z.string(),
    siteName: z.string(),
    threatId: z.string().nullable().default(null),
    updatedAt: z.string(),
    userId: z.string().nullable().default(null),
  })
  .passthrough();

export const SentinelOneGetActivitiesResponseNoDataSchema =
  SentinelOneGetActivitiesResponseDataSchema.omit({ data: true });

export const SentinelOneGetActivitiesResponseSchema = z
  .object({
    errors: z.array(z.string()).optional(),
    pagination: z
      .object({
        nextCursor: z.string().nullable().default(null),
        totalItems: z.coerce.number(),
      })
      .strict(),
    data: z.array(SentinelOneGetActivitiesResponseDataSchema),
  })
  .passthrough();

export const AlertIds = z.array(z.string()).optional();

export const SentinelOneGetRemoteScriptsResponseSchema = z
  .object({
    errors: z.array(z.string()).nullable().default(null),
    pagination: z
      .object({
        nextCursor: z.string().nullable().default(null),
        totalItems: z.coerce.number(),
      })
      .strict(),
    data: z.array(
      z
        .object({
          id: z.string(),
          updater: z.string().nullable().default(null),
          isAvailableForLite: z.boolean(),
          isAvailableForArs: z.boolean(),
          fileSize: z.coerce.number(),
          mgmtId: z.coerce.number(),
          scopeLevel: z.string(),
          shortFileName: z.string(),
          scriptName: z.string(),
          creator: z.string(),
          package: z
            .object({
              id: z.string(),
              bucketName: z.string(),
              endpointExpiration: z.string(),
              fileName: z.string(),
              endpointExpirationSeconds: z.coerce.number().nullable().default(null),
              fileSize: z.coerce.number(),
              signatureType: z.string(),
              signature: z.string(),
            })
            .passthrough()
            .nullable()
            .default(null),
          bucketName: z.string(),
          inputRequired: z.boolean(),
          fileName: z.string(),
          supportedDestinations: z.array(z.string()).nullable().default(null),
          scopeName: z.string().nullable().default(null),
          signatureType: z.string(),
          outputFilePaths: z.array(z.string()).nullable().default(null),
          scriptDescription: z.string().nullable().default(null),
          createdByUserId: z.string(),
          scopeId: z.string(),
          updatedAt: z.string(),
          scriptType: z.string(),
          scopePath: z.string(),
          creatorId: z.string(),
          osTypes: z.array(z.string()),
          scriptRuntimeTimeoutSeconds: z.coerce.number(),
          version: z.string(),
          updaterId: z.string().nullable().default(null),
          createdAt: z.string(),
          inputExample: z.string().nullable().default(null),
          inputInstructions: z.string().nullable().default(null),
          signature: z.string(),
          createdByUser: z.string(),
          requiresApproval: z.boolean().optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();

export const SentinelOneExecuteScriptParamsSchema = z
  .object({
    // Only a sub-set of filters are defined below. This API, however, support many more filters
    // which can be added in the future if needed.
    filter: z
      .object({
        uuids: z.string().min(1).optional(),
        ids: z.string().min(1).optional(),
      })
      .strict(),
    script: z
      .object({
        apiKey: z.string().optional(),
        inputParams: z.string().optional(),
        outputDirectory: z.string().optional(),
        outputDestination: z.enum(['Local', 'None', 'SentinelCloud', 'SingularityXDR']).optional(),
        passwordFromScope: z
          .object({
            scopeLevel: z.string().optional(),
            scopeId: z.string().optional(),
          })
          .strict()
          .optional(),
        password: z.string().optional(),
        requiresApproval: z.boolean().optional(),
        scriptId: z.string(),
        scriptName: z.string().optional(),
        scriptRuntimeTimeoutSeconds: z.coerce.number().optional(),
        singularityxdrKeyword: z.string().optional(),
        singularityxdrUrl: z.string().optional(),
        taskDescription: z.string().optional(),
      })
      .strict(),
    alertIds: AlertIds,
  })
  .strict();

export const SentinelOneExecuteScriptResponseSchema = z
  .object({
    errors: z.array(z.object({}).passthrough()).nullable().default(null),
    data: z
      .object({
        pendingExecutionId: z.string().nullable().default(null),
        affected: z.coerce.number().nullable().default(null),
        parentTaskId: z.string().nullable().default(null),
        pending: z.boolean().nullable().default(null),
      })
      .passthrough()
      .nullable()
      .default(null),
  })
  .passthrough();

export const SentinelOneGetRemoteScriptResultsParamsSchema = z
  .object({
    taskIds: z.array(z.string()),
  })
  .strict();

export const SentinelOneGetRemoteScriptResultsResponseSchema = z
  .object({
    errors: z
      .array(z.object({ type: z.string() }).passthrough())
      .nullable()
      .default(null),
    data: z.any(),
  })
  .passthrough();

export const SentinelOneDownloadRemoteScriptResultsParamsSchema = z
  .object({
    taskId: z.string().min(1),
  })
  .strict();

export const SentinelOneDownloadRemoteScriptResultsResponseSchema = z.any();

export const SentinelOneGetRemoteScriptStatusParamsSchema = z
  .object({
    parentTaskId: z.string(),
  })
  .passthrough();

export const SentinelOneGetRemoteScriptStatusResponseSchema = z
  .object({
    pagination: z
      .object({
        totalItems: z.coerce.number(),
        nextCursor: z.string().nullable().default(null),
      })
      .strict(),
    errors: z
      .array(z.object({ type: z.string() }).passthrough())
      .nullable()
      .default(null),
    data: z.array(z.map(z.string(), z.any())),
  })
  .passthrough();

export const SentinelOneBaseFilterSchema = z
  .object({
    K8SNodeName__contains: z.string().nullable().default(null),
    coreCount__lt: z.string().nullable().default(null),
    rangerStatuses: z.string().nullable().default(null),
    adUserQuery__contains: z.string().nullable().default(null),
    rangerVersionsNin: z.string().nullable().default(null),
    rangerStatusesNin: z.string().nullable().default(null),
    coreCount__gte: z.string().nullable().default(null),
    threatCreatedAt__gte: z.string().nullable().default(null),
    decommissionedAt__lte: z.string().nullable().default(null),
    operationalStatesNin: z.string().nullable().default(null),
    appsVulnerabilityStatusesNin: z.string().nullable().default(null),
    mitigationMode: z.string().nullable().default(null),
    createdAt__gte: z.string().nullable().default(null),
    gatewayIp: z.string().nullable().default(null),
    cloudImage__contains: z.string().nullable().default(null),
    registeredAt__between: z.string().nullable().default(null),
    threatMitigationStatus: z.string().nullable().default(null),
    installerTypesNin: z.string().nullable().default(null),
    appsVulnerabilityStatuses: z.string().nullable().default(null),
    threatResolved: z.string().nullable().default(null),
    mitigationModeSuspicious: z.string().nullable().default(null),
    isUpToDate: z.string().nullable().default(null),
    adComputerQuery__contains: z.string().nullable().default(null),
    updatedAt__gte: z.string().nullable().default(null),
    azureResourceGroup__contains: z.string().nullable().default(null),
    scanStatus: z.string().nullable().default(null),
    threatContentHash: z.string().nullable().default(null),
    osTypesNin: z.string().nullable().default(null),
    threatRebootRequired: z.string().nullable().default(null),
    totalMemory__between: z.string().nullable().default(null),
    firewallEnabled: z.string().nullable().default(null),
    gcpServiceAccount__contains: z.string().nullable().default(null),
    updatedAt__gt: z.string().nullable().default(null),
    remoteProfilingStates: z.string().nullable().default(null),
    filteredGroupIds: z.string().nullable().default(null),
    agentVersions: z.string().nullable().default(null),
    activeThreats: z.string().nullable().default(null),
    machineTypesNin: z.string().nullable().default(null),
    lastActiveDate__gt: z.string().nullable().default(null),
    awsSubnetIds__contains: z.string().nullable().default(null),
    installerTypes: z.string().nullable().default(null),
    registeredAt__gte: z.string().nullable().default(null),
    migrationStatus: z.string().nullable().default(null),
    cloudTags__contains: z.string().nullable().default(null),
    totalMemory__gte: z.string().nullable().default(null),
    decommissionedAt__lt: z.string().nullable().default(null),
    threatCreatedAt__lt: z.string().nullable().default(null),
    updatedAt__lte: z.string().nullable().default(null),
    osArch: z.string().nullable().default(null),
    registeredAt__gt: z.string().nullable().default(null),
    registeredAt__lt: z.string().nullable().default(null),
    siteIds: z.string().nullable().default(null),
    networkInterfaceInet__contains: z.string().nullable().default(null),
    groupIds: z.string().nullable().default(null),
    uuids: z.string().nullable().default(null),
    accountIds: z.string().nullable().default(null),
    scanStatusesNin: z.string().nullable().default(null),
    cpuCount__lte: z.string().nullable().default(null),
    locationIds: z.string().nullable().default(null),
    awsSecurityGroups__contains: z.string().nullable().default(null),
    networkStatusesNin: z.string().nullable().default(null),
    activeThreats__gt: z.string().nullable().default(null),
    infected: z.string().nullable().default(null),
    osVersion__contains: z.string().nullable().default(null),
    machineTypes: z.string().nullable().default(null),
    agentPodName__contains: z.string().nullable().default(null),
    computerName__like: z.string().nullable().default(null),
    threatCreatedAt__gt: z.string().nullable().default(null),
    consoleMigrationStatusesNin: z.string().nullable().default(null),
    computerName: z.string().nullable().default(null),
    decommissionedAt__between: z.string().nullable().default(null),
    cloudInstanceId__contains: z.string().nullable().default(null),
    createdAt__lte: z.string().nullable().default(null),
    coreCount__between: z.string().nullable().default(null),
    totalMemory__lte: z.string().nullable().default(null),
    remoteProfilingStatesNin: z.string().nullable().default(null),
    adComputerMember__contains: z.string().nullable().default(null),
    threatCreatedAt__between: z.string().nullable().default(null),
    totalMemory__gt: z.string().nullable().default(null),
    ids: z.string().nullable().default(null),
    agentVersionsNin: z.string().nullable().default(null),
    updatedAt__between: z.string().nullable().default(null),
    locationEnabled: z.string().nullable().default(null),
    locationIdsNin: z.string().nullable().default(null),
    osTypes: z.string().nullable().default(null),
    encryptedApplications: z.string().nullable().default(null),
    filterId: z.string().nullable().default(null),
    decommissionedAt__gt: z.string().nullable().default(null),
    adUserMember__contains: z.string().nullable().default(null),
    uuid: z.string().nullable().default(null),
    coreCount__lte: z.string().nullable().default(null),
    coreCount__gt: z.string().nullable().default(null),
    cloudNetwork__contains: z.string().nullable().default(null),
    clusterName__contains: z.string().nullable().default(null),
    cpuCount__gte: z.string().nullable().default(null),
    query: z.string().nullable().default(null),
    lastActiveDate__between: z.string().nullable().default(null),
    rangerStatus: z.string().nullable().default(null),
    domains: z.string().nullable().default(null),
    cloudProvider: z.string().nullable().default(null),
    lastActiveDate__lt: z.string().nullable().default(null),
    scanStatuses: z.string().nullable().default(null),
    hasLocalConfiguration: z.string().nullable().default(null),
    networkStatuses: z.string().nullable().default(null),
    isPendingUninstall: z.string().nullable().default(null),
    createdAt__gt: z.string().nullable().default(null),
    cpuCount__lt: z.string().nullable().default(null),
    consoleMigrationStatuses: z.string().nullable().default(null),
    adQuery: z.string().nullable().default(null),
    updatedAt__lt: z.string().nullable().default(null),
    createdAt__lt: z.string().nullable().default(null),
    adComputerName__contains: z.string().nullable().default(null),
    cloudInstanceSize__contains: z.string().nullable().default(null),
    registeredAt__lte: z.string().nullable().default(null),
    networkQuarantineEnabled: z.string().nullable().default(null),
    cloudAccount__contains: z.string().nullable().default(null),
    cloudLocation__contains: z.string().nullable().default(null),
    rangerVersions: z.string().nullable().default(null),
    networkInterfaceGatewayMacAddress__contains: z.string().nullable().default(null),
    uuid__contains: z.string().nullable().default(null),
    agentNamespace__contains: z.string().nullable().default(null),
    K8SNodeLabels__contains: z.string().nullable().default(null),
    adQuery__contains: z.string().nullable().default(null),
    K8SType__contains: z.string().nullable().default(null),
    countsFor: z.string().nullable().default(null),
    totalMemory__lt: z.string().nullable().default(null),
    externalId__contains: z.string().nullable().default(null),
    filteredSiteIds: z.string().nullable().default(null),
    decommissionedAt__gte: z.string().nullable().default(null),
    cpuCount__gt: z.string().nullable().default(null),
    threatHidden: z.string().nullable().default(null),
    isUninstalled: z.string().nullable().default(null),
    computerName__contains: z.string().nullable().default(null),
    lastActiveDate__lte: z.string().nullable().default(null),
    adUserName__contains: z.string().nullable().default(null),
    isActive: z.string().nullable().default(null),
    userActionsNeeded: z.string().nullable().default(null),
    threatCreatedAt__lte: z.string().nullable().default(null),
    domainsNin: z.string().nullable().default(null),
    operationalStates: z.string().nullable().default(null),
    externalIp__contains: z.string().nullable().default(null),
    isDecommissioned: z.string().nullable().default(null),
    networkInterfacePhysical__contains: z.string().nullable().default(null),
    lastActiveDate__gte: z.string().nullable().default(null),
    createdAt__between: z.string().nullable().default(null),
    cpuCount__between: z.string().nullable().default(null),
    lastLoggedInUserName__contains: z.string().nullable().default(null),
    awsRole__contains: z.string().nullable().default(null),
    K8SVersion__contains: z.string().nullable().default(null),
    alertIds: AlertIds,
  })
  .strict();

export const SentinelOneIsolateHostParamsSchema = SentinelOneBaseFilterSchema;

export const SentinelOneGetAgentsParamsSchema = SentinelOneBaseFilterSchema;

export const SentinelOneIsolateHostSchema = z
  .object({
    subAction: z.literal(SUB_ACTION.ISOLATE_HOST),
    subActionParams: SentinelOneIsolateHostParamsSchema,
  })
  .strict();

export const SentinelOneReleaseHostSchema = z
  .object({
    subAction: z.literal(SUB_ACTION.RELEASE_HOST),
    subActionParams: SentinelOneIsolateHostParamsSchema,
  })
  .strict();

export const SentinelOneExecuteScriptSchema = z
  .object({
    subAction: z.literal(SUB_ACTION.EXECUTE_SCRIPT),
    subActionParams: SentinelOneExecuteScriptParamsSchema,
  })
  .strict();

export const SentinelOneActionParamsSchema = z.union([
  SentinelOneIsolateHostSchema,
  SentinelOneReleaseHostSchema,
  SentinelOneExecuteScriptSchema,
]);
