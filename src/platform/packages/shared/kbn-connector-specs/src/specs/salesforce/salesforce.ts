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
import { OAuth } from '../../auth_types/oauth';

const SALESFORCE_API_VERSION = 'v59.0';

function getBaseUrl(ctx: {
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}): string {
  const instanceUrl =
    (ctx.config?.instanceUrl as string | undefined) ??
    (ctx.secrets?.instanceUrl as string | undefined) ??
    '';
  const domain = ctx.secrets?.domain as string | undefined;
  const rawTokenUrl = ctx.secrets?.tokenUrl as string | undefined;
  const tokenUrlBase = rawTokenUrl
    ? (rawTokenUrl.includes('/services/oauth2/token')
        ? rawTokenUrl.replace(/\/services\/oauth2\/token.*$/, '')
        : rawTokenUrl
      ).replace(/\/+$/, '')
    : '';
  const base =
    instanceUrl ||
    (domain ? `https://${domain.replace(/\/$/, '').replace(/^https?:\/\//, '')}` : '') ||
    tokenUrlBase;
  return base.replace(/\/+$/, '');
}

export const SalesforceConnector: ConnectorSpec = {
  metadata: {
    id: '.salesforce',
    displayName: 'Salesforce',
    description: i18n.translate('core.kibanaConnectorSpecs.salesforce.metadata.description', {
      defaultMessage: 'Connect to Salesforce to query and explore your org data',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [OAuth.id],
  },

  actions: {
    list_objects: {
      isTool: true,
      input: z.object({}).optional(),
      handler: async (ctx) => {
        const baseUrl = getBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/`,
          {}
        );
        return response.data;
      },
    },

    search: {
      isTool: false,
      input: z.object({
        soql: z.string(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { soql: string };
        const baseUrl = getBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`,
          {
            params: { q: typedInput.soql },
          }
        );
        return response.data;
      },
    },

    get_record: {
      isTool: false,
      input: z.object({
        sobjectName: z.string(),
        recordId: z.string(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { sobjectName: string; recordId: string };
        const baseUrl = getBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${typedInput.sobjectName}/${typedInput.recordId}`,
          {}
        );
        return response.data;
      },
    },

    list_records: {
      isTool: false,
      input: z.object({
        sobjectName: z.string(),
        limit: z.number().default(200),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          sobjectName: string;
          limit?: number;
          nextRecordsUrl?: string;
        };
        const baseUrl = getBaseUrl(ctx);

        const limit = Math.min(typedInput.limit ?? 200, 2000);
        const soql = `SELECT Id FROM ${typedInput.sobjectName} LIMIT ${limit}`;
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`,
          { params: { q: soql } }
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.salesforce.test.description', {
      defaultMessage: 'Verifies Salesforce connection by running a simple query',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Salesforce test handler');

      try {
        const baseUrl = getBaseUrl(ctx);
        await ctx.client.get(`${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`, {
          params: { q: 'SELECT Id FROM User LIMIT 1' },
        });
        return {
          ok: true,
          message: 'Successfully connected to Salesforce',
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
};
