/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  collect,
  findDocumentAssociations,
  findImplicitReferences,
  savedObjectAssociations,
} from './associations';

describe('findImplicitReferences', () => {
  it('links a rule to its scheduled task', () => {
    expect(findImplicitReferences('alert', { name: 'r', scheduledTaskId: 't1' })).toEqual([
      { name: 'scheduledTaskId', type: 'task', id: 't1' },
    ]);
  });

  it('links a task to the objects named in its JSON params', () => {
    const params = JSON.stringify({ alertId: 'r1', spaceId: 'space-a', consumer: 'stackAlerts' });
    expect(findImplicitReferences('task', { taskType: 'alerting:.es-query', params })).toEqual([
      { name: 'params.alertId', type: 'alert', id: 'r1', space: 'space-a' },
    ]);
  });

  it('ignores unparseable task params and other types', () => {
    expect(findImplicitReferences('task', { params: '{not json' })).toEqual([]);
    expect(findImplicitReferences('dashboard', { scheduledTaskId: 't1' })).toEqual([]);
  });
});

describe('task event log associations', () => {
  it('searches task manager events by task id', () => {
    expect(savedObjectAssociations('task', 't1').map(({ query }) => query)).toEqual([
      'kibana.saved_objects:{ type: "task" and id: "t1" }',
      'kibana.task.id: "t1"',
    ]);
    expect(savedObjectAssociations('alert', 'r1', 't1').map(({ query }) => query)).toContain(
      'kibana.task.id: "t1"'
    );
  });

  it('links task manager event log documents to their task', () => {
    expect(findDocumentAssociations({ kibana: { task: { id: 't1' } } })).toEqual([
      { kind: 'saved_object', label: 'Task', target: { type: 'task', id: 't1' } },
    ]);
  });
});

describe('collect', () => {
  it('reads nested objects, dotted keys, and arrays', () => {
    const source = {
      'kibana.alert.rule.uuid': 'r1',
      kibana: { alert: { case_ids: ['c1', 'c2'] }, saved_objects: [{ id: 'a' }, { id: 'b' }] },
    };
    expect(collect(source, 'kibana.alert.rule.uuid')).toEqual(['r1']);
    expect(collect(source, 'kibana.alert.case_ids')).toEqual(['c1', 'c2']);
    expect(collect(source, 'kibana.saved_objects.id')).toEqual(['a', 'b']);
    expect(collect(source, 'missing.path')).toEqual([]);
  });
});

describe('savedObjectAssociations', () => {
  it('always includes the event log and adds alerts for rules', () => {
    expect(savedObjectAssociations('alert', 'r1')).toEqual([
      expect.objectContaining({
        kind: 'event_log',
        index: '.kibana-event-log*',
        query: 'kibana.saved_objects:{ type: "alert" and id: "r1" }',
      }),
      expect.objectContaining({
        kind: 'alerts',
        index: '.alerts-*',
        query: 'kibana.alert.rule.uuid: "r1"',
      }),
    ]);
  });

  it('only includes the event log for types that alerts do not reference', () => {
    expect(savedObjectAssociations('dashboard', 'd1').map(({ kind }) => kind)).toEqual([
      'event_log',
    ]);
  });
});

describe('findDocumentAssociations', () => {
  it('links event log documents to their saved objects and rule execution', () => {
    const associations = findDocumentAssociations({
      kibana: {
        saved_objects: [
          { rel: 'primary', type: 'alert', id: 'r1', namespace: 'space-a' },
          { type: 'action', id: 'c1' },
        ],
        alert: { rule: { execution: { uuid: 'e1' } } },
      },
    });
    expect(associations).toEqual([
      {
        kind: 'saved_object',
        label: 'Primary alert',
        target: { type: 'alert', id: 'r1', space: 'space-a' },
      },
      {
        kind: 'saved_object',
        label: 'Related action',
        target: { type: 'action', id: 'c1', space: undefined },
      },
      expect.objectContaining({
        kind: 'search',
        index: '.kibana-event-log*',
        query: 'kibana.alert.rule.execution.uuid: "e1"',
      }),
      expect.objectContaining({
        kind: 'search',
        index: '.alerts-*',
        query: 'kibana.alert.rule.execution.uuid: "e1"',
      }),
    ]);
  });

  it('links alert documents with dotted keys to their rule, maintenance windows, and cases', () => {
    const associations = findDocumentAssociations({
      'kibana.space_ids': ['default'],
      'kibana.alert.rule.uuid': 'r1',
      'kibana.alert.maintenance_window_ids': ['mw1'],
      'kibana.alert.case_ids': ['case1'],
    });
    expect(
      associations.map((association) =>
        association.kind === 'saved_object' ? association.target : association.kind
      )
    ).toEqual([
      { type: 'alert', id: 'r1', space: 'default' },
      { type: 'maintenance-window', id: 'mw1', space: 'default' },
      { type: 'cases', id: 'case1', space: 'default' },
    ]);
  });

  it('returns nothing for ordinary documents', () => {
    expect(findDocumentAssociations({ host: { name: 'web-1' } })).toEqual([]);
  });
});
