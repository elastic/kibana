/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';

const SERVICENOW_ID_MAX = 128;
const SERVICENOW_VALUE_MAX = 1024;
const SERVICENOW_TEXT_MAX = 40_000;
const SERVICENOW_CHANGED_FIELDS_MAX = 20;

const snId = (description: string) =>
  z.string().min(1).max(SERVICENOW_ID_MAX).describe(description);

const optionalSnId = (description: string) => snId(description).optional();

const optionalSnValue = (description: string) =>
  z.string().min(1).max(SERVICENOW_VALUE_MAX).optional().describe(description);

const ChangedFieldSchema = lazySchema(() =>
  z.object({
    field: snId('Name of the field that changed.'),
    previous: z
      .string()
      .max(SERVICENOW_VALUE_MAX)
      .optional()
      .describe('Previous value, when ServiceNow sent one.'),
    current: z
      .string()
      .max(SERVICENOW_VALUE_MAX)
      .optional()
      .describe('Current value, when ServiceNow sent one.'),
  })
);

const IncidentCreatedEventSchema = lazySchema(() =>
  z.object({
    table: snId('ServiceNow table of the record, such as incident.'),
    sys_id: snId('sys_id of the record.'),
    number: snId('Record number, such as INC0010001.'),
    summary: optionalSnValue('Short description of the record.'),
    state: optionalSnValue('State value.'),
    priority: optionalSnValue('Priority value.'),
    assignment_group: optionalSnId('sys_id of the assignment group.'),
    assigned_to: optionalSnId('sys_id of the assigned user.'),
  })
);

const IncidentUpdatedEventSchema = lazySchema(() =>
  z.object({
    table: snId('ServiceNow table of the record, such as incident.'),
    sys_id: snId('sys_id of the record.'),
    number: optionalSnId('Record number, such as INC0010001.'),
    changed_fields: z
      .array(ChangedFieldSchema)
      .max(SERVICENOW_CHANGED_FIELDS_MAX)
      .optional()
      .describe('Fields that changed, with previous and current values when ServiceNow sent them.'),
  })
);

const IncidentResolvedEventSchema = lazySchema(() =>
  z.object({
    table: snId('ServiceNow table of the record, such as incident.'),
    sys_id: snId('sys_id of the record.'),
    state: z.string().min(1).max(SERVICENOW_VALUE_MAX).describe('Resulting state value.'),
    number: optionalSnId('Record number, such as INC0010001.'),
    close_code: optionalSnValue('Resolution code, when ServiceNow sent one.'),
    close_notes: z
      .string()
      .min(1)
      .max(SERVICENOW_TEXT_MAX)
      .optional()
      .describe('Resolution notes, when ServiceNow sent them.'),
  })
);

const JournalEventSchema = lazySchema(() =>
  z.object({
    table: snId('Table of the parent record, such as incident.'),
    sys_id: snId('sys_id of the parent record.'),
    journal_entry_id: snId('sys_id of the journal entry.'),
    author: z.string().min(1).max(SERVICENOW_VALUE_MAX).describe('Author of the journal entry.'),
    text: z.string().min(1).max(SERVICENOW_TEXT_MAX).describe('Journal entry text.'),
    number: optionalSnId('Number of the parent record, when ServiceNow sent one.'),
    timestamp: optionalSnValue('When the journal entry was written.'),
  })
);

const ChangeApprovalStateChangedEventSchema = lazySchema(() =>
  z.object({
    change_request_id: snId('sys_id of the change request.'),
    approval_id: snId('sys_id of the approval record.'),
    state: z.string().min(1).max(SERVICENOW_VALUE_MAX).describe('Current approval state.'),
    approver: optionalSnId('sys_id of the approver.'),
    previous_state: optionalSnValue('Previous approval state, when ServiceNow sent one.'),
  })
);

export const servicenowSearchIncidentCreated = {
  name: 'servicenow_search.incident_created' as const,
  eventSchema: IncidentCreatedEventSchema,
};

export const servicenowSearchIncidentUpdated = {
  name: 'servicenow_search.incident_updated' as const,
  eventSchema: IncidentUpdatedEventSchema,
};

export const servicenowSearchIncidentResolved = {
  name: 'servicenow_search.incident_resolved' as const,
  eventSchema: IncidentResolvedEventSchema,
};

export const servicenowSearchCommentAdded = {
  name: 'servicenow_search.comment_added' as const,
  eventSchema: JournalEventSchema,
};

export const servicenowSearchWorkNoteAdded = {
  name: 'servicenow_search.work_note_added' as const,
  eventSchema: JournalEventSchema,
};

export const servicenowSearchChangeApprovalStateChanged = {
  name: 'servicenow_search.change_approval_state_changed' as const,
  eventSchema: ChangeApprovalStateChangedEventSchema,
};
