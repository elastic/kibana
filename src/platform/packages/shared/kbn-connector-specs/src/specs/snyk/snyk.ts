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

interface SnykConfig {
  orgId: string;
  projectId: string;
  apiUrl: string;
}

type SnykIgnoreReasonType = 'not-vulnerable' | 'wont-fix' | 'temporary-ignore';

type SnykSeverity = 'critical' | 'high' | 'medium' | 'low';

interface GetAggregatedIssuesInput {
  filters?: {
    ignored?: boolean;
    severity?: SnykSeverity[];
  };
  includeDescription?: boolean;
  includeIntroducedThrough?: boolean;
}

interface IssueNumberInput {
  issueNumber: string;
}

interface ApplyIgnoreExtensionInput {
  issueNumber: string;
  expires: string;
  reason: string;
  reasonType: SnykIgnoreReasonType;
  disregardIfFixable: boolean;
  ignorePath: string;
}

function getConfig(ctx: { config?: unknown }): SnykConfig {
  if (!ctx.config) {
    throw new Error('Snyk connector configuration is missing');
  }
  return ctx.config as SnykConfig;
}

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
        const { filters, includeDescription, includeIntroducedThrough } =
          input as GetAggregatedIssuesInput;
        const { orgId, projectId, apiUrl } = getConfig(ctx);

        const response = await ctx.client.post(
          `${apiUrl}/v1/org/${orgId}/project/${projectId}/aggregated-issues`,
          {
            data: {
              filters: filters ?? { ignored: false },
              includeDescription: includeDescription ?? true,
              includeIntroducedThrough: includeIntroducedThrough ?? true,
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
        const { issueNumber } = input as IssueNumberInput;
        const { apiUrl } = getConfig(ctx);

        const response = await ctx.client.get(`${apiUrl}/v1/vuln/${issueNumber}`);
        return response.data;
      },
    },
    getVulnerabilityPaths: {
      isTool: true,
      input: z.object({
        issueNumber: z.string().describe('Snyk issue number'),
      }),
      handler: async (ctx, input) => {
        const { issueNumber } = input as IssueNumberInput;
        const { orgId, projectId, apiUrl } = getConfig(ctx);

        const response = await ctx.client.get(
          `${apiUrl}/v1/org/${orgId}/project/${projectId}/history/latest/issue/${issueNumber}/paths`
        );
        return response.data;
      },
    },
    getIssueIgnore: {
      isTool: true,
      input: z.object({
        issueNumber: z.string().describe('Snyk issue number (e.g., SNYK-JS-LODASH-12345)'),
      }),
      handler: async (ctx, input) => {
        const { issueNumber } = input as IssueNumberInput;
        const { orgId, projectId, apiUrl } = getConfig(ctx);

        const response = await ctx.client.get(
          `${apiUrl}/v1/org/${orgId}/project/${projectId}/ignore/${issueNumber}`
        );
        return response.data;
      },
    },
    applyIgnoreExtension: {
      isTool: true,
      input: z.object({
        issueNumber: z.string().describe('Snyk issue number (e.g., SNYK-JS-LODASH-12345)'),
        expires: z.string().describe('New expiry as an ISO date string, e.g. "2026-10-12"'),
        reason: z
          .string()
          .describe('Justification text (pass the existing reason verbatim unless changed)'),
        reasonType: z
          .enum(['not-vulnerable', 'wont-fix', 'temporary-ignore'])
          .optional()
          .default('temporary-ignore')
          .describe('Snyk ignore reason type'),
        disregardIfFixable: z
          .boolean()
          .optional()
          .default(false)
          .describe('Snyk disregardIfFixable flag'),
        ignorePath: z
          .string()
          .optional()
          .default('*')
          .describe('Ignore path selector. Defaults to "*" (all paths)'),
      }),
      handler: async (ctx, input) => {
        const { issueNumber, expires, reason, reasonType, disregardIfFixable, ignorePath } =
          input as ApplyIgnoreExtensionInput;
        const { orgId, projectId, apiUrl } = getConfig(ctx);

        const response = await ctx.client.put(
          `${apiUrl}/v1/org/${orgId}/project/${projectId}/ignore/${issueNumber}`,
          {
            data: [{ ignorePath, reason, reasonType, disregardIfFixable, expires }],
          }
        );
        return response.data;
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        const { orgId, apiUrl } = getConfig(ctx);

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
