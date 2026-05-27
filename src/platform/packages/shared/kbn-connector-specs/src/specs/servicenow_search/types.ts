/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Common ServiceNow tables and their purpose, for use in field descriptions.
 * Keep this in sync with the table descriptions in the connector spec skill text.
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
  'sys_user (ServiceNow users), ' +
  'sys_attachment (file attachments — query to find attachment sys_ids for a record). ' +
  'Custom tables are also supported.';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchInputSchema = lazySchema(() =>
  z.object({
    table: z.string().describe(TABLE_DESCRIPTION),
    query: z.string().describe('Full-text search query string'),
    encodedQuery: z
      .string()
      .optional()
      .describe(
        'Optional ServiceNow encoded query to combine with the full-text search for additional filtering. ' +
          'Syntax: AND conditions with ^ (field1=value1^field2=value2), OR with ^OR (field1=value1^ORfield2=value2). ' +
          'Operators: = != < > LIKE STARTSWITH ENDSWITH ISEMPTY ISNOTEMPTY. ' +
          'Date ranges: sys_created_on>2024-01-01^sys_created_on<2025-01-01. ' +
          'Examples: active=true^priority=1 | state=1^ORstate=2 | assigned_toISEMPTY^active=true | short_descriptionLIKEnetwork^priority<=2'
      ),
    fields: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of fields to return (e.g., sys_id,number,short_description,description)'
      ),
    limit: z.number().default(20).describe('Maximum number of results to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetRecordInputSchema = lazySchema(() =>
  z.object({
    table: z.string().describe(TABLE_DESCRIPTION),
    sysId: z.string().describe('The sys_id of the record to retrieve'),
    fields: z.string().optional().describe('Comma-separated list of fields to return'),
  })
);
export type GetRecordInput = z.infer<typeof GetRecordInputSchema>;

export const ListRecordsInputSchema = lazySchema(() =>
  z.object({
    table: z.string().describe(TABLE_DESCRIPTION),
    encodedQuery: z
      .string()
      .optional()
      .describe(
        'ServiceNow encoded query string for filtering. ' +
          'Syntax: AND conditions with ^ (field1=value1^field2=value2), OR with ^OR (field1=value1^ORfield2=value2). ' +
          'Operators: = != < > LIKE STARTSWITH ENDSWITH ISEMPTY ISNOTEMPTY. ' +
          'Date ranges: sys_created_on>2024-01-01^sys_created_on<2025-01-01. ' +
          'Examples: number=INC0010023 | active=true^priority=1 | state=1^ORstate=2 | assigned_toISEMPTY^active=true | assignment_group.nameLIKEnetwork^state!=6 | short_descriptionLIKEnetwork^priority<=2'
      ),
    fields: z.string().optional().describe('Comma-separated list of fields to return'),
    limit: z.number().default(20).describe('Maximum number of results to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
    orderBy: z
      .string()
      .optional()
      .describe('Field to order results by (prefix with - for descending)'),
  })
);
export type ListRecordsInput = z.infer<typeof ListRecordsInputSchema>;

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .optional()
      .describe('Optional filter to search table names or labels (e.g., "incident", "CMDB")'),
    limit: z.number().default(50).describe('Maximum number of tables to return (default: 50)'),
    offset: z.number().optional().describe('Offset for pagination'),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const ListKnowledgeBasesInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .optional()
      .default(20)
      .describe('Maximum number of knowledge bases to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
  })
);
export type ListKnowledgeBasesInput = z.infer<typeof ListKnowledgeBasesInputSchema>;

export const GetCommentsInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .describe(
        'The ServiceNow table the record belongs to (e.g., incident, change_request, problem)'
      ),
    recordSysId: z
      .string()
      .describe('The sys_id of the record whose comments/work notes to retrieve'),
    limit: z.number().default(20).describe('Maximum number of entries to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
  })
);
export type GetCommentsInput = z.infer<typeof GetCommentsInputSchema>;

export const GetAttachmentInputSchema = lazySchema(() =>
  z.object({
    sysId: z.string().describe('The sys_id of the attachment (from the sys_attachment table)'),
  })
);
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .describe(
        'The name of the ServiceNow table to describe (e.g., incident, kb_knowledge, change_request)'
      ),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;
