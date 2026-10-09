/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorIngressContext, HandleEventsResult } from '../../connector_spec_events';
import { buildEventId } from '../../event_type_id';
import { SPECS_ALLOWED_EVENTS } from '../../specs_allowed_events';
import { validateEmittedEvents } from '../../validate_emitted_events';
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
  SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
  SERVICENOW_WORK_NOTE_ADDED_EVENT_ID,
  SERVICENOW_WORK_NOTE_ADDED_EVENT_KEY,
} from './constants';
import { ServicenowSearch } from './servicenow_search';

const NAMED_SERVICENOW_EVENTS = [
  [SERVICENOW_INCIDENT_CREATED_EVENT_KEY, SERVICENOW_INCIDENT_CREATED_EVENT_ID],
  [SERVICENOW_INCIDENT_UPDATED_EVENT_KEY, SERVICENOW_INCIDENT_UPDATED_EVENT_ID],
  [SERVICENOW_INCIDENT_RESOLVED_EVENT_KEY, SERVICENOW_INCIDENT_RESOLVED_EVENT_ID],
  [SERVICENOW_COMMENT_ADDED_EVENT_KEY, SERVICENOW_COMMENT_ADDED_EVENT_ID],
  [SERVICENOW_WORK_NOTE_ADDED_EVENT_KEY, SERVICENOW_WORK_NOTE_ADDED_EVENT_ID],
  [
    SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_KEY,
    SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_ID,
  ],
] as const;

const SYS_ID = '46b66a40a9fe198101d44d884e7d3a1a';
const SYS_UPDATED_ON = '2026-01-01 12:00:00';

describe('ServiceNow inbound events', () => {
  const { events } = ServicenowSearch;
  if (events === undefined) {
    throw new Error('ServiceNow must declare events');
  }

  const createContext = (rawBody: unknown): ConnectorIngressContext => ({
    spaceId: 'default',
    log: loggerMock.create(),
    connectorId: 'servicenow-connector',
    connectorTypeId: SERVICENOW_SEARCH_CONNECTOR_TYPE_ID,
    config: {},
    rawBody,
  });

  const expectEmit = (result: HandleEventsResult) => {
    expect(result.type).toBe('emit');
    if (result.type !== 'emit') {
      throw new Error('expected emit');
    }
    return result;
  };

  it('declares the named catalog and not any', () => {
    expect(SPECS_ALLOWED_EVENTS.has(SERVICENOW_SEARCH_CONNECTOR_TYPE_ID)).toBe(true);
    expect(Object.keys(events.definitions).sort()).toEqual(
      NAMED_SERVICENOW_EVENTS.map(([key]) => key).sort()
    );
    expect(events.definitions.any).toBeUndefined();

    for (const [eventKey, eventId] of NAMED_SERVICENOW_EVENTS) {
      expect(events.definitions[eventKey]?.eventId).toBe(eventId);
      expect(eventId).toBe(buildEventId(SERVICENOW_SEARCH_CONNECTOR_TYPE_ID, eventKey));
    }
    expect(SERVICENOW_INCIDENT_CREATED_EVENT_ID).toBe('servicenow_search.incident_created');
  });

  it('emits an incident created event with optional fields', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_INCIDENT_CREATED,
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          summary: 'VPN is down',
          state: '1',
          priority: '2',
          assignment_group: 'group-1',
          assigned_to: 'user-1',
          sys_updated_on: SYS_UPDATED_ON,
        })
      )
    );

    expect(result.events).toEqual([
      {
        eventId: SERVICENOW_INCIDENT_CREATED_EVENT_ID,
        correlationKey: `${SYS_ID}:${SERVICENOW_OCCURRENCE_INCIDENT_CREATED}:${SYS_UPDATED_ON}`,
        payload: {
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          summary: 'VPN is down',
          state: '1',
          priority: '2',
          assignment_group: 'group-1',
          assigned_to: 'user-1',
        },
      },
    ]);
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('omits optional incident fields that ServiceNow did not send', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_INCIDENT_CREATED,
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          summary: '',
          sys_updated_on: SYS_UPDATED_ON,
        })
      )
    );

    expect(result.events[0]?.payload).toEqual({
      table: 'incident',
      sys_id: SYS_ID,
      number: 'INC0010001',
    });
  });

  it('emits an incident update with changed fields and does not treat it as resolved', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_INCIDENT_UPDATED,
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          state: '6',
          changed_fields: [
            { field: '', previous: '1' },
            'not-a-field',
            { previous: '1', current: '2' },
            { field: 'priority', previous: '3', current: '1' },
          ],
          sys_updated_on: SYS_UPDATED_ON,
        })
      )
    );

    expect(result.events).toEqual([
      {
        eventId: SERVICENOW_INCIDENT_UPDATED_EVENT_ID,
        correlationKey: `${SYS_ID}:${SERVICENOW_OCCURRENCE_INCIDENT_UPDATED}:${SYS_UPDATED_ON}`,
        payload: {
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          changed_fields: [{ field: 'priority', previous: '3', current: '1' }],
        },
      },
    ]);
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('keeps an incident update when changed fields are absent', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_INCIDENT_UPDATED,
          table: 'incident',
          sys_id: SYS_ID,
          changed_fields: 'priority',
          sys_updated_on: SYS_UPDATED_ON,
        })
      )
    );

    expect(result.events[0]?.eventId).toBe(SERVICENOW_INCIDENT_UPDATED_EVENT_ID);
    expect(result.events[0]?.payload).toEqual({
      table: 'incident',
      sys_id: SYS_ID,
    });
  });

  it('caps changed fields at 20', async () => {
    const changedFields = Array.from({ length: 21 }, (_, index) => ({
      field: `field_${index}`,
      previous: 'a',
      current: 'b',
    }));
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_INCIDENT_UPDATED,
          table: 'incident',
          sys_id: SYS_ID,
          changed_fields: changedFields,
          sys_updated_on: SYS_UPDATED_ON,
        })
      )
    );

    const payload = result.events[0]?.payload as { changed_fields: Array<{ field: string }> };
    expect(payload.changed_fields).toHaveLength(20);
    expect(payload.changed_fields[0]?.field).toBe('field_0');
    expect(payload.changed_fields[19]?.field).toBe('field_19');
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('emits incident resolved or closed as its own event', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED,
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          state: '7',
          close_code: 'Solved (Permanently)',
          close_notes: 'Restarted the VPN gateway.',
          changed_fields: [{ field: 'state', previous: '2', current: '7' }],
          sys_updated_on: SYS_UPDATED_ON,
        })
      )
    );

    expect(result.events).toEqual([
      {
        eventId: SERVICENOW_INCIDENT_RESOLVED_EVENT_ID,
        correlationKey: `${SYS_ID}:${SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED}:${SYS_UPDATED_ON}`,
        payload: {
          table: 'incident',
          sys_id: SYS_ID,
          number: 'INC0010001',
          state: '7',
          close_code: 'Solved (Permanently)',
          close_notes: 'Restarted the VPN gateway.',
        },
      },
    ]);
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it.each([
    [
      'comment',
      SERVICENOW_OCCURRENCE_COMMENT_ADDED,
      SERVICENOW_COMMENT_ADDED_EVENT_ID,
      'Caller can see this.',
    ],
    [
      'work note',
      SERVICENOW_OCCURRENCE_WORK_NOTE_ADDED,
      SERVICENOW_WORK_NOTE_ADDED_EVENT_ID,
      'Internal triage note.',
    ],
  ])(
    'emits a %s without treating it as an incident update',
    async (_label, occurrence, eventId, text) => {
      const result = expectEmit(
        await events.handleEvents(
          createContext({
            occurrence,
            table: 'incident',
            sys_id: SYS_ID,
            number: 'INC0010001',
            journal_entry_id: 'journal-1',
            author: 'user-1',
            text,
            timestamp: SYS_UPDATED_ON,
          })
        )
      );

      expect(result.events).toEqual([
        {
          eventId,
          correlationKey: 'journal-1',
          payload: {
            table: 'incident',
            sys_id: SYS_ID,
            number: 'INC0010001',
            journal_entry_id: 'journal-1',
            author: 'user-1',
            text,
            timestamp: SYS_UPDATED_ON,
          },
        },
      ]);
      expect(result.events[0]?.eventId).not.toBe(SERVICENOW_INCIDENT_UPDATED_EVENT_ID);
      expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
    }
  );

  it('emits a change approval state change separately from incident events', async () => {
    const result = expectEmit(
      await events.handleEvents(
        createContext({
          occurrence: SERVICENOW_OCCURRENCE_CHANGE_APPROVAL_STATE_CHANGED,
          change_request_id: 'change-1',
          approval_id: 'approval-1',
          approver: 'user-1',
          previous_state: 'requested',
          state: 'approved',
        })
      )
    );

    expect(result.events).toEqual([
      {
        eventId: SERVICENOW_CHANGE_APPROVAL_STATE_CHANGED_EVENT_ID,
        correlationKey: 'approval-1:approved',
        payload: {
          change_request_id: 'change-1',
          approval_id: 'approval-1',
          approver: 'user-1',
          previous_state: 'requested',
          state: 'approved',
        },
      },
    ]);
    expect(result.events[0]?.eventId).not.toBe(SERVICENOW_INCIDENT_UPDATED_EVENT_ID);
    expect(validateEmittedEvents(events.definitions, result.events)).toEqual({ ok: true });
  });

  it('assigns a new correlation key when an incident omits sys_updated_on', async () => {
    const rawBody = {
      occurrence: SERVICENOW_OCCURRENCE_INCIDENT_CREATED,
      table: 'incident',
      sys_id: SYS_ID,
      number: 'INC0010001',
    };
    const first = expectEmit(await events.handleEvents(createContext(rawBody)));
    const second = expectEmit(await events.handleEvents(createContext(rawBody)));

    expect(first.events[0]?.correlationKey).toEqual(expect.any(String));
    expect(first.events[0]?.correlationKey).not.toBe(second.events[0]?.correlationKey);
  });

  it.each([
    ['non-object body', null],
    ['unknown occurrence', { occurrence: 'problem.created', table: 'problem', sys_id: SYS_ID }],
    [
      'incident created without a number',
      { occurrence: SERVICENOW_OCCURRENCE_INCIDENT_CREATED, table: 'incident', sys_id: SYS_ID },
    ],
    [
      'incident updated without a table',
      { occurrence: SERVICENOW_OCCURRENCE_INCIDENT_UPDATED, sys_id: SYS_ID },
    ],
    [
      'incident resolved without a state',
      {
        occurrence: SERVICENOW_OCCURRENCE_INCIDENT_RESOLVED,
        table: 'incident',
        sys_id: SYS_ID,
        close_notes: 'done',
      },
    ],
    [
      'comment without text',
      {
        occurrence: SERVICENOW_OCCURRENCE_COMMENT_ADDED,
        table: 'incident',
        sys_id: SYS_ID,
        journal_entry_id: 'journal-1',
        author: 'user-1',
      },
    ],
    [
      'work note without an author',
      {
        occurrence: SERVICENOW_OCCURRENCE_WORK_NOTE_ADDED,
        table: 'incident',
        sys_id: SYS_ID,
        journal_entry_id: 'journal-1',
        text: 'internal',
      },
    ],
    [
      'approval without a change request',
      {
        occurrence: SERVICENOW_OCCURRENCE_CHANGE_APPROVAL_STATE_CHANGED,
        approval_id: 'approval-1',
        state: 'approved',
      },
    ],
  ])('does not emit for %s', async (_label, rawBody) => {
    await expect(events.handleEvents(createContext(rawBody))).resolves.toEqual({
      type: 'emit',
      events: [],
    });
  });
});
