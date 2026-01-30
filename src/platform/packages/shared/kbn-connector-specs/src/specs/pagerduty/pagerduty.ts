/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type * as PD from './types';

/**
 * Pagerduty v2 Kibana Stack Connector
 */
export const PagerDutyConnector: ConnectorSpec = {
  metadata: {
    id: '.pagerduty-v2',
    displayName: 'PagerDuty v2',
    description: i18n.translate('core.kibanaConnectorSpecs.pagerduty.metadata.description', {
      defaultMessage:
        'Access PagerDuty incidents, escalation policies, schedules, and related data',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer', 'oauth_client_credentials'],
    headers: {
      Accept: 'application/vnd.pagerduty+json;version=2',
    },
    authorizationHeaderFormat: (token) => `Token token=${token}`,
  },

  actions: {
    // https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-escalation-policies
    listEscalationPolicies: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        query: z.string().optional(),
        include: z.string().optional(),
      }),
      handler: async (ctx, input: PD.ListEscalationPoliciesInput) => {
        const queryParams = buildPaginationParams(input);
        if (input.query) {
          queryParams.query = input.query;
        }

        const response = await ctx.client.get('https://api.pagerduty.com/escalation_policies', {
          params: queryParams,
        });

        const data = response.data;
        if (data.escalation_policy) {
          return {
            escalation_policy: transformEscalationPolicy(data.escalation_policy),
          };
        }
        if (data.escalation_policies) {
          return {
            limit: data.limit,
            offset: data.offset,
            total: data.total,
            more: data.more,
            escalation_policies: data.escalation_policies.map(transformEscalationPolicy),
          };
        }
        return data;
      },
    },

    // https://developer.pagerduty.com/api-reference/c8d0b4b12e36f9-get-an-escalation-policy
    getEscalationPolicy: {
      isTool: false,
      input: z.object({
        id: z.string(),
        include: z.string().optional(),
      }),
      handler: async (ctx, input: PD.GetEscalationPolicyInput) => {
        const queryParams = buildPaginationParams(input);
        const response = await ctx.client.get(
          `https://api.pagerduty.com/escalation_policies/${input.id}`,
          queryParams
        );

        const data = response.data;
        if (data.escalation_policy) {
          return {
            escalation_policy: transformEscalationPolicy(data.escalation_policy),
          };
        }
        if (data.escalation_policies) {
          return {
            limit: data.limit,
            offset: data.offset,
            total: data.total,
            more: data.more,
            escalation_policies: data.escalation_policies.map(transformEscalationPolicy),
          };
        }
        return data;
      },
    },

    // https://developer.pagerduty.com/api-reference/b4a9be04aa6ac-list-incidents
    listIncidents: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        dateRange: z.string().optional(),
        incidentKey: z.string().optional(),
        include: z.string().optional(),
        statuses: z.string().optional(),
        serviceIds: z.string().optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        urgencies: z.string().optional(),
        timeZone: z.string().optional(),
        sortBy: z.string().optional(),
      }),
      handler: async (ctx, input: PD.ListIncidentsInput) => {
        const baseParams = buildPaginationParams(input);
        const queryParams: Record<string, string | number | boolean | string[]> = {
          ...baseParams,
        };
        if (input.dateRange) {
          queryParams.date_range = input.dateRange;
        }
        if (input.incidentKey) {
          queryParams.incident_key = input.incidentKey;
        }
        if (input.statuses) {
          queryParams['statuses[]'] = input.statuses.split(',').map((s) => s.trim());
        }
        if (input.serviceIds) {
          queryParams['service_ids[]'] = input.serviceIds.split(',').map((s) => s.trim());
        }
        if (input.since) {
          queryParams.since = input.since;
        }
        if (input.until) {
          queryParams.until = input.until;
        }
        if (input.urgencies) {
          queryParams['urgencies[]'] = input.urgencies.split(',').map((s) => s.trim());
        }
        if (input.timeZone) {
          queryParams.time_zone = input.timeZone;
        }
        if (input.sortBy) {
          queryParams.sort_by = input.sortBy;
        }

        const response = await ctx.client.get('https://api.pagerduty.com/incidents', {
          params: queryParams,
        });
        return transformIncidentsResponse(response.data);
      },
    },

    // https://developer.pagerduty.com/api-reference/b4a9be04aa6ac-get-an-incident
    getIncident: {
      isTool: false,
      input: z.object({
        id: z.string(),
        include: z.string().optional(),
      }),
      handler: async (ctx, input: PD.GetIncidentInput) => {
        // Parse and filter the include parameter
        const includeValues = input.include ? input.include.split(',').map((v) => v.trim()) : [];
        const apiIncludes: string[] = [];
        const additionalData: {
          alerts?: Awaited<ReturnType<typeof listAlertsForIncidentHandler>>;
          notes?: Awaited<ReturnType<typeof listNotesForIncidentHandler>>;
          past?: Awaited<ReturnType<typeof listPastIncidentsHandler>>;
          related?: Awaited<ReturnType<typeof listRelatedIncidentsHandler>>;
        } = {};

        for (const includeValue of includeValues) {
          switch (includeValue) {
            case 'alerts':
              additionalData.alerts = await listAlertsForIncidentHandler(ctx, {
                incidentId: input.id,
                limit: 10,
              });
              break;

            case 'notes':
              additionalData.notes = await listNotesForIncidentHandler(ctx, {
                incidentId: input.id,
                limit: 10,
              });
              break;

            case 'related':
              additionalData.related = await listRelatedIncidentsHandler(ctx, {
                incidentId: input.id,
                limit: 10,
              });
              break;

            case 'past':
              additionalData.past = await listPastIncidentsHandler(ctx, {
                incidentId: input.id,
                limit: 10,
              });
              break;

            default:
              apiIncludes.push(includeValue);
              break;
          }
        }

        // Build query params for the main API call (only non-filtered includes)
        const queryParams = buildPaginationParams({
          include: apiIncludes.length > 0 ? apiIncludes.join(',') : undefined,
        });
        const response = await ctx.client.get(`https://api.pagerduty.com/incidents/${input.id}`, {
          params: queryParams,
        });
        const result = transformIncidentsResponse(response.data);

        // Merge the additional data into the result
        return {
          ...result,
          ...additionalData,
        };
      },
    },

    // https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-alerts-for-an-incident
    listAlertsForIncident: {
      isTool: false,
      input: z.object({
        incidentId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        include: z.string().optional(),
      }),
      handler: listAlertsForIncidentHandler,
    },

    // https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-notes-for-an-incident
    listNotesForIncident: {
      isTool: false,
      input: z.object({
        incidentId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        include: z.string().optional(),
      }),
      handler: listNotesForIncidentHandler,
    },

    // https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-related-change-events-for-an-incident
    listRelatedIncidents: {
      isTool: false,
      input: z.object({
        incidentId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        include: z.string().optional(),
      }),
      handler: listRelatedIncidentsHandler,
    },

    // https://developer.pagerduty.com/api-reference/b4a9be04aa6ac-list-past-incidents
    listPastIncidents: {
      isTool: false,
      input: z.object({
        incidentId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        include: z.string().optional(),
      }),
      handler: listPastIncidentsHandler,
    },

    // https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-schedules
    listSchedules: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        query: z.string().optional(),
        include: z.string().optional(),
        timeZone: z.string().optional(),
      }),
      handler: async (ctx, input: PD.ListSchedulesInput) => {
        const queryParams = buildPaginationParams(input);
        if (input.query) {
          queryParams.query = input.query;
        }
        if (input.timeZone) {
          queryParams.time_zone = input.timeZone;
        }

        const response = await ctx.client.get('https://api.pagerduty.com/schedules', {
          params: queryParams,
        });
        return transformScheduleResponse(response.data);
      },
    },

    // https://developer.pagerduty.com/api-reference/c8d0b4b12e36f9-get-a-schedule
    getSchedule: {
      isTool: false,
      input: z.object({
        id: z.string(),
        include: z.string().optional(),
        timeZone: z.string().optional(),
      }),
      handler: async (ctx, input: PD.GetScheduleInput) => {
        const queryParams = buildPaginationParams({ ...input, include: undefined });
        if (input.timeZone) {
          queryParams.time_zone = input.timeZone;
        }

        const response = await ctx.client.get(`https://api.pagerduty.com/schedules/${input.id}`, {
          params: queryParams,
        });
        return transformScheduleResponse(response.data);
      },
    },

    // https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-oncalls
    listOnCalls: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        total: z.boolean().optional(),
        scheduleIds: z.string().optional(),
        userIds: z.string().optional(),
        escalationPolicyIds: z.string().optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        include: z.string().optional(),
        timeZone: z.string().optional(),
      }),
      handler: async (ctx, input: PD.ListOnCallsInput) => {
        const baseParams = buildPaginationParams(input);
        const queryParams: Record<string, string | number | boolean | string[]> = {
          ...baseParams,
        };
        if (input.scheduleIds) {
          // PagerDuty expects schedule_ids[] as an array, but we accept comma-separated string
          queryParams['schedule_ids[]'] = input.scheduleIds.split(',').map((id) => id.trim());
        }
        if (input.userIds) {
          queryParams['user_ids[]'] = input.userIds.split(',').map((id) => id.trim());
        }
        if (input.escalationPolicyIds) {
          queryParams['escalation_policy_ids[]'] = input.escalationPolicyIds
            .split(',')
            .map((id) => id.trim());
        }
        if (input.since) {
          queryParams.since = input.since;
        }
        if (input.until) {
          queryParams.until = input.until;
        }
        if (input.timeZone) {
          queryParams.time_zone = input.timeZone;
        }

        const response = await ctx.client.get('https://api.pagerduty.com/oncalls', {
          params: queryParams,
        });

        const data = response.data as PD.PagerDutyOnCallsResponse;
        const transformOnCall = (oncall: PD.PagerDutyOnCall): PD.TransformedOnCall => ({
          user: oncall.user
            ? {
                id: oncall.user.id,
                summary: oncall.user.summary,
              }
            : undefined,
          escalation_policy: oncall.escalation_policy
            ? {
                id: oncall.escalation_policy.id,
                summary: oncall.escalation_policy.summary,
              }
            : undefined,
          schedule: oncall.schedule
            ? {
                id: oncall.schedule.id,
                summary: oncall.schedule.summary,
              }
            : undefined,
          escalation_level: oncall.escalation_level,
          start: oncall.start,
          end: oncall.end,
        });

        if (data.oncalls) {
          return {
            limit: data.limit,
            offset: data.offset,
            total: data.total,
            more: data.more,
            oncalls: data.oncalls.map(transformOnCall),
          };
        }
        return data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.pagerduty.test.description', {
      defaultMessage: 'Verifies PagerDuty connection by fetching authenticated user information',
    }),
    handler: async (ctx) => {
      ctx.log.debug('PagerDuty test handler - pinging /users/me endpoint');

      try {
        const response = await ctx.client.get('https://api.pagerduty.com/users/me');
        const user = response.data?.user;
        const userEmail = user?.email || 'unknown';
        const userName = user?.name || userEmail;

        return {
          ok: true,
          message: i18n.translate('core.kibanaConnectorSpecs.pagerduty.test.success', {
            defaultMessage:
              'Successfully connected to PagerDuty API. Authenticated as {userName} ({email})',
            values: { userName, email: userEmail },
          }),
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        ctx.log.error(`PagerDuty test failed: ${errorMessage}`);
        return {
          ok: false,
          message: i18n.translate('core.kibanaConnectorSpecs.pagerduty.test.failure', {
            defaultMessage: 'Failed to connect to PagerDuty API: {error}',
            values: { error: errorMessage },
          }),
        };
      }
    },
  },
};

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Handler for listAlertsForIncident action
 */
async function listAlertsForIncidentHandler(
  ctx: ActionContext,
  input: PD.IncidentIdPaginationInput
) {
  const queryParams = buildPaginationParams(input);
  const response = await ctx.client.get(
    `https://api.pagerduty.com/incidents/${input.incidentId}/alerts`,
    {
      params: queryParams,
    }
  );

  const data = response.data as {
    alert?: PD.PagerDutyAlert;
    alerts?: PD.PagerDutyAlert[];
    limit?: number;
    offset?: number;
    total?: number;
    more?: boolean;
  };
  const transformAlert = (alert: PD.PagerDutyAlert): PD.TransformedAlert => ({
    id: alert.id,
    summary: alert.summary,
    type: alert.type,
    created_at: alert.created_at,
    status: alert.status,
    alert_key: alert.alert_key,
    service: alert.service
      ? {
          id: alert.service.id,
          name: alert.service.name,
          summary: alert.service.summary,
        }
      : undefined,
    body: alert.body
      ? {
          type: alert.body.type,
          details: alert.body.details,
        }
      : undefined,
  });

  if (data.alert) {
    return {
      alert: transformAlert(data.alert),
    };
  }
  if (data.alerts) {
    return {
      limit: data.limit,
      offset: data.offset,
      total: data.total,
      more: data.more,
      alerts: data.alerts.map(transformAlert),
    };
  }
  return data;
}

/**
 * Handler for listNotesForIncident action
 */
async function listNotesForIncidentHandler(
  ctx: ActionContext,
  input: PD.IncidentIdPaginationInput
) {
  const queryParams = buildPaginationParams(input);
  const response = await ctx.client.get(
    `https://api.pagerduty.com/incidents/${input.incidentId}/notes`,
    {
      params: queryParams,
    }
  );

  const data = response.data as {
    note?: PD.PagerDutyNote;
    notes?: PD.PagerDutyNote[];
    limit?: number;
    offset?: number;
    total?: number;
    more?: boolean;
  };
  const transformNote = (note: PD.PagerDutyNote): PD.TransformedNote => ({
    id: note.id,
    content: note.content,
    created_at: note.created_at,
    user: note.user
      ? {
          id: note.user.id,
          summary: note.user.summary,
        }
      : undefined,
  });

  if (data.note) {
    return {
      note: transformNote(data.note),
    };
  }
  if (data.notes) {
    return {
      limit: data.limit,
      offset: data.offset,
      total: data.total,
      more: data.more,
      notes: data.notes.map(transformNote),
    };
  }
  return data;
}

/**
 * Handler for listRelatedIncidents action
 */
async function listRelatedIncidentsHandler(
  ctx: ActionContext,
  input: PD.IncidentIdPaginationInput
) {
  const queryParams = buildPaginationParams(input);
  const response = await ctx.client.get(
    `https://api.pagerduty.com/incidents/${input.incidentId}/related_change_events`,
    {
      params: queryParams,
    }
  );

  return transformIncidentsResponse(response.data);
}

/**
 * Handler for listPastIncidents action
 */
async function listPastIncidentsHandler(ctx: ActionContext, input: PD.IncidentIdPaginationInput) {
  const queryParams = buildPaginationParams(input);
  const response = await ctx.client.get(
    `https://api.pagerduty.com/incidents/${input.incidentId}/past_incidents`,
    {
      params: queryParams,
    }
  );

  return transformIncidentsResponse(response.data);
}

// ============================================================================
// QUERY PARAMETER HELPERS
// ============================================================================

interface PaginationParams {
  limit?: number;
  offset?: number;
  total?: boolean;
  include?: string;
}

/**
 * Build query parameters from common pagination fields
 */
function buildPaginationParams(params: PaginationParams): Record<string, string> {
  const queryParams: Record<string, string> = {};
  if (params.limit !== undefined) {
    queryParams.limit = params.limit.toString();
  }
  if (params.offset !== undefined) {
    queryParams.offset = params.offset.toString();
  }
  if (params.total !== undefined) {
    queryParams.total = params.total.toString();
  }
  if (params.include) {
    queryParams.include = params.include;
  }
  return queryParams;
}

// ============================================================================
// RESPONSE TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform incident response to include only essential fields
 */
function transformIncident(incident: PD.PagerDutyIncident): PD.TransformedIncident {
  return {
    id: incident.id,
    incident_number: incident.incident_number,
    title: incident.title,
    description: incident.description,
    status: incident.status,
    urgency: incident.urgency,
    priority: incident.priority,
    created_at: incident.created_at,
    updated_at: incident.updated_at,
    resolved_at: incident.resolved_at,
    service: incident.service
      ? {
          id: incident.service.id,
          name: incident.service.name,
          summary: incident.service.summary,
        }
      : undefined,
    assignments: incident.assignments?.map((assignment: PD.PagerDutyAssignment) => ({
      assignee: assignment.assignee
        ? {
            id: assignment.assignee.id,
            summary: assignment.assignee.summary,
          }
        : undefined,
    })),
    acknowledgers: incident.acknowledgers?.map((ack: PD.PagerDutyAcknowledger) => ({
      acknowledger: ack.acknowledger
        ? {
            id: ack.acknowledger.id,
            summary: ack.acknowledger.summary,
          }
        : undefined,
    })),
  };
}

/**
 * Transform escalation policy response to include only essential fields
 */
function transformEscalationPolicy(
  ep: PD.PagerDutyEscalationPolicy
): PD.TransformedEscalationPolicy {
  return {
    id: ep.id,
    name: ep.name,
    description: ep.description,
    num_loops: ep.num_loops,
    on_call_handoff_notifications: ep.on_call_handoff_notifications,
    teams: ep.teams?.map((team: PD.PagerDutyTeam) => ({
      id: team.id,
      name: team.name,
      summary: team.summary,
    })),
    services: ep.services?.map((service: PD.PagerDutyServiceReference) => ({
      id: service.id,
      name: service.name,
      summary: service.summary,
    })),
  };
}

/**
 * Transform schedule to include only essential fields
 */
function transformSchedule(schedule: PD.PagerDutySchedule): PD.TransformedSchedule {
  return {
    id: schedule.id,
    name: schedule.name,
    description: schedule.description,
    time_zone: schedule.time_zone,
    schedule_layers: schedule.schedule_layers?.map((layer) => ({
      id: layer.id,
      name: layer.name,
      start: layer.start,
      rotation_virtual_start: layer.rotation_virtual_start,
      rotation_turn_length_seconds: layer.rotation_turn_length_seconds,
      users: layer.users
        ?.map((user) => ({
          user:
            user.user && user.user.id
              ? {
                  id: user.user.id,
                  summary: user.user.summary,
                  name: user.user.name,
                  email: user.user.email,
                }
              : undefined,
        }))
        .filter((item) => item.user !== undefined),
    })),
    users: schedule.users
      ?.filter((user) => user && user.id)
      .map((user) => ({
        id: user.id,
        summary: user.summary,
      })),
  };
}

/**
 * Transform schedule(s) API response (single schedule or list)
 */
function transformScheduleResponse(data: {
  schedule?: PD.PagerDutySchedule;
  schedules?: PD.PagerDutySchedule[];
  limit?: number;
  offset?: number;
  total?: number;
  more?: boolean;
}) {
  if (data.schedule) {
    return { schedule: transformSchedule(data.schedule) };
  }
  if (data.schedules) {
    return {
      limit: data.limit,
      offset: data.offset,
      total: data.total,
      more: data.more,
      schedules: data.schedules.map(transformSchedule),
    };
  }
  return data;
}

/**
 * Transform incidents list response
 */
function transformIncidentsResponse(
  data: PD.PagerDutyIncidentsResponse
): PD.TransformedIncidentsResponse {
  if (data.incident) {
    return {
      incident: transformIncident(data.incident),
    };
  }
  if (data.incidents) {
    return {
      limit: data.limit,
      offset: data.offset,
      total: data.total,
      more: data.more,
      incidents: data.incidents.map(transformIncident),
    };
  }
  return data as PD.TransformedIncidentsResponse;
}
