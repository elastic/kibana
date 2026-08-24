/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangePointCardModel } from '@kbn/change-point-chart-viewer';
import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  appendDistinctEntityWhereToLineEsql,
  ENTITY_WHERE_PREDICATE_CAP,
  getEarliestAnnotationTimeFromCards,
  getEntityColumnIds,
  getSummarySeriesTimeRange,
  partitionLineRows,
} from './change_point_summary_series_helpers';

const makeTable = (columns: Datatable['columns'], rows: Datatable['rows']): Datatable => ({
  type: 'datatable',
  columns,
  rows,
});

const ESQL_NO_BY =
  'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';

const ESQL_WITH_HOST_BY =
  'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket BY host';

const COLUMNS_NO_BY = [
  { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
  { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
  { id: 'type', name: 'type', meta: { type: 'string' as const } },
  { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
];

const COLUMNS_WITH_HOST = [
  { id: 'host', name: 'host', meta: { type: 'string' as const } },
  { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
  { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
  { id: 'type', name: 'type', meta: { type: 'string' as const } },
  { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
];

const stubCards = (datetimes: string[]): ChangePointCardModel[] =>
  [
    {
      annotationEvents: datetimes.map((datetime) => ({ name: 'mean_shift', datetime })),
    },
  ] as ChangePointCardModel[];

describe('change_point_summary_series_helpers', () => {
  describe('getEntityColumnIds', () => {
    it('returns BY columns that exist on the table', () => {
      expect(getEntityColumnIds(ESQL_NO_BY, makeTable(COLUMNS_NO_BY, []))).toEqual([]);
      expect(getEntityColumnIds(ESQL_WITH_HOST_BY, makeTable(COLUMNS_WITH_HOST, []))).toEqual([
        'host',
      ]);
      expect(getEntityColumnIds(ESQL_WITH_HOST_BY, makeTable(COLUMNS_NO_BY, []))).toEqual([]);
    });
  });

  describe('getEarliestAnnotationTimeFromCards / getSummarySeriesTimeRange', () => {
    it('finds the earliest valid annotation datetime across cards', () => {
      expect(
        getEarliestAnnotationTimeFromCards(
          stubCards(['2023-11-15T00:00:00.000Z', '2023-11-10T00:00:00.000Z'])
        )
      ).toBe(Date.parse('2023-11-10T00:00:00.000Z'));
    });

    it('skips invalid datetimes and returns undefined when none are valid', () => {
      expect(getEarliestAnnotationTimeFromCards(stubCards(['not-a-date']))).toBeUndefined();
      expect(getEarliestAnnotationTimeFromCards(undefined)).toBeUndefined();
      expect(getEarliestAnnotationTimeFromCards([])).toBeUndefined();
    });

    it('extends from when the annotation is before Discover from', () => {
      const range = getSummarySeriesTimeRange(
        { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
        Date.parse('2023-11-10T00:00:00.000Z')
      );
      expect(range).toEqual({
        from: '2023-11-10T00:00:00.000Z',
        to: '2023-11-20T00:00:00.000Z',
      });
    });

    it('does not extend from when the annotation is inside the range', () => {
      const timeRange = { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' };
      expect(getSummarySeriesTimeRange(timeRange, Date.parse('2023-11-15T00:00:00.000Z'))).toEqual(
        timeRange
      );
    });
  });

  describe('partitionLineRows', () => {
    it('builds a single series with empty entity key when there is no BY', () => {
      const series = partitionLineRows(
        [
          { bucket: '2023-11-14T00:00:00.000Z', avg_bytes: 12 },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14 },
        ],
        'bucket',
        'avg_bytes',
        []
      );

      expect([...series.keys()]).toEqual(['']);
      expect(series.get('')).toEqual([
        { x: Date.parse('2023-11-14T00:00:00.000Z'), y: 12 },
        { x: Date.parse('2023-11-15T00:00:00.000Z'), y: 14 },
      ]);
    });

    it('partitions and sorts points per entity key', () => {
      const series = partitionLineRows(
        [
          { host: 'b', bucket: '2023-11-16T00:00:00.000Z', avg_bytes: 20 },
          { host: 'a', bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14 },
          { host: 'a', bucket: '2023-11-14T00:00:00.000Z', avg_bytes: 12 },
          { host: 'b', bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 18 },
        ],
        'bucket',
        'avg_bytes',
        ['host']
      );

      expect(series.get('host=a')).toEqual([
        { x: Date.parse('2023-11-14T00:00:00.000Z'), y: 12 },
        { x: Date.parse('2023-11-15T00:00:00.000Z'), y: 14 },
      ]);
      expect(series.get('host=b')).toEqual([
        { x: Date.parse('2023-11-15T00:00:00.000Z'), y: 18 },
        { x: Date.parse('2023-11-16T00:00:00.000Z'), y: 20 },
      ]);
    });

    it('skips rows with invalid time or non-numeric values', () => {
      const series = partitionLineRows(
        [
          { bucket: 'not-a-date', avg_bytes: 12 },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 'nope' },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: null },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14 },
        ],
        'bucket',
        'avg_bytes',
        []
      );

      expect(series.get('')).toEqual([{ x: Date.parse('2023-11-15T00:00:00.000Z'), y: 14 }]);
    });
  });

  describe('appendDistinctEntityWhereToLineEsql', () => {
    const line = 'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket';

    it('appends OR predicates for distinct entity values', () => {
      expect(
        appendDistinctEntityWhereToLineEsql(
          line,
          [{ host: 'a' }, { host: 'a' }, { host: 'b' }],
          ['host']
        )
      ).toBe(`${line} | WHERE host == "a" OR host == "b"`);
    });

    it('groups multi-column entities', () => {
      expect(
        appendDistinctEntityWhereToLineEsql(
          line,
          [{ host: 'a', service: 'orders' }],
          ['host', 'service']
        )
      ).toBe(`${line} | WHERE (host == "a" AND service == "orders")`);
    });

    it('returns the original query when the distinct set exceeds the cap', () => {
      const rows = Array.from({ length: ENTITY_WHERE_PREDICATE_CAP + 1 }, (_, i) => ({
        host: `h${i}`,
      }));
      expect(appendDistinctEntityWhereToLineEsql(line, rows, ['host'])).toBe(line);
    });
  });
});
