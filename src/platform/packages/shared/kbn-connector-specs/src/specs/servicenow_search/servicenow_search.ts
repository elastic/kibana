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
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  SearchInputSchema,
  GetRecordInputSchema,
  ListRecordsInputSchema,
  ListTablesInputSchema,
  ListKnowledgeBasesInputSchema,
  GetCommentsInputSchema,
  GetAttachmentInputSchema,
  DescribeTableInputSchema,
  CreateRecordInputSchema,
  UpdateRecordInputSchema,
  CreateIncidentInputSchema,
  UpdateIncidentInputSchema,
  AddCommentInputSchema,
  AddWorkNoteInputSchema,
  CloseIncidentInputSchema,
  CreateSecurityIncidentInputSchema,
  CreateEventInputSchema,
  UploadAttachmentInputSchema,
  DeleteRecordInputSchema,
  GetChoicesInputSchema,
  QueryUsersInputSchema,
} from './types';
import type {
  SearchInput,
  GetRecordInput,
  ListRecordsInput,
  ListTablesInput,
  ListKnowledgeBasesInput,
  GetCommentsInput,
  GetAttachmentInput,
  DescribeTableInput,
  CreateRecordInput,
  UpdateRecordInput,
  CreateIncidentInput,
  UpdateIncidentInput,
  AddCommentInput,
  AddWorkNoteInput,
  CloseIncidentInput,
  CreateSecurityIncidentInput,
  CreateEventInput,
  UploadAttachmentInput,
  DeleteRecordInput,
  GetChoicesInput,
  QueryUsersInput,
} from './types';
export const ServicenowSearch: ConnectorSpec = {
  metadata: {
    id: '.servicenow_search',
    displayName: 'ServiceNow',
    description: i18n.translate('core.kibanaConnectorSpecs.servicenowSearch.metadata.description', {
      defaultMessage:
        'Create, update, and search records, incidents, security incidents, events, and attachments in ServiceNow',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://your-instance.service-now.com/oauth_auth.do',
            },
            tokenUrl: {
              placeholder: 'https://your-instance.service-now.com/oauth_token.do',
            },
            scope: { hidden: true },
          },
        },
      },
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

  schema: lazySchema(() =>
    z.object({
      instanceUrl: z
        .url()
        .describe('ServiceNow instance URL (e.g., https://your-instance.service-now.com)')
        .meta({
          label: 'Instance URL',
          widget: 'text',
          placeholder: 'https://your-instance.service-now.com',
        }),
    })
  ),

  actions: {
    search: {
      isTool: true,
      description: 'Search ServiceNow records using full-text search across a given table',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(input.table)}`;
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
      input: GetRecordInputSchema,
      handler: async (ctx, input: GetRecordInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(
          input.table
        )}/${encodeURIComponent(input.sysId)}`;

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
      input: ListRecordsInputSchema,
      handler: async (ctx, input: ListRecordsInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(input.table)}`;
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
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
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
      input: ListKnowledgeBasesInputSchema,
      handler: async (ctx, input: ListKnowledgeBasesInput) => {
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
      input: GetCommentsInputSchema,
      handler: async (ctx, input: GetCommentsInput) => {
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
        'use listRecords with table=sys_attachment and encodedQuery=table_name=<table>^table_sys_id=<record_sys_id>. ' +
        'WARNING: This action returns raw base64-encoded binary data. Only call it when you have a concrete plan to process the data (e.g. via an Elasticsearch ingest pipeline attachment processor); do not call it speculatively or store the raw base64 in a case or alert without further processing.',
      input: GetAttachmentInputSchema,
      output: lazySchema(() =>
        z.object({
          fileName: z.string().describe('Name of the attachment file'),
          contentType: z.string().describe('MIME type of the attachment'),
          base64: z.string().describe('Base64-encoded attachment content'),
        })
      ),
      handler: async (ctx, input: GetAttachmentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };

        // First get attachment metadata
        const metaResponse = await ctx.client.get(
          `${instanceUrl}/api/now/attachment/${encodeURIComponent(input.sysId)}`,
          {}
        );
        const { file_name: fileName, content_type: contentType } = metaResponse.data.result;

        // Then download the content
        const contentResponse = await ctx.client.get(
          `${instanceUrl}/api/now/attachment/${encodeURIComponent(input.sysId)}/file`,
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

    describeTable: {
      isTool: true,
      description:
        'Describe the schema of a ServiceNow table by listing all its fields (including inherited fields), ' +
        'their types, labels, and constraints. Use this to understand the structure of a table before ' +
        'querying it — for example, to know which fields to request or filter on.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        // The /api/now/doc/table/schema endpoint returns the full flattened schema
        // including inherited fields from parent tables, and is accessible to non-admin users.
        const url = `${instanceUrl}/api/now/doc/table/schema/${encodeURIComponent(input.table)}`;

        const response = await ctx.client.get(url, {});

        return response.data;
      },
    },

    // -------------------------------------------------------------------------
    // Write operations — generic
    // -------------------------------------------------------------------------

    createRecord: {
      isTool: true,
      description:
        'Insert a new record into any ServiceNow table. Returns the created record including its sys_id and number. ' +
        'For ITSM incidents use createIncident; for security incidents use createSecurityIncident; ' +
        'for ITOM events use createEvent. Use this action for all other tables.',
      input: CreateRecordInputSchema,
      handler: async (ctx, input: CreateRecordInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(input.table)}`;

        const response = await ctx.client.post(url, input.fields, {
          params: { sysparm_display_value: 'true' },
        });

        return response.data;
      },
    },

    updateRecord: {
      isTool: true,
      description:
        'Update an existing record in any ServiceNow table by its sys_id. ' +
        'Provide only the fields that need to change — all other fields are left untouched. ' +
        'Returns the full updated record. ' +
        'For ITSM incidents use updateIncident; use this action for all other tables.',
      input: UpdateRecordInputSchema,
      handler: async (ctx, input: UpdateRecordInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(
          input.table
        )}/${encodeURIComponent(input.sysId)}`;

        const response = await ctx.client.patch(url, input.fields, {
          params: { sysparm_display_value: 'true' },
        });

        return response.data;
      },
    },

    // -------------------------------------------------------------------------
    // Write operations — ITSM incidents
    // -------------------------------------------------------------------------

    createIncident: {
      isTool: true,
      description:
        'Create a new ITSM incident in ServiceNow. ' +
        'Requires short_description; all other fields are optional. ' +
        'Returns the created incident including its sys_id and incident number (e.g., INC0012345). ' +
        'Use queryUsers to resolve names to sys_ids for caller_id and assigned_to. ' +
        'Use getChoices to discover valid values for category, impact, and urgency.',
      input: CreateIncidentInputSchema,
      handler: async (ctx, input: CreateIncidentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/incident`;

        const response = await ctx.client.post(url, input, {
          params: { sysparm_display_value: 'true' },
        });

        return response.data;
      },
    },

    updateIncident: {
      isTool: true,
      description:
        'Update an existing ITSM incident by its sys_id. ' +
        'Provide only the fields to change — all other fields are left untouched. ' +
        'Returns the updated incident. ' +
        'To resolve or close an incident use closeIncident instead.',
      input: UpdateIncidentInputSchema,
      handler: async (ctx, input: UpdateIncidentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const { sysId, ...fields } = input;
        const url = `${instanceUrl}/api/now/table/incident/${encodeURIComponent(sysId)}`;

        const response = await ctx.client.patch(url, fields, {
          params: { sysparm_display_value: 'true' },
        });

        return response.data;
      },
    },

    addComment: {
      isTool: true,
      description:
        'Add a customer-visible comment to a ServiceNow record. ' +
        'The comment appears in the record journal and is visible to the caller. ' +
        'Use addWorkNote for internal-only notes that should not be visible to the end user.',
      input: AddCommentInputSchema,
      handler: async (ctx, input: AddCommentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(
          input.table
        )}/${encodeURIComponent(input.sysId)}`;

        const response = await ctx.client.patch(
          url,
          { comments: input.comment },
          { params: { sysparm_display_value: 'true' } }
        );

        return response.data;
      },
    },

    // -------------------------------------------------------------------------
    // Write operations — should-have
    // -------------------------------------------------------------------------

    addWorkNote: {
      isTool: true,
      description:
        'Add an internal work note to a ServiceNow record. ' +
        'Work notes are only visible to agents and never shown to the end user or caller. ' +
        'Use addComment for customer-facing journal entries.',
      input: AddWorkNoteInputSchema,
      handler: async (ctx, input: AddWorkNoteInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(
          input.table
        )}/${encodeURIComponent(input.sysId)}`;

        const response = await ctx.client.patch(
          url,
          { work_notes: input.workNote },
          { params: { sysparm_display_value: 'true' } }
        );

        return response.data;
      },
    },

    closeIncident: {
      isTool: true,
      description:
        'Resolve or close a ServiceNow incident by setting its state to Resolved (6) or Closed (7). ' +
        'A close code and close notes are required. ' +
        'Use getChoices with tableName=incident, fieldName=close_code to see valid close codes for the instance.',
      input: CloseIncidentInputSchema,
      handler: async (ctx, input: CloseIncidentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const { sysId, closeCode, closeNotes, state } = input;
        const url = `${instanceUrl}/api/now/table/incident/${encodeURIComponent(sysId)}`;

        const response = await ctx.client.patch(
          url,
          { state, close_code: closeCode, close_notes: closeNotes },
          { params: { sysparm_display_value: 'true' } }
        );

        return response.data;
      },
    },

    createSecurityIncident: {
      isTool: true,
      description:
        'Create a new Security Operations (SecOps/SIR) incident in the sn_si_incident table. ' +
        'Use this for cyber security incidents and threat investigations rather than ITSM incidents. ' +
        'Returns the created incident with its sys_id.',
      input: CreateSecurityIncidentInputSchema,
      handler: async (ctx, input: CreateSecurityIncidentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/sn_si_incident`;

        const response = await ctx.client.post(url, input, {
          params: { sysparm_display_value: 'true' },
        });

        return response.data;
      },
    },

    createEvent: {
      isTool: true,
      description:
        'Send an ITOM event to ServiceNow Event Management. ' +
        'Creates or updates an alert in the Event Management console. ' +
        'Use message_key to deduplicate: events with the same source, node, type, and message_key ' +
        'update the existing alert instead of creating a new one.',
      input: CreateEventInputSchema,
      handler: async (ctx, input: CreateEventInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/em/event`;

        const { additional_info, ...eventFields } = input;
        const eventBody: Record<string, unknown> = { ...eventFields };
        if (additional_info !== undefined) {
          eventBody.additional_info = JSON.stringify(additional_info);
        }

        const response = await ctx.client.post(url, { records: [eventBody] });

        return response.data;
      },
    },

    uploadAttachment: {
      isTool: true,
      description:
        'Upload a file attachment to a ServiceNow record. ' +
        'The file must be provided as base64-encoded content. ' +
        'Returns the attachment metadata including the new attachment sys_id. ' +
        'WARNING: Transmits file content through the connector — avoid files larger than 5MB. ' +
        'To retrieve existing attachments use getAttachment.',
      input: UploadAttachmentInputSchema,
      handler: async (ctx, input: UploadAttachmentInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/attachment/file`;
        const buffer = Buffer.from(input.base64Content, 'base64');

        const response = await ctx.client.post(url, buffer, {
          params: {
            table_name: input.tableName,
            table_sys_id: input.tableSysId,
            file_name: input.fileName,
          },
          headers: { 'Content-Type': input.contentType },
          // Bypass JSON serialization so the Buffer is sent as binary
          transformRequest: [(data: Buffer) => data],
        });

        return response.data;
      },
    },

    deleteRecord: {
      isTool: true,
      description:
        'Permanently delete a record from a ServiceNow table by its sys_id. ' +
        'This operation cannot be undone. ' +
        'Use only for automation-created records that need cleanup — ' +
        'prefer updating state to "Cancelled" or "Closed" over deleting business records.',
      input: DeleteRecordInputSchema,
      handler: async (ctx, input: DeleteRecordInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/${encodeURIComponent(
          input.table
        )}/${encodeURIComponent(input.sysId)}`;

        await ctx.client.delete(url);

        return { deleted: true, table: input.table, sysId: input.sysId };
      },
    },

    getChoices: {
      isTool: true,
      description:
        'Look up valid choice values for a ServiceNow field. ' +
        'Call this before writing to discover valid values for state, close_code, category, impact, urgency, ' +
        'and other choice-list fields. Returns values with their display labels.',
      input: GetChoicesInputSchema,
      handler: async (ctx, input: GetChoicesInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/sys_choice`;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_query: `name=${input.tableName}^element=${input.fieldName}^language=${
              input.language ?? 'en'
            }^inactive=false`,
            sysparm_fields: 'value,label,sequence',
            sysparm_display_value: 'true',
            sysparm_limit: 100,
          },
        });

        return response.data;
      },
    },

    queryUsers: {
      isTool: true,
      description:
        'Search ServiceNow users by name, email, or username. ' +
        'Use this to look up the sys_id for caller_id or assigned_to fields ' +
        'before creating or updating an incident.',
      input: QueryUsersInputSchema,
      handler: async (ctx, input: QueryUsersInput) => {
        const { instanceUrl } = ctx.config as { instanceUrl: string };
        const url = `${instanceUrl}/api/now/table/sys_user`;
        const limit = input.limit ?? 20;

        const response = await ctx.client.get(url, {
          params: {
            sysparm_limit: limit,
            sysparm_fields: 'sys_id,user_name,name,email,department,title,active',
            sysparm_display_value: 'true',
            ...(input.query && {
              sysparm_query: `nameLIKE${input.query}^ORemailLIKE${input.query}^ORuser_nameLIKE${input.query}`,
            }),
            ...(input.offset !== undefined && { sysparm_offset: input.offset }),
          },
        });

        return response.data;
      },
    },
  },

  skill: [
    'ServiceNow connector — cross-action usage guidance for LLMs.',
    '',
    '## Discovery pattern',
    'When the target table is unknown, start with listTables (optionally filter by query keyword),',
    'then call describeTable on the chosen table to understand available fields before querying.',
    '',
    '## Knowledge articles',
    'listKnowledgeBases → search (or listRecords) on kb_knowledge table.',
    'Useful fields: sys_id, number, short_description, text, topic, category, author,',
    'sys_created_on, sys_updated_on, workflow_state, kb_knowledge_base, kb_category.',
    'To filter by knowledge base: include kb_knowledge_base=<kb_sys_id> in encodedQuery.',
    '',
    '## Attachments',
    'Attachment sys_ids are not stored on the parent record. Find them first:',
    '  listRecords(table=sys_attachment, encodedQuery=table_name=<table>^table_sys_id=<record_sys_id>)',
    'Then call getAttachment with the attachment sys_id to retrieve base64-encoded content.',
    'To upload: use uploadAttachment with base64-encoded content. Avoid files larger than 5MB.',
    '',
    '## Write operations — generic vs typed',
    'Use createRecord/updateRecord for any table not covered by a typed action.',
    'Use createIncident/updateIncident/closeIncident for ITSM incidents.',
    'Use createSecurityIncident for SecOps SIR incidents (sn_si_incident table).',
    'Use createEvent for ITOM Event Management (em_event).',
    '',
    '## Incident lifecycle',
    'createIncident → updateIncident (as state changes) → addComment/addWorkNote → closeIncident.',
    'closeIncident (not updateIncident) is the correct action to resolve/close — it enforces',
    'close_code and close_notes. Use getChoices(tableName=incident, fieldName=close_code)',
    'to discover valid close codes for the instance before calling closeIncident.',
    '',
    '## Comments vs work notes',
    'addComment: customer-visible, appears in the caller-facing journal. Use for case write-back.',
    'addWorkNote: internal only, never shown to the caller. Use for investigation and triage notes.',
    '',
    '## Read-before-write',
    'For updates, call getRecord first to verify current state and avoid overwriting concurrent changes.',
    '',
    '## Resolving names to sys_ids',
    'Use queryUsers to look up sys_ids for caller_id and assigned_to fields.',
    'Use getChoices to look up valid string values for state, category, impact, and urgency fields.',
  ].join('\n'),

  test: {
    enabled: true,
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
