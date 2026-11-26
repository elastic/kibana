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
  z.object({
    id: idSchema.describe('The ID of the referenced object'),
    summary: z
      .string()
      .max(500)
      .optional()
      .describe('A short server-generated summary of the referenced object'),
  })
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
    name: z.string().min(1).max(200).describe('The name of the rotation event'),
    start_time: zonedTimeSchema.describe('The start time, ISO 8601 with UTC offset'),
    end_time: zonedTimeSchema.describe('The end time, ISO 8601 with UTC offset'),
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
    assignment_strategy: z
      .object({
        type: z
          .enum(['rotating_member_assignment_strategy', 'every_member_assignment_strategy'])
          .describe('The assignment strategy type'),
        members: z
          .array(memberSchema)
          .max(20)
          .describe('The members participating in this assignment strategy'),
        shifts_per_member: z
          .number()
          .int()
          .optional()
          .describe("Required when type is 'rotating_member_assignment_strategy'"),
      })
      .describe('How members are assigned to shifts'),
  })
);

const customShiftDataSchema = lazySchema(() =>
  z.object({
    start_time: dateTimeSchema.describe('The start time, ISO 8601 with UTC offset'),
    end_time: dateTimeSchema.describe('The end time, ISO 8601 with UTC offset'),
    assignments: z
      .array(z.object({ member: memberSchema.describe('The member assigned to this shift') }))
      .length(1)
      .describe('The single assignment covering this shift'),
  })
);

const overrideDataSchema = lazySchema(() =>
  z.object({
    start_time: dateTimeSchema.describe('The start time, ISO 8601 with UTC offset'),
    end_time: dateTimeSchema.describe('The end time, ISO 8601 with UTC offset'),
    overridden_member: memberSchema.describe('The member being overridden'),
    overriding_member: memberSchema.describe('The member covering the override'),
  })
);

const legacyScheduleSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('The name of the schedule'),
    time_zone: z.string().min(1).max(100).describe('IANA time zone, e.g. America/New_York'),
    description: textSchema.optional().describe('The description of the schedule'),
    schedule_layers: z
      .array(
        z.object({
          name: z.string().min(1).max(200).describe('The name of the schedule layer'),
          start: dateTimeSchema.describe('The start time, ISO 8601'),
          end: dateTimeSchema.optional().describe('The end time, ISO 8601'),
          rotation_virtual_start: dateTimeSchema.describe(
            'The effective start time of the layer; can be before the schedule start'
          ),
          rotation_turn_length_seconds: z
            .number()
            .int()
            .describe('Duration of each on-call shift in seconds'),
          users: z
            .array(z.object({ user: referenceSchema.describe('The user') }))
            .max(100)
            .describe('The users in this layer'),
          restrictions: z
            .array(
              z.object({
                type: z
                  .enum(['daily_restriction', 'weekly_restriction'])
                  .describe('The restriction type'),
                start_time_of_day: z.string().max(16).describe('HH:MM:SS'),
                duration_seconds: z
                  .number()
                  .int()
                  .describe('Duration of the restriction in seconds'),
                start_day_of_week: z
                  .number()
                  .int()
                  .optional()
                  .describe('1=Monday, 7=Sunday (ISO-8601)'),
              })
            )
            .max(25)
            .optional()
            .describe('Restrictions on when the layer accepts assignments'),
        })
      )
      .max(25)
      .describe('The layers of the schedule'),
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
    name: z.string().max(200).optional().describe('The name of the alert grouping setting'),
    description: textSchema.optional().describe('The description of the alert grouping setting'),
    type: z
      .enum(['content_based', 'content_based_intelligent', 'intelligent', 'time'])
      .describe('The alert grouping algorithm'),
    config: z
      .object({
        aggregate: z
          .enum(['all', 'any'])
          .optional()
          .describe('Group when all or any of the fields match'),
        fields: z
          .array(z.string().max(200))
          .max(25)
          .optional()
          .describe('The fields to group alerts on'),
        time_window: z
          .number()
          .int()
          .optional()
          .describe('Seconds; 0 uses the recommended window, otherwise 300-3600 (or 86400)'),
        recommended_time_window: z
          .number()
          .int()
          .optional()
          .describe('The recommended time window calculated by PagerDuty'),
        timeout: z.number().int().optional().describe('Time-based only: seconds, 60-86400'),
        iag_fields: z
          .array(z.string().max(200))
          .max(25)
          .optional()
          .describe('The fields used for intelligent alert grouping'),
      })
      .describe('Configuration matching the setting type'),
    services: z.array(referenceSchema).max(100).describe('The services the object applies to'),
  })
);

const statusPageReferenceSchema = (type: string) =>
  z.object({
    id: idSchema.describe('The ID of the referenced object'),
    type: z.literal(type).optional().describe('The type of the referenced status page object'),
  });

const postUpdateSchema = lazySchema(() =>
  z.object({
    message: z.string().min(1).max(5000).describe('The message text'),
    status: statusPageReferenceSchema('status_page_status').describe(
      'The status page status reference'
    ),
    severity: statusPageReferenceSchema('status_page_severity').describe(
      'The severity of the post update'
    ),
    impacted_services: z
      .array(
        z.object({
          service: statusPageReferenceSchema('status_page_service').describe(
            'The service the object belongs to'
          ),
          impact: statusPageReferenceSchema('status_page_impact').describe(
            'The impact on the service'
          ),
        })
      )
      .max(100)
      .optional()
      .describe('The status page services affected by the update'),
    update_frequency_ms: z.number().int().optional().describe('Milliseconds until the next update'),
    notify_subscribers: z
      .boolean()
      .optional()
      .describe('Whether to notify subscribers of the update'),
    reported_at: dateTimeSchema.optional().describe('When the update was reported, ISO 8601'),
    post: statusPageReferenceSchema('status_page_post').optional().describe('The status page post'),
  })
);

const serviceDataSchema = lazySchema(() =>
  z.object({
    service: z
      .object({
        id: idSchema.optional().describe('The ID of the referenced object'),
        name: z.string().max(200).optional().describe('The name of the service'),
        description: textSchema.optional().describe('The description of the service'),
        escalation_policy: referenceSchema.describe('The escalation policy of the service'),
        teams: z
          .array(referenceSchema)
          .max(25)
          .optional()
          .describe('The teams associated with the object'),
        status: z.string().max(100).optional().describe('The current state of the service'),
      })
      .describe('The service the object belongs to'),
  })
);

const teamDataSchema = lazySchema(() =>
  z.object({
    team: z
      .object({
        name: z.string().min(1).max(200).describe('The name of the team'),
        description: textSchema.optional().describe('The description of the team'),
        default_role: z
          .enum(['manager', 'none'])
          .optional()
          .describe('The default role granted to users added to the team'),
      })
      .describe('The team definition'),
  })
);

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const BrowseUsersInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('get').describe('The operation to run') }),
        z.object({
          action: z.literal('list').describe('The operation to run'),
          query: textSchema.optional().describe('Free-text search string'),
          team_ids: idsSchema.optional().describe('Filter by team IDs'),
          ...pageSchema(),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseUsersInput = z.infer<typeof BrowseUsersInputSchema>;

export const BrowseSchedulesInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          query: textSchema.optional().describe('Filter by schedule name'),
          team_ids: idsSchema.optional().describe('Filter by team IDs'),
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
          action: z.literal('get').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          kind: z
            .enum(['legacy', 'shift_based'])
            .optional()
            .describe('Omit unless certain; the tool detects the kind'),
        }),
        z.object({
          action: z.literal('list_users').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
        }),
        z.object({
          action: z.literal('list_oncalls').describe('The operation to run'),
          time_zone: z
            .string()
            .max(100)
            .optional()
            .describe("IANA time zone, e.g. 'America/New_York'"),
          user_ids: idsSchema.optional().describe('Filter by user IDs'),
          escalation_policy_ids: idsSchema.optional().describe('Filter by escalation policy IDs'),
          schedule_ids: idsSchema.optional().describe('Filter by schedule IDs'),
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
        z.object({
          action: z.literal('list_rotations').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_rotation').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          rotation_id: idSchema.describe('The ID of the rotation'),
        }),
        z.object({
          action: z.literal('list_rotation_events').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          rotation_id: idSchema.describe('The ID of the rotation'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_rotation_event').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          rotation_id: idSchema.describe('The ID of the rotation'),
          event_id: idSchema.describe('The ID of the rotation event'),
        }),
        z.object({
          action: z.literal('list_custom_shifts').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          since: dateTimeSchema.describe('Start of the time range, ISO 8601'),
          until: dateTimeSchema.describe('End of the time range, ISO 8601'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_custom_shift').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          custom_shift_id: idSchema.describe('The ID of the custom shift'),
        }),
        z.object({
          action: z.literal('list_overrides').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          since: dateTimeSchema.describe('Start of the time range, ISO 8601'),
          until: dateTimeSchema.describe('End of the time range, ISO 8601'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_override').describe('The operation to run'),
          schedule_id: idSchema.describe('The ID of the schedule'),
          override_id: idSchema.describe('The ID of the override'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseSchedulesInput = z.infer<typeof BrowseSchedulesInputSchema>;

export const BrowseEscalationPoliciesInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          query: textSchema.optional().describe('Free-text search string'),
          user_ids: idsSchema.optional().describe('Filter by user IDs'),
          team_ids: idsSchema.optional().describe('Filter by team IDs'),
          include: z
            .array(z.enum(['services', 'teams']))
            .max(2)
            .optional()
            .describe('Related resources to include in the response'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          policy_id: idSchema.describe('The ID of the escalation policy'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseEscalationPoliciesInput = z.infer<typeof BrowseEscalationPoliciesInputSchema>;

export const BrowseIncidentsInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          request_scope: z
            .enum(['all', 'teams', 'assigned'])
            .optional()
            .describe('Which incidents to list: all, teams, or assigned to the current user'),
          statuses: z
            .array(z.enum(['triggered', 'acknowledged', 'resolved']))
            .max(3)
            .optional()
            .describe('Filter by status'),
          since: dateTimeSchema.optional().describe('ISO 8601 start time'),
          until: dateTimeSchema.optional().describe('ISO 8601 end time'),
          urgencies: z
            .array(z.enum(['high', 'low']))
            .max(2)
            .optional()
            .describe('Filter by urgency'),
          priorities: idsSchema.optional().describe('Filter by priority ID (not name/level)'),
          service_ids: idsSchema.optional().describe('Filter by service IDs'),
          team_ids: idsSchema
            .optional()
            .describe("Overrides the caller's own teams when request_scope is 'teams'"),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          include: z
            .array(z.string().max(100))
            .max(10)
            .optional()
            .describe('Related resources to include in the response'),
        }),
        z.object({
          action: z.literal('list_alerts').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_alert').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          alert_id: idSchema.describe('The ID of the alert'),
        }),
        z.object({
          action: z.literal('list_notes').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('context').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
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
          action: z.literal('list_change_events').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('list_workflows').describe('The operation to run'),
          query: textSchema.optional().describe('Free-text search string'),
          include: z
            .array(z.enum(['steps', 'team']))
            .max(2)
            .optional()
            .describe('Related resources to include in the response'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_workflow').describe('The operation to run'),
          workflow_id: idSchema.describe('The ID of the incident workflow'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseIncidentsInput = z.infer<typeof BrowseIncidentsInputSchema>;

export const BrowseTeamsInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          scope: z
            .enum(['all', 'my'])
            .optional()
            .describe("Which teams to list: all or the current user's"),
          query: textSchema.optional().describe('Free-text search string'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          team_id: idSchema.describe('The ID of the team'),
        }),
        z.object({
          action: z.literal('list_members').describe('The operation to run'),
          team_id: idSchema.describe('The ID of the team'),
          ...pageSchema(),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseTeamsInput = z.infer<typeof BrowseTeamsInputSchema>;

export const BrowseServicesInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          query: textSchema.optional().describe('Free-text search string'),
          team_ids: idsSchema.optional().describe('Filter by team IDs'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          service_id: idSchema.describe('The ID of the service'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseServicesInput = z.infer<typeof BrowseServicesInputSchema>;

export const BrowseEventOrchestrationsInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          sort_by: z
            .enum([
              'name:asc',
              'name:desc',
              'routes:asc',
              'routes:desc',
              'created_at:asc',
              'created_at:desc',
            ])
            .optional()
            .describe('Sort order'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          orchestration_id: idSchema.describe('The ID of the event orchestration'),
        }),
        z.object({
          action: z.literal('get_router').describe('The operation to run'),
          orchestration_id: idSchema.describe('The ID of the event orchestration'),
        }),
        z.object({
          action: z.literal('get_service').describe('The operation to run'),
          service_id: idSchema.describe('The ID of the service'),
        }),
        z.object({
          action: z.literal('get_global').describe('The operation to run'),
          orchestration_id: idSchema.describe('The ID of the event orchestration'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseEventOrchestrationsInput = z.infer<typeof BrowseEventOrchestrationsInputSchema>;

export const BrowseAlertGroupingInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          service_ids: idsSchema.optional().describe('Filter by service IDs'),
          limit: limitSchema.optional().describe('Maximum number of results to return'),
          after: z.string().max(500).optional().describe('Cursor for the next page'),
          before: z.string().max(500).optional().describe('Cursor for the previous page'),
          total: z.boolean().optional().describe('Whether to include the total count of results'),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          setting_id: idSchema.describe('The ID of the alert grouping setting'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseAlertGroupingInput = z.infer<typeof BrowseAlertGroupingInputSchema>;

const changeEventFilters = () => ({
  since: dateTimeSchema.optional().describe('ISO 8601 start time'),
  until: dateTimeSchema.optional().describe('ISO 8601 end time'),
  total: z.boolean().optional().describe('Whether to include the total count of results'),
  team_ids: idsSchema.optional().describe('Filter by team IDs'),
  integration_ids: idsSchema.optional().describe('Filter by integration IDs'),
  ...pageSchema(),
});

export const BrowseChangeEventsInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          ...changeEventFilters(),
        }),
        z.object({
          action: z.literal('get').describe('The operation to run'),
          change_event_id: idSchema.describe('The ID of the change event'),
        }),
        z.object({
          action: z.literal('list_service').describe('The operation to run'),
          service_id: idSchema.describe('The ID of the service'),
          ...changeEventFilters(),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseChangeEventsInput = z.infer<typeof BrowseChangeEventsInputSchema>;

export const BrowseStatusPagesInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list').describe('The operation to run'),
          status_page_type: z
            .enum(['public', 'private', 'audience_specific'])
            .optional()
            .describe('Filter by status page type'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('list_severities').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('list_impacts').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('list_statuses').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_post').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          post_id: idSchema.describe('The ID of the status page post'),
          include: z
            .array(z.literal('status_page_post_update'))
            .max(1)
            .optional()
            .describe('Related resources to include in the response'),
        }),
        z.object({
          action: z.literal('list_post_updates').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          post_id: idSchema.describe('The ID of the status page post'),
          ...pageSchema(),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type BrowseStatusPagesInput = z.infer<typeof BrowseStatusPagesInputSchema>;

export const BrowseActivityInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('list_log_entries').describe('The operation to run'),
          since: dateTimeSchema.optional().describe('ISO 8601 start time (default: 7 days ago)'),
          until: dateTimeSchema.optional().describe('ISO 8601 end time (default: now)'),
          is_overview: z
            .boolean()
            .optional()
            .describe('If true, returns only the most important changes to the incident'),
          include: z
            .array(z.enum(['incidents', 'services', 'channels', 'teams']))
            .max(4)
            .optional()
            .describe('Related resources to include in the response'),
          ...pageSchema(),
        }),
        z.object({
          action: z.literal('get_log_entry').describe('The operation to run'),
          log_entry_id: idSchema.describe('The ID of the log entry'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
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
      .email()
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
      .email()
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
      .email()
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
        .email()
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
      .refine((ids) => new Set(ids).size === ids.length, { message: 'team_ids must be unique' })
      .meta({ uniqueItems: true })
      .optional()
      .describe('Filter to services belonging to these team IDs (e.g., ["P123ABC"])'),
  })
);
export type ListServicesInput = z.infer<typeof ListServicesInputSchema>;

export const AddRespondersInputSchema = lazySchema(() =>
  z
    .object({
      from: z
        .email()
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
      .email()
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
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('create').describe('The operation to run'),
          incident: z
            .object({
              title: z.string().min(1).max(1024).describe('The title of the incident'),
              service: referenceSchema.describe('The service the incident belongs to'),
              urgency: z.enum(['high', 'low']).optional().describe('The urgency, high or low'),
              body: z
                .object({
                  details: z.string().max(10000).describe('Free-form details of the incident'),
                })
                .optional()
                .describe('The body of the incident'),
              assignments: z
                .array(z.object({ assignee: referenceSchema.describe('The user to assign') }))
                .max(25)
                .optional()
                .describe('When set, only these users receive the initial notification'),
            })
            .describe('The incident'),
        }),
        z.object({
          action: z.literal('update').describe('The operation to run'),
          manage_request: z
            .object({
              incident_ids: idsSchema.min(1).describe('The IDs of the incidents to update'),
              assignment: referenceSchema.optional().describe('The user to assign'),
              status: z
                .enum(['acknowledged', 'resolved'])
                .optional()
                .describe('The status to set the incident to'),
              urgency: z.enum(['high', 'low']).optional().describe('The urgency, high or low'),
              escalation_level: z.number().int().optional().describe('The escalation level to set'),
            })
            .describe('The incident update to apply'),
        }),
        z.object({
          action: z.literal('add_note').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          note: z.string().min(1).max(10000).describe('The text of the note'),
        }),
        z.object({
          action: z.literal('add_responders').describe('The operation to run'),
          incident_id: idSchema.describe('The ID of the incident'),
          request: z
            .object({
              message: z.string().min(1).max(2000).describe('The message text'),
              responder_request_targets: z
                .array(
                  z.object({
                    responder_request_target: z
                      .object({
                        id: idSchema.describe('The ID of the referenced object'),
                        type: z
                          .enum(['user_reference', 'escalation_policy_reference'])
                          .describe('The type of target: a user or an escalation policy'),
                      })
                      .describe('The user or escalation policy to request as a responder'),
                  })
                )
                .min(1)
                .max(25)
                .describe('The users or escalation policies to request as responders'),
            })
            .describe(
              "The request to send. Set action to the operation to run and provide that operation's fields"
            ),
        }),
        z.object({
          action: z.literal('start_workflow').describe('The operation to run'),
          workflow_id: idSchema.describe('The ID of the incident workflow'),
          instance_request: z
            .object({
              incident_workflow_instance: z
                .object({
                  id: idSchema.optional().describe('Identifier to tell workflow executions apart'),
                  incident: referenceSchema.describe('The incident'),
                })
                .describe('The incident workflow instance to start'),
            })
            .describe('The incident workflow instance request'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type ManageIncidentsInput = z.infer<typeof ManageIncidentsInputSchema>;

export const ManageServicesInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('create').describe('The operation to run'),
          service_data: serviceDataSchema.describe('The service definition'),
        }),
        z.object({
          action: z.literal('update').describe('The operation to run'),
          service_id: idSchema.describe('The ID of the service'),
          service_data: serviceDataSchema.describe('The service definition'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type ManageServicesInput = z.infer<typeof ManageServicesInputSchema>;

export const ManageSchedulesInputSchema = lazySchema(() => {
  const scheduleIds = () => ({ schedule_id: idSchema.describe('The ID of the schedule') });
  const rotationIds = () => ({
    ...scheduleIds(),
    rotation_id: idSchema.describe('The ID of the rotation'),
  });
  return z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('create').describe('The operation to run'),
          schedule_data: z
            .discriminatedUnion('kind', [
              z.object({
                kind: z
                  .literal('legacy')
                  .describe('The scheduling system: legacy (v2) or shift_based (v3)'),
                schedule: legacyScheduleSchema.describe('The schedule definition'),
              }),
              z.object({
                kind: z
                  .literal('shift_based')
                  .describe('The scheduling system: legacy (v2) or shift_based (v3)'),
                name: z.string().min(1).max(200).describe('The name of the schedule'),
                time_zone: z
                  .string()
                  .min(1)
                  .max(100)
                  .describe('IANA time zone, e.g. America/New_York'),
                description: textSchema.optional().describe('The description of the schedule'),
                teams: z
                  .array(referenceSchema)
                  .max(25)
                  .optional()
                  .describe('The teams associated with the object'),
              }),
            ])
            .describe('The schedule definition'),
        }),
        z.object({
          action: z.literal('update').describe('The operation to run'),
          ...scheduleIds(),
          schedule_data: z
            .discriminatedUnion('kind', [
              z.object({
                kind: z
                  .literal('legacy')
                  .describe('The scheduling system: legacy (v2) or shift_based (v3)'),
                schedule: legacyScheduleSchema.describe('The schedule definition'),
              }),
              z.object({
                kind: z
                  .literal('shift_based')
                  .describe('The scheduling system: legacy (v2) or shift_based (v3)'),
                name: z.string().max(200).optional().describe('The name of the schedule'),
                time_zone: z
                  .string()
                  .max(100)
                  .optional()
                  .describe('IANA time zone, e.g. America/New_York'),
                description: textSchema.optional().describe('The description of the schedule'),
                teams: z
                  .array(referenceSchema)
                  .max(25)
                  .optional()
                  .describe('The teams associated with the object'),
              }),
            ])
            .describe('The schedule definition'),
        }),
        z.object({
          action: z.literal('create_override').describe('The operation to run'),
          ...scheduleIds(),
          override_request: z
            .object({
              overrides: z
                .array(
                  z.object({
                    start: dateTimeSchema.describe('The start time, ISO 8601'),
                    end: dateTimeSchema.describe('The end time, ISO 8601'),
                    user_id: idSchema.describe('The ID of the user'),
                  })
                )
                .min(1)
                .max(50)
                .describe('The overrides to create'),
            })
            .describe('The overrides to create'),
        }),
        z.object({
          action: z.literal('delete_schedule_v3').describe('The operation to run'),
          ...scheduleIds(),
        }),
        z.object({
          action: z.literal('create_rotation').describe('The operation to run'),
          ...scheduleIds(),
        }),
        z.object({
          action: z.literal('delete_rotation').describe('The operation to run'),
          ...rotationIds(),
        }),
        z.object({
          action: z.literal('create_rotation_event').describe('The operation to run'),
          ...rotationIds(),
          event_data: rotationEventDataSchema.describe('The rotation event definition'),
        }),
        z.object({
          action: z.literal('update_rotation_event').describe('The operation to run'),
          ...rotationIds(),
          event_id: idSchema.describe('The ID of the rotation event'),
          event_data: rotationEventDataSchema.describe(
            'Full replacement; for a started event only effective_until may change'
          ),
        }),
        z.object({
          action: z.literal('delete_rotation_event').describe('The operation to run'),
          ...rotationIds(),
          event_id: idSchema.describe('The ID of the rotation event'),
        }),
        z.object({
          action: z.literal('create_custom_shifts').describe('The operation to run'),
          ...scheduleIds(),
          shifts: z
            .array(customShiftDataSchema)
            .min(1)
            .max(50)
            .describe('The custom shifts to create'),
        }),
        z.object({
          action: z.literal('update_custom_shift').describe('The operation to run'),
          ...scheduleIds(),
          custom_shift_id: idSchema.describe('The ID of the custom shift'),
          shift_data: customShiftDataSchema.describe('The replacement custom shift data'),
        }),
        z.object({
          action: z.literal('delete_custom_shift').describe('The operation to run'),
          ...scheduleIds(),
          custom_shift_id: idSchema.describe('The ID of the custom shift'),
        }),
        z.object({
          action: z.literal('create_overrides').describe('The operation to run'),
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
            .max(50)
            .describe('The overrides to create'),
        }),
        z.object({
          action: z.literal('update_override').describe('The operation to run'),
          ...scheduleIds(),
          override_id: idSchema.describe('The ID of the override'),
          override_data: overrideDataSchema.describe('The replacement override data'),
        }),
        z.object({
          action: z.literal('delete_override').describe('The operation to run'),
          ...scheduleIds(),
          override_id: idSchema.describe('The ID of the override'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  });
});
export type ManageSchedulesInput = z.infer<typeof ManageSchedulesInputSchema>;

export const ManageTeamsInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('create').describe('The operation to run'),
          create_model: teamDataSchema.describe('The object to create'),
        }),
        z.object({
          action: z.literal('update').describe('The operation to run'),
          team_id: idSchema.describe('The ID of the team'),
          update_model: teamDataSchema.describe('The object updates to apply'),
        }),
        z.object({
          action: z.literal('delete').describe('The operation to run'),
          team_id: idSchema.describe('The ID of the team'),
        }),
        z.object({
          action: z.literal('add_member').describe('The operation to run'),
          team_id: idSchema.describe('The ID of the team'),
          member_data: z
            .object({
              user_id: idSchema.describe('The ID of the user'),
              role: z
                .enum(['observer', 'responder', 'manager'])
                .optional()
                .describe('The role of the user on the team'),
            })
            .describe('The team member to add'),
        }),
        z.object({
          action: z.literal('remove_member').describe('The operation to run'),
          team_id: idSchema.describe('The ID of the team'),
          user_id: idSchema.describe('The ID of the user'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type ManageTeamsInput = z.infer<typeof ManageTeamsInputSchema>;

export const ManageEventOrchestrationsInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('update_router').describe('The operation to run'),
          orchestration_id: idSchema.describe('The ID of the event orchestration'),
          router_update: z
            .object({
              orchestration_path: z
                .object({
                  type: z.literal('router').optional().describe("Set to 'router'"),
                  sets: z
                    .array(
                      z.object({
                        id: z.string().max(200).optional().describe("Defaults to 'start'"),
                        rules: z
                          .array(
                            z.object({
                              id: idSchema.describe('The ID of the referenced object'),
                              label: z
                                .string()
                                .max(500)
                                .optional()
                                .describe("A description of the rule's purpose"),
                              conditions: routerRuleConditionsSchema.describe(
                                'Conditions for matching an event; the rule matches if any condition matches'
                              ),
                              actions: routerActionsSchema.describe(
                                'The actions to take when an event matches'
                              ),
                              disabled: z
                                .boolean()
                                .optional()
                                .describe('Whether the rule is disabled'),
                            })
                          )
                          .max(1000)
                          .describe('The rules in this set'),
                      })
                    )
                    .max(1)
                    .describe('The sets of routing rules'),
                  catch_all: z
                    .object({
                      actions: routerActionsSchema.describe(
                        'The actions to take when an event matches'
                      ),
                    })
                    .describe('Routing used when no rule matches an event'),
                })
                .describe('The orchestration router path configuration'),
            })
            .describe('The router configuration to apply'),
        }),
        z.object({
          action: z.literal('append_router_rule').describe('The operation to run'),
          orchestration_id: idSchema.describe('The ID of the event orchestration'),
          new_rule: z
            .object({
              label: z.string().max(500).optional().describe("A description of the rule's purpose"),
              conditions: routerRuleConditionsSchema.describe(
                'Conditions for matching an event; the rule matches if any condition matches'
              ),
              actions: routerActionsSchema.describe('The actions to take when an event matches'),
              disabled: z.boolean().optional().describe('Whether the rule is disabled'),
            })
            .describe('The routing rule to append'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type ManageEventOrchestrationsInput = z.infer<typeof ManageEventOrchestrationsInputSchema>;

export const ManageAlertGroupingInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('create').describe('The operation to run'),
          create_model: z
            .object({
              alert_grouping_setting: alertGroupingSettingSchema.describe(
                'The alert grouping setting'
              ),
            })
            .describe('The object to create'),
        }),
        z.object({
          action: z.literal('update').describe('The operation to run'),
          setting_id: idSchema.describe('The ID of the alert grouping setting'),
          update_model: z
            .object({
              alert_grouping_setting: alertGroupingSettingSchema.describe(
                'The alert grouping setting'
              ),
            })
            .describe('The object updates to apply'),
        }),
        z.object({
          action: z.literal('delete').describe('The operation to run'),
          setting_id: idSchema.describe('The ID of the alert grouping setting'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type ManageAlertGroupingInput = z.infer<typeof ManageAlertGroupingInputSchema>;

export const ManageStatusPagesInputSchema = lazySchema(() =>
  z.object({
    request: z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('create_post').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          create_model: z
            .object({
              post: z
                .object({
                  title: z.string().min(1).max(500).describe('The title of the post'),
                  post_type: z
                    .enum(['incident', 'maintenance'])
                    .describe('The type of the post: incident or maintenance'),
                  starts_at: dateTimeSchema.describe('When the post becomes effective, ISO 8601'),
                  ends_at: dateTimeSchema.describe('When the post concludes, ISO 8601'),
                  updates: z
                    .array(postUpdateSchema)
                    .min(1)
                    .max(25)
                    .describe('The updates to create with the post'),
                  status_page: statusPageReferenceSchema('status_page').describe('The status page'),
                })
                .describe('The status page post'),
            })
            .describe('The object to create'),
        }),
        z.object({
          action: z.literal('create_post_update').describe('The operation to run'),
          status_page_id: idSchema.describe('The ID of the status page'),
          post_id: idSchema.describe('The ID of the status page post'),
          create_model: z
            .object({ post_update: postUpdateSchema.describe('The status page post update') })
            .describe('The object to create'),
        }),
      ])
      .describe(
        "The request to send. Set action to the operation to run and provide that operation's fields"
      ),
  })
);
export type ManageStatusPagesInput = z.infer<typeof ManageStatusPagesInputSchema>;
