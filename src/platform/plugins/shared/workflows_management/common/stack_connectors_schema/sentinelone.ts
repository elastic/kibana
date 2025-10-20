/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/sentinelone/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod';

// SentinelOne connector parameter schemas for different sub-actions
export const SentinelOneIsolateHostParamsSchema = z.object({
  uuid: z.string(),
});

export const SentinelOneReleaseHostParamsSchema = z.object({
  uuid: z.string(),
});

export const SentinelOneGetAgentsParamsSchema = z.object({
  uuid: z.string().optional(),
  computerName: z.string().optional(),
  osType: z.string().optional(),
  infected: z.boolean().optional(),
});

export const SentinelOneExecuteScriptParamsSchema = z.object({
  uuid: z.string(),
  scriptId: z.string(),
  outputDestination: z.string().optional(),
  outputDirectory: z.string().optional(),
  password: z.string().optional(),
  singularityPath: z.string().optional(),
  taskDescription: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  inputParams: z.string().optional(),
});

export const SentinelOneGetRemoteScriptsParamsSchema = z.object({
  accountIds: z.array(z.string()).optional(),
  siteIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  osTypes: z.array(z.string()).optional(),
  scriptType: z.string().optional(),
  limit: z.number().optional(),
});

export const SentinelOneGetRemoteScriptStatusParamsSchema = z.object({
  parentTaskId: z.string(),
});

export const SentinelOneGetRemoteScriptResultsParamsSchema = z.object({
  parentTaskId: z.string(),
  taskId: z.string().optional(),
});

export const SentinelOneDownloadRemoteScriptResultsParamsSchema = z.object({
  parentTaskId: z.string(),
  taskId: z.string(),
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
  agentIds: z.array(z.string()).optional(),
  accountIds: z.array(z.string()).optional(),
  siteIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  activityTypes: z.array(z.string()).optional(),
  limit: z.number().optional(),
});

// SentinelOne connector response schema
export const SentinelOneResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      computerName: z.string(),
      uuid: z.string(),
      osType: z.string(),
      infected: z.boolean(),
      isActive: z.boolean(),
      networkStatus: z.string(),
    })
  ),
  pagination: z
    .object({
      totalItems: z.number(),
      nextCursor: z.string().optional(),
    })
    .optional(),
});
