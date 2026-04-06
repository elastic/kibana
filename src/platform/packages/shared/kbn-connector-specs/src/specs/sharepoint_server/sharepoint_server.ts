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
import {
  CallRestApiInputSchema,
  DownloadFileInputSchema,
  DownloadFileOutputSchema,
  GetFolderContentsInputSchema,
  GetFolderContentsOutputSchema,
  GetListItemsInputSchema,
  GetSitePageContentsInputSchema,
  ODataCollectionOutputSchema,
  SearchInputSchema,
} from './types';

const ODATA_HEADERS = { Accept: 'application/json;odata=nometadata' };

export const SharepointServer: ConnectorSpec = {
  metadata: {
    id: '.sharepoint-server',
    displayName: 'SharePoint Server',
    description: i18n.translate('core.kibanaConnectorSpecs.sharepointServer.metadata.description', {
      defaultMessage:
        'Connect to SharePoint Server (on-premises) to search and retrieve site content.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
    isTechnicalPreview: true,
  },

  auth: {
    types: ['basic'],
  },

  schema: z.object({
    siteUrl: z
      .string()
      .url()
      .transform((val) => val.replace(/\/+$/, ''))
      .describe('SharePoint Server site URL')
      .meta({
        label: 'Site URL',
        widget: 'text',
        placeholder: 'https://sharepoint.company.com/sites/mysite',
      }),
  }),

  actions: {
    getWeb: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.getWeb.description',
        {
          defaultMessage:
            'Get metadata about the SharePoint site (title, URL, description, locale).',
        }
      ),
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
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.getLists.description',
        { defaultMessage: 'List all lists and document libraries on the SharePoint site.' }
      ),
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
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.getListItems.description',
        { defaultMessage: 'Get items from a list or document library by display name.' }
      ),
      input: GetListItemsInputSchema,
      output: ODataCollectionOutputSchema,
      handler: async (ctx, input) => {
        const { listTitle } = input as { listTitle: string };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server getting items of list "${listTitle}"`);
        const escapedListTitle = listTitle.replace(/'/g, "''");
        const response = await ctx.client.get(
          `${siteUrl}/_api/web/lists/GetByTitle('${escapedListTitle}')/items`,
          {
            headers: ODATA_HEADERS,
          }
        );
        return response.data;
      },
    },

    getFolderContents: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.getFolderContents.description',
        { defaultMessage: 'List files and subfolders at a given server-relative folder path.' }
      ),
      input: GetFolderContentsInputSchema,
      output: GetFolderContentsOutputSchema,
      handler: async (ctx, input) => {
        const { path } = input as { path: string };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server getting folder contents at "${path}"`);
        const escapedPath = path.replace(/'/g, "''");
        const [filesResponse, foldersResponse] = await Promise.all([
          ctx.client.get(
            `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${escapedPath}')/Files`,
            { headers: ODATA_HEADERS }
          ),
          ctx.client.get(
            `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${escapedPath}')/Folders`,
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
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.downloadFile.description',
        { defaultMessage: 'Download a file by server-relative URL and return its content as text.' }
      ),
      input: DownloadFileInputSchema,
      output: DownloadFileOutputSchema,
      handler: async (ctx, input) => {
        const { path } = input as { path: string };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server downloading file at "${path}"`);
        const escapedPath = path.replace(/'/g, "''");
        const response = await ctx.client.get(
          `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${escapedPath}')/$value`,
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
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.getSitePageContents.description',
        { defaultMessage: 'Get the content of a SharePoint site page by integer item ID.' }
      ),
      input: GetSitePageContentsInputSchema,
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
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.search.description',
        { defaultMessage: 'Search SharePoint site content using Keyword Query Language (KQL).' }
      ),
      input: SearchInputSchema,
      output: z.any(),
      handler: async (ctx, input) => {
        const { query, from, size } = input as { query: string; from?: number; size?: number };
        const { siteUrl } = ctx.config as { siteUrl: string };
        ctx.log.debug(`SharePoint Server search: "${query}"`);
        const response = await ctx.client.get(`${siteUrl}/_api/search/query`, {
          headers: ODATA_HEADERS,
          params: {
            querytext: `'${query.replace(/'/g, "''")}'`,
            ...(from !== undefined && { startRow: from }),
            ...(size !== undefined && { rowLimit: size }),
          },
        });
        return response.data;
      },
    },

    callRestApi: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.sharepointServer.actions.callRestApi.description',
        {
          defaultMessage:
            "Call a SharePoint Server REST API endpoint directly by path (must start with '_api/').",
        }
      ),
      input: CallRestApiInputSchema,
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
      defaultMessage: 'Verifies SharePoint Server connection by fetching the site title.',
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
