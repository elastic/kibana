/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SharePoint Server (On-Premises) Connector
 *
 * This connector provides integration with SharePoint Server (on-premises) via
 * the native SharePoint REST API (/_api/). Features include:
 * - Site and list retrieval
 * - List items and folder contents
 * - File download
 * - Site page content retrieval
 * - KQL search
 *
 * Uses HTTP Basic authentication (username/password).
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const ODATA_HEADERS = { Accept: 'application/json;odata=nometadata' };

const ODataCollectionOutputSchema = z.object({
  value: z.array(z.any()).describe('Array of items returned from the API'),
});

export const SharepointServer: ConnectorSpec = {
  metadata: {
    id: '.sharepoint-server',
    displayName: 'SharePoint Server',
    description: i18n.translate('core.kibanaConnectorSpecs.sharepointServer.metadata.description', {
      defaultMessage: 'Kibana Stack Connector for SharePoint Server (on-premises).',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['basic'],
  },

  schema: z.object({
    siteUrl: z.string().url().describe('SharePoint Server site URL').meta({
      label: 'Site URL',
      widget: 'text',
      placeholder: 'https://sharepoint.company.com/sites/mysite',
    }),
  }),

  actions: {
    getWeb: {
      isTool: true,
      input: z.object({}).optional(),
      output: z.any(),
      handler: async (ctx) => {
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug('SharePoint Server getting web info');
        const response = await ctx.client.get(`${siteUrl}/_api/web`, {
          headers: ODATA_HEADERS,
        });
        return response.data;
      },
    },

    getLists: {
      isTool: true,
      input: z.object({}).optional(),
      output: ODataCollectionOutputSchema,
      handler: async (ctx) => {
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug('SharePoint Server getting lists');
        const response = await ctx.client.get(`${siteUrl}/_api/web/lists`, {
          headers: ODATA_HEADERS,
          params: {
            $select: 'Id,Title,ItemCount,Description,Created,LastItemModifiedDate',
          },
        });
        return response.data;
      },
    },

    getListItems: {
      isTool: true,
      input: z.object({
        listTitle: z.string().describe('Title of the list'),
      }),
      output: ODataCollectionOutputSchema,
      handler: async (ctx, input) => {
        const { listTitle } = input as { listTitle: string };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server getting items of list "${listTitle}"`);
        const response = await ctx.client.get(
          `${siteUrl}/_api/web/lists/GetByTitle('${encodeURIComponent(listTitle)}')/items`,
          {
            headers: ODATA_HEADERS,
          }
        );
        return response.data;
      },
    },

    getFolderContents: {
      isTool: true,
      input: z.object({
        path: z
          .string()
          .describe('Server-relative URL of the folder (e.g., /sites/mysite/Shared Documents)'),
      }),
      output: z.object({
        files: z.array(z.any()).describe('Files in the folder'),
        folders: z.array(z.any()).describe('Subfolders in the folder'),
      }),
      handler: async (ctx, input) => {
        const { path } = input as { path: string };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server getting folder contents at "${path}"`);
        const encodedPath = encodeURIComponent(path);
        const [filesResponse, foldersResponse] = await Promise.all([
          ctx.client.get(
            `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${encodedPath}')/Files`,
            { headers: ODATA_HEADERS }
          ),
          ctx.client.get(
            `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${encodedPath}')/Folders`,
            { headers: ODATA_HEADERS }
          ),
        ]);
        return {
          files: filesResponse.data.value,
          folders: foldersResponse.data.value,
        };
      },
    },

    downloadFile: {
      isTool: true,
      input: z.object({
        path: z
          .string()
          .describe(
            'Server-relative URL of the file (e.g., /sites/mysite/Shared Documents/file.docx)'
          ),
      }),
      output: z.object({
        contentType: z.string().optional().describe('Content-Type header'),
        contentLength: z.string().optional().describe('Content-Length header'),
        text: z.string().describe('File content as UTF-8 text'),
      }),
      handler: async (ctx, input) => {
        const { path } = input as { path: string };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server downloading file at "${path}"`);
        const encodedPath = encodeURIComponent(path);
        const response = await ctx.client.get(
          `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${encodedPath}')/$value`,
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(response.data);
        return {
          contentType: response.headers?.['content-type'],
          contentLength: response.headers?.['content-length'],
          text: buffer.toString('utf8'),
        };
      },
    },

    getSitePageContents: {
      isTool: true,
      input: z.object({
        pageId: z.number().int().describe('Integer item ID of the site page'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const { pageId } = input as { pageId: number };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server getting site page contents for page ID ${pageId}`);
        const response = await ctx.client.get(
          `${siteUrl}/_api/web/lists/GetByTitle('Site Pages')/items(${pageId})`,
          {
            headers: ODATA_HEADERS,
            params: {
              $select: 'Title,CanvasContent1,WikiField',
            },
          }
        );
        return response.data;
      },
    },

    search: {
      isTool: true,
      input: z.object({
        query: z.string().describe('KQL search query string'),
        from: z.number().optional().describe('Start row offset for pagination'),
        size: z.number().optional().describe('Number of results to return'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const { query, from, size } = input as { query: string; from?: number; size?: number };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server search: "${query}"`);
        const response = await ctx.client.get(`${siteUrl}/_api/search/query`, {
          headers: ODATA_HEADERS,
          params: {
            querytext: `'${query}'`,
            ...(from !== undefined && { startRow: from }),
            ...(size !== undefined && { rowLimit: size }),
          },
        });
        return response.data;
      },
    },

    callRestApi: {
      isTool: true,
      description:
        "Call a SharePoint Server REST API endpoint by path only (e.g., _api/web/title). Path must start with '_api/'.",
      input: z.object({
        method: z.enum(['GET', 'POST']).describe('HTTP method'),
        path: z
          .string()
          .describe("API path starting with '_api/' (e.g., '_api/web/title')")
          .refine((value) => value.startsWith('_api/'), {
            message: "Path must start with '_api/'",
          }),
        body: z.any().optional().describe('Request body (for POST)'),
      }),
      output: z.any(),
      handler: async (ctx, input) => {
        const { method, path, body } = input as {
          method: 'GET' | 'POST';
          path: string;
          body?: unknown;
        };
        const { siteUrl } = ctx.config as { siteUrl: string };
        const url = `${siteUrl}/${path}`;
        ctx.log.debug(`SharePoint Server callRestApi ${method} ${url}`);
        const response = await ctx.client.request({
          method,
          url,
          headers: ODATA_HEADERS,
          data: body,
        });
        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
        };
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.sharepointServer.test.description', {
      defaultMessage: 'Verifies SharePoint Server connection by fetching the site title',
    }),
    handler: async (ctx) => {
      ctx.log.debug('SharePoint Server test handler');
      try {
        const { siteUrl } = ctx.config as { siteUrl: string };
        const response = await ctx.client.get(`${siteUrl}/_api/web/title`, {
          headers: ODATA_HEADERS,
        });
        const title = response.data?.value ?? 'Unknown';
        return {
          ok: true,
          message: `Successfully connected to SharePoint Server: ${title}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
