/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/microsoft_defender_endpoint/microsoft_defender_endpoint.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Microsoft Defender Endpoint connector parameter schemas for different sub-actions

export const MicrosoftDefenderEndpointGetAgentDetailsParamsSchema = z.object({
  id: z.string(),
});

export const MicrosoftDefenderEndpointGetAgentListParamsSchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).optional(),
  computerDnsName: z.union([z.string(), z.array(z.string())]).optional(),
  osPlatform: z.union([z.string(), z.array(z.string())]).optional(),
  lastSeen: z.union([z.string(), z.array(z.string())]).optional(),
  healthStatus: z.union([z.string(), z.array(z.string())]).optional(),
  riskScore: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sortField: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export const MicrosoftDefenderEndpointIsolateHostParamsSchema = z.object({
  id: z.string(),
  comment: z.string().optional(),
  isolationType: z.enum(['Full', 'Selective']).optional(),
});

export const MicrosoftDefenderEndpointReleaseHostParamsSchema = z.object({
  id: z.string(),
  comment: z.string().optional(),
});

export const MicrosoftDefenderEndpointTestConnectorParamsSchema = z.object({});

export const MicrosoftDefenderEndpointGetActionsParamsSchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  requestor: z.union([z.string(), z.array(z.string())]).optional(),
  machineId: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sortField: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export const MicrosoftDefenderEndpointGetLibraryFilesParamsSchema = z.object({});

export const MicrosoftDefenderEndpointRunScriptParamsSchema = z.object({
  id: z.string(),
  comment: z.string().optional(),
  scriptName: z.string(),
  scriptArgs: z.string().optional(),
});

export const MicrosoftDefenderEndpointCancelActionParamsSchema = z.object({
  id: z.string(),
  comment: z.string().optional(),
});

export const MicrosoftDefenderEndpointGetActionResultsParamsSchema = z.object({
  id: z.string(),
  index: z.number().optional(),
});

// Microsoft Defender Endpoint connector response schemas

export const MicrosoftDefenderEndpointMachineSchema = z.object({
  id: z.string(),
  computerDnsName: z.string().optional(),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  osPlatform: z.string().optional(),
  osVersion: z.string().optional(),
  osProcessor: z.string().optional(),
  version: z.string().optional(),
  lastIpAddress: z.string().optional(),
  lastExternalIpAddress: z.string().optional(),
  agentVersion: z.string().optional(),
  osBuild: z.number().optional(),
  healthStatus: z.string().optional(),
  riskScore: z.string().optional(),
  exposureLevel: z.string().optional(),
  isAadJoined: z.boolean().optional(),
  aadDeviceId: z.string().optional(),
  machineTags: z.array(z.string()).optional(),
  defenderAvStatus: z.string().optional(),
  onboardingStatus: z.string().optional(),
  osArchitecture: z.string().optional(),
  managedBy: z.string().optional(),
  managedByStatus: z.string().optional(),
  rbacGroupId: z.number().optional(),
  rbacGroupName: z.string().optional(),
  ipAddresses: z.array(z.any()).optional(),
});

export const MicrosoftDefenderEndpointGetAgentDetailsResponseSchema =
  MicrosoftDefenderEndpointMachineSchema;

export const MicrosoftDefenderEndpointGetAgentListResponseSchema = z.object({
  '@odata.context': z.string().optional(),
  '@odata.count': z.number().optional(),
  value: z.array(MicrosoftDefenderEndpointMachineSchema),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  total: z.number().optional(),
});

export const MicrosoftDefenderEndpointMachineActionSchema = z.object({
  id: z.string(),
  type: z.string(),
  requestor: z.string().optional(),
  requestorComment: z.string().optional(),
  status: z.string(),
  machineId: z.string().optional(),
  computerDnsName: z.string().optional(),
  creationDateTimeUtc: z.string().optional(),
  lastUpdateDateTimeUtc: z.string().optional(),
  cancellationRequestor: z.string().optional(),
  cancellationComment: z.string().optional(),
  cancellationDateTimeUtc: z.string().optional(),
  errorHResult: z.number().optional(),
  scope: z.string().optional(),
  externalID: z.string().optional(),
  requestSource: z.string().optional(),
  relatedFileInfo: z.any().optional(),
  commands: z.array(z.any()).optional(),
});

export const MicrosoftDefenderEndpointIsolateHostResponseSchema =
  MicrosoftDefenderEndpointMachineActionSchema;

export const MicrosoftDefenderEndpointReleaseHostResponseSchema =
  MicrosoftDefenderEndpointMachineActionSchema;

export const MicrosoftDefenderEndpointTestConnectorResponseSchema = z.object({
  results: z.array(z.string()),
});

export const MicrosoftDefenderEndpointGetActionsResponseSchema = z.object({
  '@odata.context': z.string().optional(),
  '@odata.count': z.number().optional(),
  value: z.array(MicrosoftDefenderEndpointMachineActionSchema),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  total: z.number().optional(),
});

export const MicrosoftDefenderEndpointLibraryFileSchema = z.object({
  sha1: z.string(),
  fileName: z.string(),
  description: z.string().optional(),
  creationTime: z.string().optional(),
  createdBy: z.string().optional(),
});

export const MicrosoftDefenderEndpointGetLibraryFilesResponseSchema = z.object({
  value: z.array(MicrosoftDefenderEndpointLibraryFileSchema),
});

export const MicrosoftDefenderEndpointRunScriptResponseSchema =
  MicrosoftDefenderEndpointMachineActionSchema;

export const MicrosoftDefenderEndpointCancelActionResponseSchema =
  MicrosoftDefenderEndpointMachineActionSchema;

export const MicrosoftDefenderEndpointGetActionResultsResponseSchema = z.any();
