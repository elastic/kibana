/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { sortTriggerEventRows } from './trigger_event_table_sort';

const row = (id: string, flattened: Record<string, unknown>) =>
  ({ id, raw: { _id: id }, flattened } as DataTableRecord);

describe('sortTriggerEventRows', () => {
  const rows = [
    row('1', { '@timestamp': '2026-10-06T10:00:00.000Z', triggerId: 'b' }),
    row('2', { '@timestamp': '2026-10-06T12:00:00.000Z', triggerId: 'a' }),
    row('3', { '@timestamp': '2026-10-06T11:00:00.000Z', triggerId: 'b' }),
  ];

  it('sorts by a column, descending', () => {
    expect(sortTriggerEventRows(rows, [['@timestamp', 'desc']]).map(({ id }) => id)).toEqual([
      '2',
      '3',
      '1',
    ]);
  });

  it('sorts by the next column on ties', () => {
    expect(
      sortTriggerEventRows(rows, [
        ['triggerId', 'asc'],
        ['@timestamp', 'asc'],
      ]).map(({ id }) => id)
    ).toEqual(['2', '1', '3']);
  });

  it('keeps the rows without a sort', () => {
    expect(sortTriggerEventRows(rows, [])).toBe(rows);
  });
});
