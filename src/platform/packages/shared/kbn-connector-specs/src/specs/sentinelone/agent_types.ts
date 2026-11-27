/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ISO_DATE_HINT, additionalFilters, idString } from './types';

/** A comma-separated id list, for example 'one, two'. */
const ACTIVITY_ID_LIST_PATTERN = /^[A-Za-z0-9_-]+(\s*,\s*[A-Za-z0-9_-]+)*$/;

// getAgents
export const GetAgentsInputSchema = lazySchema(() =>
  z.object({
    computerName: z.string().max(255).optional().describe('Exact computer name'),
    uuid: idString(64).optional().describe('Agent UUID'),
    ip: z.string().max(64).optional().describe('Internal IP address (contains match)'),
    ids: z.array(idString(32)).max(1000).optional().describe('Agent ids'),
    query: z.string().max(255).optional().describe('Free-text search'),
    networkStatuses: z
      .array(z.string().min(1).max(32))
      .max(10)
      .optional()
      .describe('Network statuses, for example connected, disconnected, connecting, disconnecting'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
    additionalFilters: additionalFilters(
      'More Get Agents filters, for example osTypes, infected, isActive, lastActiveDate__gte, machineTypes, uuids, computerName__contains, sortBy, sortOrder. Values are strings, numbers, booleans or string lists; unknown keys are rejected'
    ),
  })
);
export type GetAgentsInput = z.infer<typeof GetAgentsInputSchema>;

// isolateHost
export const IsolateHostInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(300).describe('Agent ids from getAgents'),
  })
);
export type IsolateHostInput = z.infer<typeof IsolateHostInputSchema>;

// releaseHost
export const ReleaseHostInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(300).describe('Agent ids from getAgents'),
  })
);
export type ReleaseHostInput = z.infer<typeof ReleaseHostInputSchema>;

// fetchAgentFiles
export const FetchAgentFilesInputSchema = lazySchema(() =>
  z.object({
    agentId: idString(32).describe('Agent id'),
    files: z.array(z.string().min(1).max(1024)).min(1).max(10).describe('Absolute file paths'),
    zipPassCode: z
      .string()
      .min(10)
      .max(256)
      .describe('Archive password; the value is saved with the agent tool call'),
  })
);
export type FetchAgentFilesInput = z.infer<typeof FetchAgentFilesInputSchema>;

// downloadAgentFile
export const DownloadAgentFileInputSchema = lazySchema(() =>
  z.object({
    agentId: idString(32).describe('Agent id'),
    activityId: idString(32).describe('Upload activity id from getActivities'),
  })
);
export type DownloadAgentFileInput = z.infer<typeof DownloadAgentFileInputSchema>;

// getActivities
// No params at all is accepted, and a numeric-string limit is coerced.
export const GetActivitiesInputSchema = lazySchema(() =>
  z
    .object({
      ids: z
        .union([
          z.array(idString(32)).max(1000),
          z.string().min(1).max(20000).regex(ACTIVITY_ID_LIST_PATTERN),
        ])
        .optional()
        .describe('Activity ids, as a list or a comma-separated string'),
      agentIds: z.array(idString(32)).max(1000).optional().describe('Agent ids'),
      threatIds: z.array(idString(32)).max(1000).optional().describe('Threat ids'),
      activityTypes: z
        .array(z.number().int().min(0))
        .max(100)
        .optional()
        .describe('Activity type ids'),
      createdAtGte: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe(`Created at or after, ${ISO_DATE_HINT}`),
      createdAtLte: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe(`Created at or before, ${ISO_DATE_HINT}`),
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
        'More filters, for example activityUuids, alertIds, ruleIds, userEmails, userIds, createdAt__gt, createdAt__lt, includeHidden, countOnly, skip, sortBy, sortOrder; unknown keys are rejected'
      ),
    })
    .default({})
);
export type GetActivitiesInput = z.infer<typeof GetActivitiesInputSchema>;

// moveAgent
export const MoveAgentInputSchema = lazySchema(() =>
  z.object({
    groupId: idString(32).describe('Target group id from getGroups'),
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids from getAgents'),
  })
);
export type MoveAgentInput = z.infer<typeof MoveAgentInputSchema>;

// initiateScan
export const InitiateScanInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids from getAgents'),
  })
);
export type InitiateScanInput = z.infer<typeof InitiateScanInputSchema>;

// abortScan
export const AbortScanInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids from getAgents'),
  })
);
export type AbortScanInput = z.infer<typeof AbortScanInputSchema>;

// shutdownAgent
export const ShutdownAgentInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids from getAgents'),
  })
);
export type ShutdownAgentInput = z.infer<typeof ShutdownAgentInputSchema>;

// broadcastMessage
export const BroadcastMessageInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids from getAgents'),
    message: z.string().min(1).max(140).describe('Message text'),
  })
);
export type BroadcastMessageInput = z.infer<typeof BroadcastMessageInputSchema>;

// getInstalledApplications
export const GetInstalledApplicationsInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(300).describe('Agent ids'),
  })
);
export type GetInstalledApplicationsInput = z.infer<typeof GetInstalledApplicationsInputSchema>;
