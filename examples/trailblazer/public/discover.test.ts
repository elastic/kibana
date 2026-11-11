/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALL_TIME,
  bucketTimeRange,
  dataViewParams,
  esqlIdentifier,
  esqlString,
  numericHistogramParams,
} from './discover';

describe('dataViewParams', () => {
  it('uses an ad hoc data view with the KQL query and time range', () => {
    const timeRange = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
    expect(
      dataViewParams({
        search: { index: 'logs-*', language: 'kql', query: 'a: 1' },
        includeHidden: false,
        timeField: '@timestamp',
        timeRange,
      })
    ).toEqual({
      dataViewSpec: {
        id: 'trailblazer:logs-*:@timestamp',
        title: 'logs-*',
        name: 'logs-*',
        timeFieldName: '@timestamp',
        allowHidden: false,
      },
      timeRange,
      query: { language: 'kuery', query: 'a: 1' },
    });
  });

  it('passes Query DSL as a custom filter', () => {
    const params = dataViewParams({
      search: { index: '.kibana-event-log*', language: 'dsl', query: '{"term":{"a":1}}' },
      includeHidden: true,
      columns: ['a'],
    });
    expect(params?.timeRange).toEqual(ALL_TIME);
    expect(params?.columns).toEqual(['a']);
    expect(params?.filters).toEqual([
      expect.objectContaining({
        query: { term: { a: 1 } },
        meta: expect.objectContaining({ type: 'custom', index: 'trailblazer:.kibana-event-log*:' }),
      }),
    ]);
  });

  it('returns undefined for invalid Query DSL', () => {
    expect(
      dataViewParams({
        search: { index: 'x', language: 'dsl', query: '{oops' },
        includeHidden: false,
      })
    ).toBeUndefined();
  });
});

describe('numericHistogramParams', () => {
  it('builds an ES|QL histogram with the KQL query', () => {
    expect(
      numericHistogramParams({
        search: { index: 'a,b*', language: 'kql', query: 'host: "x"' },
        includeHidden: false,
        field: 'event.duration',
        interval: 50,
      })
    ).toEqual({
      query: {
        esql: [
          'FROM "a", "b*"',
          '| WHERE KQL("host: \\"x\\"")',
          '| WHERE `event.duration` IS NOT NULL',
          '| STATS count = COUNT(*) BY bucket = BUCKET(`event.duration`, 50)',
          '| SORT bucket',
        ].join('\n'),
      },
      timeRange: ALL_TIME,
    });
  });

  it('uses QSTR for Lucene and a data view for Query DSL', () => {
    const lucene = numericHistogramParams({
      search: { index: 'a', language: 'lucene', query: 'x:1' },
      includeHidden: false,
      field: 'n',
      interval: 1,
    });
    expect(lucene?.query).toEqual(
      expect.objectContaining({ esql: expect.stringContaining('QSTR("x:1")') })
    );

    const dsl = numericHistogramParams({
      search: { index: 'a', language: 'dsl', query: '' },
      includeHidden: false,
      field: 'n',
      interval: 1,
    });
    expect(dsl?.dataViewSpec?.title).toBe('a');
    expect(dsl?.columns).toEqual(['n']);
  });
});

describe('ES|QL quoting', () => {
  it('escapes identifiers and strings', () => {
    expect(esqlIdentifier('we`ird')).toBe('`we``ird`');
    expect(esqlString('a\\b"c\nd')).toBe('"a\\\\b\\"c\\nd"');
  });
});

describe('bucketTimeRange', () => {
  it('spans the first to the last bucket', () => {
    expect(
      bucketTimeRange([
        { key: '2026-01-01T00:00:00.000Z', label: '', count: 1, to: '2026-01-02T00:00:00.000Z' },
        { key: '2026-01-02T00:00:00.000Z', label: '', count: 1, to: '2026-01-03T00:00:00.000Z' },
      ])
    ).toEqual({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-03T00:00:00.000Z' });
    expect(bucketTimeRange([])).toBeUndefined();
  });
});
