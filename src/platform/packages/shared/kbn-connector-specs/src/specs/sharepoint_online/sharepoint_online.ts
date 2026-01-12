/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SharePoint Online Connector
 *
 * This connector provides integration with Microsoft SharePoint Online via
 * the Microsoft Graph API. Features include:
 * - Site listing and retrieval
 * - Page listing within sites
 * - Cross-site search functionality
 *
 * Requires OAuth2 client credentials authentication with Microsoft Entra ID.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

export const SharepointOnline: ConnectorSpec = {
  metadata: {
    id: '.sharepoint-online',
    displayName: 'SharePoint Online',
    description: i18n.translate('core.kibanaConnectorSpecs.sharepointOnline.metadata.description', {
      defaultMessage: 'Kibana Stack Connector for SharePoint Online.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: 'https://graph.microsoft.com/.default',
          tokenUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
        },
      },
    ],
  },

  schema: z.object({
    region: z
      .enum(['NAM', 'EUR', 'LAM', 'MEA', 'APC'])
      .meta({ label: 'Region' })
      .describe(
        'Geographic region for search queries (NAM=North America, EUR=Europe, APC=Asia Pacific, LAM=Latin America, MEA=Middle East/Africa)'
      ),
  }),

  actions: {
    getAllSites: {
      isTool: true,
      input: z.object({}).optional(),
      handler: async (ctx, input) => {
        ctx.log.debug('SharePoint listing all sites');
        const response = await ctx.client.get(
          'https://graph.microsoft.com/v1.0/sites/getAllSites/'
        );
        return response.data;
      },
    },

    getSitePages: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { siteId: string };
        ctx.log.debug(`SharePoint listing all pages from siteId ${typedInput.siteId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/pages/`
        );
        return response.data;
      },
    },

    getSite: {
      isTool: true,
      input: z.union([
        z.object({ siteId: z.string().describe('Site ID') }).strict(),
        z.object({ relativeUrl: z.string().describe('Relative URL path') }).strict(),
      ]),
      handler: async (ctx, input) => {
        const typedInput = input as { siteId: string } | { relativeUrl: string };

        let url = 'https://graph.microsoft.com/v1.0/sites/';
        if ('siteId' in typedInput) {
          url += typedInput.siteId;
        } else {
          url += typedInput.relativeUrl;
        }

        ctx.log.debug(`SharePoint getting site info via ${url}`);
        const response = await ctx.client.get(url);
        return response.data;
      },
    },

    getSiteDrives: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {siteId: string};

        ctx.log.debug(`SharePoint getting all drives of site ${typedInput.siteId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/drives/`
        );
        return response.data;
      },
    },

    getSiteLists: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {siteId: string};

        ctx.log.debug(`SharePoint getting all lists of site ${typedInput.siteId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/lists/`
        );
        return response.data;
      },
    },

    search: {
      isTool: true,
      input: z.object({
        query: z.string().describe('Search query'),
        entityTypes: z
          .array(z.enum(['site', 'list', 'listItem', 'drive', 'driveItem']))
          .optional()
          .describe('Entity types to search'),
        from: z.number().optional().describe('Offset for pagination'),
        size: z.number().optional().describe('Number of results to return'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          entityTypes?: Array<'site' | 'list' | 'listItem' | 'drive' | 'driveItem'>;
          from?: number;
          size?: number;
        };
        const config = ctx.config as { region: string };

        const searchRequest = {
          requests: [
            {
              entityTypes: typedInput.entityTypes ?? ['driveItem'],
              query: {
                queryString: typedInput.query,
              },
              region: config.region,
              ...(typedInput.from !== undefined && { from: typedInput.from }),
              ...(typedInput.size !== undefined && { size: typedInput.size }),
            },
          ],
        };

        ctx.log.debug(`SharePoint search request: ${JSON.stringify(searchRequest, null, 2)}`);
        const response = await ctx.client.post(
          'https://graph.microsoft.com/v1.0/search/query',
          searchRequest
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.sharepointOnline.test.description', {
      defaultMessage: 'Verifies SharePoint Online connection by checking API access',
    }),
    handler: async (ctx) => {
      ctx.log.debug('SharePoint Online test handler');

      try {
        const response = await ctx.client.get('https://graph.microsoft.com/v1.0/sites/root');
        const siteName = response.data.displayName || 'Unknown';
        return {
          ok: true,
          message: `Successfully connected to SharePoint Online: ${siteName}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
