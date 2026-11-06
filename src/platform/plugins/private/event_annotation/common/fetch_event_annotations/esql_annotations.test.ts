/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { EsqlEventAnnotationOutput } from '../esql_event_annotation';
import { mergeAnnotationDatatables, toEsqlAnnotationDatatable } from './esql_annotations';

const annotation: EsqlEventAnnotationOutput = {
  type: 'esql_event_annotation',
  id: 'deployments',
  query: 'FROM deployments',
  timeColumn: 'time',
  textColumn: 'message',
  extraColumns: ['count'],
  label: 'Deployments',
  icon: 'triangle',
  color: '#FF0000',
  lineStyle: 'dashed',
  lineWidth: 3,
  textVisibility: true,
};
const datatable: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'time-id', name: 'time', meta: { type: 'date' } },
    { id: 'message-id', name: 'message', meta: { type: 'string' } },
    {
      id: 'count-id',
      name: 'count',
      meta: { type: 'number', params: { id: 'number', params: { pattern: '0.00' } } },
    },
  ],
  rows: [
    { 'time-id': '2026-01-01T01:30:00Z', 'message-id': 'Second', 'count-id': 2 },
    { 'time-id': 1767227400000, 'message-id': 'First', 'count-id': 1 },
  ],
};
const options = {
  annotation,
  datatable,
  interval: '1h',
  timezone: 'UTC',
  timeRange: { from: '2026-01-01T00:00:00Z', to: '2026-01-01T04:00:00Z' },
};

describe('toEsqlAnnotationDatatable', () => {
  it('maps result IDs to namespaced fields, sorts events, and preserves styles and formatters', () => {
    const result = toEsqlAnnotationDatatable(options);

    expect(result.rows).toEqual([
      expect.objectContaining({
        id: 'deployments',
        type: 'point',
        time: '2026-01-01T00:30:00.000Z',
        timebucket: '2026-01-01T00:00:00.000Z',
        label: 'Deployments',
        color: '#FF0000',
        lineStyle: 'dashed',
        lineWidth: 3,
        textVisibility: true,
        textField: '["deployments","message"]',
        'field:["deployments","message"]': 'First',
        'field:["deployments","count"]': 1,
      }),
      expect.objectContaining({
        time: '2026-01-01T01:30:00.000Z',
        timebucket: '2026-01-01T01:00:00.000Z',
        'field:["deployments","message"]': 'Second',
        'field:["deployments","count"]': 2,
      }),
    ]);
    expect(result.columns).toContainEqual({
      ...datatable.columns[2],
      id: 'field:["deployments","count"]',
    });
  });

  it('returns an empty table with column metadata when the query has no events', () => {
    const result = toEsqlAnnotationDatatable({ ...options, datatable: { ...datatable, rows: [] } });
    expect(result.rows).toEqual([]);
    expect(result.columns).toContainEqual(
      expect.objectContaining({ id: 'field:["deployments","message"]' })
    );
  });

  it('clips points to the chart time range', () => {
    const result = toEsqlAnnotationDatatable({
      ...options,
      timeRange: { from: '2026-01-01T01:00:00Z', to: '2026-01-01T02:00:00Z' },
    });
    expect(result.rows.map(({ time }) => time)).toEqual(['2026-01-01T01:30:00.000Z']);
  });

  it('keeps overlapping ranges and assigns unique IDs to multiple events from one config', () => {
    const result = toEsqlAnnotationDatatable({
      ...options,
      annotation: { ...annotation, endTimeColumn: 'end', outside: true },
      datatable: {
        ...datatable,
        columns: [...datatable.columns, { id: 'end-id', name: 'end', meta: { type: 'date' } }],
        rows: [
          {
            ...datatable.rows[0],
            'time-id': '2025-12-31T23:00:00Z',
            'end-id': '2026-01-01T01:00:00Z',
          },
          { ...datatable.rows[1], 'end-id': '2026-01-01T05:00:00Z' },
        ],
      },
    });
    expect(
      result.rows.map(({ id, type, time, endTime, outside }) => ({
        id,
        type,
        time,
        endTime,
        outside,
      }))
    ).toEqual([
      {
        id: 'deployments:0',
        type: 'range',
        time: '2025-12-31T23:00:00.000Z',
        endTime: '2026-01-01T01:00:00.000Z',
        outside: true,
      },
      {
        id: 'deployments:1',
        type: 'range',
        time: '2026-01-01T00:30:00.000Z',
        endTime: '2026-01-01T05:00:00.000Z',
        outside: true,
      },
    ]);
  });

  it.each(['missing', 'message'])('rejects missing or non-date time columns: %s', (timeColumn) => {
    expect(() =>
      toEsqlAnnotationDatatable({ ...options, annotation: { ...annotation, timeColumn } })
    ).toThrow(`column ${timeColumn} is missing or has an incompatible type`);
  });

  it.each([null, 'not-a-date'])('skips rows with invalid timestamps: %s', (time) => {
    const result = toEsqlAnnotationDatatable({
      ...options,
      datatable: {
        ...datatable,
        rows: [{ ...datatable.rows[0], 'time-id': time }, datatable.rows[1]],
      },
    });
    expect(result.rows.map(({ time: rowTime }) => rowTime)).toEqual(['2026-01-01T00:30:00.000Z']);
  });

  it.each([null, '2026-01-01T00:00:00Z'])(
    'skips ranges with an invalid or earlier end: %s',
    (end) => {
      const result = toEsqlAnnotationDatatable({
        ...options,
        annotation: { ...annotation, endTimeColumn: 'end' },
        datatable: {
          ...datatable,
          columns: [...datatable.columns, { id: 'end-id', name: 'end', meta: { type: 'date' } }],
          rows: [
            { ...datatable.rows[0], 'end-id': end },
            { ...datatable.rows[1], 'end-id': '2026-01-01T03:00:00Z' },
          ],
        },
      });
      expect(result.rows.map(({ id }) => id)).toEqual(['deployments:1']);
    }
  );

  it('fails on missing text or tooltip columns like missing DSL annotation fields', () => {
    expect(() =>
      toEsqlAnnotationDatatable({
        ...options,
        annotation: { ...annotation, extraColumns: ['gone'] },
      })
    ).toThrow('column gone is missing or has an incompatible type');
  });

  it('limits points per bucket and carries skipped counts through merging with manual annotations', () => {
    const result = toEsqlAnnotationDatatable({
      ...options,
      datatable: {
        ...datatable,
        rows: Array.from({ length: 12 }, (_, index) => ({
          ...datatable.rows[0],
          'time-id': 1767225600000 + index * 1000,
        })),
      },
    });
    expect(result.rows).toHaveLength(10);
    expect(result.rows[9].skippedCount).toBe(2);

    const merged = mergeAnnotationDatatables([
      result,
      {
        type: 'datatable',
        columns: [],
        rows: [
          {
            id: 'manual',
            type: 'point',
            time: '2026-01-01T00:59:00.000Z',
            timebucket: '2026-01-01T00:00:00.000Z',
            label: 'Manual',
          },
        ],
      },
    ]);
    expect(merged.rows[9].skippedCount).toBeUndefined();
    expect(merged.rows[10].skippedCount).toBe(2);
    expect(result.rows[9].skippedCount).toBe(2);
  });

  it('keeps same-named columns from independent queries separate', () => {
    const first = toEsqlAnnotationDatatable(options);
    const second = toEsqlAnnotationDatatable({
      ...options,
      annotation: { ...annotation, id: 'maintenance' },
      datatable: {
        ...datatable,
        columns: datatable.columns.map((column) =>
          column.name === 'count' ? { ...column, meta: { type: 'string' } } : column
        ),
        rows: [{ ...datatable.rows[0], 'count-id': 'two' }],
      },
    });
    const merged = mergeAnnotationDatatables([first, second]);
    expect(merged.columns).toContainEqual(
      expect.objectContaining({
        id: 'field:["deployments","count"]',
        meta: datatable.columns[2].meta,
      })
    );
    expect(merged.columns).toContainEqual(
      expect.objectContaining({ id: 'field:["maintenance","count"]', meta: { type: 'string' } })
    );
    expect(merged.rows).toContainEqual(
      expect.objectContaining({ 'field:["maintenance","count"]': 'two' })
    );
  });
});
