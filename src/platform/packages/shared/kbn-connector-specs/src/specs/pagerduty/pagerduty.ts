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
import { skillFiles } from './skills';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  CallToolInput,
  GetEscalationPolicyInput,
  GetIncidentInput,
  GetScheduleInput,
  GetTeamInput,
  ListEscalationPoliciesInput,
  ListIncidentsInput,
  ListOncallsInput,
  ListSchedulesInput,
  ListTeamsInput,
  ListUsersInput,
} from './types';
import {
  ListToolsInputSchema,
  GetUserDataInputSchema,
  ListSchedulesInputSchema,
  ListEscalationPoliciesInputSchema,
  ListIncidentsInputSchema,
  ListOncallsInputSchema,
  ListUsersInputSchema,
  ListTeamsInputSchema,
  GetScheduleInputSchema,
  GetIncidentInputSchema,
  GetEscalationPolicyInputSchema,
  GetTeamInputSchema,
  CallToolInputSchema,
} from './types';

const PAGERDUTY_MCP_SERVER_URL = 'https://mcp.pagerduty.com/mcp';

export const PagerdutyConnector: ConnectorSpec = {
  metadata: {
    id: '.pagerduty_mcp',
    displayName: 'PagerDuty (MCP)',
    description: i18n.translate('core.kibanaConnectorSpecs.pagerduty.metadata.description', {
      defaultMessage:
        'Connect to PagerDuty to access incidents, escalation policies, schedules, and related data.',
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
      description:
        'Return the current PagerDuty user — i.e. the account that owns the API key. Returns id, name, email, summary, role, and teams. No inputs required. Use this to confirm which user the connector is authenticated as.',
      input: GetUserDataInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_user_data');
      },
    },

    listSchedules: {
      isTool: false,
      description:
        'List PagerDuty on-call schedules. Supports free-text search across name and description fields (e.g., "primary" or "weekend"), filtering by team or user IDs, and including related resources such as schedule_layers, overrides_subschedule, or final_schedule.',
      input: ListSchedulesInputSchema,
      handler: async (ctx, input: ListSchedulesInput) => {
        return callToolJson(ctx, 'list_schedules', { query_model: input });
      },
    },

    listEscalationPolicies: {
      isTool: false,
      description:
        'List PagerDuty escalation policies. Supports free-text search across name and description fields (e.g., "production" or "on-call"), and filtering by user or team IDs. Returns each policy\'s escalation rules, targets, associated services, and teams.',
      input: ListEscalationPoliciesInputSchema,
      handler: async (ctx, input: ListEscalationPoliciesInput) => {
        return callToolJson(ctx, 'list_escalation_policies', { query_model: input });
      },
    },

    listIncidents: {
      isTool: false,
      description:
        'List PagerDuty incidents. Supports filtering by status (triggered, acknowledged, resolved), service IDs, user IDs, urgency, and date range. Dates use ISO 8601 format. Results can be scoped to all incidents, team incidents, or those assigned to the current user. Supports sorting by incident_number, created_at, resolved_at, or urgency.',
      input: ListIncidentsInputSchema,
      handler: async (ctx, input: ListIncidentsInput) => {
        return callToolJson(ctx, 'list_incidents', { query_model: input });
      },
    },

    listOncalls: {
      isTool: false,
      description:
        'Get current on-call assignments in PagerDuty. Use this to find who is currently on call for specific schedules or escalation policies. Supports filtering by schedule IDs, user IDs, or escalation policy IDs, and time range queries using ISO 8601 dates. Set earliest=true to return only the first on-call entry per user+policy combination.',
      input: ListOncallsInputSchema,
      handler: async (ctx, input: ListOncallsInput) => {
        return callToolJson(ctx, 'list_oncalls', { query_model: input });
      },
    },

    listUsers: {
      isTool: false,
      description:
        "List PagerDuty users. Supports free-text search across name and email fields. Returns each user's id, name, email, summary, and role.",
      input: ListUsersInputSchema,
      handler: async (ctx, input: ListUsersInput) => {
        return callToolJson(ctx, 'list_users', { query_model: input });
      },
    },

    listTeams: {
      isTool: false,
      description:
        "List PagerDuty teams. Supports free-text search across name and description fields. Returns each team's id, name, description, and summary.",
      input: ListTeamsInputSchema,
      handler: async (ctx, input: ListTeamsInput) => {
        return callToolJson(ctx, 'list_teams', { query_model: input });
      },
    },

    getSchedule: {
      isTool: true,
      description:
        "Get a specific PagerDuty on-call schedule by its ID. Returns the schedule's name, description, time zone, schedule layers (including rotation settings and assigned users), and the list of users on the schedule.",
      input: GetScheduleInputSchema,
      handler: async (ctx, input: GetScheduleInput) => {
        return callToolJson(ctx, 'get_schedule', { schedule_id: input.schedule_id });
      },
    },

    getIncident: {
      isTool: true,
      description:
        "Get a specific PagerDuty incident by its ID. Returns the incident's summary, status, urgency, service, current assignments (who is assigned and when), and creation/update timestamps.",
      input: GetIncidentInputSchema,
      handler: async (ctx, input: GetIncidentInput) => {
        return callToolJson(ctx, 'get_incident', { incident_id: input.incident_id });
      },
    },

    getEscalationPolicy: {
      isTool: true,
      description:
        "Get a specific PagerDuty escalation policy by its ID. Returns the policy's name, description, escalation rules (with delay minutes and targets), associated services, and teams.",
      input: GetEscalationPolicyInputSchema,
      handler: async (ctx, input: GetEscalationPolicyInput) => {
        return callToolJson(ctx, 'get_escalation_policy', { policy_id: input.policy_id });
      },
    },

    getTeam: {
      isTool: true,
      description:
        "Get a specific PagerDuty team by its ID. Returns the team's id, name, description, and summary.",
      input: GetTeamInputSchema,
      handler: async (ctx, input: GetTeamInput) => {
        return callToolJson(ctx, 'get_team', { team_id: input.team_id });
      },
    },

    listTools: {
      isTool: true,
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
      description:
        'Call any tool on the PagerDuty MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.pagerduty.test.description', {
      defaultMessage: 'Verifies connection to the PagerDuty MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to PagerDuty MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skillFiles,

  skill: [
    '## PagerDuty Connector Usage Guide',
    '',
    '### Identifying the Authenticated User (getUserData)',
    '',
    'Call `getUserData` with no inputs to retrieve the currently authenticated PagerDuty user.',
    "Use this to confirm which account the connector is acting as, or to obtain the current user's ID for subsequent filtered queries.",
    '',
    '### Finding Who Is On Call',
    '',
    '1. Use the `pagerduty-oncall` to get schedule information, including who is on call.',
    '',
    '### Investigating Incidents',
    '',
    'To investigate incidents, use the `pagerduty-list-incidents` skill',
    '',
    'Once you have an incident ID from the list, call `getIncident` for full details including assignments, service, and timestamps.',
    '',
    '### Working with Escalation Policies',
    '',
    'To explore escalation policies:',
    '1. Use the `pagerduty-escalation-policies` skill for escalation related topics.',
    '2. Use the returned IDs to call `getEscalationPolicy` for full details: escalation rules, delay minutes, targets, associated services, and teams.',
    '',
    '### User and Team lookup',
    'To explore teams and users:',
    '1. Use the `pagerduty-users-teams` skill to lookup users or teams.',
    "2. Use the returned IDs to call 'getTeam' for full team details.",
  ].join('\n'),
};
