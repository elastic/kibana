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
  AcknowledgeIncidentInput,
  AddRespondersInput,
  CallToolInput,
  ListServicesInput,
  ResolveIncidentInput,
  RunResponsePlayInput,
  TriggerIncidentInput,
  UpdateIncidentInput,
  BrowseIncidentsInput,
  BrowseServicesInput,
  BrowseSchedulesInput,
  BrowseTeamsInput,
  BrowseUsersInput,
  BrowseEscalationPoliciesInput,
  BrowseEventOrchestrationsInput,
  BrowseAlertGroupingInput,
  BrowseChangeEventsInput,
  BrowseStatusPagesInput,
  BrowseActivityInput,
  ManageIncidentsInput,
  ManageServicesInput,
  ManageSchedulesInput,
  ManageTeamsInput,
  ManageEventOrchestrationsInput,
  ManageAlertGroupingInput,
  ManageStatusPagesInput,
} from './types';
import {
  AcknowledgeIncidentInputSchema,
  AddRespondersInputSchema,
  CallToolInputSchema,
  ListServicesInputSchema,
  ResolveIncidentInputSchema,
  RunResponsePlayInputSchema,
  TriggerIncidentInputSchema,
  UpdateIncidentInputSchema,
  ListToolsInputSchema,
  BrowseIncidentsInputSchema,
  BrowseServicesInputSchema,
  BrowseSchedulesInputSchema,
  BrowseTeamsInputSchema,
  BrowseUsersInputSchema,
  BrowseEscalationPoliciesInputSchema,
  BrowseEventOrchestrationsInputSchema,
  BrowseAlertGroupingInputSchema,
  BrowseChangeEventsInputSchema,
  BrowseStatusPagesInputSchema,
  BrowseActivityInputSchema,
  ManageIncidentsInputSchema,
  ManageServicesInputSchema,
  ManageSchedulesInputSchema,
  ManageTeamsInputSchema,
  ManageEventOrchestrationsInputSchema,
  ManageAlertGroupingInputSchema,
  ManageStatusPagesInputSchema,
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
    browseUsers: {
      isTool: true,
      scope: 'read',
      description:
        "Read PagerDuty users. Set request.action to get (the current authenticated user's profile; no other fields) or list (optional query and team_ids).",
      input: BrowseUsersInputSchema,
      handler: async (ctx, input: BrowseUsersInput) => {
        return callToolJson(ctx, 'browse_users', input);
      },
    },

    triggerIncident: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new PagerDuty incident. Requires a service ID (use listServices to find one), an incident title, and the from email of the acting user (call browseUsers with request.action get to retrieve it). Returns the full incident object including incident.id, which downstream steps can use to acknowledge, resolve, or update the incident. Optionally accepts urgency, a detailed body, an escalation policy override, and direct user assignments.',
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

    manageIncidents: {
      isTool: true,
      scope: 'destroy',
      description:
        'Modify PagerDuty incidents. Set request.action to create (incident.title and incident.service.id), update (manage_request.incident_ids with status acknowledged or resolved, urgency, assignment, or escalation_level), add_note, add_responders, or start_workflow.',
      input: ManageIncidentsInputSchema,
      handler: async (ctx, input: ManageIncidentsInput) => {
        return callToolJson(ctx, 'manage_incidents', input);
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
          paramsSerializer: { indexes: false },
        });
        return response.data;
      },
    },

    browseServices: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty services. Set request.action to list (optional query and team_ids) or get (service_id). Use list to find a service ID before creating an incident.',
      input: BrowseServicesInputSchema,
      handler: async (ctx, input: BrowseServicesInput) => {
        return callToolJson(ctx, 'browse_services', input);
      },
    },

    manageServices: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create or update PagerDuty services. Set request.action to create (service_data.service with name and escalation_policy.id) or update (service_id and service_data).',
      input: ManageServicesInputSchema,
      handler: async (ctx, input: ManageServicesInput) => {
        return callToolJson(ctx, 'manage_services', input);
      },
    },

    addResponders: {
      isTool: true,
      scope: 'write',
      description:
        'Request additional responders for an active PagerDuty incident. Notifies the specified users or escalation policy on-call responders that their help is needed. Requires the incident ID, your PagerDuty user ID (call browseUsers with request.action get to retrieve it), a message, and at least one user ID or escalation policy ID to notify. Returns the responder request object.',
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
        'Execute a predefined PagerDuty response play against an incident. Response plays automate multi-step incident response tasks (e.g. paging additional teams, posting updates). Requires the incident ID, the response play ID, the from email, and your PagerDuty user ID (call browseUsers with request.action get to retrieve it). Returns the response play execution result.',
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

    browseSchedules: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty schedules and on-call data. Set request.action to list, get, list_users, list_oncalls (who is on call, filterable by schedule, user, escalation policy, or service), or, for shift-based (v3) schedules, list_rotations, get_rotation, list_rotation_events, get_rotation_event, list_custom_shifts, get_custom_shift, list_overrides, get_override.',
      input: BrowseSchedulesInputSchema,
      handler: async (ctx, input: BrowseSchedulesInput) => {
        return callToolJson(ctx, 'browse_schedules', input);
      },
    },

    browseEscalationPolicies: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty escalation policies. Set request.action to list (optional query, user_ids, team_ids, include) or get (policy_id).',
      input: BrowseEscalationPoliciesInputSchema,
      handler: async (ctx, input: BrowseEscalationPoliciesInput) => {
        return callToolJson(ctx, 'browse_escalation_policies', input);
      },
    },

    browseIncidents: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty incident data. Set request.action to one of: list (filter by request_scope, statuses, urgencies, priorities, service_ids, team_ids, since/until), get (incident_id), list_alerts, get_alert, list_notes, context (context_type: related, past, or outlier), list_change_events, list_workflows, get_workflow.',
      input: BrowseIncidentsInputSchema,
      handler: async (ctx, input: BrowseIncidentsInput) => {
        return callToolJson(ctx, 'browse_incidents', input);
      },
    },

    browseTeams: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty teams. Set request.action to list (scope all or my, optional query), get (team_id), or list_members (team_id).',
      input: BrowseTeamsInputSchema,
      handler: async (ctx, input: BrowseTeamsInput) => {
        return callToolJson(ctx, 'browse_teams', input);
      },
    },

    manageSchedules: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create, update, or delete PagerDuty schedules. Legacy (v2) schedules use create, update, and create_override. Shift-based (v3) schedules use create, update, delete_schedule_v3, create_rotation, delete_rotation, create_rotation_event, update_rotation_event, delete_rotation_event, create_custom_shifts, update_custom_shift, delete_custom_shift, create_overrides, update_override, and delete_override.',
      input: ManageSchedulesInputSchema,
      handler: async (ctx, input: ManageSchedulesInput) => {
        return callToolJson(ctx, 'manage_schedules', input);
      },
    },

    manageTeams: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create, update, or delete PagerDuty teams and membership. Set request.action to create, update, delete, add_member (member_data.user_id and role), or remove_member.',
      input: ManageTeamsInputSchema,
      handler: async (ctx, input: ManageTeamsInput) => {
        return callToolJson(ctx, 'manage_teams', input);
      },
    },

    browseEventOrchestrations: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty event orchestrations. Set request.action to list, get (orchestration_id), get_router (orchestration_id), get_service (service_id), or get_global (orchestration_id).',
      input: BrowseEventOrchestrationsInputSchema,
      handler: async (ctx, input: BrowseEventOrchestrationsInput) => {
        return callToolJson(ctx, 'browse_event_orchestrations', input);
      },
    },

    manageEventOrchestrations: {
      isTool: true,
      scope: 'destroy',
      description:
        'Modify PagerDuty event orchestration routing. Set request.action to update_router (replaces the full router config) or append_router_rule (adds a rule to the end of the router).',
      input: ManageEventOrchestrationsInputSchema,
      handler: async (ctx, input: ManageEventOrchestrationsInput) => {
        return callToolJson(ctx, 'manage_event_orchestrations', input);
      },
    },

    browseAlertGrouping: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty alert grouping settings. Set request.action to list (optional service_ids, cursor pagination with after/before) or get (setting_id).',
      input: BrowseAlertGroupingInputSchema,
      handler: async (ctx, input: BrowseAlertGroupingInput) => {
        return callToolJson(ctx, 'browse_alert_grouping', input);
      },
    },

    manageAlertGrouping: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create, update, or delete PagerDuty alert grouping settings. Set request.action to create, update, or delete (setting_id).',
      input: ManageAlertGroupingInputSchema,
      handler: async (ctx, input: ManageAlertGroupingInput) => {
        return callToolJson(ctx, 'manage_alert_grouping', input);
      },
    },

    browseChangeEvents: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty change events. Set request.action to list (filter by since/until, team_ids, integration_ids), get (change_event_id), or list_service (service_id).',
      input: BrowseChangeEventsInputSchema,
      handler: async (ctx, input: BrowseChangeEventsInput) => {
        return callToolJson(ctx, 'browse_change_events', input);
      },
    },

    browseStatusPages: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty status pages. Set request.action to list, list_severities, list_impacts, list_statuses (each needs status_page_id), get_post, or list_post_updates (status_page_id and post_id). Use the severity, impact, and status IDs when creating posts.',
      input: BrowseStatusPagesInputSchema,
      handler: async (ctx, input: BrowseStatusPagesInput) => {
        return callToolJson(ctx, 'browse_status_pages', input);
      },
    },

    manageStatusPages: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create status page posts and post updates. Set request.action to create_post (needs at least one update) or create_post_update.',
      input: ManageStatusPagesInputSchema,
      handler: async (ctx, input: ManageStatusPagesInput) => {
        return callToolJson(ctx, 'manage_status_pages', input);
      },
    },

    browseActivity: {
      isTool: true,
      scope: 'read',
      description:
        'Read PagerDuty account activity. Set request.action to list_log_entries (since/until default to the last 7 days) or get_log_entry (log_entry_id).',
      input: BrowseActivityInputSchema,
      handler: async (ctx, input: BrowseActivityInput) => {
        return callToolJson(ctx, 'browse_activity', input);
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
    '### Identifying the Authenticated User',
    '',
    'Call `browseUsers` with `request.action` set to `get` to retrieve the currently authenticated PagerDuty user.',
    "This returns the user's id, name, email, summary, role, and team memberships.",
    'Use this to confirm which account the connector is acting as, and to obtain your user id and email before calling any write action.',
    '',
    '### The `from` Parameter (Write Actions)',
    '',
    'Every write action (triggerIncident, acknowledgeIncident, resolveIncident, updateIncident, addResponders, runResponsePlay) requires a `from` parameter — the email address of the acting PagerDuty user.',
    'This is needed because org-scoped API tokens have no implicit user identity.',
    'To get the email, call `browseUsers` (`get`) first and use the returned `email` field.',
    '',
    '### Triggering an Incident',
    '',
    'Typical workflow to create and manage an incident:',
    '1. Call `browseUsers` (`get`) to get your `id` and `email` (needed for `from` and optionally `requester_id`).',
    '2. Call `listServices` with a `query` to find the target service ID.',
    '3. Call `triggerIncident` with the service ID, title, and your email as `from`.',
    '4. Store the returned `incident.id` for subsequent steps.',
    '5. Call `acknowledgeIncident` or `resolveIncident` with that `incident.id` to update the incident state.',
    '',
    '### Finding Who Is On Call',
    '',
    'To find who is currently on call for a named schedule:',
    '1. Call `browseSchedules` (`list`) with a `query` matching the schedule name (e.g., "primary" or "database") to get candidate schedule IDs.',
    '2. Call `browseSchedules` (`list_oncalls`) with `schedule_ids` set to the IDs returned in step 1 to get the current on-call assignments.',
    '',
    'If you only need to know who is on call right now without knowing which schedule, call `browseSchedules` (`list_oncalls`) directly with a `since`/`until` time range (ISO 8601 format) and optionally an `escalation_policy_ids` filter.',
    'Set `earliest: true` to return only the first on-call entry per user+policy combination and reduce noise.',
    '',
    '### Investigating Incidents',
    '',
    'To investigate incidents, use `browseIncidents` (`list`) with one or more of these filters:',
    '- `statuses`: array of statuses — "triggered", "acknowledged", or "resolved"',
    '- `urgencies`: array — "high" or "low"',
    '- `since` / `until`: ISO 8601 date range to scope by creation time',
    '- `service_ids`: limit to specific services',
    '- `request_scope`: "all" (default), "teams", or "assigned" (incidents assigned to the current user)',
    '',
    'Once you have an incident ID from the list, call `browseIncidents` (`get`) for full details including assignments, service, and timestamps.',
    '',
    '### Escalating an Active Incident',
    '',
    'To page additional responders on an active incident:',
    '1. Call `browseUsers` (`get`) to get your user id for `requester_id`.',
    '2. Call `addResponders` with the incident ID, your user ID, a message, and the IDs of users or escalation policies to notify.',
    '',
    'To run a predefined multi-step response play:',
    '1. Call `browseUsers` (`get`) to get your user id for `requester_id`.',
    '2. Call `runResponsePlay` with the incident ID, response play ID, your email as `from`, and your user id as `requester_id`.',
    '',
    '### Working with Escalation Policies',
    '',
    'To explore escalation policies:',
    '1. Call `browseEscalationPolicies` (`list`) with an optional `query` (free-text name/description search) or `team_ids` / `user_ids` filters.',
    '2. Use the returned IDs to call `browseEscalationPolicies` (`get`) for full details: escalation rules, delay minutes, targets, associated services, and teams.',
  ].join('\n'),
};
