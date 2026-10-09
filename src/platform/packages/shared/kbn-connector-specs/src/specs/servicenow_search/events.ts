/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConnectorIngressContext,
  ConnectorSpecEvents,
  HandleEventsResult,
} from '../../connector_spec_events';
import { MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH } from '../../handle_events_result';
import {
  SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_ID,
  SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_KEY,
  SERVICENOW_COMMENT_ADDED_EVENT_ID,
  SERVICENOW_COMMENT_ADDED_EVENT_KEY,
  SERVICENOW_INCIDENT_CREATED_EVENT_ID,
  SERVICENOW_INCIDENT_CREATED_EVENT_KEY,
  SERVICENOW_INCIDENT_RESOLVED_EVENT_ID,
  SERVICENOW_INCIDENT_RESOLVED_EVENT_KEY,
  SERVICENOW_INCIDENT_UPDATED_EVENT_ID,
  SERVICENOW_INCIDENT_UPDATED_EVENT_KEY,
  SERVICENOW_OCCURRENCE_CHANGE_APPROVAL_STATE_CHANGED,
  SERVICENOW_OCCURRENCE_COMMENT_ADDED,
  SERVICENOW_OCCURRENCE_INCIDENT_CREATED,
  SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED,
  SERVICENOW_OCCURRENCE_INCIDENT_UPDATED,
  SERVICENOW_OCCURRENCE_WORK_NOTE_ADDED,
  SERVICENOW_WORK_NOTE_ADDED_EVENT_ID,
  SERVICENOW_WORK_NOTE_ADDED_EVENT_KEY,
} from './constants';

const SERVICENOW_ID_MAX = 128;
const SERVICENOW_VALUE_MAX = 1024;
const SERVICENOW_TEXT_MAX = 40_000;
const SERVICENOW_CHANGED_FIELDS_MAX = 20;
const SERVICENOW_OCCURRENCE_MAX = 64;

const snId = (description: string) =>
  z.string().min(1).max(SERVICENOW_ID_MAX).describe(description);

const optionalSnId = (description: string) => snId(description).optional();

const optionalSnValue = (description: string) =>
  z.string().min(1).max(SERVICENOW_VALUE_MAX).optional().describe(description);

const ChangedFieldSchema = z.object({
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
});

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

interface ChangedField {
  readonly field: string;
  readonly previous?: string;
  readonly current?: string;
}

interface ParsedServicenowEvent {
  readonly eventId: string;
  readonly correlationKey: string;
  readonly payload: Record<string, unknown>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readBoundedString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    return undefined;
  }
  return value;
};

const readId = (value: unknown): string | undefined => readBoundedString(value, SERVICENOW_ID_MAX);

const readValue = (value: unknown): string | undefined =>
  readBoundedString(value, SERVICENOW_VALUE_MAX);

const readText = (value: unknown): string | undefined =>
  readBoundedString(value, SERVICENOW_TEXT_MAX);

const omitUndefined = (fields: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(fields).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );

const boundedCorrelationKey = (value: string): string =>
  value.length <= MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH ? value : uuidv4();

const incidentCorrelationKey = (
  body: Record<string, unknown>,
  sysId: string,
  occurrence: string
): string => {
  const sysUpdatedOn = readId(body.sys_updated_on);
  if (sysUpdatedOn === undefined) {
    return uuidv4();
  }
  return boundedCorrelationKey(`${sysId}:${occurrence}:${sysUpdatedOn}`);
};

const readChangedFields = (value: unknown): ChangedField[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const fields = value
    .filter(isPlainObject)
    .flatMap((entry) => {
      const field = readId(entry.field);
      if (field === undefined) {
        return [];
      }
      const previous = readValue(entry.previous);
      const current = readValue(entry.current);
      const changed: ChangedField = {
        field,
        ...(previous !== undefined ? { previous } : {}),
        ...(current !== undefined ? { current } : {}),
      };
      return [changed];
    })
    .slice(0, SERVICENOW_CHANGED_FIELDS_MAX);
  return fields.length > 0 ? fields : undefined;
};

const parseIncidentCreated = (body: Record<string, unknown>): ParsedServicenowEvent | undefined => {
  const table = readId(body.table);
  const sysId = readId(body.sys_id);
  const number = readId(body.number);
  if (table === undefined || sysId === undefined || number === undefined) {
    return undefined;
  }
  return {
    eventId: SERVICENOW_INCIDENT_CREATED_EVENT_ID,
    correlationKey: incidentCorrelationKey(body, sysId, SERVICENOW_OCCURRENCE_INCIDENT_CREATED),
    payload: omitUndefined({
      table,
      sys_id: sysId,
      number,
      summary: readValue(body.summary),
      state: readValue(body.state),
      priority: readValue(body.priority),
      assignment_group: readId(body.assignment_group),
      assigned_to: readId(body.assigned_to),
    }),
  };
};

const parseIncidentUpdated = (body: Record<string, unknown>): ParsedServicenowEvent | undefined => {
  const table = readId(body.table);
  const sysId = readId(body.sys_id);
  if (table === undefined || sysId === undefined) {
    return undefined;
  }
  const changedFields = readChangedFields(body.changed_fields);
  return {
    eventId: SERVICENOW_INCIDENT_UPDATED_EVENT_ID,
    correlationKey: incidentCorrelationKey(body, sysId, SERVICENOW_OCCURRENCE_INCIDENT_UPDATED),
    payload: {
      ...omitUndefined({
        table,
        sys_id: sysId,
        number: readId(body.number),
      }),
      ...(changedFields !== undefined ? { changed_fields: changedFields } : {}),
    },
  };
};

const parseIncidentResolved = (
  body: Record<string, unknown>
): ParsedServicenowEvent | undefined => {
  const table = readId(body.table);
  const sysId = readId(body.sys_id);
  const state = readValue(body.state);
  if (table === undefined || sysId === undefined || state === undefined) {
    return undefined;
  }
  return {
    eventId: SERVICENOW_INCIDENT_RESOLVED_EVENT_ID,
    correlationKey: incidentCorrelationKey(body, sysId, SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED),
    payload: omitUndefined({
      table,
      sys_id: sysId,
      state,
      number: readId(body.number),
      close_code: readValue(body.close_code),
      close_notes: readText(body.close_notes),
    }),
  };
};

const parseJournal = (
  body: Record<string, unknown>,
  eventId: string
): ParsedServicenowEvent | undefined => {
  const table = readId(body.table);
  const sysId = readId(body.sys_id);
  const journalEntryId = readId(body.journal_entry_id);
  const author = readValue(body.author);
  const text = readText(body.text);
  if (
    table === undefined ||
    sysId === undefined ||
    journalEntryId === undefined ||
    author === undefined ||
    text === undefined
  ) {
    return undefined;
  }
  return {
    eventId,
    correlationKey: journalEntryId,
    payload: omitUndefined({
      table,
      sys_id: sysId,
      journal_entry_id: journalEntryId,
      author,
      text,
      number: readId(body.number),
      timestamp: readValue(body.timestamp),
    }),
  };
};

const parseChangeApproval = (body: Record<string, unknown>): ParsedServicenowEvent | undefined => {
  const changeRequestId = readId(body.change_request_id);
  const approvalId = readId(body.approval_id);
  const state = readValue(body.state);
  if (changeRequestId === undefined || approvalId === undefined || state === undefined) {
    return undefined;
  }
  return {
    eventId: SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_ID,
    correlationKey: boundedCorrelationKey(`${approvalId}:${state}`),
    payload: omitUndefined({
      change_request_id: changeRequestId,
      approval_id: approvalId,
      state,
      approver: readId(body.approver),
      previous_state: readValue(body.previous_state),
    }),
  };
};

const parseByOccurrence: Record<
  string,
  (body: Record<string, unknown>) => ParsedServicenowEvent | undefined
> = {
  [SERVICENOW_OCCURRENCE_INCIDENT_CREATED]: parseIncidentCreated,
  [SERVICENOW_OCCURRENCE_INCIDENT_UPDATED]: parseIncidentUpdated,
  [SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED]: parseIncidentResolved,
  [SERVICENOW_OCCURRENCE_COMMENT_ADDED]: (body) =>
    parseJournal(body, SERVICENOW_COMMENT_ADDED_EVENT_ID),
  [SERVICENOW_OCCURRENCE_WORK_NOTE_ADDED]: (body) =>
    parseJournal(body, SERVICENOW_WORK_NOTE_ADDED_EVENT_ID),
  [SERVICENOW_OCCURRENCE_CHANGE_APPROVAL_STATE_CHANGED]: parseChangeApproval,
};

const parseServicenowOccurrence = (
  body: Record<string, unknown>
): ParsedServicenowEvent | undefined => {
  const occurrence = readBoundedString(body.occurrence, SERVICENOW_OCCURRENCE_MAX);
  if (occurrence === undefined) {
    return undefined;
  }
  const parse = parseByOccurrence[occurrence];
  if (parse === undefined) {
    return undefined;
  }
  return parse(body);
};

const handleServicenowEvents = async (
  ctx: ConnectorIngressContext
): Promise<HandleEventsResult> => {
  if (!isPlainObject(ctx.rawBody)) {
    return { type: 'emit', events: [] };
  }
  const parsed = parseServicenowOccurrence(ctx.rawBody);
  if (parsed === undefined) {
    return { type: 'emit', events: [] };
  }
  return {
    type: 'emit',
    events: [
      {
        eventId: parsed.eventId,
        correlationKey: parsed.correlationKey,
        payload: parsed.payload,
      },
    ],
  };
};

export const servicenowSearchEvents: ConnectorSpecEvents = {
  definitions: {
    [SERVICENOW_INCIDENT_CREATED_EVENT_KEY]: {
      eventId: SERVICENOW_INCIDENT_CREATED_EVENT_ID,
      title: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.incidentCreated.title',
        {
          defaultMessage: 'Incident created',
        }
      ),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.incidentCreated.description',
        {
          defaultMessage: 'An incident was created.',
        }
      ),
      eventSchema: IncidentCreatedEventSchema,
    },
    [SERVICENOW_INCIDENT_UPDATED_EVENT_KEY]: {
      eventId: SERVICENOW_INCIDENT_UPDATED_EVENT_ID,
      title: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.incidentUpdated.title',
        {
          defaultMessage: 'Incident updated',
        }
      ),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.incidentUpdated.description',
        {
          defaultMessage:
            'An incident record changed. Changed fields include previous and current values when ServiceNow sends them.',
        }
      ),
      eventSchema: IncidentUpdatedEventSchema,
    },
    [SERVICENOW_INCIDENT_RESOLVED_EVENT_KEY]: {
      eventId: SERVICENOW_INCIDENT_RESOLVED_EVENT_ID,
      title: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.incidentResolved.title',
        {
          defaultMessage: 'Incident resolved or closed',
        }
      ),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.incidentResolved.description',
        {
          defaultMessage:
            'An incident was resolved or closed. The resulting state is included, with resolution details when ServiceNow sends them.',
        }
      ),
      eventSchema: IncidentResolvedEventSchema,
    },
    [SERVICENOW_COMMENT_ADDED_EVENT_KEY]: {
      eventId: SERVICENOW_COMMENT_ADDED_EVENT_ID,
      title: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.commentAdded.title',
        {
          defaultMessage: 'Comment added',
        }
      ),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.commentAdded.description',
        {
          defaultMessage: 'A public comment was added to a record.',
        }
      ),
      eventSchema: JournalEventSchema,
    },
    [SERVICENOW_WORK_NOTE_ADDED_EVENT_KEY]: {
      eventId: SERVICENOW_WORK_NOTE_ADDED_EVENT_ID,
      title: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.workNoteAdded.title',
        {
          defaultMessage: 'Work note added',
        }
      ),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.workNoteAdded.description',
        {
          defaultMessage: 'An internal work note was added to a record.',
        }
      ),
      eventSchema: JournalEventSchema,
    },
    [SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_KEY]: {
      eventId: SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_ID,
      title: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.changeApprovalStateChanged.title',
        {
          defaultMessage: 'Change approval state changed',
        }
      ),
      description: i18n.translate(
        'core.kibanaConnectorSpecs.servicenowSearch.events.changeApprovalStateChanged.description',
        {
          defaultMessage: 'The approval state of a change request changed.',
        }
      ),
      eventSchema: ChangeApprovalStateChangedEventSchema,
    },
  },
  handleEvents: handleServicenowEvents,
};
