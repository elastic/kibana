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

/**
 * Common output schema for Microsoft Graph API responses that return a collection.
 * Uses z.any() for the array items to avoid over-specifying the response structure.
 */
const GraphCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
  '@odata.nextLink': z.string().optional().describe('URL to fetch next page of results'),
});

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
        overrides: {
          meta: {
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    getAllSites: {
      isTool: true,
      input: z.object({}).optional(),
      output: GraphCollectionOutputSchema,
      handler: async (ctx) => {
        ctx.log.debug('SharePoint listing all sites');
        const response = await ctx.client.get(
          'https://graph.microsoft.com/v1.0/sites/getAllSites/',
          {
            params: {
              $select: 'id,displayName,webUrl,siteCollection',
            },
          }
        );
        return response.data;
      },
    },

    getSitePages: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          siteId: string;
        };
        ctx.log.debug(`SharePoint listing all pages from siteId ${typedInput.siteId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/pages/`,
          {
            params: {
              $select: 'id,title,description,webUrl,createdDateTime,lastModifiedDateTime',
            },
          }
        );
        return response.data;
      },
    },

    getSitePageContents: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
        pageId: z.string().describe('Page ID'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const typedInput = input as {
          siteId: string;
          pageId: string;
        };
        const url = `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/pages/${typedInput.pageId}/microsoft.graph.sitePage`;

        ctx.log.debug(`SharePoint getting page contents from ${url}`);
        const response = await ctx.client.get(url, {
          params: {
            $expand: 'canvasLayout',
            $select:
              'id,title,description,webUrl,createdDateTime,lastModifiedDateTime,canvasLayout',
          },
        });
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
        const response = await ctx.client.get(url, {
          params: {
            $select: 'id,displayName,webUrl,siteCollection,createdDateTime,lastModifiedDateTime',
          },
        });
        return response.data;
      },
    },

    getSiteDrives: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          siteId: string;
        };

        ctx.log.debug(`SharePoint getting all drives of site ${typedInput.siteId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/drives/`,
          {
            params: {
              $select:
                'id,name,driveType,webUrl,createdDateTime,lastModifiedDateTime,description,owner',
            },
          }
        );
        return response.data;
      },
    },

    getSiteLists: {
      isTool: true,
      input: z
        .object({
          siteId: z.string().describe('Site ID'),
        })
        .strict(),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          siteId: string;
        };

        ctx.log.debug(`SharePoint getting all lists of site ${typedInput.siteId}`);
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/lists/`,
          {
            params: {
              $select:
                'id,displayName,name,webUrl,description,createdDateTime,lastModifiedDateTime',
            },
          }
        );
        return response.data;
      },
    },

    getSiteListItems: {
      isTool: true,
      input: z.object({
        siteId: z.string().describe('Site ID'),
        listId: z.string().describe('List ID'),
      }),
      output: GraphCollectionOutputSchema,
      handler: async (ctx, input) => {
        const typedInput = input as {
          siteId: string;
          listId: string;
        };

        ctx.log.debug(
          `SharePoint getting all items of list ${typedInput.listId} of site ${typedInput.siteId}`
        );
        const response = await ctx.client.get(
          `https://graph.microsoft.com/v1.0/sites/${typedInput.siteId}/lists/${typedInput.listId}/items/`,
          {
            params: {
              $select: 'id,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy',
            },
          }
        );
        return response.data;
      },
    },

    getDriveItems: {
      isTool: true,
      input: z.object({
        driveId: z.string().describe('Drive ID'),
        path: z.string().optional().describe('Path relative to drive root'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { driveId: string; path?: string };
        const baseUrl = `https://graph.microsoft.com/v1.0/drives/${typedInput.driveId}`;
        const url = typedInput.path
          ? `${baseUrl}/root:/${typedInput.path}:/children`
          : `${baseUrl}/root/children`;

        ctx.log.debug(`SharePoint getting drive items from ${url}`);
        const response = await ctx.client.get(url, {
          params: {
            select:
              'id,name,webUrl,createdDateTime,lastModifiedDateTime,size,@microsoft.graph.downloadUrl',
          },
        });
        return response.data;
      },
    },

    downloadDriveItem: {
      isTool: true,
      input: z.object({
        driveId: z.string().describe('Drive ID'),
        itemId: z.string().describe('Drive item ID'),
      }),
      output: z.object({
        contentType: z.string().optional().describe('Content-Type header'),
        contentLength: z.string().optional().describe('Content-Length header'),
        text: z.string().describe('File content as UTF-8 text'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          driveId: string;
          itemId: string;
        };
        const baseUrl = `https://graph.microsoft.com/v1.0/drives/${typedInput.driveId}/items/${typedInput.itemId}`;

        const contentUrl = `${baseUrl}/content`;
        ctx.log.debug(`SharePoint downloading drive item content from ${contentUrl}`);
        const response = await ctx.client.get(contentUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        return {
          contentType: response.headers?.['content-type'],
          contentLength: response.headers?.['content-length'],
          text: buffer.toString('utf8'),
        };
      },
    },

    downloadItemFromURL: {
      isTool: true,
      input: z.object({
        downloadUrl: z.string().url().describe('Pre-authenticated download URL'),
      }),
      output: z.object({
        contentType: z.string().optional().describe('Content-Type header'),
        contentLength: z.string().optional().describe('Content-Length header'),
        base64: z.string().describe('File content as base64-encoded string'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          downloadUrl: string;
        };

        ctx.log.debug(`SharePoint downloading item from URL ${typedInput.downloadUrl}`);
        const response = await ctx.client.get(typedInput.downloadUrl, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);
        return {
          contentType: response.headers?.['content-type'],
          contentLength: response.headers?.['content-length'],
          base64: buffer.toString('base64'),
        };
      },
    },

    callGraphAPI: {
      isTool: true,
      description: 'Call a Microsoft Graph v1.0 endpoint by path only (e.g., /v1.0/me).',
      input: z.object({
        method: z.enum(['GET', 'POST']).describe('HTTP method'),
        path: z
          .string()
          .describe("Graph path starting with '/v1.0/' (e.g., '/v1.0/me')")
          .refine((value) => value.startsWith('/v1.0/'), {
            message: "Path must start with '/v1.0/'",
          })
          .refine((value) => !/^https?:\/\//i.test(value), {
            message: 'Path must not be a full URL',
          }),
        query: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Query parameters (e.g., $top, $filter)'),
        body: z.any().optional().describe('Request body (for POST)'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const typedInput = input as {
          method: 'GET' | 'POST';
          path: string;
          query?: Record<string, string | number | boolean>;
          body?: unknown;
        };

        const url = `https://graph.microsoft.com${typedInput.path}`;
        ctx.log.debug(`SharePoint callGraphAPI ${typedInput.method} ${url}`);

        const response = await ctx.client.request({
          method: typedInput.method,
          url,
          params: typedInput.query,
          data: typedInput.body,
        });

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
        };
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
        region: z
          .enum(['NAM', 'EUR', 'APC', 'LAM', 'MEA'])
          .optional()
          .describe(
            'Search region (NAM=North America, EUR=Europe, APC=Asia Pacific, LAM=Latin America, MEA=Middle East/Africa)'
          ),
        from: z.number().optional().describe('Offset for pagination'),
        size: z.number().optional().describe('Number of results to return'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          entityTypes?: Array<'site' | 'list' | 'listItem' | 'drive' | 'driveItem'>;
          from?: number;
          size?: number;
          region?: 'NAM' | 'EUR' | 'APC' | 'LAM' | 'MEA';
        };

        const searchRequest = {
          requests: [
            {
              entityTypes: typedInput.entityTypes ?? ['site'],
              query: {
                queryString: typedInput.query,
              },
              region: typedInput.region ?? 'NAM',
              ...(typedInput.from !== undefined && { from: typedInput.from }),
              ...(typedInput.size !== undefined && { size: typedInput.size }),
            },
          ],
        };

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
        const response = await ctx.client.get('https://graph.microsoft.com/v1.0/');
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
