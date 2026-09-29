/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * PagerDuty MCP Connector (v2)
 *
 * An MCP-native v2 connector that connects to the PagerDuty MCP server.
 *
 * Auth: API Key (Authorization: Token token=<key>)
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  AddRespondersInput,
  AcknowledgeIncidentInput,
  CallToolInput,
  GetEscalationPolicyInput,
  GetIncidentInput,
  GetScheduleInput,
  GetTeamInput,
  ListEscalationPoliciesInput,
  ListIncidentsInput,
  ListOncallsInput,
  ListSchedulesInput,
  ListServicesInput,
  ListTeamsInput,
  ListUsersInput,
  ResolveIncidentInput,
  RunResponsePlayInput,
  TriggerIncidentInput,
  UpdateIncidentInput,
} from './types';
import {
  AddRespondersInputSchema,
  AcknowledgeIncidentInputSchema,
  ListToolsInputSchema,
  GetUserDataInputSchema,
  ListSchedulesInputSchema,
  ListEscalationPoliciesInputSchema,
  ListIncidentsInputSchema,
  ListOncallsInputSchema,
  ListUsersInputSchema,
  ListTeamsInputSchema,
  ListServicesInputSchema,
  GetScheduleInputSchema,
  GetIncidentInputSchema,
  GetEscalationPolicyInputSchema,
  GetTeamInputSchema,
  ResolveIncidentInputSchema,
  RunResponsePlayInputSchema,
  TriggerIncidentInputSchema,
  UpdateIncidentInputSchema,
  CallToolInputSchema,
} from './types';

const PAGERDUTY_MCP_SERVER_URL = 'https://mcp.pagerduty.com/mcp';
const PAGERDUTY_REST_API_BASE_URL = 'https://api.pagerduty.com';

/** Headers required by the PagerDuty v2 REST API for all requests. */
const PD_ACCEPT_HEADER = 'application/vnd.pagerduty+json;version=2';

export const PagerdutyConnector: ConnectorSpec = {
  metadata: {
    id: '.pagerduty_mcp',
    displayName: 'PagerDuty (MCP)',
    description: i18n.translate('core.kibanaConnectorSpecs.pagerduty.metadata.description', {
      defaultMessage:
        'Trigger, acknowledge, resolve, and update PagerDuty incidents; list services, on-call schedules, escalation policies, and users.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'Authorization' },
        overrides: {
          meta: {
            Authorization: {
              label: i18n.translate('connectorSpecs.pagerduty.auth.apiKey.label', {
                defaultMessage: 'API Key',
              }),
              helpText: i18n.translate('connectorSpecs.pagerduty.auth.apiKey.helpText', {
                defaultMessage:
                  'Enter your PagerDuty API key in the format: Token token=YOUR_API_KEY',
              }),
              placeholder: 'Token token={{YOUR_API_KEY}}',
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(PAGERDUTY_MCP_SERVER_URL)
        .describe('PagerDuty MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: 'https://mcp.pagerduty.com/mcp',
          hidden: true,
          label: i18n.translate('connectorSpecs.pagerduty.config.serverUrl.label', {
            defaultMessage: 'MCP Server URL',
          }),
          helpText: i18n.translate('connectorSpecs.pagerduty.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the PagerDuty MCP server.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    getUserData: {
      isTool: true,
      scope: 'read',
      description:
        'Return the current PagerDuty user — i.e. the account that owns the API key. Returns id, name, email, summary, role, and teams. No inputs required. Use this to confirm which user the connector is authenticated as, and to obtain your user ID and email for write actions that require the from parameter.',
      input: GetUserDataInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_user_data');
      },
    },

    triggerIncident: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new PagerDuty incident. Requires a service ID (use listServices to find one), an incident title, and the from email of the acting user (call getUserData to retrieve it). Returns the full incident object including incident.id, which downstream steps can use to acknowledge, resolve, or update the incident. Optionally accepts urgency, a detailed body, an escalation policy override, and direct user assignments.',
      input: TriggerIncidentInputSchema,
      handler: async (ctx, input: TriggerIncidentInput) => {
        const incidentPayload: Record<string, unknown> = {
          type: 'incident',
          title: input.title,
          service: { id: input.service_id, type: 'service_reference' },
        };
        if (input.urgency !== undefined) {
          incidentPayload.urgency = input.urgency;
        }
        if (input.body !== undefined) {
          incidentPayload.body = { type: 'incident_body', details: input.body };
        }
        if (input.escalation_policy_id !== undefined) {
          incidentPayload.escalation_policy = {
            id: input.escalation_policy_id,
            type: 'escalation_policy_reference',
          };
        }
        if (input.assignment_user_ids !== undefined && input.assignment_user_ids.length > 0) {
          incidentPayload.assignments = input.assignment_user_ids.map((id) => ({
            assignee: { id, type: 'user_reference' },
          }));
        }
        const response = await ctx.client.post(
          `${PAGERDUTY_REST_API_BASE_URL}/incidents`,
          { incident: incidentPayload },
          { headers: { From: input.from, Accept: PD_ACCEPT_HEADER } }
        );
        return response.data;
      },
    },

    acknowledgeIncident: {
      isTool: true,
      scope: 'destroy',
      description:
        'Acknowledge an active PagerDuty incident by its ID. Moves the incident status from "triggered" to "acknowledged". Requires the incident ID and the from email of the acting user. Returns the updated incident object.',
      input: AcknowledgeIncidentInputSchema,
      handler: async (ctx, input: AcknowledgeIncidentInput) => {
        const response = await ctx.client.put(
          `${PAGERDUTY_REST_API_BASE_URL}/incidents/${encodeURIComponent(input.incident_id)}`,
          { incident: { type: 'incident', status: 'acknowledged' } },
          { headers: { From: input.from, Accept: PD_ACCEPT_HEADER } }
        );
        return response.data;
      },
    },

    resolveIncident: {
      isTool: true,
      scope: 'destroy',
      description:
        'Resolve a PagerDuty incident by its ID. Moves the incident status to "resolved". Requires the incident ID and the from email of the acting user. Returns the updated incident object. Use this as the final step of an automated remediation workflow.',
      input: ResolveIncidentInputSchema,
      handler: async (ctx, input: ResolveIncidentInput) => {
        const response = await ctx.client.put(
          `${PAGERDUTY_REST_API_BASE_URL}/incidents/${encodeURIComponent(input.incident_id)}`,
          { incident: { type: 'incident', status: 'resolved' } },
          { headers: { From: input.from, Accept: PD_ACCEPT_HEADER } }
        );
        return response.data;
      },
    },

    updateIncident: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update one or more fields on an existing PagerDuty incident (title, status, urgency, priority, or assignments). At least one updatable field must be provided. Requires the incident ID and the from email of the acting user. Returns the updated incident object.',
      input: UpdateIncidentInputSchema,
      handler: async (ctx, input: UpdateIncidentInput) => {
        const incidentPayload: Record<string, unknown> = { type: 'incident' };
        if (input.title !== undefined) {
          incidentPayload.title = input.title;
        }
        if (input.status !== undefined) {
          incidentPayload.status = input.status;
        }
        if (input.urgency !== undefined) {
          incidentPayload.urgency = input.urgency;
        }
        if (input.priority_id !== undefined) {
          incidentPayload.priority = { id: input.priority_id, type: 'priority_reference' };
        }
        if (input.assignment_user_ids !== undefined && input.assignment_user_ids.length > 0) {
          incidentPayload.assignments = input.assignment_user_ids.map((id) => ({
            assignee: { id, type: 'user_reference' },
          }));
        }
        const response = await ctx.client.put(
          `${PAGERDUTY_REST_API_BASE_URL}/incidents/${encodeURIComponent(input.incident_id)}`,
          { incident: incidentPayload },
          { headers: { From: input.from, Accept: PD_ACCEPT_HEADER } }
        );
        return response.data;
      },
    },

    listServices: {
      isTool: true,
      scope: 'read',
      description:
        "List PagerDuty services. Supports free-text search across name and description, and filtering by team IDs. Returns each service's id, name, description, status, and escalation policy. Use this to look up a service ID before triggering an incident.",
      input: ListServicesInputSchema,
      handler: async (ctx, input: ListServicesInput) => {
        const params: Record<string, unknown> = {};
        if (input.query !== undefined) {
          params.query = input.query;
        }
        if (input.limit !== undefined) {
          params.limit = input.limit;
        }
        if (input.team_ids !== undefined && input.team_ids.length > 0) {
          params['team_ids[]'] = input.team_ids;
        }
        const response = await ctx.client.get(`${PAGERDUTY_REST_API_BASE_URL}/services`, {
          params,
          headers: { Accept: PD_ACCEPT_HEADER },
          paramsSerializer: { indexes: null },
        });
        return response.data;
      },
    },

    addResponders: {
      isTool: true,
      scope: 'write',
      description:
        'Request additional responders for an active PagerDuty incident. Notifies the specified users or escalation policy on-call responders that their help is needed. Requires the incident ID, your PagerDuty user ID (call getUserData to retrieve it), a message, and at least one user ID or escalation policy ID to notify. Returns the responder request object.',
      input: AddRespondersInputSchema,
      handler: async (ctx, input: AddRespondersInput) => {
        const targets: Array<{ responder_request_target: { id: string; type: string } }> = [];
        for (const id of input.responder_user_ids ?? []) {
          targets.push({ responder_request_target: { id, type: 'user_reference' } });
        }
        for (const id of input.responder_escalation_policy_ids ?? []) {
          targets.push({
            responder_request_target: { id, type: 'escalation_policy_reference' },
          });
        }
        const response = await ctx.client.post(
          `${PAGERDUTY_REST_API_BASE_URL}/incidents/${encodeURIComponent(
            input.incident_id
          )}/responder_requests`,
          {
            requester_id: input.requester_id,
            message: input.message,
            responder_request_targets: targets,
          },
          { headers: { From: input.from, Accept: PD_ACCEPT_HEADER } }
        );
        return response.data;
      },
    },

    runResponsePlay: {
      isTool: true,
      scope: 'write',
      description:
        'Execute a predefined PagerDuty response play against an incident. Response plays automate multi-step incident response tasks (e.g. paging additional teams, posting updates). Requires the incident ID, the response play ID, the from email, and your PagerDuty user ID (call getUserData to retrieve it). Returns the response play execution result.',
      input: RunResponsePlayInputSchema,
      handler: async (ctx, input: RunResponsePlayInput) => {
        const response = await ctx.client.post(
          `${PAGERDUTY_REST_API_BASE_URL}/response_plays/${encodeURIComponent(
            input.response_play_id
          )}/run`,
          {
            incident: { id: input.incident_id, type: 'incident_reference' },
            requester: { id: input.requester_id, type: 'user_reference' },
          },
          { headers: { From: input.from, Accept: PD_ACCEPT_HEADER } }
        );
        return response.data;
      },
    },

    listSchedules: {
      isTool: true,
      scope: 'read',
      description:
        'List PagerDuty on-call schedules. Supports free-text search across name and description fields (e.g., "primary" or "weekend"), filtering by team or user IDs, and including related resources such as schedule_layers, overrides_subschedule, or final_schedule.',
      input: ListSchedulesInputSchema,
      handler: async (ctx, input: ListSchedulesInput) => {
        return callToolJson(ctx, 'list_schedules', { query_model: input });
      },
    },

    listEscalationPolicies: {
      isTool: true,
      scope: 'read',
      description:
        'List PagerDuty escalation policies. Supports free-text search across name and description fields (e.g., "production" or "on-call"), and filtering by user or team IDs. Returns each policy\'s escalation rules, targets, associated services, and teams.',
      input: ListEscalationPoliciesInputSchema,
      handler: async (ctx, input: ListEscalationPoliciesInput) => {
        return callToolJson(ctx, 'list_escalation_policies', { query_model: input });
      },
    },

    listIncidents: {
      isTool: true,
      scope: 'read',
      description:
        'List PagerDuty incidents. Supports filtering by status (triggered, acknowledged, resolved), service IDs, user IDs, urgency, and date range. Dates use ISO 8601 format. Results can be scoped to all incidents, team incidents, or those assigned to the current user. Supports sorting by incident_number, created_at, resolved_at, or urgency.',
      input: ListIncidentsInputSchema,
      handler: async (ctx, input: ListIncidentsInput) => {
        return callToolJson(ctx, 'list_incidents', { query_model: input });
      },
    },

    listOncalls: {
      isTool: true,
      scope: 'read',
      description:
        'Get current on-call assignments in PagerDuty. Use this to find who is currently on call for specific schedules or escalation policies. Supports filtering by schedule IDs, user IDs, or escalation policy IDs, and time range queries using ISO 8601 dates. Set earliest=true to return only the first on-call entry per user+policy combination.',
      input: ListOncallsInputSchema,
      handler: async (ctx, input: ListOncallsInput) => {
        return callToolJson(ctx, 'list_oncalls', { query_model: input });
      },
    },

    listUsers: {
      isTool: true,
      scope: 'read',
      description:
        "List PagerDuty users. Supports free-text search across name and email fields. Returns each user's id, name, email, summary, and role.",
      input: ListUsersInputSchema,
      handler: async (ctx, input: ListUsersInput) => {
        return callToolJson(ctx, 'list_users', { query_model: input });
      },
    },

    listTeams: {
      isTool: true,
      scope: 'read',
      description:
        "List PagerDuty teams. Supports free-text search across name and description fields. Returns each team's id, name, description, and summary.",
      input: ListTeamsInputSchema,
      handler: async (ctx, input: ListTeamsInput) => {
        return callToolJson(ctx, 'list_teams', { query_model: input });
      },
    },

    getSchedule: {
      isTool: true,
      scope: 'read',
      description:
        "Get a specific PagerDuty on-call schedule by its ID. Returns the schedule's name, description, time zone, schedule layers (including rotation settings and assigned users), and the list of users on the schedule.",
      input: GetScheduleInputSchema,
      handler: async (ctx, input: GetScheduleInput) => {
        return callToolJson(ctx, 'get_schedule', { schedule_id: input.schedule_id });
      },
    },

    getIncident: {
      isTool: true,
      scope: 'read',
      description:
        "Get a specific PagerDuty incident by its ID. Returns the incident's summary, status, urgency, service, current assignments (who is assigned and when), and creation/update timestamps.",
      input: GetIncidentInputSchema,
      handler: async (ctx, input: GetIncidentInput) => {
        return callToolJson(ctx, 'get_incident', { incident_id: input.incident_id });
      },
    },

    getEscalationPolicy: {
      isTool: true,
      scope: 'read',
      description:
        "Get a specific PagerDuty escalation policy by its ID. Returns the policy's name, description, escalation rules (with delay minutes and targets), associated services, and teams.",
      input: GetEscalationPolicyInputSchema,
      handler: async (ctx, input: GetEscalationPolicyInput) => {
        return callToolJson(ctx, 'get_escalation_policy', { policy_id: input.policy_id });
      },
    },

    getTeam: {
      isTool: true,
      scope: 'read',
      description:
        "Get a specific PagerDuty team by its ID. Returns the team's id, name, description, and summary.",
      input: GetTeamInputSchema,
      handler: async (ctx, input: GetTeamInput) => {
        return callToolJson(ctx, 'get_team', { team_id: input.team_id });
      },
    },

    listTools: {
      isTool: true,
      scope: 'read',
      description:
        'List all tools available on the PagerDuty MCP server. Use this to discover available capabilities.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      scope: 'destroy',
      description:
        'Call any tool on the PagerDuty MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.pagerduty.test.description', {
      defaultMessage: 'Verifies the PagerDuty connection.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        await mcp.listTools();
        return {};
      });
    },
  },

  skill: [
    '## PagerDuty Connector Usage Guide',
    '',
    '### Identifying the Authenticated User (getUserData)',
    '',
    'Call `getUserData` with no inputs to retrieve the currently authenticated PagerDuty user.',
    "This returns the user's id, name, email, summary, role, and team memberships.",
    'Use this to confirm which account the connector is acting as, and to obtain your user id and email before calling any write action.',
    '',
    '### The `from` Parameter (Write Actions)',
    '',
    'Every write action (triggerIncident, acknowledgeIncident, resolveIncident, updateIncident, addResponders, runResponsePlay) requires a `from` parameter — the email address of the acting PagerDuty user.',
    'This is needed because org-scoped API tokens have no implicit user identity.',
    'To get the email, call `getUserData` first and use the returned `email` field.',
    '',
    '### Triggering an Incident',
    '',
    'Typical workflow to create and manage an incident:',
    '1. Call `getUserData` to get your `id` and `email` (needed for `from` and optionally `requester_id`).',
    '2. Call `listServices` with a `query` to find the target service ID.',
    '3. Call `triggerIncident` with the service ID, title, and your email as `from`.',
    '4. Store the returned `incident.id` for subsequent steps.',
    '5. Call `acknowledgeIncident` or `resolveIncident` with that `incident.id` to update the incident state.',
    '',
    '### Finding Who Is On Call',
    '',
    'To find who is currently on call for a named schedule:',
    '1. Call `listSchedules` with a `query` matching the schedule name (e.g., "primary" or "database") to get candidate schedule IDs.',
    '2. Call `listOncalls` with `schedule_ids` set to the IDs returned in step 1 to get the current on-call assignments.',
    '',
    'If you only need to know who is on call right now without knowing which schedule, call `listOncalls` directly with a `since`/`until` time range (ISO 8601 format) and optionally an `escalation_policy_ids` filter.',
    'Set `earliest: true` to return only the first on-call entry per user+policy combination and reduce noise.',
    '',
    '### Investigating Incidents',
    '',
    'To investigate incidents, use `listIncidents` with one or more of these filters:',
    '- `status`: array of statuses — "triggered", "acknowledged", or "resolved"',
    '- `urgencies`: array — "high" or "low"',
    '- `since` / `until`: ISO 8601 date range to scope by creation time',
    '- `service_ids`: limit to specific services',
    '- `request_scope`: "all" (default), "teams", or "assigned" (incidents assigned to the current user)',
    '- `sort_by`: array of sort fields with direction, e.g. ["created_at:desc"]',
    '',
    'Once you have an incident ID from the list, call `getIncident` for full details including assignments, service, and timestamps.',
    '',
    '### Escalating an Active Incident',
    '',
    'To page additional responders on an active incident:',
    '1. Call `getUserData` to get your user id for `requester_id`.',
    '2. Call `addResponders` with the incident ID, your user ID, a message, and the IDs of users or escalation policies to notify.',
    '',
    'To run a predefined multi-step response play:',
    '1. Call `getUserData` to get your user id for `requester_id`.',
    '2. Call `runResponsePlay` with the incident ID, response play ID, your email as `from`, and your user id as `requester_id`.',
    '',
    '### Working with Escalation Policies',
    '',
    'To explore escalation policies:',
    '1. Call `listEscalationPolicies` with an optional `query` (free-text name/description search) or `team_ids` / `user_ids` filters.',
    '2. Use the returned IDs to call `getEscalationPolicy` for full details: escalation rules, delay minutes, targets, associated services, and teams.',
  ].join('\n'),
};
