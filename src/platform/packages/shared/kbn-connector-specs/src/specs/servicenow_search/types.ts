/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

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

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchInputSchema = z.object({
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
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetRecordInputSchema = z.object({
  table: z.string().describe(TABLE_DESCRIPTION),
  sysId: z.string().describe('The sys_id of the record to retrieve'),
  fields: z.string().optional().describe('Comma-separated list of fields to return'),
});
export type GetRecordInput = z.infer<typeof GetRecordInputSchema>;

export const ListRecordsInputSchema = z.object({
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
});
export type ListRecordsInput = z.infer<typeof ListRecordsInputSchema>;

export const ListTablesInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Optional filter to search table names or labels (e.g., "incident", "CMDB")'),
  limit: z.number().optional().describe('Maximum number of tables to return (default: 50)'),
  offset: z.number().optional().describe('Offset for pagination'),
});
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const ListKnowledgeBasesInputSchema = z.object({
  limit: z
    .number()
    .optional()
    .describe('Maximum number of knowledge bases to return (default: 20)'),
  offset: z.number().optional().describe('Offset for pagination'),
});
export type ListKnowledgeBasesInput = z.infer<typeof ListKnowledgeBasesInputSchema>;

export const GetCommentsInputSchema = z.object({
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
});
export type GetCommentsInput = z.infer<typeof GetCommentsInputSchema>;

export const GetAttachmentInputSchema = z.object({
  sysId: z.string().describe('The sys_id of the attachment (from the sys_attachment table)'),
});
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;

export const DescribeTableInputSchema = z.object({
  table: z
    .string()
    .describe(
      'The name of the ServiceNow table to describe (e.g., incident, kb_knowledge, change_request)'
    ),
});
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;
