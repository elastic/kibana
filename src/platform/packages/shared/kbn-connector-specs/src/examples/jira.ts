/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Example: Jira Connector
 *
 * This demonstrates an enterprise ticketing system connector with:
 * - Basic authentication (username/password or email/API token)
 * - Multiple sub-actions for different operations
 * - Dynamic field loading based on project/issue type
 * - Integration with Cases management
 *
 * REFERENCE: Based on actual Jira connector
 * FILE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/
 */

import { z } from '@kbn/zod';
import type { ConnectorSpec } from '../connector_spec';
import { withUIMeta, UISchemas } from '../connector_spec_ui';

export const JiraConnectorExample: ConnectorSpec = {
  // ---- Metadata (required) ----
  metadata: {
    id: '.jira',
    displayName: 'Jira',
    icon: 'logoJira',
    description: 'Create and update issues in Jira',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v2/',
    minimumLicense: 'gold',
    supportedFeatureIds: ['alerting', 'cases', 'uptime', 'siem'],
  },

  // ---- Auth Schema (required) ----
  // WHY: Jira uses HTTP Basic Auth (email + API token)
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/service.ts:66
  schema: z.discriminatedUnion('method', [
    z.object({
      method: z.literal('basic'),
      credentials: z.object({
        // For Jira Cloud, username is email, password is API token
        username: withUIMeta(z.string().email(), {
          placeholder: 'user@example.com',
          helpText: 'Your Jira account email',
        }).describe('Email'),

        password: withUIMeta(UISchemas.secret(), {
          helpText:
            'Get your API token from https://id.atlassian.com/manage-profile/security/api-tokens',
          placeholder: 'API Token',
        }).describe('API Token'),
      }),
    }),
  ]),

  // URL allowlist validation (framework-enforced)
  validateUrls: {
    fields: ['apiUrl'],
  },

  // ---- Policies (optional) ----
  policies: {
    retry: {
      retryOnStatusCodes: [429, 500, 502, 503, 504],
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
    },

    rateLimit: {
      strategy: 'header',
      codes: [429],
      resetHeader: 'x-ratelimit-reset',
      remainingHeader: 'x-ratelimit-remaining',
    },
  },

  // ---- Actions (required) ----
  // WHY: Jira connector has multiple sub-actions for different operations
  // REFERENCE: x-pack/platform/plugins/shared/stack_connectors/server/connector_types/jira/index.ts:45-53
  actions: {
    // Action 1: Get fields (for form building)
    getFields: {
      actionGroup: 'Metadata',
      description: 'Get available Jira fields for form building',
      isTool: false, // Internal use only

      input: z.object({}),

      handler: async (ctx, input) => {
        // Fetch all available fields from Jira
        // Used to build dynamic forms
        return [
          { id: 'summary', name: 'Summary', schema: { type: 'string' } },
          { id: 'description', name: 'Description', schema: { type: 'string' } },
          { id: 'priority', name: 'Priority', schema: { type: 'priority' } },
          { id: 'labels', name: 'Labels', schema: { type: 'array' } },
        ];
      },
    },

    // Action 2: Get issue types
    issueTypes: {
      actionGroup: 'Metadata',
      description: 'Get available Jira issue types',
      isTool: false,

      input: z.object({
        project: z.string().optional().describe('Project Key'),
      }),

      handler: async (ctx, input) => {
        // Fetch issue types for a project
        return [
          { id: '10001', name: 'Bug', description: 'A problem' },
          { id: '10002', name: 'Task', description: 'A task' },
          { id: '10003', name: 'Story', description: 'A user story' },
        ];
      },
    },

    // Action 3: Get fields by issue type
    fieldsByIssueType: {
      actionGroup: 'Metadata',
      description: 'Get fields for a specific issue type',
      isTool: false,

      input: z.object({
        id: z.string().describe('Issue Type ID'),
      }),

      handler: async (ctx, input) => {
        // Fetch fields specific to an issue type
        // Different issue types have different required fields
        return {
          fields: [
            { id: 'summary', required: true },
            { id: 'description', required: false },
            { id: 'priority', required: true },
          ],
        };
      },
    },

    // Action 4: Push to service (create/update issue)
    // This is the main action used by Cases
    pushToService: {
      actionGroup: 'Issues',
      description: 'Create or update a Jira issue',
      isTool: true,

      input: z.object({
        incident: z.object({
          summary: z.string().min(1).describe('Summary'),

          description: withUIMeta(z.string(), {
            widget: 'textarea',
            widgetOptions: { rows: 10 },
          })
            .optional()
            .describe('Description'),

          externalId: z.string().optional().describe('Existing Issue Key (for updates)'),

          issueType: withUIMeta(z.string(), {
            widget: 'select',
            optionsFrom: {
              action: 'issueTypes',
              map: (result: any) =>
                result.map((it: any) => ({
                  value: it.id,
                  label: it.name,
                })),
            },
            helpText: 'Select issue type',
          })
            .optional()
            .describe('Issue Type'),

          priority: withUIMeta(z.string(), {
            widget: 'select',
          })
            .optional()
            .describe('Priority'),

          labels: z.array(z.string()).optional().describe('Labels'),

          // Additional fields (dynamic based on issue type)
          otherFields: z.record(z.string(), z.any()).optional().describe('Additional Fields'),
        }),

        comments: z
          .array(
            z.object({
              commentId: z.string(),
              comment: z.string(),
            })
          )
          .optional()
          .describe('Comments to add'),
      }),

      handler: async (ctx, input) => {
        const { incident, comments } = input as any;

        // Implementation:
        // 1. If externalId exists, update issue
        // 2. Otherwise, create new issue
        // 3. Add comments if provided
        // 4. Return issue details

        return {
          id: incident.externalId || 'PROJ-123',
          title: incident.summary,
          url: `${ctx.config?.apiUrl || 'https://your-jira.atlassian.net'}/browse/PROJ-123`,
          pushedDate: new Date().toISOString(),
          comments:
            comments?.map((c: any) => ({
              commentId: c.commentId,
              pushedDate: new Date().toISOString(),
            })) || [],
        };
      },
    },

    // Action 5: Get incident (retrieve issue details)
    getIncident: {
      actionGroup: 'Issues',
      description: 'Get a Jira issue by ID',
      isTool: true,

      input: z.object({
        externalId: z.string().describe('Issue Key (e.g., PROJ-123)'),
      }),

      handler: async (ctx, input) => {
        const { externalId } = input as any;

        // Fetch issue details from Jira
        return {
          id: externalId,
          summary: 'Issue summary',
          description: 'Issue description',
          status: 'Open',
          priority: 'High',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      },
    },

    // Action 6: Get issues (search)
    issues: {
      actionGroup: 'Issues',
      description: 'Search for Jira issues using JQL',
      isTool: true,

      input: z.object({
        title: z.string().describe('Search query'),
      }),

      handler: async (ctx, input) => {
        const { title } = input as any;

        // Search for issues matching query
        return [
          {
            id: 'PROJ-123',
            key: 'PROJ-123',
            title: 'Matching issue',
          },
        ];
      },
    },

    // Action 7: Get single issue
    issue: {
      actionGroup: 'Issues',
      description: 'Get a single Jira issue',
      isTool: true,

      input: z.object({
        id: z.string().describe('Issue Key'),
      }),

      handler: async (ctx, input) => {
        const { id } = input as any;

        // Get full issue details
        return {
          id,
          key: id,
          summary: 'Issue summary',
          description: 'Issue description',
          fields: {
            status: { name: 'Open' },
            priority: { name: 'High' },
            issuetype: { name: 'Bug' },
          },
        };
      },
    },
  },

  // ---- Test Function (optional) ----
  test: {
    handler: async (ctx) => {
      // Verify Jira credentials by making simple API call
      // Try to fetch current user info or server info
      return {
        ok: true,
        message: 'Successfully connected to Jira',
        url: ctx.config?.apiUrl,
      };
    },
    description: 'Verifies Jira credentials and connectivity',
  },
};
