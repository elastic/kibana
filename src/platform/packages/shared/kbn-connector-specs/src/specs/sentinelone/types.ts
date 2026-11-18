/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** SentinelOne object ids are numeric strings; letters, digits, '-' and '_' are accepted, never ',' (lists are sent comma-separated). */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const FILTER_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const ISO_DATE_HINT = 'ISO 8601 date-time, for example 2026-01-31T00:00:00Z';

/** A comma-separated id list as V1 accepted it, for example 'one, two'. */
const ACTIVITY_ID_LIST_PATTERN = /^[A-Za-z0-9_-]+(\s*,\s*[A-Za-z0-9_-]+)*$/;

const idString = (maxLength: number) => z.string().min(1).max(maxLength).regex(ID_PATTERN);

const filterValue = () =>
  z.union([
    z.string().max(1024),
    z.number(),
    z.boolean(),
    z.array(z.string().min(1).max(1024)).max(1000),
  ]);

const additionalFilters = (description: string) =>
  z
    .record(z.string().min(1).max(64).regex(FILTER_KEY_PATTERN), filterValue())
    .refine((value) => Object.keys(value).length <= 50, {
      message: 'additionalFilters accepts at most 50 keys',
    })
    .optional()
    .describe(description);

// getAgents: GET /web/api/v2.1/agents
export const GetAgentsInputSchema = lazySchema(() =>
  z.object({
    computerName: z.string().max(255).optional().describe('Exact computer (host) name'),
    uuid: idString(64).optional().describe('Agent UUID'),
    ip: z
      .string()
      .max(64)
      .optional()
      .describe('Internal IP address (contains match); sent as a one-item list'),
    ids: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Agent ids (connector bound 1000; spec states no maximum for this filter)'),
    query: z.string().max(255).optional().describe('Free-text search'),
    networkStatuses: z
      .array(z.string().min(1).max(32))
      .max(10)
      .optional()
      .describe(
        'Network statuses to match. Known values connected, disconnected, connecting, disconnecting; the API reference lists no enum, so other values are passed through'
      ),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
    additionalFilters: additionalFilters(
      "Other documented Get Agents filters (V1 passed every Get Agents filter through), for example osTypes, infected, isActive, lastActiveDate__gte, machineTypes, uuids, computerName__contains, skip, sortBy, sortOrder. Up to 50 keys; each value is a string (max 1024), number, boolean or an array of up to 1000 strings (sent comma-separated). Keys are checked against the route's documented filter names; an unknown key is rejected before the call."
    ),
  })
);
export type GetAgentsInput = z.infer<typeof GetAgentsInputSchema>;

// isolateHost: POST /web/api/v2.1/agents/actions/disconnect
export const IsolateHostInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .min(1)
      .max(300)
      .describe(
        'Agent ids from getAgents (at least 1; connector bound 300 because the state check sends the ids in a query string, which gateways reject above about 8 KB; spec ceiling 5000)'
      ),
  })
);
export type IsolateHostInput = z.infer<typeof IsolateHostInputSchema>;

// releaseHost: POST /web/api/v2.1/agents/actions/connect
export const ReleaseHostInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .min(1)
      .max(300)
      .describe(
        'Agent ids from getAgents (at least 1; connector bound 300 because the state check sends the ids in a query string, which gateways reject above about 8 KB; spec ceiling 5000)'
      ),
  })
);
export type ReleaseHostInput = z.infer<typeof ReleaseHostInputSchema>;

// executeScript: POST /web/api/v2.1/remote-scripts/execute
export const ExecuteScriptInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .max(5000)
      .optional()
      .describe('Agent ids to run on (agentIds or agentUuids is required)'),
    agentUuids: z
      .array(idString(64))
      .max(5000)
      .optional()
      .describe('Agent UUIDs to run on (V1 accepted ids or uuids)'),
    scriptId: idString(32).describe('Script id from getRemoteScripts'),
    taskDescription: z
      .string()
      .min(2)
      .max(500)
      .describe(
        'Task description, 2 to 500 characters (spec minLength 2; maximum is a connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    outputDestination: z
      .enum(['SentinelCloud', 'Local', 'None', 'SingularityXDR'])
      .optional()
      .describe('Where results go; defaults to SentinelCloud (V1 default)'),
    inputParams: z
      .string()
      .max(4096)
      .optional()
      .describe(
        'Script input parameters (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    scriptRuntimeTimeoutSeconds: z.coerce
      .number()
      .int()
      .min(60)
      .max(172800)
      .optional()
      .describe(
        'Script runtime limit in seconds, 60 to 172800 (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    requiresApproval: z
      .boolean()
      .optional()
      .describe('Queue as a pending execution that needs approval in the console'),
    outputDirectory: z
      .string()
      .max(1024)
      .optional()
      .describe('Output directory (outputDestination Local)'),
    outputFilePaths: z
      .array(z.string().min(1).max(1024))
      .max(50)
      .optional()
      .describe('Output file paths to collect'),
    password: z
      .string()
      .max(256)
      .optional()
      .describe('Password for the results archive (sensitive: never logged)'),
    passwordFromScope: z
      .object({
        scopeLevel: z
          .enum(['tenant', 'account', 'site'])
          .describe('Scope level of the stored password'),
        scopeId: idString(32).optional().describe('Account or site id (omit for tenant)'),
      })
      .optional()
      .describe('Use the password stored at a scope: {scopeLevel, scopeId}'),
    singularityxdrUrl: z
      .string()
      .max(2048)
      .optional()
      .describe('Singularity XDR URL (outputDestination SingularityXDR)'),
    singularityxdrKeyword: z.string().max(255).optional().describe('Singularity XDR keyword'),
    apiKey: z
      .string()
      .max(512)
      .optional()
      .describe('Singularity XDR API key (sensitive: never logged)'),
  })
);
export type ExecuteScriptInput = z.infer<typeof ExecuteScriptInputSchema>;

// getRemoteScriptStatus: GET /web/api/v2.1/remote-scripts/status
export const GetRemoteScriptStatusInputSchema = lazySchema(() =>
  z.object({
    parentTaskId: idString(32).describe('parentTaskId returned by executeScript'),
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
      .describe('Only tasks in these statuses'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetRemoteScriptStatusInput = z.infer<typeof GetRemoteScriptStatusInputSchema>;

// getRemoteScriptResults: POST /web/api/v2.1/remote-scripts/fetch-files
export const GetRemoteScriptResultsInputSchema = lazySchema(() =>
  z.object({
    taskIds: z.array(idString(32)).min(1).max(5000).describe('Task ids (1 to 5000)'),
    computerNames: z
      .array(z.string().min(1).max(255))
      .max(100)
      .optional()
      .describe(
        'Partial or whole computer names (spec maximum 5000; connector-side bound (Kibana needs bounded inputs; the API reference states no limit) 100)'
      ),
  })
);
export type GetRemoteScriptResultsInput = z.infer<typeof GetRemoteScriptResultsInputSchema>;

// downloadRemoteScriptResults: POST /web/api/v2.1/remote-scripts/fetch-files
export const DownloadRemoteScriptResultsInputSchema = lazySchema(() =>
  z.object({
    taskId: idString(32).describe('Task id (data[].id from getRemoteScriptStatus)'),
  })
);
export type DownloadRemoteScriptResultsInput = z.infer<
  typeof DownloadRemoteScriptResultsInputSchema
>;

// getRemoteScripts: GET /web/api/v2.1/remote-scripts
export const GetRemoteScriptsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Free-text search (script name)'),
    ids: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Script ids (spec maximum 5000; connector bound 1000)'),
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
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10); a numeric string is accepted, as in V1'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
    additionalFilters: additionalFilters(
      "Other documented filters V1 passed through: skip, skipCount, sortBy (for example scriptName), sortOrder. Up to 50 keys; each value is a string (max 1024), number, boolean or an array of up to 1000 strings (sent comma-separated). Keys are checked against the route's documented filter names; an unknown key is rejected before the call."
    ),
  })
);
export type GetRemoteScriptsInput = z.infer<typeof GetRemoteScriptsInputSchema>;

// fetchAgentFiles: POST /web/api/v2.1/agents/{agent_id}/actions/fetch-files
export const FetchAgentFilesInputSchema = lazySchema(() =>
  z.object({
    agentId: idString(32).describe('Agent id'),
    files: z
      .array(z.string().min(1).max(1024))
      .min(1)
      .max(10)
      .describe('Absolute file paths, 1 to 10 (spec)'),
    zipPassCode: z
      .string()
      .min(10)
      .max(256)
      .describe(
        "Archive password, at least 10 characters (V1 rule; the API reference states only 'File encryption password'); sensitive: never logged"
      ),
  })
);
export type FetchAgentFilesInput = z.infer<typeof FetchAgentFilesInputSchema>;

// downloadAgentFile: GET /web/api/v2.1/agents/{agent_id}/uploads/{activity_id}
export const DownloadAgentFileInputSchema = lazySchema(() =>
  z.object({
    agentId: idString(32).describe('Agent id'),
    activityId: idString(32).describe('Upload activity id from getActivities'),
  })
);
export type DownloadAgentFileInput = z.infer<typeof DownloadAgentFileInputSchema>;

// getActivities: GET /web/api/v2.1/activities
// V1 accepted no params at all (undefined) and coerced a numeric-string limit: both are carried.
export const GetActivitiesInputSchema = lazySchema(() =>
  z
    .object({
      ids: z
        .union([
          z.array(idString(32)).max(1000),
          z.string().min(1).max(20000).regex(ACTIVITY_ID_LIST_PATTERN),
        ])
        .optional()
        .describe(
          'Activity ids: a list, or a comma-separated string as V1 accepted (spec maximum 5000; connector bound 1000 ids or 20000 characters)'
        ),
      agentIds: z
        .array(idString(32))
        .max(1000)
        .optional()
        .describe('Agent ids (spec maximum 5000; connector bound 1000)'),
      threatIds: z
        .array(idString(32))
        .max(1000)
        .optional()
        .describe('Threat ids (spec maximum 5000; connector bound 1000)'),
      activityTypes: z
        .array(z.number().int().min(0))
        .max(100)
        .optional()
        .describe('Activity type ids (the API reference lists the valid ids)'),
      createdAtGte: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe(`From (ISO 8601) (${ISO_DATE_HINT})`),
      createdAtLte: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe(`To (ISO 8601) (${ISO_DATE_HINT})`),
      accountIds: z
        .array(idString(32))
        .max(500)
        .optional()
        .describe('Account scope ids (spec: 1 to 500)'),
      siteIds: z
        .array(idString(32))
        .max(500)
        .optional()
        .describe('Site scope ids (spec: 1 to 500)'),
      groupIds: z
        .array(idString(32))
        .max(500)
        .optional()
        .describe('Group scope ids (spec: 1 to 500)'),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Page size, 1 to 1000 (default 10); a numeric string is accepted, as in V1'),
      cursor: z
        .string()
        .max(2048)
        .optional()
        .describe('pagination.nextCursor from the previous page; send it with the same filters'),
      additionalFilters: additionalFilters(
        "Other documented filters V1 passed through: activityUuids, alertIds, ids, ruleIds, userEmails, userIds, createdAt__gt, createdAt__lt, createdAt__between, includeHidden, countOnly, skip, skipCount, sortBy, sortOrder. Up to 50 keys; each value is a string (max 1024), number, boolean or an array of up to 1000 strings (sent comma-separated). Keys are checked against the route's documented filter names; an unknown key is rejected before the call."
      ),
    })
    .default({})
);
export type GetActivitiesInput = z.infer<typeof GetActivitiesInputSchema>;

// mitigateThreat: POST /web/api/v2.1/threats/mitigate/{action}
export const MitigateThreatInputSchema = lazySchema(() =>
  z.object({
    action: z
      .enum([
        'kill',
        'remediate',
        'rollback-remediation',
        'quarantine',
        'un-quarantine',
        'remove_macros',
        'restore_macros',
      ])
      .describe('Mitigation action (the 7 values of the API reference)'),
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids (1 to 5000)'),
  })
);
export type MitigateThreatInput = z.infer<typeof MitigateThreatInputSchema>;

// rollbackThreat: POST /web/api/v2.1/threats/mitigate/rollback-remediation
export const RollbackThreatInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids (1 to 5000)'),
  })
);
export type RollbackThreatInput = z.infer<typeof RollbackThreatInputSchema>;

// getThreats: GET /web/api/v2.1/threats
export const GetThreatsInputSchema = lazySchema(() =>
  z.object({
    analystVerdicts: z
      .array(z.enum(['undefined', 'true_positive', 'false_positive', 'suspicious']))
      .max(4)
      .optional()
      .describe('Analyst verdicts'),
    incidentStatuses: z
      .array(z.enum(['unresolved', 'in_progress', 'resolved']))
      .max(3)
      .optional()
      .describe('Incident statuses'),
    mitigationStatuses: z
      .array(z.enum(['not_mitigated', 'mitigated', 'marked_as_benign']))
      .max(3)
      .optional()
      .describe('Mitigation statuses'),
    confidenceLevels: z
      .array(z.enum(['malicious', 'suspicious', 'n/a']))
      .max(3)
      .optional()
      .describe('Confidence levels'),
    contentHashes: z
      .array(z.string().min(1).max(40))
      .max(1000)
      .optional()
      .describe('File SHA1 hashes (spec maximum 5000; connector bound 1000)'),
    agentIds: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Agent ids (spec maximum 5000; connector bound 1000)'),
    computerNameContains: z
      .array(z.string().min(1).max(255))
      .max(10)
      .optional()
      .describe('Host name contains (spec maximum 10)'),
    ids: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Threat ids (spec maximum 5000; connector bound 1000)'),
    createdAtGte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Detected from (ISO 8601) (${ISO_DATE_HINT})`),
    createdAtLte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Detected to (ISO 8601) (${ISO_DATE_HINT})`),
    sortBy: z
      .enum([
        'id',
        'createdAt',
        'updatedAt',
        'mitigationStatus',
        'agentComputerName',
        'contentHash',
      ])
      .optional()
      .describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetThreatsInput = z.infer<typeof GetThreatsInputSchema>;

// updateThreatVerdict: POST /web/api/v2.1/threats/analyst-verdict
export const UpdateThreatVerdictInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids (1 to 5000)'),
    analystVerdict: z
      .enum(['undefined', 'true_positive', 'false_positive', 'suspicious'])
      .describe('Verdict'),
  })
);
export type UpdateThreatVerdictInput = z.infer<typeof UpdateThreatVerdictInputSchema>;

// updateThreatStatus: POST /web/api/v2.1/threats/incident
export const UpdateThreatStatusInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids (1 to 5000)'),
    incidentStatus: z.enum(['unresolved', 'in_progress', 'resolved']).describe('Status'),
    analystVerdict: z
      .enum(['undefined', 'true_positive', 'false_positive', 'suspicious'])
      .optional()
      .describe('Optional verdict'),
  })
);
export type UpdateThreatStatusInput = z.infer<typeof UpdateThreatStatusInputSchema>;

// addThreatNote: POST /web/api/v2.1/threats/notes
export const AddThreatNoteInputSchema = lazySchema(() =>
  z.object({
    threatIds: z.array(idString(32)).min(1).max(5000).describe('Threat ids (1 to 5000)'),
    text: z.string().min(2).max(10000).describe('Note text, 2 to 10000 characters (spec)'),
  })
);
export type AddThreatNoteInput = z.infer<typeof AddThreatNoteInputSchema>;

// getThreatNotes: GET /web/api/v2.1/threats/{threat_id}/notes
export const GetThreatNotesInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetThreatNotesInput = z.infer<typeof GetThreatNotesInputSchema>;

// addHashToBlocklist: POST /web/api/v2.1/restrictions
export const AddHashToBlocklistInputSchema = lazySchema(() =>
  z.object({
    osType: z.enum(['windows', 'linux', 'windows_legacy', 'macos']).describe('Operating system'),
    sha1: z
      .string()
      .max(40)
      .optional()
      .describe('SHA1 (40 hex characters; sha1 or sha256 is required)'),
    sha256: z.string().max(64).optional().describe('SHA256 (64 hex characters)'),
    description: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Description (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    source: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Source label (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500); at least one scope field is required'),
    siteIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Site scope ids (spec: 1 to 500); at least one scope field is required'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500); at least one scope field is required'),
    tenant: z
      .boolean()
      .optional()
      .describe('Global (tenant) scope; at least one scope field is required'),
  })
);
export type AddHashToBlocklistInput = z.infer<typeof AddHashToBlocklistInputSchema>;

// removeHashFromBlocklist: DELETE /web/api/v2.1/restrictions
export const RemoveHashFromBlocklistInputSchema = lazySchema(() =>
  z.object({
    ids: z.array(idString(32)).min(1).max(5000).describe('Blocklist item ids (1 to 5000)'),
  })
);
export type RemoveHashFromBlocklistInput = z.infer<typeof RemoveHashFromBlocklistInputSchema>;

// searchBlocklist: GET /web/api/v2.1/restrictions
export const SearchBlocklistInputSchema = lazySchema(() =>
  z.object({
    value: z
      .string()
      .max(64)
      .optional()
      .describe('Exact hash (a single string, per the API reference)'),
    valueContains: z
      .array(z.string().min(1).max(64))
      .max(10)
      .optional()
      .describe(
        'Hash contains (spec states no maximum; connector-side bound (Kibana needs bounded inputs; the API reference states no limit) 10)'
      ),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    tenant: z.boolean().optional().describe('Global (tenant) scope'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type SearchBlocklistInput = z.infer<typeof SearchBlocklistInputSchema>;

// getHashReputation: GET /web/api/v2.1/hashes/{hash}/verdict
export const GetHashReputationInputSchema = lazySchema(() =>
  z.object({
    hash: z
      .string()
      .min(1)
      .max(40)
      .regex(/^[A-Fa-f0-9]{40}$/)
      .describe('SHA1 (40 hex characters)'),
  })
);
export type GetHashReputationInput = z.infer<typeof GetHashReputationInputSchema>;

// createQuery: POST /web/api/v2.1/dv/init-query
export const CreateQueryInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(4096)
      .describe(
        'S1QL query (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    fromDate: z
      .string()
      .min(1)
      .max(40)
      .describe(`Events created after this time (ISO 8601) (${ISO_DATE_HINT})`),
    toDate: z
      .string()
      .min(1)
      .max(40)
      .describe(`Events created up to this time (ISO 8601) (${ISO_DATE_HINT})`),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids (spec 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids (spec 1 to 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20000)
      .optional()
      .describe(
        'Maximum events, 1 to 20000 (spec allows up to 100000; 20000 is a connector-side bound)'
      ),
    queryType: z
      .enum(['events', 'processState'])
      .optional()
      .describe('events or processState (exactly one)'),
    isVerbose: z.boolean().optional().describe('Verbose results (default false)'),
  })
);
export type CreateQueryInput = z.infer<typeof CreateQueryInputSchema>;

// getQueryStatus: GET /web/api/v2.1/dv/query-status
export const GetQueryStatusInputSchema = lazySchema(() =>
  z.object({
    queryId: idString(64).describe('queryId from createQuery'),
  })
);
export type GetQueryStatusInput = z.infer<typeof GetQueryStatusInputSchema>;

// getQueryEvents: GET /web/api/v2.1/dv/events
export const GetQueryEventsInputSchema = lazySchema(() =>
  z.object({
    queryId: idString(64).describe('queryId from createQuery'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
  })
);
export type GetQueryEventsInput = z.infer<typeof GetQueryEventsInputSchema>;

// searchAlerts: GET /web/api/v2.1/cloud-detection/alerts
export const SearchAlertsInputSchema = lazySchema(() =>
  z.object({
    severity: z
      .array(z.enum(['Info', 'Low', 'Medium', 'High', 'Critical']))
      .max(5)
      .optional()
      .describe('Severities'),
    incidentStatus: z
      .array(z.enum(['UNRESOLVED', 'IN_PROGRESS', 'RESOLVED']))
      .max(3)
      .optional()
      .describe('Incident statuses'),
    analystVerdict: z
      .array(z.enum(['UNDEFINED', 'TRUE_POSITIVE', 'FALSE_POSITIVE', 'SUSPICIOUS']))
      .max(4)
      .optional()
      .describe('Analyst verdicts'),
    createdAtGte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`From (ISO 8601) (${ISO_DATE_HINT})`),
    createdAtLte: z.string().min(1).max(40).optional().describe(`To (ISO 8601) (${ISO_DATE_HINT})`),
    ids: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Alert ids (spec maximum 5000; connector bound 1000)'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type SearchAlertsInput = z.infer<typeof SearchAlertsInputSchema>;

// updateAlertVerdict: POST /web/api/v2.1/cloud-detection/alerts/analyst-verdict
export const UpdateAlertVerdictInputSchema = lazySchema(() =>
  z.object({
    alertIds: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Alert ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
    analystVerdict: z
      .enum(['undefined', 'true_positive', 'false_positive', 'suspicious'])
      .describe('New value'),
  })
);
export type UpdateAlertVerdictInput = z.infer<typeof UpdateAlertVerdictInputSchema>;

// updateAlertStatus: POST /web/api/v2.1/cloud-detection/alerts/incident
export const UpdateAlertStatusInputSchema = lazySchema(() =>
  z.object({
    alertIds: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Alert ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
    incidentStatus: z.enum(['unresolved', 'in_progress', 'resolved']).describe('New value'),
  })
);
export type UpdateAlertStatusInput = z.infer<typeof UpdateAlertStatusInputSchema>;

// getSites: GET /web/api/v2.1/sites
export const GetSitesInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Free-text name search'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
    sortBy: z
      .enum(['id', 'name', 'createdAt', 'updatedAt', 'accountName', 'state'])
      .optional()
      .describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
  })
);
export type GetSitesInput = z.infer<typeof GetSitesInputSchema>;

// getGroups: GET /web/api/v2.1/groups
export const GetGroupsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Free-text name search'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    type: z.enum(['static', 'dynamic', 'pinned']).optional().describe('Group type'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetGroupsInput = z.infer<typeof GetGroupsInputSchema>;

// getAccounts: GET /web/api/v2.1/accounts
export const GetAccountsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(255).optional().describe('Free-text name search'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account ids (spec maximum 5000; connector bound 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetAccountsInput = z.infer<typeof GetAccountsInputSchema>;

// createExclusion: POST /web/api/v2.1/exclusions
export const CreateExclusionInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['path', 'certificate', 'browser', 'file_type', 'white_hash'])
      .describe('Exclusion type'),
    osType: z.enum(['windows', 'linux', 'windows_legacy', 'macos']).describe('Operating system'),
    value: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        'Value for the type (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    description: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Description (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    mode: z
      .enum([
        'suppress',
        'suppress_dynamic_only',
        'suppress_dfi_only',
        'disable_in_process_monitor',
        'disable_in_process_monitor_deep',
        'disable_all_monitors',
        'disable_all_monitors_deep',
        'suppress_app_control',
        'suppress_drift_detection',
      ])
      .optional()
      .describe('Path exclusion mode (path type only)'),
    pathExclusionType: z
      .string()
      .max(64)
      .optional()
      .describe('Path exclusion type (path type only)'),
    actions: z
      .array(z.enum(['upload', 'detect']))
      .max(2)
      .optional()
      .describe('Exclusion actions'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500); at least one scope field is required'),
    siteIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Site scope ids (spec: 1 to 500); at least one scope field is required'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500); at least one scope field is required'),
    tenant: z
      .boolean()
      .optional()
      .describe('Global (tenant) scope; at least one scope field is required'),
  })
);
export type CreateExclusionInput = z.infer<typeof CreateExclusionInputSchema>;

// listExclusions: GET /web/api/v2.1/exclusions
export const ListExclusionsInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['path', 'certificate', 'browser', 'file_type', 'white_hash', 'dv_exclusions'])
      .optional()
      .describe('Exclusion type'),
    osTypes: z
      .array(z.enum(['windows', 'linux', 'windows_legacy', 'macos']))
      .max(4)
      .optional()
      .describe('Operating systems'),
    value: z.string().max(1024).optional().describe('Exact value'),
    valueContains: z
      .array(z.string().min(1).max(1024))
      .max(20)
      .optional()
      .describe('Value contains (spec maximum 20)'),
    ids: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Exclusion ids (spec maximum 5000; connector bound 1000)'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    tenant: z.boolean().optional().describe('Global (tenant) scope'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type ListExclusionsInput = z.infer<typeof ListExclusionsInputSchema>;

// deleteExclusion: DELETE /web/api/v2.1/exclusions
export const DeleteExclusionInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Exclusion ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
    type: z
      .enum(['path', 'certificate', 'browser', 'file_type', 'white_hash'])
      .optional()
      .describe('Exclusion type'),
  })
);
export type DeleteExclusionInput = z.infer<typeof DeleteExclusionInputSchema>;

// moveAgent: PUT /web/api/v2.1/groups/{group_id}/move-agents
export const MoveAgentInputSchema = lazySchema(() =>
  z.object({
    groupId: idString(32).describe('Target group id'),
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids (1 to 5000)'),
  })
);
export type MoveAgentInput = z.infer<typeof MoveAgentInputSchema>;

// downloadThreatFile: GET /web/api/v2.1/threats/{threat_id}/download-from-cloud
export const DownloadThreatFileInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
  })
);
export type DownloadThreatFileInput = z.infer<typeof DownloadThreatFileInputSchema>;

// fetchThreatFile: POST /web/api/v2.1/threats/fetch-file (the filter must match exactly one threat: no bulk operations)
export const FetchThreatFileInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id (one threat per request)'),
    password: z
      .string()
      .min(10)
      .max(256)
      .describe(
        "Password that encrypts the fetched file, at least 10 characters (SentinelOne rejects shorter ones; the API reference states only 'File encryption password'); sensitive: never logged"
      ),
  })
);
export type FetchThreatFileInput = z.infer<typeof FetchThreatFileInputSchema>;

// initiateScan: POST /web/api/v2.1/agents/actions/initiate-scan
export const InitiateScanInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids (1 to 5000)'),
  })
);
export type InitiateScanInput = z.infer<typeof InitiateScanInputSchema>;

// abortScan: POST /web/api/v2.1/agents/actions/abort-scan
export const AbortScanInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids (1 to 5000)'),
  })
);
export type AbortScanInput = z.infer<typeof AbortScanInputSchema>;

// shutdownAgent: POST /web/api/v2.1/agents/actions/shutdown
export const ShutdownAgentInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids (1 to 5000)'),
  })
);
export type ShutdownAgentInput = z.infer<typeof ShutdownAgentInputSchema>;

// broadcastMessage: POST /web/api/v2.1/agents/actions/broadcast
export const BroadcastMessageInputSchema = lazySchema(() =>
  z.object({
    agentIds: z.array(idString(32)).min(1).max(5000).describe('Agent ids (1 to 5000)'),
    message: z
      .string()
      .min(1)
      .max(140)
      .describe("Message, 1 to 140 characters (stated in the API reference's description)"),
  })
);
export type BroadcastMessageInput = z.infer<typeof BroadcastMessageInputSchema>;

// createIOC: POST /web/api/v2.1/threat-intelligence/iocs
export const CreateIOCInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['DNS', 'IPV4', 'IPV6', 'MD5', 'SHA1', 'SHA256', 'URL'])
      .describe('Indicator type'),
    value: z
      .string()
      .min(1)
      .max(2048)
      .describe(
        'Indicator value (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    source: z
      .string()
      .min(1)
      .max(255)
      .describe(
        'Source label (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    validUntil: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Expiry (ISO 8601); optional (${ISO_DATE_HINT})`),
    name: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Indicator name (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    description: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Description (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    externalId: z
      .string()
      .max(255)
      .optional()
      .describe(
        'External id (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500); at least one scope field is required'),
    siteIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Site scope ids (spec: 1 to 500); at least one scope field is required'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500); at least one scope field is required'),
    tenant: z
      .boolean()
      .optional()
      .describe('Global (tenant) scope; at least one scope field is required'),
  })
);
export type CreateIOCInput = z.infer<typeof CreateIOCInputSchema>;

// searchIOCs: GET /web/api/v2.1/threat-intelligence/iocs
export const SearchIOCsInputSchema = lazySchema(() =>
  z.object({
    value: z.string().max(2048).optional().describe('Exact indicator value'),
    type: z
      .enum(['DNS', 'IPV4', 'IPV6', 'MD5', 'SHA1', 'SHA256', 'URL'])
      .optional()
      .describe('Indicator type'),
    source: z
      .array(z.string().min(1).max(255))
      .max(100)
      .optional()
      .describe('Source labels (spec maximum 5000; connector bound 100)'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account ids (spec maximum 5000; connector bound 500)'),
    siteIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Site ids (spec maximum 5000; connector bound 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type SearchIOCsInput = z.infer<typeof SearchIOCsInputSchema>;

// deleteIOC: DELETE /web/api/v2.1/threat-intelligence/iocs
export const DeleteIOCInputSchema = lazySchema(() =>
  z.object({
    accountIds: z
      .array(idString(32))
      .min(1)
      .max(500)
      .describe('Account ids, 1 to 500 (spec maximum 5000; connector bound 500)'),
    uuids: z.array(idString(64)).min(1).max(5000).describe('Indicator uuids, 1 to 5000'),
    type: z
      .enum(['DNS', 'IPV4', 'IPV6', 'MD5', 'SHA1', 'SHA256', 'URL'])
      .optional()
      .describe('Indicator type'),
  })
);
export type DeleteIOCInput = z.infer<typeof DeleteIOCInputSchema>;

// getInstalledApplications: GET /web/api/v2.1/agents/applications
export const GetInstalledApplicationsInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .min(1)
      .max(300)
      .describe(
        'Agent ids, 1 to 300 (spec maximum 5000; connector bound 300 because the ids are sent in a query string, which gateways reject above about 8 KB)'
      ),
  })
);
export type GetInstalledApplicationsInput = z.infer<typeof GetInstalledApplicationsInputSchema>;

// getAgentCves: GET /web/api/v2.1/installed-applications/cves
export const GetAgentCvesInputSchema = lazySchema(() =>
  z.object({
    cveIds: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('CVE ids such as CVE-2018-3182 (spec maximum 5000; connector bound 1000)'),
    applicationIds: z
      .array(idString(32))
      .max(1000)
      .optional()
      .describe('Application ids (spec maximum 5000; connector bound 1000)'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetAgentCvesInput = z.infer<typeof GetAgentCvesInputSchema>;

// getThreatDetails: GET /web/api/v2.1/threats
export const GetThreatDetailsInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(idString(32))
      .min(1)
      .max(300)
      .describe(
        'Threat ids, 1 to 300 (spec maximum 5000; connector bound 300 because the ids are sent in a query string, which gateways reject above about 8 KB)'
      ),
  })
);
export type GetThreatDetailsInput = z.infer<typeof GetThreatDetailsInputSchema>;

// getThreatTimeline: GET /web/api/v2.1/threats/{threat_id}/timeline
export const GetThreatTimelineInputSchema = lazySchema(() =>
  z.object({
    threatId: idString(32).describe('Threat id'),
    query: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Free-text search (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type GetThreatTimelineInput = z.infer<typeof GetThreatTimelineInputSchema>;

// listFirewallRules: GET /web/api/v2.1/firewall-control
export const ListFirewallRulesInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(200).optional().describe('Rule name'),
    actions: z
      .array(z.enum(['Allow', 'Block']))
      .max(2)
      .optional()
      .describe('Actions'),
    statuses: z
      .array(z.enum(['Enabled', 'Disabled']))
      .max(2)
      .optional()
      .describe('Statuses'),
    osTypes: z
      .array(z.enum(['windows', 'linux', 'windows_legacy', 'macos']))
      .max(4)
      .optional()
      .describe('Operating systems'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500)'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site scope ids (spec: 1 to 500)'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500)'),
    tenant: z.boolean().optional().describe('Global (tenant) scope'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Page size, 1 to 1000 (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('pagination.nextCursor from the previous page; send it with the same filters'),
  })
);
export type ListFirewallRulesInput = z.infer<typeof ListFirewallRulesInputSchema>;

// createFirewallRule: POST /web/api/v2.1/firewall-control
export const CreateFirewallRuleInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Rule name (spec maximum 200)'),
    action: z.enum(['Allow', 'Block']).describe('Allow or Block'),
    status: z.enum(['Enabled', 'Disabled']).describe('Enabled or Disabled'),
    direction: z.enum(['any', 'inbound', 'outbound']).optional().describe('Traffic direction'),
    osTypes: z
      .array(z.enum(['windows', 'linux', 'windows_legacy', 'macos']))
      .max(4)
      .optional()
      .describe('Operating systems'),
    remoteHosts: z
      .array(
        z.object({
          type: z.enum(['any', 'cidr', 'range', 'addresses', 'fqdn']).describe('Remote host type'),
          values: z
            .array(z.string().min(1).max(255))
            .max(5000)
            .optional()
            .describe('Host values for the type, for example 10.0.0.0/8 or example.com'),
        })
      )
      .max(100)
      .optional()
      .describe('Remote hosts: [{type: any|cidr|range|addresses|fqdn, values: [...]}]'),
    protocol: z
      .string()
      .max(16)
      .optional()
      .describe(
        'Protocol, for example TCP or UDP (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    description: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Description (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500); at least one scope field is required'),
    siteIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Site scope ids (spec: 1 to 500); at least one scope field is required'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500); at least one scope field is required'),
    tenant: z
      .boolean()
      .optional()
      .describe('Global (tenant) scope; at least one scope field is required'),
  })
);
export type CreateFirewallRuleInput = z.infer<typeof CreateFirewallRuleInputSchema>;

// deleteFirewallRule: DELETE /web/api/v2.1/firewall-control
export const DeleteFirewallRuleInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Rule ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
  })
);
export type DeleteFirewallRuleInput = z.infer<typeof DeleteFirewallRuleInputSchema>;

// createStarRule: POST /web/api/v2.1/cloud-detection/rules
export const CreateStarRuleInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe(
        'Rule name (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    severity: z.enum(['Info', 'Low', 'Medium', 'High', 'Critical']).describe('Severity'),
    queryType: z
      .enum(['events', 'correlation', 'uebafirstseen', 'scheduled'])
      .describe('Query type'),
    s1ql: z
      .string()
      .min(1)
      .max(4096)
      .describe(
        'Detection query (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    status: z
      .enum(['Draft', 'Active', 'Disabled'])
      .optional()
      .describe('Draft (default), Active or Disabled'),
    description: z.string().max(2000).optional().describe('Description (spec maximum 2000)'),
    expirationMode: z
      .enum(['Permanent', 'Temporary'])
      .optional()
      .describe('Permanent (default) or Temporary'),
    expiration: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Expiry (ISO 8601), required when expirationMode is Temporary (${ISO_DATE_HINT})`),
    treatAsThreat: z
      .enum(['UNDEFINED', 'Suspicious', 'Malicious'])
      .optional()
      .describe('Raise matches as threats'),
    networkQuarantine: z
      .boolean()
      .optional()
      .describe('Network-quarantine the endpoint on a match (default false)'),
    queryLang: z.enum(['1.0', '2.0']).optional().describe('Query language version'),
    accountIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Account scope ids (spec: 1 to 500); at least one scope field is required'),
    siteIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Site scope ids (spec: 1 to 500); at least one scope field is required'),
    groupIds: z
      .array(idString(32))
      .max(500)
      .optional()
      .describe('Group scope ids (spec: 1 to 500); at least one scope field is required'),
    tenant: z
      .boolean()
      .optional()
      .describe('Global (tenant) scope; at least one scope field is required'),
  })
);
export type CreateStarRuleInput = z.infer<typeof CreateStarRuleInputSchema>;

// updateStarRule: PUT /web/api/v2.1/cloud-detection/rules/{rule_id}
export const UpdateStarRuleInputSchema = lazySchema(() =>
  z.object({
    ruleId: idString(32).describe('Rule id'),
    name: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Rule name (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    severity: z.enum(['Info', 'Low', 'Medium', 'High', 'Critical']).optional().describe('Severity'),
    status: z
      .enum(['Draft', 'Active', 'Disabled'])
      .optional()
      .describe('Draft, Active or Disabled'),
    s1ql: z
      .string()
      .max(4096)
      .optional()
      .describe(
        'Detection query (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    description: z.string().max(2000).optional().describe('Description (spec maximum 2000)'),
    expirationMode: z
      .enum(['Permanent', 'Temporary'])
      .optional()
      .describe('Permanent (default) or Temporary'),
    expiration: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Expiry (ISO 8601), required when expirationMode is Temporary (${ISO_DATE_HINT})`),
    treatAsThreat: z
      .enum(['UNDEFINED', 'Suspicious', 'Malicious'])
      .optional()
      .describe('Raise matches as threats'),
    networkQuarantine: z
      .boolean()
      .optional()
      .describe('Network-quarantine the endpoint on a match (default false)'),
    queryLang: z.enum(['1.0', '2.0']).optional().describe('Query language version'),
  })
);
export type UpdateStarRuleInput = z.infer<typeof UpdateStarRuleInputSchema>;

// enableStarRules: PUT /web/api/v2.1/cloud-detection/rules/enable
export const EnableStarRulesInputSchema = lazySchema(() =>
  z.object({
    ruleIds: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Rule ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
  })
);
export type EnableStarRulesInput = z.infer<typeof EnableStarRulesInputSchema>;

// disableStarRules: PUT /web/api/v2.1/cloud-detection/rules/disable
export const DisableStarRulesInputSchema = lazySchema(() =>
  z.object({
    ruleIds: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Rule ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
  })
);
export type DisableStarRulesInput = z.infer<typeof DisableStarRulesInputSchema>;

// deleteStarRule: DELETE /web/api/v2.1/cloud-detection/rules
export const DeleteStarRuleInputSchema = lazySchema(() =>
  z.object({
    ruleIds: z
      .array(idString(32))
      .min(1)
      .max(1000)
      .describe('Rule ids, 1 to 1000 (spec maximum 5000; connector bound 1000)'),
  })
);
export type DeleteStarRuleInput = z.infer<typeof DeleteStarRuleInputSchema>;

// runScriptAndWait: POST /web/api/v2.1/remote-scripts/execute
export const RunScriptAndWaitInputSchema = lazySchema(() =>
  z.object({
    agentIds: z
      .array(idString(32))
      .max(5000)
      .optional()
      .describe('Agent ids to run on (agentIds or agentUuids is required)'),
    agentUuids: z
      .array(idString(64))
      .max(5000)
      .optional()
      .describe('Agent UUIDs to run on (V1 accepted ids or uuids)'),
    scriptId: idString(32).describe('Script id from getRemoteScripts'),
    taskDescription: z
      .string()
      .min(2)
      .max(500)
      .describe(
        'Task description, 2 to 500 characters (spec minLength 2; maximum is a connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    outputDestination: z
      .enum(['SentinelCloud', 'Local', 'None', 'SingularityXDR'])
      .optional()
      .describe('Where results go; defaults to SentinelCloud (V1 default)'),
    inputParams: z
      .string()
      .max(4096)
      .optional()
      .describe(
        'Script input parameters (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    scriptRuntimeTimeoutSeconds: z
      .number()
      .int()
      .min(60)
      .max(172800)
      .optional()
      .describe(
        'Script runtime limit in seconds, 60 to 172800 (connector-side bound (Kibana needs bounded inputs; the API reference states no limit))'
      ),
    requiresApproval: z
      .boolean()
      .optional()
      .describe('Queue as a pending execution that needs approval in the console'),
    outputDirectory: z
      .string()
      .max(1024)
      .optional()
      .describe('Output directory (outputDestination Local)'),
    outputFilePaths: z
      .array(z.string().min(1).max(1024))
      .max(50)
      .optional()
      .describe('Output file paths to collect'),
    password: z
      .string()
      .max(256)
      .optional()
      .describe('Password for the results archive (sensitive: never logged)'),
    passwordFromScope: z
      .object({
        scopeLevel: z
          .enum(['tenant', 'account', 'site'])
          .describe('Scope level of the stored password'),
        scopeId: idString(32).optional().describe('Account or site id (omit for tenant)'),
      })
      .optional()
      .describe('Use the password stored at a scope: {scopeLevel, scopeId}'),
    singularityxdrUrl: z
      .string()
      .max(2048)
      .optional()
      .describe('Singularity XDR URL (outputDestination SingularityXDR)'),
    singularityxdrKeyword: z.string().max(255).optional().describe('Singularity XDR keyword'),
    apiKey: z
      .string()
      .max(512)
      .optional()
      .describe('Singularity XDR API key (sensitive: never logged)'),
    waitSeconds: z
      .number()
      .int()
      .min(10)
      .max(240)
      .optional()
      .describe(
        'How long the connector waits for completion, 10 to 240 seconds (connector-side bound that keeps one call within the action execution time limit) Default 100.'
      ),
  })
);
export type RunScriptAndWaitInput = z.infer<typeof RunScriptAndWaitInputSchema>;
