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
import type * as Notion from './types';

export const NotionConnector: ConnectorSpec = {
  metadata: {
    id: '.notion',
    displayName: 'Notion',
    description: i18n.translate('core.kibanaConnectorSpecs.notion.metadata.description', {
      defaultMessage: 'Explore content and databases in Notion',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer'],
    headers: {
      'Notion-Version': '2025-09-03',
    },
  },

  actions: {
    // https://developers.notion.com/reference/post-search
    searchPageOrDSByTitle: {
      isTool: false,
      input: z.object({
        query: z.string(),
        queryObjectType: z.enum(['page', 'data_source']),
        startCursor: z.string().optional(),
        pageSize: z.number().optional(),
      }),
      handler: async (ctx, input: Notion.SearchByTitleInput) => {
        const response = await ctx.client.post('https://api.notion.com/v1/search', {
          query: input.query,
          filter: {
            value: input.queryObjectType,
            property: 'object',
          },
          ...(input.startCursor && { start_cursor: input.startCursor }),
          ...(input.pageSize && { page_size: input.pageSize }),
        });

        return response.data;
      },
    },

    // https://developers.notion.com/reference/retrieve-a-page
    getPage: {
      isTool: false,
      input: z.object({ pageId: z.string() }),
      handler: async (ctx, input: Notion.GetPageInput) => {
        const response = await ctx.client.get(
          `https://api.notion.com/v1/pages/${input.pageId}`,
          {}
        );
        return response.data;
      },
    },

    // https://developers.notion.com/reference/retrieve-a-data-source
    getDataSource: {
      isTool: false,
      input: z.object({ dataSourceId: z.string() }),
      handler: async (ctx, input: Notion.GetDataSourceInput) => {
        const response = await ctx.client.get(
          `https://api.notion.com/v1/data_sources/${input.dataSourceId}`,
          {}
        );
        return response.data;
      },
    },

    // https://developers.notion.com/reference/query-a-data-source
    queryDataSource: {
      isTool: false,
      input: z.object({
        dataSourceId: z.string(),
        filter: z.string().optional(),
        startCursor: z.string().optional(),
        pageSize: z.number().optional(),
      }),
      handler: async (ctx, input: Notion.QueryDataSourceInput) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let requestData: Record<string, any> = {
          page_size: input.pageSize,
          start_cursor: input.startCursor,
        };
        if (input.filter) {
          requestData = { ...requestData, filter: JSON.parse(input.filter) };
        }

        const response = await ctx.client.post(
          `https://api.notion.com/v1/data_sources/${input.dataSourceId}/query`,
          requestData
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.notion.test.description', {
      defaultMessage: 'Verifies Notion connection by fetching metadata about given data source',
    }),
    // TODO: might need to accept some input here in order to pass to the API endpoint to test
    // if listing all users feels a bit too much
    handler: async (ctx) => {
      ctx.log.debug('Notion test handler');

      try {
        const response = await ctx.client.get('https://api.notion.com/v1/users');
        const numOfUsers = response.data.results.length;
        return {
          ok: true,
          message: `Successfully connected to Notion API: found ${numOfUsers} users`,
        };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  },
};
