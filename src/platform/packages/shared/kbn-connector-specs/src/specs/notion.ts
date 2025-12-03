/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';

export const NotionConnector: ConnectorSpec = {
  metadata: {
    id: '.notion',
    displayName: 'Notion',
    description: 'Explore content and databases in Notion',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  // TODO: we also need to send another custom header "Notion-Version": "2025-09-03"
  // https://developers.notion.com/docs/authorization#making-api-requests-with-an-internal-integration
  authTypes: ['bearer'],

  actions: {
    // https://developers.notion.com/reference/post-search
    searchPageOrDSByTitle: {
      isTool: true,
      input: z.object({
        query: z.string(),
        queryObjectType: z.enum(['page', 'data_source']),
        startCursor: z.string().optional(),
        pageSize: z.number().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          query: string;
          queryObjectType: 'page' | 'data_source';
          startCursor?: string;
          pageSize?: number;
        };

        const response = await ctx.client.post(
          'https://api.notion.com/v1/search',
          {
            query: typedInput.query,
            filter: {
              value: typedInput.queryObjectType,
              property: 'object',
            },
            ...(typedInput.startCursor && { start_cursor: typedInput.startCursor }),
            ...(typedInput.pageSize && { page_size: typedInput.pageSize }),
          },
          { headers: { 'Notion-Version': '2025-09-03' } }
        );

        return response.data;
      },
    },
    // getPage: {},
    // getDataSource: {},
    // queryDataSource: {},
  },

  test: {
    description: 'Fetch metadata about given data source',
    handler: async (ctx) => {
      ctx.log.debug('Notion test handler');
      return { ok: true };
    },
  },
};
