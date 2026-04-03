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
import { z } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
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
import searchWorkflow from './workflows/search.yaml';
import getByIdWorkflow from './workflows/get_by_id.yaml';
import getIncidentsWorkflow from './workflows/get_incidents.yaml';
import getOncallsWorkflow from './workflows/get_oncalls.yaml';
import getSchedulesWorkflow from './workflows/get_schedules.yaml';
import getEscalationPoliciesWorkflow from './workflows/get_escalation_policies.yaml';
import whoAmIWorkflow from './workflows/who_am_i.yaml';
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
    supportedFeatureIds: ['workflows', 'agentBuilder'],
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

  schema: z.object({
    serverUrl: UISchemas.url()
      .default(PAGERDUTY_MCP_SERVER_URL)
      .describe('PagerDuty MCP Server URL')
      .meta({
        widget: 'text',
        placeholder: 'https://mcp.pagerduty.com/mcp',
        label: i18n.translate('connectorSpecs.pagerduty.config.serverUrl.label', {
          defaultMessage: 'MCP Server URL',
        }),
        helpText: i18n.translate('connectorSpecs.pagerduty.config.serverUrl.helpText', {
          defaultMessage: 'The URL of the PagerDuty MCP server.',
        }),
      }),
  }),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    getUserData: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.getUserData.description', {
        defaultMessage:
          'Get the authenticated PagerDuty user profile including name, email, role, and teams.',
      }),
      input: GetUserDataInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_user_data');
      },
    },

    listSchedules: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.listSchedules.description', {
        defaultMessage: 'List PagerDuty schedules with optional filtering by query, team, or user.',
      }),
      input: ListSchedulesInputSchema,
      handler: async (ctx, input: ListSchedulesInput) => {
        return callToolJson(ctx, 'list_schedules', { query_model: input });
      },
    },

    listEscalationPolicies: {
      isTool: true,
      description: i18n.translate(
        'connectorSpecs.pagerduty.actions.listEscalationPolicies.description',
        {
          defaultMessage:
            'List PagerDuty escalation policies with optional filtering by query, user, or team.',
        }
      ),
      input: ListEscalationPoliciesInputSchema,
      handler: async (ctx, input: ListEscalationPoliciesInput) => {
        return callToolJson(ctx, 'list_escalation_policies', { query_model: input });
      },
    },

    listIncidents: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.listIncidents.description', {
        defaultMessage:
          'List PagerDuty incidents with filtering by status, service, date range, urgency, and sort.',
      }),
      input: ListIncidentsInputSchema,
      handler: async (ctx, input: ListIncidentsInput) => {
        return callToolJson(ctx, 'list_incidents', { query_model: input });
      },
    },

    listOncalls: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.listOncalls.description', {
        defaultMessage:
          'Get current on-call assignments in PagerDuty with filtering by schedule, user, or escalation policy.',
      }),
      input: ListOncallsInputSchema,
      handler: async (ctx, input: ListOncallsInput) => {
        return callToolJson(ctx, 'list_oncalls', { query_model: input });
      },
    },

    listUsers: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.listUsers.description', {
        defaultMessage: 'List PagerDuty users with optional query filter.',
      }),
      input: ListUsersInputSchema,
      handler: async (ctx, input: ListUsersInput) => {
        return callToolJson(ctx, 'list_users', { query_model: input });
      },
    },

    listTeams: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.listTeams.description', {
        defaultMessage: 'List PagerDuty teams with optional query filter.',
      }),
      input: ListTeamsInputSchema,
      handler: async (ctx, input: ListTeamsInput) => {
        return callToolJson(ctx, 'list_teams', { query_model: input });
      },
    },

    getSchedule: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.getSchedule.description', {
        defaultMessage: 'Get a specific PagerDuty schedule by ID.',
      }),
      input: GetScheduleInputSchema,
      handler: async (ctx, input: GetScheduleInput) => {
        return callToolJson(ctx, 'get_schedule', { schedule_id: input.schedule_id });
      },
    },

    getIncident: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.getIncident.description', {
        defaultMessage: 'Get a specific PagerDuty incident by ID.',
      }),
      input: GetIncidentInputSchema,
      handler: async (ctx, input: GetIncidentInput) => {
        return callToolJson(ctx, 'get_incident', { incident_id: input.incident_id });
      },
    },

    getEscalationPolicy: {
      isTool: true,
      description: i18n.translate(
        'connectorSpecs.pagerduty.actions.getEscalationPolicy.description',
        {
          defaultMessage: 'Get a specific PagerDuty escalation policy by ID.',
        }
      ),
      input: GetEscalationPolicyInputSchema,
      handler: async (ctx, input: GetEscalationPolicyInput) => {
        return callToolJson(ctx, 'get_escalation_policy', { policy_id: input.policy_id });
      },
    },

    getTeam: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.getTeam.description', {
        defaultMessage: 'Get a specific PagerDuty team by ID.',
      }),
      input: GetTeamInputSchema,
      handler: async (ctx, input: GetTeamInput) => {
        return callToolJson(ctx, 'get_team', { team_id: input.team_id });
      },
    },

    listTools: {
      isTool: true,
      description: i18n.translate('connectorSpecs.pagerduty.actions.listTools.description', {
        defaultMessage:
          'List all tools available on the PagerDuty MCP server. Use this to discover available capabilities.',
      }),
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
      description: i18n.translate('connectorSpecs.pagerduty.actions.callTool.description', {
        defaultMessage:
          'Call any tool on the PagerDuty MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      }),
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

  agentBuilderWorkflows: [
    searchWorkflow,
    getByIdWorkflow,
    getIncidentsWorkflow,
    getOncallsWorkflow,
    getSchedulesWorkflow,
    getEscalationPoliciesWorkflow,
    whoAmIWorkflow,
  ],
};
