/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { additionalFilters, idString } from './types';

// executeScript
export const ExecuteScriptInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .max(5000)
      .optional()
      .describe('Agent ids; agentIds or agentUuids is required'),
    agentUuids: z.array(idString(64)).max(5000).optional().describe('Agent UUIDs'),
    scriptId: idString(32).describe('Script id from getRemoteScripts'),
    taskDescription: z.string().min(2).max(500).describe('Task description'),
    outputDestination: z
      .enum(['SentinelCloud', 'Local', 'None'])
      .optional()
      .describe('Where results go (default SentinelCloud)'),
    inputParams: z.string().max(4096).optional().describe('Script input parameters'),
    scriptRuntimeTimeoutSeconds: z.coerce
      .number()
      .int()
      .min(60)
      .max(172800)
      .optional()
      .describe('Script runtime limit in seconds'),
    requiresApproval: z
      .boolean()
      .optional()
      .describe('Wait for approval in the console before running'),
    outputDirectory: z
      .string()
      .max(1024)
      .optional()
      .describe('Output directory for outputDestination Local'),
    outputFilePaths: z
      .array(z.string().min(1).max(1024))
      .max(50)
      .optional()
      .describe('File paths to collect'),
    password: z
      .string()
      .max(256)
      .optional()
      .describe(
        'Results archive password; the value is saved with the workflow step or agent tool call'
      ),
    passwordFromScope: z
      .object({
        scopeLevel: z.enum(['tenant', 'account', 'site']).describe('Scope level'),
        scopeId: idString(32).optional().describe('Account or site id (omit for tenant)'),
      })
      .optional()
      .describe('Use the archive password stored at this scope instead'),
  })
);
export type ExecuteScriptInput = z.infer<typeof ExecuteScriptInputSchema>;

// getRemoteScriptStatus
export const GetRemoteScriptStatusInputSchema = lazySchema(() =>
  z.object({
    parentTaskId: idString(32).describe('parentTaskId from executeScript'),
    statuses: z
      .array(
        z.enum([
          'created',
          'scheduled',
          'pending',
          'pending_user_action',
          'in_progress',
          'failed',
          'completed',
          'canceled',
          'expired',
          'partially_completed',
        ])
      )
      .max(10)
      .optional()
      .describe('Task statuses'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type GetRemoteScriptStatusInput = z.infer<typeof GetRemoteScriptStatusInputSchema>;

// getRemoteScriptResults
export const GetRemoteScriptResultsInputSchema = lazySchema(() =>
  z.object({
    taskIds: z.array(idString(32)).min(1).max(5000).describe('Task ids from getRemoteScriptStatus'),
    computerNames: z
      .array(z.string().min(1).max(255))
      .max(100)
      .optional()
      .describe('Computer names (partial match)'),
  })
);
export type GetRemoteScriptResultsInput = z.infer<typeof GetRemoteScriptResultsInputSchema>;

// downloadRemoteScriptResults
export const DownloadRemoteScriptResultsInputSchema = lazySchema(() =>
  z.object({
    taskId: idString(32).describe('Task id (data[].id from getRemoteScriptStatus)'),
  })
);
export type DownloadRemoteScriptResultsInput = z.infer<
  typeof DownloadRemoteScriptResultsInputSchema
>;

// getRemoteScripts
export const GetRemoteScriptsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Script name search'),
    ids: z.array(idString(32)).max(1000).optional().describe('Script ids'),
    osTypes: z
      .array(z.enum(['linux', 'macos', 'windows']))
      .max(3)
      .optional()
      .describe('Operating systems'),
    scriptType: z
      .array(z.enum(['artifactCollection', 'dataCollection', 'action']))
      .max(3)
      .optional()
      .describe('Script types'),
    isAvailableForArs: z
      .boolean()
      .optional()
      .describe('Only scripts available for automated response'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    limit: z.coerce.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
    additionalFilters: additionalFilters(
      'More filters: skip, skipCount, sortBy (for example scriptName), sortOrder; unknown keys are rejected'
    ),
  })
);
export type GetRemoteScriptsInput = z.infer<typeof GetRemoteScriptsInputSchema>;

// runScriptAndWait
export const RunScriptAndWaitInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .max(5000)
      .optional()
      .describe('Agent ids; agentIds or agentUuids is required'),
    agentUuids: z.array(idString(64)).max(5000).optional().describe('Agent UUIDs'),
    scriptId: idString(32).describe('Script id from getRemoteScripts'),
    taskDescription: z.string().min(2).max(500).describe('Task description'),
    outputDestination: z
      .enum(['SentinelCloud', 'Local', 'None'])
      .optional()
      .describe('Where results go (default SentinelCloud)'),
    inputParams: z.string().max(4096).optional().describe('Script input parameters'),
    scriptRuntimeTimeoutSeconds: z
      .number()
      .int()
      .min(60)
      .max(172800)
      .optional()
      .describe('Script runtime limit in seconds'),
    requiresApproval: z
      .boolean()
      .optional()
      .describe('Wait for approval in the console before running'),
    outputDirectory: z
      .string()
      .max(1024)
      .optional()
      .describe('Output directory for outputDestination Local'),
    outputFilePaths: z
      .array(z.string().min(1).max(1024))
      .max(50)
      .optional()
      .describe('File paths to collect'),
    password: z
      .string()
      .max(256)
      .optional()
      .describe(
        'Results archive password; the value is saved with the workflow step or agent tool call'
      ),
    passwordFromScope: z
      .object({
        scopeLevel: z.enum(['tenant', 'account', 'site']).describe('Scope level'),
        scopeId: idString(32).optional().describe('Account or site id (omit for tenant)'),
      })
      .optional()
      .describe('Use the archive password stored at this scope instead'),
    waitSeconds: z
      .number()
      .int()
      .min(10)
      .max(240)
      .optional()
      .describe('Seconds to wait for completion (default 100)'),
  })
);
export type RunScriptAndWaitInput = z.infer<typeof RunScriptAndWaitInputSchema>;
