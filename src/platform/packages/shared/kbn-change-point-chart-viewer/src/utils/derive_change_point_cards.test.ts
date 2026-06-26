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
      expect(cards![0].annotationEvents).toHaveLength(1);
      expect(cards![0].annotationEvents[0].name).toContain('mean_shift');
      expect(cards![0].annotationEvents[0].name).toContain('pvalue=');
    });

    it('returns undefined when the ON column is not a date type', () => {
      // CHANGE_POINT ... ON customer_full_name.keyword uses a keyword as the time axis.
      // The Lens dateHistogram xAxis requires a date column, so the chart cannot render.
      // buildChangePointCards must return undefined so the grid shows the "No change point
      // series" empty state rather than a broken chart with "No results found".
      const rawEsql =
        'FROM kibana_sample_data_ecommerce | CHANGE_POINT products.base_price ON customer_full_name.keyword';
      const columnsBase = [
        {
          id: 'customer_full_name.keyword',
          name: 'customer_full_name.keyword',
          meta: { type: 'string' as const },
        },
        {
          id: 'products.base_price',
          name: 'products.base_price',
          meta: { type: 'number' as const },
        },
        { id: 'category', name: 'category', meta: { type: 'string' as const } },
        { id: 'type', name: 'type', meta: { type: 'string' as const } },
        { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
      ];

      // Holds with change points detected
      expect(
        buildChangePointCards({
          table: {
            type: 'datatable' as const,
            columns: columnsBase,
            rows: [
              {
                'customer_full_name.keyword': 'Ahmed Al Gomez',
                'products.base_price': 28.98,
                category: "Men's Shoes",
                type: 'mean_shift',
                pvalue: 0.001,
              },
            ],
          },
          esql: rawEsql,
        })
      ).toBeUndefined();

      // Holds with an empty result set too
      expect(
        buildChangePointCards({
          table: { type: 'datatable' as const, columns: columnsBase, rows: [] },
          esql: rawEsql,
        })
      ).toBeUndefined();
    });

    it('does not append WHERE for a single-series query without CHANGE_POINT BY', () => {
      // Without an explicit CHANGE_POINT ... BY, all rows belong to one series and the line
      // query must go out unmodified regardless of what extra columns appear in the result.
      const singleSeriesEsql =
        'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';
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

      const cards = buildChangePointCards({ table, esql: singleSeriesEsql });

      expect(cards).toHaveLength(1);
      expect(cards![0].lineEsql).not.toContain('WHERE');
      expect(cards![0].entityValues).toEqual({});
      expect(cards![0].entityDescription).toBeUndefined();
    });

    it('builds separate line queries per entity via WHERE when CHANGE_POINT uses BY', () => {
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

    it('does not append WHERE when CHANGE_POINT has no BY, even with extra STATS BY columns', () => {
      // Without an explicit CHANGE_POINT ... BY all rows belong to one series; the line query
      // must go out unmodified regardless of what extra columns appear in the result table.
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

      const cards = buildChangePointCards({ table, esql: esqlWithHost });

      expect(cards).toHaveLength(1);
      expect(cards![0].lineEsql).not.toContain('WHERE');
    });

    it('returns undefined when all rows have null type and no change points are detected (no BY)', () => {
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
      expect(buildChangePointCards({ table, esql })).toBeUndefined();
    });

    it('returns undefined for CHANGE_POINT BY when no change points are detected', () => {
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
      expect(buildChangePointCards({ table, esql: esqlWithHost })).toBeUndefined();
    });

    it('returns undefined when type is set but pvalue is null (no valid change point)', () => {
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
        ],
        rows: [
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14, type: 'mean_shift', pvalue: null },
        ],
      };
      expect(buildChangePointCards({ table, esql })).toBeUndefined();
    });

    it('does not use "No change points detected" title when type and pvalue are set but timestamp is null', () => {
      // Regression: a change point at the edge of the time range may have a null bucket timestamp.
      // The annotation cannot be rendered, but the change point was still detected.
      const table = {
        type: 'datatable' as const,
        columns: [
          { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
          { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
          { id: 'type', name: 'type', meta: { type: 'string' as const } },
          { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
        ],
        rows: [{ bucket: null, avg_bytes: 14, type: 'mean_shift', pvalue: 0.001 }],
      };

      const cards = buildChangePointCards({ table, esql });

      expect(cards).toHaveLength(1);
      // Annotation could not be rendered (no valid timestamp), but a change point was detected.
      expect(cards![0].annotationEvents).toHaveLength(0);
      expect(cards![0].title).not.toBe('No change points detected');
      // Uses the line data query (CHANGE_POINT stripped), not the raw query.
      expect(cards![0].lineEsql).not.toContain('CHANGE_POINT avg_bytes ON bucket');
    });
  });
});
