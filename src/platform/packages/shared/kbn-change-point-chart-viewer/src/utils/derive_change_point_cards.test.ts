/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildChangePointCards, formatAnnotationTimestamp } from './derive_change_point_cards';

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
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
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
      expect(cards![0].seriesType).toBeUndefined();
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
          { id: 'host', name: 'host', meta: { type: 'string' as const } },
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
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

    it('uses full query and "No change points detected" title when all rows have null type (no BY)', () => {
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
        ],
        rows: [{ bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14, type: null, pvalue: null }],
      };
      const cards = buildChangePointCards({ table, esql });
      expect(cards).toHaveLength(1);
      expect(cards![0].annotationEvents).toHaveLength(0);
      expect(cards![0].title).toBe('No change points detected');
      expect(cards![0].lineEsql).toContain('CHANGE_POINT');
      expect(cards![0].seriesType).toBe('bar');
      // No entity split: non-BY results have one row per bucket, no breakdown needed.
      expect(cards![0].breakdownColumns).toBeUndefined();
    });

    it('returns one aggregate card with full query titled "No change points detected" for CHANGE_POINT BY with no chartable changes', () => {
      const esqlWithHost =
        'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket BY host';
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'host', name: 'host', meta: { type: 'string' as const } },
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
        ],
        rows: [
          {
            host: 'a',
            bucket: '2023-11-15T00:00:00.000Z',
            avg_bytes: 14,
            type: null,
            pvalue: null,
          },
          {
            host: 'b',
            bucket: '2023-11-16T00:00:00.000Z',
            avg_bytes: 20,
            type: null,
            pvalue: null,
          },
        ],
      };
      const cards = buildChangePointCards({ table, esql: esqlWithHost });
      expect(cards).toHaveLength(1);
      expect(cards![0].annotationEvents).toHaveLength(0);
      expect(cards![0].title).toBe('No change points detected');
      expect(cards![0].lineEsql).toContain('CHANGE_POINT');
      expect(cards![0].lineEsql).not.toContain('WHERE');
      expect(cards![0].seriesType).toBe('bar');
      // Entity columns become breakdowns so (host, bucket) pairs are unique in the chart.
      expect(cards![0].breakdownColumns).toEqual(['host']);
    });

    it('uses full query and "No change points detected" title when type is set but pvalue is null', () => {
      const table = {
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
            pvalue: null,
          },
        ],
      };

      const cards = buildChangePointCards({ table, esql });

      expect(cards).toHaveLength(1);
      expect(cards![0].annotationEvents).toHaveLength(0);
      expect(cards![0].title).toBe('No change points detected');
      expect(cards![0].lineEsql).toContain('CHANGE_POINT');
      expect(cards![0].seriesType).toBe('bar');
    });
  });
});
