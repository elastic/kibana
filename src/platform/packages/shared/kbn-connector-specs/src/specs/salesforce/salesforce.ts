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

const SALESFORCE_API_VERSION = 'v59.0';

/** Derive instance base URL from the full token URL (strip /services/oauth2/token and any path). */
function getBaseUrl(tokenUrl: string | undefined): string {
  if (!tokenUrl) return '';
  const base = tokenUrl.includes('/services/oauth2/token')
    ? tokenUrl.replace(/\/services\/oauth2\/token.*$/, '')
    : tokenUrl;
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
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {},
        overrides: {
          meta: {
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    search: {
      input: z.object({
        soql: z.string(),
        nextRecordsUrl: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { soql: string; nextRecordsUrl?: string };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        if (typedInput.nextRecordsUrl) {
          const url = typedInput.nextRecordsUrl.startsWith('http')
            ? typedInput.nextRecordsUrl
            : `${baseUrl}${typedInput.nextRecordsUrl.startsWith('/') ? '' : '/'}${
                typedInput.nextRecordsUrl
              }`;
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`,
          { params: { q: typedInput.soql } }
        );
        return response.data;
      },
    },

    get_record: {
      input: z.object({
        sobjectName: z.string(),
        recordId: z.string(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { sobjectName: string; recordId: string };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${typedInput.sobjectName}/${typedInput.recordId}`,
          {}
        );
        return response.data;
      },
    },

    list_records: {
      input: z.object({
        sobjectName: z.string(),
        limit: z.number().default(50),
        nextRecordsUrl: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          sobjectName: string;
          limit: number;
          nextRecordsUrl?: string;
        };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        if (typedInput.nextRecordsUrl) {
          const url = typedInput.nextRecordsUrl.startsWith('http')
            ? typedInput.nextRecordsUrl
            : `${baseUrl}${typedInput.nextRecordsUrl.startsWith('/') ? '' : '/'}${
                typedInput.nextRecordsUrl
              }`;
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        const limit = Math.min(typedInput.limit, 2000);
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
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
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
