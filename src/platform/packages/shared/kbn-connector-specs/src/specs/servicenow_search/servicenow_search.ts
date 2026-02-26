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
 * for federated search. Features include:
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
import type * as ServiceNow from './types';

/**
 * Common ServiceNow tables and their purpose, for use in field descriptions.
 * Keep this in sync with the table descriptions in workflow YAML files.
 */
const TABLE_DESCRIPTION =
  'The ServiceNow table to query. Common tables: ' +
  'incident (IT incidents and service disruptions), ' +
  'kb_knowledge (knowledge base articles — use fields sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category to get full content), ' +
  'sc_req_item (service catalog requests), ' +
  'change_request (change management records), ' +
  'problem (problem records linked to incidents), ' +
  'sc_task (service catalog tasks), ' +
  'cmdb_ci (CMDB configuration items — servers, apps, etc.), ' +
  'sys_user (ServiceNow users). ' +
  'Custom tables are also supported.';

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
        defaults: {},
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
        table: z.string().describe(TABLE_DESCRIPTION),
        query: z.string().describe('Full-text search query string'),
        encodedQuery: z
          .string()
          .optional()
          .describe(
            'Optional ServiceNow encoded query to combine with the full-text search for additional filtering (e.g., active=true^priority=1). Uses the same syntax as listRecords.'
          ),
        fields: z
          .string()
          .optional()
          .describe(
            'Comma-separated list of fields to return (e.g., sys_id,number,short_description,description)'
          ),
        limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
        offset: z.number().optional().describe('Offset for pagination'),
      }),
      handler: async (ctx, input: ServiceNow.SearchInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${input.table}`;
        const limit = input.limit ?? 20;

        // GOTO123TEXTQUERY321 is ServiceNow's undocumented full-text search parameter
        const sysparmQuery = input.encodedQuery
          ? `GOTO123TEXTQUERY321=${input.query}^${input.encodedQuery}`
          : `GOTO123TEXTQUERY321=${input.query}`;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_query: sysparmQuery,
            sysparm_limit: limit,
            ...(input.offset !== undefined && { sysparm_offset: input.offset }),
            ...(input.fields && { sysparm_fields: input.fields }),
            sysparm_display_value: 'true',
          },
        });

        return response.data;
      },
    },

    getRecord: {
      isTool: true,
      description:
        'Retrieve a specific ServiceNow record by its sys_id. Works for any table. ' +
        'For knowledge articles (kb_knowledge table), request fields: sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category',
      input: z.object({
        table: z.string().describe(TABLE_DESCRIPTION),
        sysId: z.string().describe('The sys_id of the record to retrieve'),
        fields: z.string().optional().describe('Comma-separated list of fields to return'),
      }),
      handler: async (ctx, input: ServiceNow.GetRecordInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${input.table}/${input.sysId}`;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_display_value: 'true',
            ...(input.fields && { sysparm_fields: input.fields }),
          },
        });

        return response.data;
      },
    },

    listRecords: {
      isTool: true,
      description: 'List records from a ServiceNow table with optional encoded query filter',
      input: z.object({
        table: z.string().describe(TABLE_DESCRIPTION),
        encodedQuery: z
          .string()
          .optional()
          .describe(
            'ServiceNow encoded query string for filtering (e.g., active=true^priority=1). ' +
              'Use ^ to AND conditions, ^OR for OR. ' +
              'Examples: number=INC0010023 | active=true^priority=1 | assignment_group.nameLIKEnetwork^state!=6'
          ),
        fields: z.string().optional().describe('Comma-separated list of fields to return'),
        limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
        offset: z.number().optional().describe('Offset for pagination'),
        orderBy: z
          .string()
          .optional()
          .describe('Field to order results by (prefix with - for descending)'),
      }),
      handler: async (ctx, input: ServiceNow.ListRecordsInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${input.table}`;
        const limit = input.limit ?? 20;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_limit: limit,
            sysparm_display_value: 'true',
            ...(input.encodedQuery && { sysparm_query: input.encodedQuery }),
            ...(input.fields && { sysparm_fields: input.fields }),
            ...(input.offset !== undefined && { sysparm_offset: input.offset }),
            ...(input.orderBy && { sysparm_orderby: input.orderBy }),
          },
        });

        return response.data;
      },
    },

    listTables: {
      isTool: true,
      description:
        'List available ServiceNow tables with their labels and descriptions. Use this to discover what tables exist in the instance before querying them.',
      input: z.object({
        query: z
          .string()
          .optional()
          .describe('Optional filter to search table names or labels (e.g., "incident", "CMDB")'),
        limit: z.number().optional().describe('Maximum number of tables to return (default: 50)'),
        offset: z.number().optional().describe('Offset for pagination'),
      }),
      handler: async (ctx, input: ServiceNow.ListTablesInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/sys_db_object`;
        const limit = input.limit ?? 50;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_limit: limit,
            sysparm_fields: 'name,label,super_class,sys_package',
            sysparm_display_value: 'true',
            ...(input.query && {
              sysparm_query: `nameLIKE${input.query}^ORlabelLIKE${input.query}`,
            }),
            ...(input.offset !== undefined && { sysparm_offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    listKnowledgeBases: {
      isTool: true,
      description:
        'List available ServiceNow knowledge bases with their titles and descriptions. Use this to discover what knowledge bases exist before searching for articles.',
      input: z.object({
        limit: z
          .number()
          .optional()
          .describe('Maximum number of knowledge bases to return (default: 20)'),
        offset: z.number().optional().describe('Offset for pagination'),
      }),
      handler: async (ctx, input: ServiceNow.ListKnowledgeBasesInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/kb_knowledge_base`;
        const limit = input.limit ?? 20;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_limit: limit,
            sysparm_fields: 'sys_id,title,description,active,kb_managers',
            sysparm_display_value: 'true',
            sysparm_query: 'active=true',
            ...(input.offset !== undefined && { sysparm_offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    getComments: {
      isTool: true,
      description:
        'Retrieve comments and work notes for a ServiceNow record (e.g., an incident or change request). ' +
        'Returns journal entries in chronological order. Call this after retrieving a record to understand its history.',
      input: z.object({
        tableName: z
          .string()
          .describe(
            'The ServiceNow table the record belongs to (e.g., incident, change_request, problem)'
          ),
        recordSysId: z
          .string()
          .describe('The sys_id of the record whose comments/work notes to retrieve'),
        limit: z.number().optional().describe('Maximum number of entries to return (default: 20)'),
        offset: z.number().optional().describe('Offset for pagination'),
      }),
      handler: async (ctx, input: ServiceNow.GetCommentsInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/sys_journal_field`;
        const limit = input.limit ?? 20;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_query: `element_id=${input.recordSysId}^name=${input.tableName}^element=comments^NQelement_id=${input.recordSysId}^name=${input.tableName}^element=work_notes^ORDERBYsys_created_on`,
            sysparm_limit: limit,
            sysparm_fields: 'sys_id,element,value,sys_created_on,sys_created_by',
            sysparm_display_value: 'true',
            ...(input.offset !== undefined && { sysparm_offset: input.offset }),
          },
        });

        return response.data;
      },
    },

    getAttachment: {
      isTool: true,
      description:
        'Download a ServiceNow attachment as base64-encoded content by its attachment sys_id. ' +
        'Attachment sys_ids can be found by querying the sys_attachment table: ' +
        'use listRecords with table=sys_attachment and encodedQuery=table_name=<table>^table_sys_id=<record_sys_id>.',
      input: z.object({
        sysId: z.string().describe('The sys_id of the attachment (from the sys_attachment table)'),
      }),
      output: z.object({
        fileName: z.string().describe('Name of the attachment file'),
        contentType: z.string().describe('MIME type of the attachment'),
        base64: z.string().describe('Base64-encoded attachment content'),
      }),
      handler: async (ctx, input: ServiceNow.GetAttachmentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };

        // First get attachment metadata
        const metaResponse = await ctx.client.get(
          `${instanceUrl}/api/now/attachment/${input.sysId}`,
          {}
        );
        const { file_name: fileName, content_type: contentType } = metaResponse.data.result;

        // Then download the content
        const contentResponse = await ctx.client.get(
          `${instanceUrl}/api/now/attachment/${input.sysId}/file`,
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
      defaultMessage: 'Verifies ServiceNow connection by fetching the current user record',
    }),
    handler: async (ctx) => {
      try {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        // Fetch the authenticated user's own record — readable by any authenticated user
        // regardless of role. Avoids relying on admin-only tables like sys_properties.
        const response = await ctx.client.get(`${instanceUrl}/api/now/table/sys_user`, {
          params: {
            sysparm_query: 'sys_created_on!=NULL',
            sysparm_limit: 1,
            sysparm_fields: 'sys_id',
          },
        });
        const results = response.data?.result ?? [];
        if (results.length > 0) {
          return {
            ok: true,
            message: 'Successfully connected to ServiceNow',
          };
        }
        return {
          ok: true,
          message: 'Successfully connected to ServiceNow (no user records visible)',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
