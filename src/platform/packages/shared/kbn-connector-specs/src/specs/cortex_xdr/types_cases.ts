/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_ISSUE_UPDATES } from './constants';
import { epochMs, filterEndpointIds, maxResults, searchFrom } from './input_fields';

// ---------------------------------------------------------------------------
// Cases and issues
// ---------------------------------------------------------------------------

const statusList = (what: string) =>
  z
    .array(z.string().min(1).max(64))
    .min(1)
    .max(10)
    .optional()
    .describe(`${what} statuses, for example ["New", "In Progress"]`);

export const GetCasesInputSchema = lazySchema(() =>
  z.object({
    caseId: z.number().int().min(1).optional().describe('Only this case id'),
    status: statusList('Case').describe(
      'Case statuses: "New", "In Progress", "Resolved", or a custom status of the tenant'
    ),
    severity: z
      .array(z.enum(['info', 'low', 'medium', 'high', 'critical']))
      .min(1)
      .max(5)
      .optional()
      .describe('Case severities (lowercase), for example ["high", "critical"]'),
    createdAfter: epochMs('Cases created at or after this time'),
    createdBefore: epochMs('Cases created at or before this time'),
    modifiedAfter: epochMs('Cases modified at or after this time'),
    modifiedBefore: epochMs('Cases modified at or before this time'),
    sortField: z
      .enum(['case_id', 'severity', 'creation_time', 'modification_time'])
      .optional()
      .describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    searchFrom: searchFrom(),
    maxResults: maxResults(),
  })
);
export type GetCasesInput = z.infer<typeof GetCasesInputSchema>;

export const GetCaseDetailsInputSchema = lazySchema(() =>
  z.object({
    caseId: z.number().int().min(1).describe('Case id (integer), from getCases'),
  })
);
export type GetCaseDetailsInput = z.infer<typeof GetCaseDetailsInputSchema>;

export const GetIssuesInputSchema = lazySchema(() =>
  z.object({
    ids: z
      .array(z.number().int().min(1))
      .min(1)
      .max(100)
      .optional()
      .describe('Only these issue ids (integers), up to 100'),
    severity: z
      .array(z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))
      .min(1)
      .max(5)
      .optional()
      .describe('Issue severities (uppercase), for example ["HIGH", "CRITICAL"]'),
    detectionMethod: z
      .array(z.string().min(1).max(64))
      .min(1)
      .max(20)
      .optional()
      .describe('Issue detection methods (sources), for example ["XDR Agent", "XDR Analytics"]'),
    status: statusList('Issue').describe('Issue statuses: "New", "In Progress", "Resolved"'),
    insertedAfter: epochMs('Issues created at or after this time'),
    insertedBefore: epochMs('Issues created at or before this time'),
    includeEvidences: z
      .boolean()
      .default(false)
      .describe('Include the evidence details of each issue. Defaults to false.'),
    sortField: z.enum(['id', 'severity', 'observation_time']).optional().describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    searchFrom: searchFrom(),
    maxResults: maxResults(),
  })
);
export type GetIssuesInput = z.infer<typeof GetIssuesInputSchema>;

const isResolved = (status?: string) => status?.trim().toLowerCase() === 'resolved';

export const UpdateCaseInputSchema = lazySchema(() =>
  z
    .object({
      caseId: z.number().int().min(1).describe('Case id (integer), from getCases'),
      status: z
        .string()
        .min(1)
        .max(64)
        .optional()
        .describe('New status: "New", "In Progress", "Resolved", or a custom status of the tenant'),
      resolveReason: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .describe(
          'Resolve reason, required when status is "Resolved". Built-in values: "Resolved - Known Issue", "Resolved - Duplicate Case", "Resolved - False Positive", "Resolved - Other", "Resolved - True Positive", "Resolved - Security Testing"; tenants can add custom reasons'
        ),
      resolveComment: z
        .string()
        .max(4096)
        .optional()
        .describe('Resolve comment; only with status "Resolved"'),
      userSeverity: z
        .enum(['low', 'medium', 'high', 'critical', ''])
        .optional()
        .describe(
          'Manual severity: "low", "medium", "high" or "critical"; an empty string clears it. Needs the Change Case/Issue Severity permission.'
        ),
      assignedUser: z
        .email()
        .max(320)
        .optional()
        .describe('Email of the Cortex XDR user to assign the case to'),
      notes: z.string().max(4096).optional().describe('Case notes, up to 4096 characters'),
    })
    .refine(
      (input) =>
        [
          input.status,
          input.resolveReason,
          input.resolveComment,
          input.userSeverity,
          input.assignedUser,
          input.notes,
        ].some((value) => value !== undefined),
      { message: 'Give at least one field to update' }
    )
    .refine(({ status, resolveReason }) => !isResolved(status) || resolveReason !== undefined, {
      message: 'resolveReason is required when status is "Resolved"',
    })
    .refine(({ status, resolveComment }) => resolveComment === undefined || isResolved(status), {
      message: 'resolveComment can only be set together with status "Resolved"',
    })
);
export type UpdateCaseInput = z.infer<typeof UpdateCaseInputSchema>;

export const UpdateIssueInputSchema = lazySchema(() =>
  z
    .object({
      issueIds: z
        .array(z.number().int().min(1))
        .min(1)
        .max(MAX_ISSUE_UPDATES)
        .describe(`Issue ids (integers) to update, 1 to ${MAX_ISSUE_UPDATES}, from getIssues`),
      status: z.enum(['New', 'In Progress', 'Resolved']).optional().describe('New status'),
      severity: z
        .enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        .optional()
        .describe('New severity. Needs the Change Case/Issue Severity permission.'),
      resolutionReason: z
        .enum([
          'Resolved - Threat Handled',
          'Resolved - Known Issue',
          'Resolved - Duplicate Issue',
          'Resolved - False Positive',
          'Resolved - Other',
          'Resolved - True Positive',
          'Resolved - Security Testing',
          'Resolved - Risk Accepted',
          'Resolved - Fixed',
          'Resolved - Dismissed',
        ])
        .optional()
        .describe(
          'Resolution reason, required when status is "Resolved". The last three depend on the tenant license.'
        ),
      resolutionComment: z
        .string()
        .max(4096)
        .optional()
        .describe('Resolution comment; only with status "Resolved"'),
    })
    .refine(({ status, severity }) => status !== undefined || severity !== undefined, {
      message: 'Give status or severity (Cortex XDR needs at least one of them)',
    })
    .refine(
      ({ status, resolutionReason }) => status !== 'Resolved' || resolutionReason !== undefined,
      {
        message: 'resolutionReason is required when status is "Resolved"',
      }
    )
    .refine(
      ({ status, resolutionReason, resolutionComment }) =>
        status === 'Resolved' ||
        (resolutionReason === undefined && resolutionComment === undefined),
      { message: 'resolutionReason and resolutionComment can only be set with status "Resolved"' }
    )
);
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

// ---------------------------------------------------------------------------
// XQL
// ---------------------------------------------------------------------------

export const RunXqlQueryInputSchema = lazySchema(() =>
  z
    .object({
      query: z
        .string()
        .min(1)
        .max(10_000)
        .describe(
          'XQL query text. Example: "dataset = xdr_data | filter event_type = ENUM.PROCESS | limit 10"'
        ),
      relativeTime: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Look-back window in milliseconds from now, e.g. 86400000 for 24 hours'),
      fromTime: epochMs('Start of an absolute time range; use with toTime'),
      toTime: epochMs('End of an absolute time range; use with fromTime'),
    })
    .refine(
      ({ relativeTime, fromTime, toTime }) =>
        relativeTime === undefined
          ? (fromTime === undefined) === (toTime === undefined)
          : fromTime === undefined && toTime === undefined,
      { message: 'Give relativeTime, or fromTime together with toTime, but not both forms' }
    )
    .refine(
      ({ fromTime, toTime }) =>
        fromTime === undefined || toTime === undefined || fromTime <= toTime,
      { message: 'fromTime must not be after toTime' }
    )
);
export type RunXqlQueryInput = z.infer<typeof RunXqlQueryInputSchema>;

export const GetXqlResultsInputSchema = lazySchema(() =>
  z.object({
    queryId: z
      .string()
      .max(128)
      .regex(/^[A-Za-z0-9_-]{1,128}$/, 'Enter the query id returned by runXqlQuery')
      .describe('Query id returned by runXqlQuery (queryId)'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum rows to return (1-1000)'),
    pendingFlag: z
      .boolean()
      .default(true)
      .describe(
        'true (default): return at once with status PENDING while the query runs. false: wait for it to finish (up to 60 seconds).'
      ),
    format: z.enum(['json', 'csv']).default('json').describe('Result format (default json)'),
  })
);
export type GetXqlResultsInput = z.infer<typeof GetXqlResultsInputSchema>;

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

const IndicatorSchema = lazySchema(() =>
  z.object({
    indicator: z
      .string()
      .min(1)
      .max(2048)
      .describe('Indicator value: a hash, IP, path, domain name or file name'),
    type: z
      .enum(['HASH', 'IP', 'PATH', 'DOMAIN_NAME', 'FILENAME', 'MIXED'])
      .describe('Indicator type'),
    severity: z
      .enum(['SEV_010_INFO', 'SEV_020_LOW', 'SEV_030_MEDIUM', 'SEV_040_HIGH'])
      .optional()
      .describe('Severity of matches'),
    ruleId: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Existing rule_id to overwrite (from getIndicators); omit to add a new indicator'),
    expirationDate: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Expiration time (epoch milliseconds)'),
    defaultExpirationEnabled: z
      .boolean()
      .optional()
      .describe('Use the tenant default expiration for this indicator type'),
    comment: z.string().max(1024).optional().describe('Comment, up to 1024 characters'),
    reputation: z
      .enum(['GOOD', 'BAD', 'SUSPICIOUS', 'UNKNOWN', 'NO_REPUTATION'])
      .optional()
      .describe('Reputation'),
    reliability: z
      .enum(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
      .optional()
      .describe('Source reliability, A (most reliable) to G'),
  })
);
export type IndicatorInput = z.infer<typeof IndicatorSchema>;

export const InsertIndicatorsInputSchema = lazySchema(() =>
  z.object({
    indicators: z
      .array(IndicatorSchema)
      .min(1)
      .max(1000)
      .describe('Indicators (IOCs) to insert or update, 1 to 1000'),
  })
);
export type InsertIndicatorsInput = z.infer<typeof InsertIndicatorsInputSchema>;

export const GetIndicatorsInputSchema = lazySchema(() =>
  z.object({
    indicator: z.string().min(1).max(2048).optional().describe('Only this indicator value'),
    type: z
      .enum(['hash', 'ip', 'path', 'domain_name', 'filename', 'mixed'])
      .optional()
      .describe('Only this indicator type (lowercase for this API)'),
    severity: z
      .enum(['SEV_010_INFO', 'SEV_020_LOW', 'SEV_030_MEDIUM', 'SEV_040_HIGH'])
      .optional()
      .describe('Only this severity'),
    extendedView: z.boolean().optional().describe('Return extended indicator details'),
    searchFrom: searchFrom(),
    maxResults: maxResults(),
  })
);
export type GetIndicatorsInput = z.infer<typeof GetIndicatorsInputSchema>;

// ---------------------------------------------------------------------------
// Audit logs and users
// ---------------------------------------------------------------------------

const textList = (max: number, maxLength: number, what: string) =>
  z.array(z.string().min(1).max(maxLength)).min(1).max(max).optional().describe(what);

export const GetAuditLogsInputSchema = lazySchema(() =>
  z
    .object({
      logType: z
        .enum(['management', 'agent'])
        .describe(
          '"management": user and API actions in the console (isolations, quarantines, policy changes). "agent": reports sent by endpoint agents.'
        ),
      timestampFrom: epochMs('Only entries at or after this time'),
      timestampTo: epochMs('Only entries at or before this time'),
      types: textList(20, 64, 'Only these entry types, up to 20'),
      subTypes: textList(20, 64, 'Only these entry sub types, up to 20'),
      results: textList(5, 32, 'Only these results, for example ["SUCCESS", "FAIL"]'),
      emails: z
        .array(z.email().max(320))
        .min(1)
        .max(20)
        .optional()
        .describe('Only entries by these user emails (logType "management" only), up to 20'),
      endpointIds: filterEndpointIds().describe(
        'Only entries from these endpoint ids (logType "agent" only), up to 100'
      ),
      searchFrom: searchFrom(),
      maxResults: maxResults(),
    })
    .refine(({ logType, emails }) => emails === undefined || logType === 'management', {
      message: 'emails can only be used with logType "management"',
    })
    .refine(({ logType, endpointIds }) => endpointIds === undefined || logType === 'agent', {
      message: 'endpointIds can only be used with logType "agent"',
    })
);
export type GetAuditLogsInput = z.infer<typeof GetAuditLogsInputSchema>;

export const GetRiskyUsersInputSchema = lazySchema(() => z.object({}));
export type GetRiskyUsersInput = z.infer<typeof GetRiskyUsersInputSchema>;
