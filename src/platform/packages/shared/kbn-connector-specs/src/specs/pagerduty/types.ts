/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = z.object({});
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const GetUserDataInputSchema = z.object({});
export type GetUserDataInput = z.infer<typeof GetUserDataInputSchema>;

export const ListSchedulesInputSchema = z.object({
  query: z.string().optional().describe('Free-text search across name and description fields'),
  limit: z.number().optional().describe('Maximum number of schedules to return'),
  include: z
    .array(z.string())
    .optional()
    .describe(
      'Related resources to include (schedule_layers, overrides_subschedule, final_schedule)'
    ),
  team_ids: z.array(z.string()).optional().describe('Filter schedules by team IDs'),
  user_ids: z.array(z.string()).optional().describe('Filter schedules by user IDs'),
});
export type ListSchedulesInput = z.infer<typeof ListSchedulesInputSchema>;

export const ListEscalationPoliciesInputSchema = z.object({
  query: z.string().optional().describe('Free-text search across name and description fields'),
  limit: z.number().optional().describe('Maximum number of escalation policies to return'),
  user_ids: z.array(z.string()).optional().describe('Filter by user IDs'),
  team_ids: z.array(z.string()).optional().describe('Filter by team IDs'),
});
export type ListEscalationPoliciesInput = z.infer<typeof ListEscalationPoliciesInputSchema>;

export const ListIncidentsInputSchema = z.object({
  limit: z.number().optional().describe('Maximum number of incidents to return (max 1000)'),
  status: z
    .array(z.string())
    .optional()
    .describe('Filter by status (triggered, acknowledged, resolved)'),
  service_ids: z.array(z.string()).optional().describe('Filter by service IDs'),
  user_ids: z.array(z.string()).optional().describe('Filter by user IDs'),
  since: z.string().optional().describe('Start of date range (ISO 8601)'),
  until: z.string().optional().describe('End of date range (ISO 8601)'),
  urgencies: z.array(z.string()).optional().describe('Filter by urgency'),
  request_scope: z.enum(['all', 'teams', 'assigned']).optional().describe('Scope of incidents'),
  sort_by: z
    .array(z.string())
    .optional()
    .describe(
      'Sort field(s) and direction (e.g., created_at:desc). Allowed: incident_number, created_at, resolved_at, urgency.'
    ),
});
export type ListIncidentsInput = z.infer<typeof ListIncidentsInputSchema>;

export const ListOncallsInputSchema = z.object({
  limit: z.number().optional().default(20).describe('Maximum number of on-call results to return'),
  schedule_ids: z.array(z.string()).optional().describe('Filter by schedule IDs'),
  user_ids: z.array(z.string()).optional().describe('Filter by user IDs'),
  escalation_policy_ids: z.array(z.string()).optional().describe('Filter by escalation policy IDs'),
  since: z.string().optional().describe('Start of time range (ISO 8601)'),
  until: z.string().optional().describe('End of time range (ISO 8601)'),
  time_zone: z.string().optional().describe('IANA time zone name for date rendering'),
  earliest: z
    .boolean()
    .optional()
    .describe(
      'If true, return only the earliest on-call for each user+escalation policy combination'
    ),
});
export type ListOncallsInput = z.infer<typeof ListOncallsInputSchema>;

export const ListUsersInputSchema = z.object({
  query: z.string().optional().describe('Free-text search across name and email fields'),
  limit: z.number().optional().describe('Maximum number of users to return'),
});
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const ListTeamsInputSchema = z.object({
  query: z.string().optional().describe('Free-text search across name and description fields'),
  limit: z.number().optional().describe('Maximum number of teams to return'),
});
export type ListTeamsInput = z.infer<typeof ListTeamsInputSchema>;

export const GetScheduleInputSchema = z.object({
  schedule_id: z.string().min(1).describe('The schedule ID to retrieve'),
});
export type GetScheduleInput = z.infer<typeof GetScheduleInputSchema>;

export const GetIncidentInputSchema = z.object({
  incident_id: z.string().min(1).describe('The incident ID to retrieve'),
});
export type GetIncidentInput = z.infer<typeof GetIncidentInputSchema>;

export const GetEscalationPolicyInputSchema = z.object({
  policy_id: z.string().min(1).describe('The escalation policy ID to retrieve'),
});
export type GetEscalationPolicyInput = z.infer<typeof GetEscalationPolicyInputSchema>;

export const GetTeamInputSchema = z.object({
  team_id: z.string().min(1).describe('The team ID to retrieve'),
});
export type GetTeamInput = z.infer<typeof GetTeamInputSchema>;

export const CallToolInputSchema = z.object({
  name: z.string().min(1).describe('Name of the MCP tool to call'),
  arguments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Arguments to pass to the tool (tool-specific)'),
});
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
