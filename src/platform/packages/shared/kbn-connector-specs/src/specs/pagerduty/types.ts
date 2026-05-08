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
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const GetUserDataInputSchema = lazySchema(() => z.object({}));
export type GetUserDataInput = z.infer<typeof GetUserDataInputSchema>;

export const ListSchedulesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .optional()
      .describe(
        'Free-text search string across name and description fields (e.g., "primary" or "weekend")'
      ),
    limit: z.number().optional().describe('Maximum number of schedules to return'),
    include: z
      .array(z.string())
      .optional()
      .describe(
        'Related resources to include. Valid values: schedule_layers, overrides_subschedule, final_schedule'
      ),
    team_ids: z
      .array(z.string())
      .optional()
      .describe('Filter schedules to those belonging to these team IDs (e.g., ["P123ABC"])'),
    user_ids: z
      .array(z.string())
      .optional()
      .describe('Filter schedules to those containing these user IDs (e.g., ["P456DEF"])'),
  })
);
export type ListSchedulesInput = z.infer<typeof ListSchedulesInputSchema>;

export const ListEscalationPoliciesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .optional()
      .describe(
        'Free-text search string across name and description fields (e.g., "production" or "on-call")'
      ),
    limit: z.number().optional().describe('Maximum number of escalation policies to return'),
    user_ids: z
      .array(z.string())
      .optional()
      .describe('Filter escalation policies by user IDs (e.g., ["P123ABC"])'),
    team_ids: z
      .array(z.string())
      .optional()
      .describe('Filter escalation policies by team IDs (e.g., ["P456DEF"])'),
  })
);
export type ListEscalationPoliciesInput = z.infer<typeof ListEscalationPoliciesInputSchema>;

export const ListIncidentsInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .max(1000)
      .default(25)
      .describe('Maximum number of incidents to return (max 1000, default 25)'),
    status: z
      .array(z.string())
      .optional()
      .describe(
        'Filter by incident status. Allowed values: triggered, acknowledged, resolved (e.g., ["triggered", "acknowledged"])'
      ),
    service_ids: z
      .array(z.string())
      .optional()
      .describe('Filter incidents to those belonging to these service IDs (e.g., ["P123ABC"])'),
    user_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Filter incidents assigned to these user IDs (e.g., ["P456DEF"]). Only used when request_scope is "assigned"'
      ),
    since: z
      .string()
      .optional()
      .describe('Start of the date range in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")'),
    until: z
      .string()
      .optional()
      .describe('End of the date range in ISO 8601 format (e.g., "2024-01-31T23:59:59Z")'),
    urgencies: z
      .array(z.string())
      .optional()
      .describe('Filter by urgency level. Allowed values: high, low (e.g., ["high"])'),
    request_scope: z
      .enum(['all', 'teams', 'assigned'])
      .optional()
      .describe(
        'Scope of incidents to return: "all" (default) returns all incidents, "teams" returns team incidents, "assigned" returns incidents assigned to the current user'
      ),
    sort_by: z
      .array(z.string())
      .optional()
      .describe(
        'Sort field(s) and direction, max 2 entries. Allowed fields: incident_number, created_at, resolved_at, urgency. Use colon for direction (e.g., "created_at:desc" or "incident_number:asc"). Default direction is asc.'
      ),
  })
);
export type ListIncidentsInput = z.infer<typeof ListIncidentsInputSchema>;

export const ListOncallsInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .optional()
      .default(20)
      .describe('Maximum number of on-call results to return (default 20)'),
    schedule_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Filter on-call results to these schedule IDs (e.g., ["P123ABC", "P456DEF"]). Use this to find who is on call for specific schedules.'
      ),
    user_ids: z
      .array(z.string())
      .optional()
      .describe('Filter on-call results to these user IDs (e.g., ["P789GHI"])'),
    escalation_policy_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Filter on-call results to these escalation policy IDs (e.g., ["PABCDEF"]). Use this to find who is on call for a specific escalation policy.'
      ),
    since: z
      .string()
      .optional()
      .describe(
        'Start of the time range for on-call periods in ISO 8601 format (e.g., "2024-01-01T00:00:00Z"). Defaults to current time.'
      ),
    until: z
      .string()
      .optional()
      .describe(
        'End of the time range for on-call periods in ISO 8601 format (e.g., "2024-01-02T00:00:00Z")'
      ),
    time_zone: z
      .string()
      .optional()
      .describe(
        'IANA time zone database name to render dates in (e.g., "America/New_York" or "Europe/London")'
      ),
    earliest: z
      .boolean()
      .optional()
      .describe(
        'If true, return only the earliest on-call entry for each unique user+escalation policy combination. Useful for finding who is currently on call without duplicates. Default is true.'
      ),
  })
);
export type ListOncallsInput = z.infer<typeof ListOncallsInputSchema>;

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .optional()
      .describe(
        'Free-text search across name and email fields (e.g., "alice" or "alice@example.com")'
      ),
    limit: z.number().optional().describe('Maximum number of users to return'),
  })
);
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const ListTeamsInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .optional()
      .describe('Free-text search across name and description fields (e.g., "platform" or "sre")'),
    limit: z.number().optional().describe('Maximum number of teams to return'),
  })
);
export type ListTeamsInput = z.infer<typeof ListTeamsInputSchema>;

export const GetScheduleInputSchema = lazySchema(() =>
  z.object({
    schedule_id: z
      .string()
      .min(1)
      .describe('The PagerDuty schedule ID to retrieve (e.g., "P123ABC")'),
  })
);
export type GetScheduleInput = z.infer<typeof GetScheduleInputSchema>;

export const GetIncidentInputSchema = lazySchema(() =>
  z.object({
    incident_id: z
      .string()
      .min(1)
      .describe('The PagerDuty incident ID to retrieve (e.g., "Q1A2B3C4D5E6F7")'),
  })
);
export type GetIncidentInput = z.infer<typeof GetIncidentInputSchema>;

export const GetEscalationPolicyInputSchema = lazySchema(() =>
  z.object({
    policy_id: z
      .string()
      .min(1)
      .describe('The PagerDuty escalation policy ID to retrieve (e.g., "P123ABC")'),
  })
);
export type GetEscalationPolicyInput = z.infer<typeof GetEscalationPolicyInputSchema>;

export const GetTeamInputSchema = lazySchema(() =>
  z.object({
    team_id: z.string().min(1).describe('The PagerDuty team ID to retrieve (e.g., "P123ABC")'),
  })
);
export type GetTeamInput = z.infer<typeof GetTeamInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).describe('Name of the MCP tool to call'),
    arguments: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Arguments to pass to the tool (tool-specific)'),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
