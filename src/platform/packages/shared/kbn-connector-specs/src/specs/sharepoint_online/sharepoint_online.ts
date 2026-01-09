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

/**
 * SharePoint Online connector using OAuth2 Authorization Code flow with Microsoft Identity Platform.
 */
export const SharepointOnline: ConnectorSpec = {
  metadata: {
    id: '.sharepointOnline',
    displayName: 'SharePoint Online',
    description: i18n.translate('core.kibanaConnectorSpecs.sharepointOnline.metadata.description', {
      defaultMessage: 'Search and explore SharePoint sites, pages, and content',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize',
          tokenUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
          scope: 'https://graph.microsoft.com/.default offline_access',
        },
      },
    ],
  },

  // No additional configuration needed beyond OAuth credentials
  schema: z.object({}),

  actions: {
    // https://learn.microsoft.com/en-us/graph/api/search-query
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

        const searchRequest = {
          requests: [
            {
              entityTypes: typedInput.entityTypes ?? ['driveItem'],
              query: {
                queryString: typedInput.query,
              },
              ...(typedInput.from !== undefined && { from: typedInput.from }),
              ...(typedInput.size !== undefined && { size: typedInput.size }),
            },
          ],
        };

        try {
          ctx.log.debug(`SharePoint search request: ${JSON.stringify(searchRequest, null, 2)}`);
          const response = await ctx.client.post(
            'https://graph.microsoft.com/v1.0/search/query',
            searchRequest
          );
          return response.data;
        } catch (error) {
          ctx.log.error(
            `SharePoint search failed: ${error.message}, Status: ${
              error.response?.status
            }, Data: ${JSON.stringify(error.response?.data)}`
          );
          throw error;
        }
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
        // Test connection by getting the root site
        const response = await ctx.client.get('https://graph.microsoft.com/v1.0/sites/root');
        const siteName = response.data.displayName || 'Unknown';
        return {
          ok: true,
          message: `Successfully connected to SharePoint Online: ${siteName}`,
        };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  },
};
