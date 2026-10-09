/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SortOrder } from '@kbn/unified-data-table';

/** Columns of the trigger event table; their values are built client-side, so they are sorted client-side. */
export const TRIGGER_EVENT_TABLE_SORTABLE_COLUMNS = [
  '@timestamp',
  'summary',
  'eventId',
  'triggerId',
  'spaceId',
  'subscriptions',
  'payload',
] as const;

/** Sorts the trigger event rows by their string values, in sort order. */
export const sortTriggerEventRows = (
  rows: DataTableRecord[],
  sort: SortOrder[]
): DataTableRecord[] => {
  if (!sort.length) {
    return rows;
  }
  return [...rows].sort((a, b) => {
    for (const [field, direction] of sort) {
      const result = String(a.flattened[field] ?? '').localeCompare(
        String(b.flattened[field] ?? '')
      );
      if (result !== 0) {
        return direction === 'desc' ? -result : result;
      }
    }
    return 0;
  });
};
