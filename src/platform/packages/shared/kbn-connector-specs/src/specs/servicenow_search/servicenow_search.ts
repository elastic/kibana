/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ServiceNow Search Connector
 *
 * This connector provides integration with ServiceNow via the Table API
 * for federated search in Workplace AI. Features include:
 * - Full-text search across ServiceNow tables (incidents, knowledge articles, etc.)
 * - Retrieve individual records by sys_id
 * - List records from any ServiceNow table with filtering
 * - Download attachment content as base64
 *
 * Requires OAuth2 client credentials authentication.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

export const ServicenowSearch: ConnectorSpec = {
  metadata: {
    id: '.servicenow_search',
    displayName: 'ServiceNow',
    description: i18n.translate('core.kibanaConnectorSpecs.servicenowSearch.metadata.description', {
      defaultMessage: 'Search and retrieve records from ServiceNow',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          tokenUrl: 'https://{instance}.service-now.com/oauth_token.do',
        },
        overrides: {
          meta: {
            tokenUrl: {
              placeholder: 'https://your-instance.service-now.com/oauth_token.do',
            },
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  schema: z.object({
    instanceUrl: z
      .string()
      .url()
      .describe('ServiceNow instance URL (e.g., https://your-instance.service-now.com)')
      .meta({
        label: 'Instance URL',
        widget: 'text',
        placeholder: 'https://your-instance.service-now.com',
      }),
  }),

  actions: {
    search: {
      isTool: true,
      description: 'Search ServiceNow records using full-text search across a given table',
      input: z.object({
        table: z
          .string()
          .describe(
            'The ServiceNow table to search (e.g., incident, kb_knowledge, sc_req_item, change_request)'
          ),
        query: z.string().describe('Full-text search query string'),
        fields: z
          .string()
          .optional()
          .describe(
            'Comma-separated list of fields to return (e.g., sys_id,number,short_description,description)'
          ),
        limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
        offset: z.number().optional().describe('Offset for pagination'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          table: string;
          query: string;
          fields?: string;
          limit?: number;
          offset?: number;
        };

        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${typedInput.table}`;
        const limit = typedInput.limit ?? 20;

        ctx.log.debug(`ServiceNow searching ${typedInput.table} for: ${typedInput.query}`);

        const response = await ctx.client.get(url, {
          params: {
            sysparm_query: `GOTO123TEXTQUERY321=${typedInput.query}`,
            sysparm_limit: limit,
            ...(typedInput.offset !== undefined && { sysparm_offset: typedInput.offset }),
            ...(typedInput.fields && { sysparm_fields: typedInput.fields }),
            sysparm_display_value: 'true',
          },
        });

        return response.data;
      },
    },

    getRecord: {
      isTool: true,
      description: 'Retrieve a specific ServiceNow record by its sys_id',
      input: z.object({
        table: z
          .string()
          .describe(
            'The ServiceNow table (e.g., incident, kb_knowledge, sc_req_item, change_request)'
          ),
        sysId: z.string().describe('The sys_id of the record to retrieve'),
        fields: z
          .string()
          .optional()
          .describe('Comma-separated list of fields to return'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          table: string;
          sysId: string;
          fields?: string;
        };

        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${typedInput.table}/${typedInput.sysId}`;

        ctx.log.debug(`ServiceNow getting record ${typedInput.sysId} from ${typedInput.table}`);

        const response = await ctx.client.get(url, {
          params: {
            sysparm_display_value: 'true',
            ...(typedInput.fields && { sysparm_fields: typedInput.fields }),
          },
        });

        return response.data;
      },
    },

    listRecords: {
      isTool: true,
      description:
        'List records from a ServiceNow table with optional encoded query filter',
      input: z.object({
        table: z
          .string()
          .describe(
            'The ServiceNow table (e.g., incident, kb_knowledge, sc_req_item, change_request)'
          ),
        encodedQuery: z
          .string()
          .optional()
          .describe(
            'ServiceNow encoded query string for filtering (e.g., active=true^priority=1)'
          ),
        fields: z
          .string()
          .optional()
          .describe('Comma-separated list of fields to return'),
        limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
        offset: z.number().optional().describe('Offset for pagination'),
        orderBy: z
          .string()
          .optional()
          .describe('Field to order results by (prefix with - for descending)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          table: string;
          encodedQuery?: string;
          fields?: string;
          limit?: number;
          offset?: number;
          orderBy?: string;
        };

        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${typedInput.table}`;
        const limit = typedInput.limit ?? 20;

        ctx.log.debug(`ServiceNow listing records from ${typedInput.table}`);

        const response = await ctx.client.get(url, {
          params: {
            sysparm_limit: limit,
            sysparm_display_value: 'true',
            ...(typedInput.encodedQuery && { sysparm_query: typedInput.encodedQuery }),
            ...(typedInput.fields && { sysparm_fields: typedInput.fields }),
            ...(typedInput.offset !== undefined && { sysparm_offset: typedInput.offset }),
            ...(typedInput.orderBy && { sysparm_orderby: typedInput.orderBy }),
          },
        });

        return response.data;
      },
    },

    getKnowledgeArticle: {
      isTool: true,
      description:
        'Retrieve a ServiceNow knowledge article with its full body content by article sys_id',
      input: z.object({
        sysId: z.string().describe('The sys_id of the knowledge article'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { sysId: string };

        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/kb_knowledge/${typedInput.sysId}`;

        ctx.log.debug(`ServiceNow getting knowledge article ${typedInput.sysId}`);

        const response = await ctx.client.get(url, {
          params: {
            sysparm_display_value: 'true',
            sysparm_fields:
              'sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category',
          },
        });

        return response.data;
      },
    },

    getAttachment: {
      isTool: true,
      description:
        'Download a ServiceNow attachment as base64-encoded content by its sys_id',
      input: z.object({
        sysId: z.string().describe('The sys_id of the attachment'),
      }),
      output: z.object({
        fileName: z.string().describe('Name of the attachment file'),
        contentType: z.string().describe('MIME type of the attachment'),
        base64: z.string().describe('Base64-encoded attachment content'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { sysId: string };

        const { instanceUrl } = ctx.config as { instanceUrl: string };

        ctx.log.debug(`ServiceNow downloading attachment ${typedInput.sysId}`);

        // First get attachment metadata
        const metaResponse = await ctx.client.get(
          `${instanceUrl}/api/now/attachment/${typedInput.sysId}`,
          {}
        );
        const { file_name: fileName, content_type: contentType } = metaResponse.data.result;

        // Then download the content
        const contentResponse = await ctx.client.get(
          `${instanceUrl}/api/now/attachment/${typedInput.sysId}/file`,
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(contentResponse.data);

        return {
          fileName,
          contentType,
          base64: buffer.toString('base64'),
        };
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.servicenowSearch.test.description', {
      defaultMessage: 'Verifies ServiceNow connection by fetching instance metadata',
    }),
    handler: async (ctx) => {
      ctx.log.debug('ServiceNow Search test handler');

      try {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const response = await ctx.client.get(
          `${instanceUrl}/api/now/table/sys_properties`,
          {
            params: {
              sysparm_query: 'name=instance_name',
              sysparm_limit: 1,
              sysparm_fields: 'name,value',
            },
          }
        );
        const results = response.data?.result ?? [];
        const instanceName = results.length > 0 ? results[0].value : 'Unknown';
        return {
          ok: true,
          message: `Successfully connected to ServiceNow instance: ${instanceName}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
