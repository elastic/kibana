/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildChangePointCards,
  formatAnnotationTimestamp,
  hasChangePointChartCards,
} from './derive_change_point_cards';

describe('derive_change_point_cards', () => {
  describe('formatAnnotationTimestamp', () => {
    it('formats epoch ms as ISO', () => {
      const ms = Date.parse('2023-11-14T22:13:20.000Z');
      expect(formatAnnotationTimestamp(ms)).toBe('2023-11-14T22:13:20.000Z');
    });

    it('parses ISO-like strings', () => {
      expect(formatAnnotationTimestamp('2023-11-14T22:13:20.000Z')).toBe(
        '2023-11-14T22:13:20.000Z'
      );
    });

    it('parses Discover-style bucket strings with a numeric timezone offset', () => {
      const s = '2021-12-20T00:00:00.000-07:00';
      expect(formatAnnotationTimestamp(s)).toBe(new Date(s).toISOString());
    });

    it('parses 13-digit epoch-millisecond strings', () => {
      // Regression: value.length < 13 excluded 13-digit strings from the numeric branch, and
      // Date.parse() returns NaN for plain numeric strings, so they fell through to undefined.
      expect(formatAnnotationTimestamp('1700000000000')).toBe(
        new Date(1700000000000).toISOString()
      );
    });
  });

  describe('buildChangePointCards', () => {
    const esql =
      'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';

    it('returns undefined without a table', () => {
      expect(
        buildChangePointCards({
          table: undefined,
          esql,
        })
      ).toBeUndefined();
    });

    it('builds one card with annotations from typed rows', () => {
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'date' } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } },
          { id: 'type', name: 'type', meta: { type: 'string' } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
        ],
        rows: [
          {
            bucket: '2023-11-14T00:00:00.000Z',
            avg_bytes: 12,
            type: '',
            pvalue: null,
          },
          {
            bucket: '2023-11-15T00:00:00.000Z',
            avg_bytes: 14,
            type: 'mean_shift',
            pvalue: 0.001,
          },
        ],
      };

      const cards = buildChangePointCards({
        table,
        esql,
      });

      expect(cards).toHaveLength(1);
      expect(cards![0].lineEsql).toContain('FROM idx');
      expect(cards![0].lineEsql).toContain('STATS avg_bytes');
      expect(cards![0].annotationEvents).toHaveLength(1);
      expect(cards![0].annotationEvents[0].name).toContain('mean_shift');
      expect(cards![0].annotationEvents[0].name).toContain('pvalue=');
    });

    it('builds separate line queries per entity via WHERE', () => {
      const esqlWithHost =
        'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'host', name: 'host', meta: { type: 'string' } },
          { id: 'bucket', name: 'bucket', meta: { type: 'date' } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } },
          { id: 'type', name: 'type', meta: { type: 'string' } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
        ],
        rows: [
          {
            host: 'a',
            bucket: '2023-11-15T00:00:00.000Z',
            avg_bytes: 14,
            type: 'mean_shift',
            pvalue: 0.001,
          },
          {
            host: 'b',
            bucket: '2023-11-16T00:00:00.000Z',
            avg_bytes: 20,
            type: 'mean_shift',
            pvalue: 0.002,
          },
        ],
      };

      const cards = buildChangePointCards({
        table,
        esql: esqlWithHost,
      });

      expect(cards).toHaveLength(2);
      expect(cards![0].lineEsql).toContain('| WHERE host == "a"');
      expect(cards![1].lineEsql).toContain('| WHERE host == "b"');
      expect(cards![0].lineEsql).not.toContain('| WHERE host == "b"');
    });

    it('hasChangePointChartCards matches whether buildChangePointCards returns cards', () => {
      const esqlLocal =
        'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';
      const tableWithCp = {
        type: 'datatable' as const,
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
        ],
        rows: [
          {
            bucket: '2023-11-15T00:00:00.000Z',
            avg_bytes: 14,
            type: 'mean_shift',
            pvalue: 0.001,
          },
        ],
      };
      expect(hasChangePointChartCards({ table: tableWithCp, esql: esqlLocal })).toBe(true);
      expect(Boolean(buildChangePointCards({ table: tableWithCp, esql: esqlLocal })?.length)).toBe(
        true
      );

      expect(hasChangePointChartCards({ table: undefined, esql: esqlLocal })).toBe(false);
      expect(buildChangePointCards({ table: undefined, esql: esqlLocal })).toBeUndefined();
    });

    it('hasChangePointChartCards returns false for split query when all groups lack annotations', () => {
      // Regression: groups.size > 0 is not enough — every group must have at least one valid
      // annotation (row with parseable timestamp + type/pvalue in non-BY mode) or buildChangePointCards
      // returns undefined for split queries.
      const esqlWithHost =
        'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';
      const tableNoAnnotations = {
        type: 'datatable' as const,
        columns: [
          { id: 'host', name: 'host', meta: { type: 'string' as const } },
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
        ],
        rows: [
          // Both entity groups have rows but no valid change-point annotations (type empty / pvalue null).
          { host: 'a', bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 10, type: '', pvalue: null },
          { host: 'b', bucket: '2023-11-16T00:00:00.000Z', avg_bytes: 20, type: '', pvalue: null },
        ],
      };

      const cards = buildChangePointCards({ table: tableNoAnnotations, esql: esqlWithHost });
      // Builder skips all groups → returns undefined.
      expect(cards).toBeUndefined();

      // Predicate must agree with the builder.
      expect(hasChangePointChartCards({ table: tableNoAnnotations, esql: esqlWithHost })).toBe(
        false
      );
    });

    it('skips annotation markers when type is set but pvalue is null', () => {
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'date' } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } },
          { id: 'type', name: 'type', meta: { type: 'string' } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
        ],
        rows: [
          {
            bucket: '2023-11-15T00:00:00.000Z',
            avg_bytes: 14,
            type: 'mean_shift',
            pvalue: null,
          },
        ],
      };

      const cards = buildChangePointCards({ table, esql });

      expect(cards).toHaveLength(1);
      expect(cards![0].annotationEvents).toHaveLength(0);
    });
  });
});
