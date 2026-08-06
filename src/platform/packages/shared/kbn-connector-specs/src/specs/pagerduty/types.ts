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

export const ListSchedulesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Free-text search string across name and description fields (e.g., "primary" or "weekend")'
      ),
    limit: z.number().optional().describe('Maximum number of schedules to return'),
    include: z
      .array(z.string().max(100))
      .max(10)
      .optional()
      .describe(
        'Related resources to include. Valid values: schedule_layers, overrides_subschedule, final_schedule'
      ),
    team_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Filter schedules to those belonging to these team IDs (e.g., ["P123ABC"])'),
    user_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Filter schedules to those containing these user IDs (e.g., ["P456DEF"])'),
  })
);
export type ListSchedulesInput = z.infer<typeof ListSchedulesInputSchema>;

export const ListEscalationPoliciesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Free-text search string across name and description fields (e.g., "production" or "on-call")'
      ),
    limit: z.number().optional().describe('Maximum number of escalation policies to return'),
    user_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Filter escalation policies by user IDs (e.g., ["P123ABC"])'),
    team_ids: z
      .array(z.string().max(200))
      .max(25)
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
      .array(z.string().max(50))
      .max(3)
      .optional()
      .describe(
        'Filter by incident status. Allowed values: triggered, acknowledged, resolved (e.g., ["triggered", "acknowledged"])'
      ),
    service_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Filter incidents to those belonging to these service IDs (e.g., ["P123ABC"])'),
    user_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe(
        'Filter incidents assigned to these user IDs (e.g., ["P456DEF"]). Only used when request_scope is "assigned"'
      ),
    since: z
      .string()
      .max(50)
      .optional()
      .describe('Start of the date range in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")'),
    until: z
      .string()
      .max(50)
      .optional()
      .describe('End of the date range in ISO 8601 format (e.g., "2024-01-31T23:59:59Z")'),
    urgencies: z
      .array(z.string().max(20))
      .max(2)
      .optional()
      .describe('Filter by urgency level. Allowed values: high, low (e.g., ["high"])'),
    request_scope: z
      .enum(['all', 'teams', 'assigned'])
      .optional()
      .describe(
        'Scope of incidents to return: "all" (default) returns all incidents, "teams" returns team incidents, "assigned" returns incidents assigned to the current user'
      ),
    sort_by: z
      .array(z.string().max(100))
      .max(2)
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
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe(
        'Filter on-call results to these schedule IDs (e.g., ["P123ABC", "P456DEF"]). Use this to find who is on call for specific schedules.'
      ),
    user_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Filter on-call results to these user IDs (e.g., ["P789GHI"])'),
    escalation_policy_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe(
        'Filter on-call results to these escalation policy IDs (e.g., ["PABCDEF"]). Use this to find who is on call for a specific escalation policy.'
      ),
    since: z
      .string()
      .max(50)
      .optional()
      .describe(
        'Start of the time range for on-call periods in ISO 8601 format (e.g., "2024-01-01T00:00:00Z"). Defaults to current time.'
      ),
    until: z
      .string()
      .max(50)
      .optional()
      .describe(
        'End of the time range for on-call periods in ISO 8601 format (e.g., "2024-01-02T00:00:00Z")'
      ),
    time_zone: z
      .string()
      .max(100)
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
      .max(2000)
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
      .max(2000)
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
      .max(200)
      .describe('The PagerDuty schedule ID to retrieve (e.g., "P123ABC")'),
  })
);
export type GetScheduleInput = z.infer<typeof GetScheduleInputSchema>;

export const GetIncidentInputSchema = lazySchema(() =>
  z.object({
    incident_id: z
      .string()
      .min(1)
      .max(200)
      .describe('The PagerDuty incident ID to retrieve (e.g., "Q1A2B3C4D5E6F7")'),
  })
);
export type GetIncidentInput = z.infer<typeof GetIncidentInputSchema>;

export const GetEscalationPolicyInputSchema = lazySchema(() =>
  z.object({
    policy_id: z
      .string()
      .min(1)
      .max(200)
      .describe('The PagerDuty escalation policy ID to retrieve (e.g., "P123ABC")'),
  })
);
export type GetEscalationPolicyInput = z.infer<typeof GetEscalationPolicyInputSchema>;

export const GetTeamInputSchema = lazySchema(() =>
  z.object({
    team_id: z
      .string()
      .min(1)
      .max(200)
      .describe('The PagerDuty team ID to retrieve (e.g., "P123ABC")'),
  })
);
export type GetTeamInput = z.infer<typeof GetTeamInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Name of the MCP tool to call'),
    arguments: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Arguments to pass to the tool (tool-specific)'),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;

// =============================================================================
// Write action input schemas (REST Incidents API)
// =============================================================================

export const TriggerIncidentInputSchema = lazySchema(() =>
  z.object({
    from: z
      .string()
      .max(200)
      .describe(
        'Email address of the PagerDuty user on whose behalf the incident is created. Required by the REST Incidents API when using a service/org-scoped token. Call getUserData to find the current user email.'
      ),
    title: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        'Brief summary of the incident, used as the email notification subject (e.g., "High CPU on prod-web-01")'
      ),
    service_id: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'ID of the PagerDuty service to attach the incident to (e.g., "PIJ90N7"). Use listServices to find service IDs.'
      ),
    urgency: z
      .enum(['high', 'low'])
      .optional()
      .describe(
        'Urgency of the incident: "high" or "low". Defaults to the service\'s urgency setting.'
      ),
    body: z
      .string()
      .max(2000)
      .optional()
      .describe('Detailed description or runbook context to include in the incident body'),
    escalation_policy_id: z
      .string()
      .max(200)
      .optional()
      .describe(
        'ID of an escalation policy to use instead of the service default (e.g., "PABCDEF")'
      ),
    assignment_user_ids: z
      .array(z.string().max(200))
      .max(10)
      .optional()
      .describe(
        'User IDs to assign the incident to directly; overrides escalation policy routing when provided (e.g., ["P123ABC"])'
      ),
  })
);
export type TriggerIncidentInput = z.infer<typeof TriggerIncidentInputSchema>;

export const AcknowledgeIncidentInputSchema = lazySchema(() =>
  z.object({
    from: z
      .string()
      .max(200)
      .describe(
        'Email address of the PagerDuty user acknowledging the incident. Required for service/org-scoped tokens.'
      ),
    incident_id: z
      .string()
      .min(1)
      .max(200)
      .describe('The PagerDuty incident ID to acknowledge (e.g., "Q1A2B3C4D5E6F7")'),
  })
);
export type AcknowledgeIncidentInput = z.infer<typeof AcknowledgeIncidentInputSchema>;

export const ResolveIncidentInputSchema = lazySchema(() =>
  z.object({
    from: z
      .string()
      .max(200)
      .describe(
        'Email address of the PagerDuty user resolving the incident. Required for service/org-scoped tokens.'
      ),
    incident_id: z
      .string()
      .min(1)
      .max(200)
      .describe('The PagerDuty incident ID to resolve (e.g., "Q1A2B3C4D5E6F7")'),
  })
);
export type ResolveIncidentInput = z.infer<typeof ResolveIncidentInputSchema>;

export const UpdateIncidentInputSchema = lazySchema(() =>
  z
    .object({
      from: z
        .string()
        .max(200)
        .describe(
          'Email address of the PagerDuty user making the update. Required for service/org-scoped tokens.'
        ),
      incident_id: z
        .string()
        .min(1)
        .max(200)
        .describe('The PagerDuty incident ID to update (e.g., "Q1A2B3C4D5E6F7")'),
      title: z.string().max(1024).optional().describe('New title for the incident'),
      status: z
        .enum(['acknowledged', 'resolved'])
        .optional()
        .describe('New status: "acknowledged" or "resolved"'),
      urgency: z.enum(['high', 'low']).optional().describe('New urgency: "high" or "low"'),
      priority_id: z
        .string()
        .max(200)
        .optional()
        .describe('ID of a PagerDuty priority to attach to the incident'),
      assignment_user_ids: z
        .array(z.string().max(200))
        .max(10)
        .optional()
        .describe('Reassign the incident to these user IDs (replaces current assignments)'),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.status !== undefined ||
        v.urgency !== undefined ||
        v.priority_id !== undefined ||
        v.assignment_user_ids !== undefined,
      {
        message:
          'At least one of title, status, urgency, priority_id, or assignment_user_ids must be provided',
      }
    )
);
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentInputSchema>;

export const ListServicesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(2000)
      .optional()
      .describe('Free-text search across service name and description fields'),
    limit: z
      .number()
      .max(100)
      .optional()
      .describe('Maximum number of services to return (max 100)'),
    team_ids: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Filter to services belonging to these team IDs (e.g., ["P123ABC"])'),
  })
);
export type ListServicesInput = z.infer<typeof ListServicesInputSchema>;

export const AddRespondersInputSchema = lazySchema(() =>
  z
    .object({
      from: z
        .string()
        .max(200)
        .describe(
          'Email address of the PagerDuty user making the request. Required for service/org-scoped tokens.'
        ),
      incident_id: z
        .string()
        .min(1)
        .max(200)
        .describe('The PagerDuty incident ID for which to request additional responders'),
      requester_id: z
        .string()
        .min(1)
        .max(200)
        .describe(
          'PagerDuty user ID of the person requesting the responders. Call getUserData to get the current user ID (e.g., "P123ABC").'
        ),
      message: z
        .string()
        .max(2000)
        .describe('Message sent to requested responders explaining why their help is needed'),
      responder_user_ids: z
        .array(z.string().max(200))
        .max(25)
        .optional()
        .describe('IDs of users to request as responders (e.g., ["P456DEF"])'),
      responder_escalation_policy_ids: z
        .array(z.string().max(200))
        .max(10)
        .optional()
        .describe(
          'IDs of escalation policies whose on-call users to notify as responders (e.g., ["PABCDEF"])'
        ),
    })
    .refine(
      (v) =>
        (v.responder_user_ids?.length ?? 0) > 0 ||
        (v.responder_escalation_policy_ids?.length ?? 0) > 0,
      {
        message:
          'At least one of responder_user_ids or responder_escalation_policy_ids must be provided',
      }
    )
);
export type AddRespondersInput = z.infer<typeof AddRespondersInputSchema>;

export const RunResponsePlayInputSchema = lazySchema(() =>
  z.object({
    from: z
      .string()
      .max(200)
      .describe(
        'Email address of the PagerDuty user running the response play. Required for service/org-scoped tokens.'
      ),
    incident_id: z
      .string()
      .min(1)
      .max(200)
      .describe('The PagerDuty incident ID against which to run the response play'),
    response_play_id: z
      .string()
      .min(1)
      .max(200)
      .describe('ID of the response play to execute (e.g., "PABCDEF")'),
    requester_id: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'PagerDuty user ID of the requester. Call getUserData to get the current user ID (e.g., "P123ABC").'
      ),
  })
);
export type RunResponsePlayInput = z.infer<typeof RunResponsePlayInputSchema>;
