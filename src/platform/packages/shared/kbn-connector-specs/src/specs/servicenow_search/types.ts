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
    table: z.string().max(200).describe(TABLE_DESCRIPTION),
    query: z.string().max(2000).describe('Full-text search query string'),
    encodedQuery: z
      .string()
      .max(2000)
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
      .max(2000)
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
    table: z.string().max(200).describe(TABLE_DESCRIPTION),
    sysId: z.string().max(200).describe('The sys_id of the record to retrieve'),
    fields: z.string().max(2000).optional().describe('Comma-separated list of fields to return'),
  })
);
export type GetRecordInput = z.infer<typeof GetRecordInputSchema>;

export const ListRecordsInputSchema = lazySchema(() =>
  z.object({
    table: z.string().max(200).describe(TABLE_DESCRIPTION),
    encodedQuery: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'ServiceNow encoded query string for filtering. ' +
          'Syntax: AND conditions with ^ (field1=value1^field2=value2), OR with ^OR (field1=value1^ORfield2=value2). ' +
          'Operators: = != < > LIKE STARTSWITH ENDSWITH ISEMPTY ISNOTEMPTY. ' +
          'Date ranges: sys_created_on>2024-01-01^sys_created_on<2025-01-01. ' +
          'Examples: number=INC0010023 | active=true^priority=1 | state=1^ORstate=2 | assigned_toISEMPTY^active=true | assignment_group.nameLIKEnetwork^state!=6 | short_descriptionLIKEnetwork^priority<=2'
      ),
    fields: z.string().max(2000).optional().describe('Comma-separated list of fields to return'),
    limit: z.number().default(20).describe('Maximum number of results to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
    orderBy: z
      .string()
      .max(200)
      .optional()
      .describe('Field to order results by (prefix with - for descending)'),
  })
);
export type ListRecordsInput = z.infer<typeof ListRecordsInputSchema>;

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(2000)
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
      .max(200)
      .describe(
        'The ServiceNow table the record belongs to (e.g., incident, change_request, problem)'
      ),
    recordSysId: z
      .string()
      .max(200)
      .describe('The sys_id of the record whose comments/work notes to retrieve'),
    limit: z.number().default(20).describe('Maximum number of entries to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
  })
);
export type GetCommentsInput = z.infer<typeof GetCommentsInputSchema>;

export const GetAttachmentInputSchema = lazySchema(() =>
  z.object({
    sysId: z
      .string()
      .max(200)
      .describe('The sys_id of the attachment (from the sys_attachment table)'),
  })
);
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .max(200)
      .describe(
        'The name of the ServiceNow table to describe (e.g., incident, kb_knowledge, change_request)'
      ),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

// =============================================================================
// Write action input schemas & inferred types
// =============================================================================

export const CreateRecordInputSchema = lazySchema(() =>
  z.object({
    table: z.string().max(200).describe(TABLE_DESCRIPTION),
    fields: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length >= 1, {
        message: 'At least one field must be provided',
      })
      .refine((v) => Object.keys(v).length <= 100, {
        message: 'Maximum 100 fields per record',
      })
      .describe(
        'Key-value map of ServiceNow field names to values for the new record ' +
          '(e.g., { "short_description": "VPN issue", "impact": "2" })'
      ),
  })
);
export type CreateRecordInput = z.infer<typeof CreateRecordInputSchema>;

export const UpdateRecordInputSchema = lazySchema(() =>
  z.object({
    table: z.string().max(200).describe(TABLE_DESCRIPTION),
    sysId: z.string().max(200).describe('The sys_id of the record to update'),
    fields: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length >= 1, {
        message: 'At least one field must be provided to update',
      })
      .refine((v) => Object.keys(v).length <= 100, {
        message: 'Maximum 100 fields per record',
      })
      .describe(
        'Key-value map of ServiceNow field names to their new values. Only provide fields that need to change.'
      ),
  })
);
export type UpdateRecordInput = z.infer<typeof UpdateRecordInputSchema>;

export const CreateIncidentInputSchema = lazySchema(() =>
  z.object({
    short_description: z
      .string()
      .max(2000)
      .describe('Brief one-line summary of the incident (required)'),
    description: z.string().max(4000).optional().describe('Detailed description of the incident'),
    caller_id: z
      .string()
      .max(200)
      .optional()
      .describe('sys_id or username of the user who reported the incident'),
    impact: z.enum(['1', '2', '3']).optional().describe('Business impact: 1=High, 2=Medium, 3=Low'),
    urgency: z.enum(['1', '2', '3']).optional().describe('Urgency level: 1=High, 2=Medium, 3=Low'),
    category: z
      .string()
      .max(200)
      .optional()
      .describe('Incident category (use getChoices with tableName=incident, fieldName=category)'),
    subcategory: z.string().max(200).optional().describe('Incident subcategory'),
    assignment_group: z
      .string()
      .max(200)
      .optional()
      .describe('sys_id or name of the assignment group'),
    assigned_to: z
      .string()
      .max(200)
      .optional()
      .describe('sys_id or username of the assigned technician (use queryUsers to look up)'),
    comments: z
      .string()
      .max(4000)
      .optional()
      .describe('Initial customer-visible comment to add to the incident'),
    work_notes: z
      .string()
      .max(4000)
      .optional()
      .describe('Initial internal work note (not visible to the caller)'),
  })
);
export type CreateIncidentInput = z.infer<typeof CreateIncidentInputSchema>;

export const UpdateIncidentInputSchema = lazySchema(() =>
  z
    .object({
      sysId: z.string().max(200).describe('The sys_id of the incident to update'),
      short_description: z.string().max(2000).optional().describe('Updated brief summary'),
      description: z.string().max(4000).optional().describe('Updated detailed description'),
      state: z
        .enum(['1', '2', '3', '6', '7'])
        .optional()
        .describe('Incident state: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed'),
      caller_id: z.string().max(200).optional().describe('sys_id or username of the caller'),
      impact: z
        .enum(['1', '2', '3'])
        .optional()
        .describe('Business impact: 1=High, 2=Medium, 3=Low'),
      urgency: z.enum(['1', '2', '3']).optional().describe('Urgency: 1=High, 2=Medium, 3=Low'),
      category: z.string().max(200).optional().describe('Incident category'),
      subcategory: z.string().max(200).optional().describe('Incident subcategory'),
      assignment_group: z
        .string()
        .max(200)
        .optional()
        .describe('sys_id or name of the assignment group'),
      assigned_to: z
        .string()
        .max(200)
        .optional()
        .describe('sys_id or username of the assigned technician'),
      comments: z
        .string()
        .max(4000)
        .optional()
        .describe('Customer-visible comment to append to the incident'),
      work_notes: z
        .string()
        .max(4000)
        .optional()
        .describe('Internal work note to append (not visible to the caller)'),
      close_code: z
        .string()
        .max(200)
        .optional()
        .describe(
          'Resolution close code (use getChoices with tableName=incident, fieldName=close_code)'
        ),
      close_notes: z
        .string()
        .max(4000)
        .optional()
        .describe('Detailed resolution notes (required when setting state to 6 or 7)'),
    })
    .refine((v) => Object.entries(v).some(([k, val]) => k !== 'sysId' && val !== undefined), {
      message: 'At least one field (besides sysId) must be provided to update',
    })
);
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentInputSchema>;

export const AddCommentInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .max(200)
      .describe(
        'The ServiceNow table containing the record (e.g., incident, change_request, problem)'
      ),
    sysId: z.string().max(200).describe('The sys_id of the record to add the comment to'),
    comment: z
      .string()
      .max(4000)
      .describe('The comment text to add. This is customer-visible and appears in the journal.'),
  })
);
export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

export const AddWorkNoteInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .max(200)
      .describe(
        'The ServiceNow table containing the record (e.g., incident, change_request, problem)'
      ),
    sysId: z.string().max(200).describe('The sys_id of the record to add the work note to'),
    workNote: z
      .string()
      .max(4000)
      .describe('The internal work note text to add. Work notes are never visible to the caller.'),
  })
);
export type AddWorkNoteInput = z.infer<typeof AddWorkNoteInputSchema>;

export const CloseIncidentInputSchema = lazySchema(() =>
  z.object({
    sysId: z.string().max(200).describe('The sys_id of the incident to close'),
    closeCode: z
      .string()
      .max(200)
      .describe(
        'Resolution close code (use getChoices with tableName=incident, fieldName=close_code to see valid values)'
      ),
    closeNotes: z
      .string()
      .max(4000)
      .describe('Detailed description of how the incident was resolved'),
    state: z
      .enum(['6', '7'])
      .default('6')
      .describe('Final state: 6=Resolved, 7=Closed (default: 6=Resolved)'),
  })
);
export type CloseIncidentInput = z.infer<typeof CloseIncidentInputSchema>;

export const CreateSecurityIncidentInputSchema = lazySchema(() =>
  z.object({
    short_description: z
      .string()
      .max(2000)
      .describe('Brief summary of the security incident (required)'),
    description: z
      .string()
      .max(4000)
      .optional()
      .describe('Detailed description of the security incident'),
    priority: z
      .enum(['1', '2', '3', '4', '5'])
      .optional()
      .describe('Priority: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning'),
    category: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Security incident category (use getChoices with tableName=sn_si_incident, fieldName=category)'
      ),
    subcategory: z.string().max(200).optional().describe('Security incident subcategory'),
    assignment_group: z
      .string()
      .max(200)
      .optional()
      .describe('sys_id or name of the assignment group'),
    assigned_to: z
      .string()
      .max(200)
      .optional()
      .describe('sys_id or username of the assigned analyst'),
    affected_user: z
      .string()
      .max(200)
      .optional()
      .describe('sys_id or username of the affected user'),
    comments: z.string().max(4000).optional().describe('Initial customer-visible comment'),
    work_notes: z
      .string()
      .max(4000)
      .optional()
      .describe('Initial internal work note (not visible to the affected user)'),
    business_criticality: z
      .enum(['1', '2', '3', '4', '5'])
      .optional()
      .describe('Business criticality: 1=Critical, 2=High, 3=Medium, 4=Low, 5=Negligible'),
  })
);
export type CreateSecurityIncidentInput = z.infer<typeof CreateSecurityIncidentInputSchema>;

export const CreateEventInputSchema = lazySchema(() =>
  z.object({
    source: z
      .string()
      .max(200)
      .describe('Event source system (e.g., "Elastic", "monitoring-agent")'),
    type: z
      .string()
      .max(200)
      .describe('Event type or category (e.g., "high_cpu", "disk_full", "service_down")'),
    node: z
      .string()
      .max(200)
      .optional()
      .describe('Hostname or IP address of the affected node or device'),
    resource: z
      .string()
      .max(200)
      .optional()
      .describe('Affected resource name (disk partition, CPU core, service name)'),
    metric_name: z
      .string()
      .max(200)
      .optional()
      .describe('Name of the metric that triggered the event'),
    value: z
      .string()
      .max(200)
      .optional()
      .describe('Current metric value at the time of the event (e.g., "95.2")'),
    severity: z
      .enum(['0', '1', '2', '3', '4', '5'])
      .optional()
      .describe('Severity: 0=Clear, 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info'),
    description: z.string().max(4000).optional().describe('Detailed description of the event'),
    message_key: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Unique key for deduplication: events with the same source, node, type, and message_key ' +
          'update the existing alert instead of creating a new one'
      ),
    additional_info: z
      .record(z.string().max(200), z.string().max(2000))
      .optional()
      .refine((v) => !v || Object.keys(v).length <= 50, {
        message: 'Maximum 50 additional_info entries',
      })
      .describe('Extra key-value metadata to attach to the event (serialized to JSON internally)'),
  })
);
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const UploadAttachmentInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .max(200)
      .describe('The ServiceNow table to attach the file to (e.g., incident, change_request)'),
    tableSysId: z.string().max(200).describe('The sys_id of the record to attach the file to'),
    fileName: z
      .string()
      .max(255)
      .describe('Name of the file including extension (e.g., screenshot.png, report.pdf)'),
    contentType: z
      .string()
      .max(200)
      .describe('MIME type of the file (e.g., application/pdf, image/png, text/plain)'),
    base64Content: z
      .string()
      .max(10_000_000)
      .describe(
        'Base64-encoded file content. WARNING: Avoid files larger than 5MB — large payloads ' +
          'may exceed connector limits and degrade performance.'
      ),
  })
);
export type UploadAttachmentInput = z.infer<typeof UploadAttachmentInputSchema>;

export const DeleteRecordInputSchema = lazySchema(() =>
  z.object({
    table: z
      .string()
      .max(200)
      .describe('The ServiceNow table to delete a record from (e.g., incident, change_request)'),
    sysId: z.string().max(200).describe('The sys_id of the record to permanently delete'),
  })
);
export type DeleteRecordInput = z.infer<typeof DeleteRecordInputSchema>;

export const GetChoicesInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .max(200)
      .describe(
        'The ServiceNow table to get choices for (e.g., incident, change_request, sn_si_incident)'
      ),
    fieldName: z
      .string()
      .max(200)
      .describe(
        'The field name to get choices for (e.g., state, close_code, category, impact, urgency, priority)'
      ),
    language: z
      .string()
      .max(10)
      .optional()
      .default('en')
      .describe('Language code for choice labels (default: en)'),
  })
);
export type GetChoicesInput = z.infer<typeof GetChoicesInputSchema>;

export const QueryUsersInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Search text to filter users by name, email, or username. Omit to list recent users.'
      ),
    limit: z.number().default(20).describe('Maximum number of users to return (default: 20)'),
    offset: z.number().optional().describe('Offset for pagination'),
  })
);
export type QueryUsersInput = z.infer<typeof QueryUsersInputSchema>;
