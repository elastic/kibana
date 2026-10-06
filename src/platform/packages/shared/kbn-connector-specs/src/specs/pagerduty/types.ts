/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Input schemas for the PagerDuty MCP server's consolidated tools. Each tool takes a single
 * `request` object discriminated by `action`. The shapes mirror the server's `tools/list` output.
 */

// =============================================================================
// Shared building blocks
// =============================================================================

const idSchema = lazySchema(() => z.string().min(1).max(200));

const idsSchema = lazySchema(() => z.array(idSchema).max(25));

const dateTimeSchema = lazySchema(() => z.string().max(64));

const textSchema = lazySchema(() => z.string().max(2000));

const limitSchema = lazySchema(() => z.number().int().min(1).max(100));

const offsetSchema = lazySchema(() => z.number().int().min(0));

const referenceSchema = lazySchema(() =>
  z.object({ id: idSchema, summary: z.string().max(500).optional() })
);

const pageSchema = () => ({
  limit: limitSchema.optional().describe('Maximum number of results to return (1-100)'),
  offset: offsetSchema.optional().describe('Offset for pagination; use after a truncated response'),
});

const memberSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['user_member', 'empty_member'])
      .describe("'empty_member' is a deliberately unfilled slot"),
    user_id: idSchema.optional().describe('Required for user_member'),
  })
);

const zonedTimeSchema = lazySchema(() =>
  z.object({
    date_time: dateTimeSchema.describe("ISO 8601 with UTC offset, e.g. '2026-09-04T13:00:00Z'"),
    time_zone: z.string().min(1).max(100).describe("IANA time zone name, e.g. 'America/New_York'"),
  })
);

const rotationEventDataSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200),
    start_time: zonedTimeSchema,
    end_time: zonedTimeSchema,
    effective_since: dateTimeSchema.describe(
      'When the event takes effect; past values are clamped to now'
    ),
    effective_until: dateTimeSchema
      .optional()
      .describe('When the event stops being effective; omit for indefinite'),
    recurrence: z
      .array(z.string().max(500))
      .max(25)
      .describe(
        "RFC 5545 rules: exactly one RRULE (e.g. 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU'), plus optional EXDATE/RDATE entries"
      ),
    assignment_strategy: z.object({
      type: z.enum(['rotating_member_assignment_strategy', 'every_member_assignment_strategy']),
      members: z.array(memberSchema).max(20),
      shifts_per_member: z
        .number()
        .int()
        .optional()
        .describe("Required when type is 'rotating_member_assignment_strategy'"),
    }),
  })
);

const customShiftDataSchema = lazySchema(() =>
  z.object({
    start_time: dateTimeSchema,
    end_time: dateTimeSchema,
    assignments: z
      .array(z.object({ member: memberSchema }))
      .length(1)
      .describe('The single assignment covering this shift'),
  })
);

const overrideDataSchema = lazySchema(() =>
  z.object({
    start_time: dateTimeSchema,
    end_time: dateTimeSchema,
    overridden_member: memberSchema,
    overriding_member: memberSchema,
  })
);

const legacyScheduleSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200),
    time_zone: z.string().min(1).max(100),
    description: textSchema.optional(),
    schedule_layers: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          start: dateTimeSchema,
          end: dateTimeSchema.optional(),
          rotation_virtual_start: dateTimeSchema,
          rotation_turn_length_seconds: z.number().int(),
          users: z.array(z.object({ user: referenceSchema })).max(100),
          restrictions: z
            .array(
              z.object({
                type: z.enum(['daily_restriction', 'weekly_restriction']),
                start_time_of_day: z.string().max(16).describe('HH:MM:SS'),
                duration_seconds: z.number().int(),
                start_day_of_week: z
                  .number()
                  .int()
                  .optional()
                  .describe('1=Monday, 7=Sunday (ISO-8601)'),
              })
            )
            .max(25)
            .optional(),
        })
      )
      .max(25),
  })
);

const routerActionsSchema = lazySchema(() =>
  z.object({
    route_to: idSchema.optional().describe('The ID of the target service for the resulting alert'),
    dynamic_route_to: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe('Route dynamically using the event payload. Available to AIOps customers.'),
  })
);

const routerRuleConditionsSchema = lazySchema(() =>
  z
    .array(
      z.object({
        expression: z
          .string()
          .max(2000)
          .describe('A PCL condition, e.g. "event.summary matches part \'my service error\'"'),
      })
    )
    .max(50)
    .describe('The rule matches if any of these conditions match')
);

const alertGroupingSettingSchema = lazySchema(() =>
  z.object({
    name: z.string().max(200).optional(),
    description: textSchema.optional(),
    type: z
      .enum(['content_based', 'content_based_intelligent', 'intelligent', 'time'])
      .describe('The alert grouping algorithm'),
    config: z
      .object({
        aggregate: z.enum(['all', 'any']).optional(),
        fields: z.array(z.string().max(200)).max(25).optional(),
        time_window: z
          .number()
          .int()
          .optional()
          .describe('Seconds; 0 uses the recommended window, otherwise 300-3600 (or 86400)'),
        recommended_time_window: z.number().int().optional(),
        timeout: z.number().int().optional().describe('Time-based only: seconds, 60-86400'),
        iag_fields: z.array(z.string().max(200)).max(25).optional(),
      })
      .describe('Configuration matching the setting type'),
    services: z.array(referenceSchema).max(100),
  })
);

const statusPageReferenceSchema = (type: string) =>
  z.object({ id: idSchema, type: z.literal(type).optional() });

const postUpdateSchema = lazySchema(() =>
  z.object({
    message: z.string().min(1).max(5000),
    status: statusPageReferenceSchema('status_page_status'),
    severity: statusPageReferenceSchema('status_page_severity'),
    impacted_services: z
      .array(
        z.object({
          service: statusPageReferenceSchema('status_page_service'),
          impact: statusPageReferenceSchema('status_page_impact'),
        })
      )
      .max(100)
      .optional(),
    update_frequency_ms: z.number().int().optional(),
    notify_subscribers: z.boolean().optional(),
    reported_at: dateTimeSchema.optional(),
    post: statusPageReferenceSchema('status_page_post').optional(),
  })
);

const serviceDataSchema = lazySchema(() =>
  z.object({
    service: z.object({
      id: idSchema.optional(),
      name: z.string().max(200).optional(),
      description: textSchema.optional(),
      escalation_policy: referenceSchema,
      teams: z.array(referenceSchema).max(25).optional(),
      status: z.string().max(100).optional(),
    }),
  })
);

const teamDataSchema = lazySchema(() =>
  z.object({
    team: z.object({
      name: z.string().min(1).max(200),
      description: textSchema.optional(),
      default_role: z.enum(['manager', 'none']).optional(),
    }),
  })
);

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const BrowseUsersInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({ action: z.literal('get') }),
      z.object({
        action: z.literal('list'),
        query: textSchema.optional(),
        team_ids: idsSchema.optional(),
        ...pageSchema(),
      }),
    ]),
  })
);
export type BrowseUsersInput = z.infer<typeof BrowseUsersInputSchema>;

export const BrowseSchedulesInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        query: textSchema.optional().describe('Filter by schedule name'),
        team_ids: idsSchema.optional(),
        user_ids: idsSchema
          .optional()
          .describe('Filter by member user IDs. Lists legacy (v2) schedules only.'),
        include: z
          .array(z.enum(['schedule_layers', 'overrides_subschedule', 'final_schedule']))
          .max(3)
          .optional()
          .describe('Extra detail for legacy (v2) schedules. Lists legacy schedules only.'),
        kind: z
          .enum(['legacy', 'shift_based'])
          .optional()
          .describe('Restrict to one scheduling system; omit to list both'),
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('get'),
        schedule_id: idSchema,
        kind: z
          .enum(['legacy', 'shift_based'])
          .optional()
          .describe('Omit unless certain; the tool detects the kind'),
      }),
      z.object({ action: z.literal('list_users'), schedule_id: idSchema }),
      z.object({
        action: z.literal('list_oncalls'),
        time_zone: z
          .string()
          .max(100)
          .optional()
          .describe("IANA time zone, e.g. 'America/New_York'"),
        user_ids: idsSchema.optional(),
        escalation_policy_ids: idsSchema.optional(),
        schedule_ids: idsSchema.optional(),
        service_ids: idsSchema
          .optional()
          .describe('Filter by the escalation policies of these services'),
        since: dateTimeSchema.optional().describe('Start of the range; defaults to now'),
        until: dateTimeSchema
          .optional()
          .describe('End of the range, at most 90 days ahead; defaults to now'),
        earliest: z
          .boolean()
          .optional()
          .describe(
            'Return only the earliest on-call per escalation policy, level and user (default true)'
          ),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('list_rotations'), schedule_id: idSchema, ...pageSchema() }),
      z.object({
        action: z.literal('get_rotation'),
        schedule_id: idSchema,
        rotation_id: idSchema,
      }),
      z.object({
        action: z.literal('list_rotation_events'),
        schedule_id: idSchema,
        rotation_id: idSchema,
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('get_rotation_event'),
        schedule_id: idSchema,
        rotation_id: idSchema,
        event_id: idSchema,
      }),
      z.object({
        action: z.literal('list_custom_shifts'),
        schedule_id: idSchema,
        since: dateTimeSchema,
        until: dateTimeSchema,
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('get_custom_shift'),
        schedule_id: idSchema,
        custom_shift_id: idSchema,
      }),
      z.object({
        action: z.literal('list_overrides'),
        schedule_id: idSchema,
        since: dateTimeSchema,
        until: dateTimeSchema,
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('get_override'),
        schedule_id: idSchema,
        override_id: idSchema,
      }),
    ]),
  })
);
export type BrowseSchedulesInput = z.infer<typeof BrowseSchedulesInputSchema>;

export const BrowseEscalationPoliciesInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        query: textSchema.optional(),
        user_ids: idsSchema.optional(),
        team_ids: idsSchema.optional(),
        include: z
          .array(z.enum(['services', 'teams']))
          .max(2)
          .optional(),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('get'), policy_id: idSchema }),
    ]),
  })
);
export type BrowseEscalationPoliciesInput = z.infer<typeof BrowseEscalationPoliciesInputSchema>;

export const BrowseIncidentsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        request_scope: z.enum(['all', 'teams', 'assigned']).optional(),
        statuses: z
          .array(z.enum(['triggered', 'acknowledged', 'resolved']))
          .max(3)
          .optional(),
        since: dateTimeSchema.optional().describe('ISO 8601 start time'),
        until: dateTimeSchema.optional().describe('ISO 8601 end time'),
        urgencies: z
          .array(z.enum(['high', 'low']))
          .max(2)
          .optional(),
        priorities: idsSchema.optional().describe('Filter by priority ID (not name/level)'),
        service_ids: idsSchema.optional(),
        team_ids: idsSchema
          .optional()
          .describe("Overrides the caller's own teams when request_scope is 'teams'"),
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('get'),
        incident_id: idSchema,
        include: z.array(z.string().max(100)).max(10).optional(),
      }),
      z.object({ action: z.literal('list_alerts'), incident_id: idSchema, ...pageSchema() }),
      z.object({ action: z.literal('get_alert'), incident_id: idSchema, alert_id: idSchema }),
      z.object({ action: z.literal('list_notes'), incident_id: idSchema, ...pageSchema() }),
      z.object({
        action: z.literal('context'),
        incident_id: idSchema,
        context_type: z
          .enum(['related', 'past', 'outlier'])
          .describe(
            "'related' returns related incidents; 'past' returns similar historical incidents; 'outlier' reports whether the incident deviates from the norm for its service"
          ),
        limit: limitSchema.optional().describe('Past incidents only: max results'),
        additional_details: z
          .array(z.string().max(100))
          .max(10)
          .optional()
          .describe('Related incidents only: additional attributes to include'),
      }),
      z.object({
        action: z.literal('list_change_events'),
        incident_id: idSchema,
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('list_workflows'),
        query: textSchema.optional(),
        include: z
          .array(z.enum(['steps', 'team']))
          .max(2)
          .optional(),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('get_workflow'), workflow_id: idSchema }),
    ]),
  })
);
export type BrowseIncidentsInput = z.infer<typeof BrowseIncidentsInputSchema>;

export const BrowseTeamsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        scope: z.enum(['all', 'my']).optional(),
        query: textSchema.optional(),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('get'), team_id: idSchema }),
      z.object({ action: z.literal('list_members'), team_id: idSchema, ...pageSchema() }),
    ]),
  })
);
export type BrowseTeamsInput = z.infer<typeof BrowseTeamsInputSchema>;

export const BrowseServicesInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        query: textSchema.optional(),
        team_ids: idsSchema.optional(),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('get'), service_id: idSchema }),
    ]),
  })
);
export type BrowseServicesInput = z.infer<typeof BrowseServicesInputSchema>;

export const BrowseEventOrchestrationsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        sort_by: z
          .enum([
            'name:asc',
            'name:desc',
            'routes:asc',
            'routes:desc',
            'created_at:asc',
            'created_at:desc',
          ])
          .optional(),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('get'), orchestration_id: idSchema }),
      z.object({ action: z.literal('get_router'), orchestration_id: idSchema }),
      z.object({ action: z.literal('get_service'), service_id: idSchema }),
      z.object({ action: z.literal('get_global'), orchestration_id: idSchema }),
    ]),
  })
);
export type BrowseEventOrchestrationsInput = z.infer<typeof BrowseEventOrchestrationsInputSchema>;

export const BrowseAlertGroupingInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        service_ids: idsSchema.optional(),
        limit: limitSchema.optional(),
        after: z.string().max(500).optional().describe('Cursor for the next page'),
        before: z.string().max(500).optional().describe('Cursor for the previous page'),
        total: z.boolean().optional(),
      }),
      z.object({ action: z.literal('get'), setting_id: idSchema }),
    ]),
  })
);
export type BrowseAlertGroupingInput = z.infer<typeof BrowseAlertGroupingInputSchema>;

const changeEventFilters = () => ({
  since: dateTimeSchema.optional().describe('ISO 8601 start time'),
  until: dateTimeSchema.optional().describe('ISO 8601 end time'),
  total: z.boolean().optional(),
  team_ids: idsSchema.optional(),
  integration_ids: idsSchema.optional(),
  ...pageSchema(),
});

export const BrowseChangeEventsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({ action: z.literal('list'), ...changeEventFilters() }),
      z.object({ action: z.literal('get'), change_event_id: idSchema }),
      z.object({
        action: z.literal('list_service'),
        service_id: idSchema,
        ...changeEventFilters(),
      }),
    ]),
  })
);
export type BrowseChangeEventsInput = z.infer<typeof BrowseChangeEventsInputSchema>;

export const BrowseStatusPagesInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list'),
        status_page_type: z.enum(['public', 'private', 'audience_specific']).optional(),
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('list_severities'),
        status_page_id: idSchema,
        ...pageSchema(),
      }),
      z.object({ action: z.literal('list_impacts'), status_page_id: idSchema, ...pageSchema() }),
      z.object({
        action: z.literal('list_statuses'),
        status_page_id: idSchema,
        ...pageSchema(),
      }),
      z.object({
        action: z.literal('get_post'),
        status_page_id: idSchema,
        post_id: idSchema,
        include: z.array(z.literal('status_page_post_update')).max(1).optional(),
      }),
      z.object({
        action: z.literal('list_post_updates'),
        status_page_id: idSchema,
        post_id: idSchema,
        ...pageSchema(),
      }),
    ]),
  })
);
export type BrowseStatusPagesInput = z.infer<typeof BrowseStatusPagesInputSchema>;

export const BrowseActivityInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('list_log_entries'),
        since: dateTimeSchema.optional().describe('ISO 8601 start time (default: 7 days ago)'),
        until: dateTimeSchema.optional().describe('ISO 8601 end time (default: now)'),
        is_overview: z
          .boolean()
          .optional()
          .describe('If true, returns only the most important changes to the incident'),
        include: z
          .array(z.enum(['incidents', 'services', 'channels', 'teams']))
          .max(4)
          .optional(),
        ...pageSchema(),
      }),
      z.object({ action: z.literal('get_log_entry'), log_entry_id: idSchema }),
    ]),
  })
);
export type BrowseActivityInput = z.infer<typeof BrowseActivityInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Name of the MCP tool to call'),
    arguments: z
      .record(z.string().max(200), z.unknown())
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

// =============================================================================
// MCP write action input schemas
// =============================================================================

export const ManageIncidentsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('create'),
        incident: z.object({
          title: z.string().min(1).max(1024),
          service: referenceSchema.describe('The service the incident belongs to'),
          urgency: z.enum(['high', 'low']).optional(),
          body: z.object({ details: z.string().max(10000) }).optional(),
          assignments: z
            .array(z.object({ assignee: referenceSchema }))
            .max(25)
            .optional()
            .describe('When set, only these users receive the initial notification'),
        }),
      }),
      z.object({
        action: z.literal('update'),
        manage_request: z.object({
          incident_ids: idsSchema.min(1),
          assignment: referenceSchema.optional().describe('The user to assign'),
          status: z.enum(['acknowledged', 'resolved']).optional(),
          urgency: z.enum(['high', 'low']).optional(),
          escalation_level: z.number().int().optional(),
        }),
      }),
      z.object({
        action: z.literal('add_note'),
        incident_id: idSchema,
        note: z.string().min(1).max(10000),
      }),
      z.object({
        action: z.literal('add_responders'),
        incident_id: idSchema,
        request: z.object({
          message: z.string().min(1).max(2000),
          responder_request_targets: z
            .array(
              z.object({
                responder_request_target: z.object({
                  id: idSchema,
                  type: z.enum(['user_reference', 'escalation_policy_reference']),
                }),
              })
            )
            .min(1)
            .max(25),
        }),
      }),
      z.object({
        action: z.literal('start_workflow'),
        workflow_id: idSchema,
        instance_request: z.object({
          incident_workflow_instance: z.object({
            id: idSchema.optional().describe('Identifier to tell workflow executions apart'),
            incident: referenceSchema,
          }),
        }),
      }),
    ]),
  })
);
export type ManageIncidentsInput = z.infer<typeof ManageIncidentsInputSchema>;

export const ManageServicesInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({ action: z.literal('create'), service_data: serviceDataSchema }),
      z.object({
        action: z.literal('update'),
        service_id: idSchema,
        service_data: serviceDataSchema,
      }),
    ]),
  })
);
export type ManageServicesInput = z.infer<typeof ManageServicesInputSchema>;

export const ManageSchedulesInputSchema = lazySchema(() => {
  const scheduleIds = () => ({ schedule_id: idSchema });
  const rotationIds = () => ({ ...scheduleIds(), rotation_id: idSchema });
  return z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('create'),
        schedule_data: z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('legacy'), schedule: legacyScheduleSchema }),
          z.object({
            kind: z.literal('shift_based'),
            name: z.string().min(1).max(200),
            time_zone: z.string().min(1).max(100),
            description: textSchema.optional(),
            teams: z.array(referenceSchema).max(25).optional(),
          }),
        ]),
      }),
      z.object({
        action: z.literal('update'),
        ...scheduleIds(),
        schedule_data: z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('legacy'), schedule: legacyScheduleSchema }),
          z.object({
            kind: z.literal('shift_based'),
            name: z.string().max(200).optional(),
            time_zone: z.string().max(100).optional(),
            description: textSchema.optional(),
            teams: z.array(referenceSchema).max(25).optional(),
          }),
        ]),
      }),
      z.object({
        action: z.literal('create_override'),
        ...scheduleIds(),
        override_request: z.object({
          overrides: z
            .array(z.object({ start: dateTimeSchema, end: dateTimeSchema, user_id: idSchema }))
            .min(1)
            .max(50),
        }),
      }),
      z.object({ action: z.literal('delete_schedule_v3'), ...scheduleIds() }),
      z.object({ action: z.literal('create_rotation'), ...scheduleIds() }),
      z.object({ action: z.literal('delete_rotation'), ...rotationIds() }),
      z.object({
        action: z.literal('create_rotation_event'),
        ...rotationIds(),
        event_data: rotationEventDataSchema,
      }),
      z.object({
        action: z.literal('update_rotation_event'),
        ...rotationIds(),
        event_id: idSchema,
        event_data: rotationEventDataSchema.describe(
          'Full replacement; for a started event only effective_until may change'
        ),
      }),
      z.object({
        action: z.literal('delete_rotation_event'),
        ...rotationIds(),
        event_id: idSchema,
      }),
      z.object({
        action: z.literal('create_custom_shifts'),
        ...scheduleIds(),
        shifts: z.array(customShiftDataSchema).min(1).max(50),
      }),
      z.object({
        action: z.literal('update_custom_shift'),
        ...scheduleIds(),
        custom_shift_id: idSchema,
        shift_data: customShiftDataSchema,
      }),
      z.object({
        action: z.literal('delete_custom_shift'),
        ...scheduleIds(),
        custom_shift_id: idSchema,
      }),
      z.object({
        action: z.literal('create_overrides'),
        ...scheduleIds(),
        overrides: z
          .array(
            overrideDataSchema.extend({
              rotation_id: idSchema
                .optional()
                .describe('Mutually exclusive with custom_shift_id; exactly one must be set'),
              custom_shift_id: idSchema
                .optional()
                .describe('Mutually exclusive with rotation_id; exactly one must be set'),
            })
          )
          .min(1)
          .max(50),
      }),
      z.object({
        action: z.literal('update_override'),
        ...scheduleIds(),
        override_id: idSchema,
        override_data: overrideDataSchema,
      }),
      z.object({
        action: z.literal('delete_override'),
        ...scheduleIds(),
        override_id: idSchema,
      }),
    ]),
  });
});
export type ManageSchedulesInput = z.infer<typeof ManageSchedulesInputSchema>;

export const ManageTeamsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({ action: z.literal('create'), create_model: teamDataSchema }),
      z.object({
        action: z.literal('update'),
        team_id: idSchema,
        update_model: teamDataSchema,
      }),
      z.object({ action: z.literal('delete'), team_id: idSchema }),
      z.object({
        action: z.literal('add_member'),
        team_id: idSchema,
        member_data: z.object({
          user_id: idSchema,
          role: z.enum(['observer', 'responder', 'manager']).optional(),
        }),
      }),
      z.object({ action: z.literal('remove_member'), team_id: idSchema, user_id: idSchema }),
    ]),
  })
);
export type ManageTeamsInput = z.infer<typeof ManageTeamsInputSchema>;

export const ManageEventOrchestrationsInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('update_router'),
        orchestration_id: idSchema,
        router_update: z.object({
          orchestration_path: z.object({
            type: z.literal('router').optional(),
            sets: z
              .array(
                z.object({
                  id: z.string().max(200).optional().describe("Defaults to 'start'"),
                  rules: z
                    .array(
                      z.object({
                        id: idSchema,
                        label: z.string().max(500).optional(),
                        conditions: routerRuleConditionsSchema,
                        actions: routerActionsSchema,
                        disabled: z.boolean().optional(),
                      })
                    )
                    .max(1000),
                })
              )
              .max(1),
            catch_all: z.object({ actions: routerActionsSchema }),
          }),
        }),
      }),
      z.object({
        action: z.literal('append_router_rule'),
        orchestration_id: idSchema,
        new_rule: z.object({
          label: z.string().max(500).optional(),
          conditions: routerRuleConditionsSchema,
          actions: routerActionsSchema,
          disabled: z.boolean().optional(),
        }),
      }),
    ]),
  })
);
export type ManageEventOrchestrationsInput = z.infer<typeof ManageEventOrchestrationsInputSchema>;

export const ManageAlertGroupingInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('create'),
        create_model: z.object({ alert_grouping_setting: alertGroupingSettingSchema }),
      }),
      z.object({
        action: z.literal('update'),
        setting_id: idSchema,
        update_model: z.object({ alert_grouping_setting: alertGroupingSettingSchema }),
      }),
      z.object({ action: z.literal('delete'), setting_id: idSchema }),
    ]),
  })
);
export type ManageAlertGroupingInput = z.infer<typeof ManageAlertGroupingInputSchema>;

export const ManageStatusPagesInputSchema = lazySchema(() =>
  z.object({
    request: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('create_post'),
        status_page_id: idSchema,
        create_model: z.object({
          post: z.object({
            title: z.string().min(1).max(500),
            post_type: z.enum(['incident', 'maintenance']),
            starts_at: dateTimeSchema,
            ends_at: dateTimeSchema,
            updates: z.array(postUpdateSchema).min(1).max(25),
            status_page: statusPageReferenceSchema('status_page'),
          }),
        }),
      }),
      z.object({
        action: z.literal('create_post_update'),
        status_page_id: idSchema,
        post_id: idSchema,
        create_model: z.object({ post_update: postUpdateSchema }),
      }),
    ]),
  })
);
export type ManageStatusPagesInput = z.infer<typeof ManageStatusPagesInputSchema>;
