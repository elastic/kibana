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
import type { ConnectorSpec } from '../../connector_spec';

export const SnykConnector: ConnectorSpec = {
  metadata: {
    id: '.snyk',
    displayName: 'Snyk',
    description: i18n.translate('connectorSpecs.snyk.metadata.description', {
      defaultMessage: 'Connect to Snyk to manage vulnerabilities and security issues',
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
      },
    ],
    headers: {
      'Content-Type': 'application/json',
    },
  },
  schema: z.object({
    orgId: z
      .string()
      .describe('Snyk organization ID')
      .meta({ placeholder: 'Snyk organization ID' }),
    projectId: z.string().describe('Snyk project ID').meta({ placeholder: 'Snyk project ID' }),
    apiUrl: z
      .string()
      .url()
      .default('https://api.snyk.io')
      .describe('Snyk API base URL')
      .meta({ placeholder: 'https://api.snyk.io' }),
  }),

  actions: {
    getAggregatedIssues: {
      isTool: true,
      input: z.object({
        filters: z
          .object({
            ignored: z.boolean().optional(),
            severity: z.array(z.enum(['critical', 'high', 'medium', 'low'])).optional(),
          })
          .optional(),
        includeDescription: z.boolean().optional().default(true),
        includeIntroducedThrough: z.boolean().optional().default(true),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          filters?: {
            ignored?: boolean;
            severity?: Array<'critical' | 'high' | 'medium' | 'low'>;
          };
          includeDescription?: boolean;
          includeIntroducedThrough?: boolean;
        };

        if (!ctx.config) {
          throw new Error('Snyk connector configuration is missing');
        }

        const { orgId, projectId, apiUrl } = ctx.config as {
          orgId: string;
          projectId: string;
          apiUrl: string;
        };

        const response = await ctx.client.post(
          `${apiUrl}/v1/org/${orgId}/project/${projectId}/aggregated-issues`,
          {
            data: {
              filters: typedInput.filters || { ignored: false },
              includeDescription: typedInput.includeDescription ?? true,
              includeIntroducedThrough: typedInput.includeIntroducedThrough ?? true,
            },
          }
        );
        return response.data;
      },
    },
    getVulnerability: {
      isTool: true,
      input: z.object({
        issueNumber: z.string().describe('Snyk issue number (e.g., SNYK-JS-MINIMIST-559764)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { issueNumber: string };

        if (!ctx.config) {
          throw new Error('Snyk connector configuration is missing');
        }

        const { apiUrl } = ctx.config as { apiUrl: string };

        const response = await ctx.client.get(`${apiUrl}/v1/vuln/${typedInput.issueNumber}`);
        return response.data;
      },
    },
    getVulnerabilityPaths: {
      isTool: true,
      input: z.object({
        issueNumber: z.string().describe('Snyk issue number'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { issueNumber: string };

        if (!ctx.config) {
          throw new Error('Snyk connector configuration is missing');
        }

        const { orgId, projectId, apiUrl } = ctx.config as {
          orgId: string;
          projectId: string;
          apiUrl: string;
        };

        const response = await ctx.client.get(
          `${apiUrl}/v1/org/${orgId}/project/${projectId}/history/latest/issue/${typedInput.issueNumber}/paths`
        );
        return response.data;
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        if (!ctx.config) {
          throw new Error('Snyk connector configuration is missing');
        }

        const { orgId, apiUrl } = ctx.config as { orgId: string; apiUrl: string };

        await ctx.client.get(`${apiUrl}/v1/org/${orgId}/project`);
        return {
          ok: true,
          message: 'Successfully connected to Snyk API',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.snyk.test.description', {
      defaultMessage: 'Verifies Snyk API key and organization access',
    }),
  },
};
