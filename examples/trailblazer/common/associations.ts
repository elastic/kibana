/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { ALERTS_INDEX_PATTERN, EVENT_LOG_INDEX_PATTERN } from '.';
import { kqlEquals, kqlValue } from './kql';
import type { SavedObjectAssociation, SavedObjectTarget } from './saved_objects';

export const RULE_SAVED_OBJECT_TYPE = 'alert';
export const TASK_SAVED_OBJECT_TYPE = 'task';
const TASK_ID_FIELD = 'kibana.task.id';

/** Saved object ids held in attributes rather than in `references`. */
export interface ImplicitReference {
  readonly name: string;
  readonly type: string;
  readonly id: string;
  readonly space?: string;
}

const TASK_PARAM_REFERENCES: ReadonlyArray<{ param: string; type: string }> = [
  { param: 'alertId', type: RULE_SAVED_OBJECT_TYPE },
  { param: 'actionTaskParamsId', type: 'action_task_params' },
  { param: 'adHocRunParamsId', type: 'ad_hoc_run_params' },
];

/** Finds references that saved objects of `type` keep in attributes, such as a rule's task id. */
export function findImplicitReferences(type: string, attributes: unknown): ImplicitReference[] {
  if (type === RULE_SAVED_OBJECT_TYPE) {
    return strings(collect(attributes, 'scheduledTaskId')).map((id) => ({
      name: 'scheduledTaskId',
      type: TASK_SAVED_OBJECT_TYPE,
      id,
    }));
  }
  if (type === TASK_SAVED_OBJECT_TYPE) {
    const params = parseJsonObject(collect(attributes, 'params')[0]);
    const [space] = strings(collect(params, 'spaceId'));
    return TASK_PARAM_REFERENCES.flatMap(({ param, type: targetType }) =>
      strings(collect(params, param)).map((id) => ({
        name: `params.${param}`,
        type: targetType,
        id,
        space,
      }))
    );
  }
  return [];
}

const jsonParseMemoMap = new Map<string, unknown>();

function parseJsonObject(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (jsonParseMemoMap.has(value)) {
    return jsonParseMemoMap.get(value);
  }
  try {
    const parsed = JSON.parse(value);
    jsonParseMemoMap.set(value, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

/** Alert document fields that hold the ids of saved objects of a given type. */
export const ALERT_FIELDS_BY_SAVED_OBJECT_TYPE: Readonly<
  Record<string, { field: string; label: string }>
> = {
  [RULE_SAVED_OBJECT_TYPE]: { field: ALERT_RULE_UUID, label: 'Alerts created by this rule' },
  'maintenance-window': {
    field: ALERT_MAINTENANCE_WINDOW_IDS,
    label: 'Alerts affected by this maintenance window',
  },
  cases: { field: ALERT_CASE_IDS, label: 'Alerts attached to this case' },
};

const SAVED_OBJECT_TYPES_BY_ALERT_FIELD: ReadonlyArray<{
  field: string;
  type: string;
  label: string;
}> = [
  { field: ALERT_RULE_UUID, type: RULE_SAVED_OBJECT_TYPE, label: 'Rule' },
  { field: ALERT_MAINTENANCE_WINDOW_IDS, type: 'maintenance-window', label: 'Maintenance window' },
  { field: ALERT_CASE_IDS, type: 'cases', label: 'Case' },
];

export function eventLogQueryForSavedObject(type: string, id: string): string {
  return `kibana.saved_objects:{ type: ${kqlValue(type)} and id: ${kqlValue(id)} }`;
}

/**
 * The event log and alert searches associated with a saved object. `taskId` is the id of a
 * task the object runs as, such as a rule's scheduled task.
 */
export function savedObjectAssociations(
  type: string,
  id: string,
  taskId?: string
): SavedObjectAssociation[] {
  const associations: SavedObjectAssociation[] = [
    {
      kind: 'event_log',
      label: 'Event log entries referencing this object',
      index: EVENT_LOG_INDEX_PATTERN,
      query: eventLogQueryForSavedObject(type, id),
    },
  ];
  if (type === TASK_SAVED_OBJECT_TYPE) {
    associations.push({
      kind: 'event_log',
      label: 'Task Manager event log entries for this task',
      index: EVENT_LOG_INDEX_PATTERN,
      query: kqlEquals(TASK_ID_FIELD, id),
    });
  } else if (taskId) {
    associations.push({
      kind: 'event_log',
      label: 'Task Manager event log entries for its task',
      index: EVENT_LOG_INDEX_PATTERN,
      query: kqlEquals(TASK_ID_FIELD, taskId),
    });
  }
  const alertField = ALERT_FIELDS_BY_SAVED_OBJECT_TYPE[type];
  if (alertField) {
    associations.push({
      kind: 'alerts',
      label: alertField.label,
      index: ALERTS_INDEX_PATTERN,
      query: kqlEquals(alertField.field, id),
    });
  }
  return associations;
}

export type DocumentAssociation =
  | { readonly kind: 'saved_object'; readonly label: string; readonly target: SavedObjectTarget }
  | {
      readonly kind: 'search';
      readonly label: string;
      readonly index: string;
      readonly query: string;
    };

/** Finds the saved objects and related searches referenced by an event log or alert document. */
export function findDocumentAssociations(source: Record<string, unknown>): DocumentAssociation[] {
  const associations = new Map<string, DocumentAssociation>();
  function add(key: string, association: DocumentAssociation) {
    if (!associations.has(key)) associations.set(key, association);
  }

  for (const entry of collect(source, 'kibana.saved_objects')) {
    const [type] = strings(collect(entry, 'type'));
    const [id] = strings(collect(entry, 'id'));
    const [space] = strings(collect(entry, 'namespace'));
    const [rel] = strings(collect(entry, 'rel'));
    if (!type || !id) continue;
    add(`so:${type}:${id}`, {
      kind: 'saved_object',
      label: rel === 'primary' ? `Primary ${type}` : `Related ${type}`,
      target: { type, id, space },
    });
  }

  for (const id of strings(collect(source, TASK_ID_FIELD))) {
    add(`so:${TASK_SAVED_OBJECT_TYPE}:${id}`, {
      kind: 'saved_object',
      label: 'Task',
      target: { type: TASK_SAVED_OBJECT_TYPE, id },
    });
  }

  const [alertSpace] = strings(collect(source, SPACE_IDS));
  for (const { field, type, label } of SAVED_OBJECT_TYPES_BY_ALERT_FIELD) {
    for (const id of strings(collect(source, field))) {
      add(`so:${type}:${id}`, {
        kind: 'saved_object',
        label,
        target: { type, id, space: alertSpace },
      });
    }
  }

  for (const uuid of strings(collect(source, ALERT_RULE_EXECUTION_UUID))) {
    const query = kqlEquals(ALERT_RULE_EXECUTION_UUID, uuid);
    add(`events:${uuid}`, {
      kind: 'search',
      label: 'Event log entries for this rule execution',
      index: EVENT_LOG_INDEX_PATTERN,
      query,
    });
    add(`alerts:${uuid}`, {
      kind: 'search',
      label: 'Alerts from this rule execution',
      index: ALERTS_INDEX_PATTERN,
      query,
    });
  }

  return [...associations.values()];
}

/** Collects the values at a dotted path, accepting both nested objects and dotted keys, and expanding arrays. */
export function collect(value: unknown, path: string): unknown[] {
  const out: unknown[] = [];
  visit(value, path === '' ? [] : path.split('.'), out);
  return out;
}

function visit(value: unknown, path: readonly string[], out: unknown[]) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, path, out);
    return;
  }
  if (path.length === 0) {
    out.push(value);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const parts = key.split('.');
    if (parts.length <= path.length && parts.every((part, i) => part === path[i])) {
      visit(child, path.slice(parts.length), out);
    }
  }
}

function strings(values: readonly unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value !== '');
}
