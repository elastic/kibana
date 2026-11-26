/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mapEsqlResponseToDatatable,
  extractEsqlErrorInfo,
  formatAndRethrowEsqlError,
  getInspectorErrorJson,
} from './datatable_mapper';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { AbortError } from '@kbn/kibana-utils-plugin/common';

const makeResponse = (
  columns: Array<{ name: string; type: string; _meta?: Record<string, unknown> }>,
  values: unknown[][] = [],
  opts: Partial<ESQLSearchResponse> = {}
): ESQLSearchResponse =>
  ({ columns, values, all_columns: undefined, ...opts } as unknown as ESQLSearchResponse);

describe('mapEsqlResponseToDatatable', () => {
  it('returns a serializable datatable', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'column1', type: 'string' }], [['value1']]),
      { query: 'FROM index' }
    );

    expect(result.type).toBe('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('resolves meta.sourceParams.sourceField through RENAME to the underlying field', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'new_name', type: 'keyword' }]),
      { query: 'FROM index | RENAME old_name AS new_name' }
    );

    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('old_name');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(true);
    expect(result.columns[0].name).toBe('new_name');
  });

  it('keeps meta.sourceParams.sourceField as the ES column name without RENAME', () => {
    const result = mapEsqlResponseToDatatable(makeResponse([{ name: 'host', type: 'keyword' }]), {
      query: 'FROM index',
    });

    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('host');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(true);
  });

  it('treats an EVAL-computed field with no rename as not filterable', () => {
    const result = mapEsqlResponseToDatatable(makeResponse([{ name: 'doubled', type: 'long' }]), {
      query: 'FROM index | EVAL doubled = bytes * 2',
    });

    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('doubled');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(false);
  });

  it('treats a METADATA column as filterable, even though it was never renamed', () => {
    const result = mapEsqlResponseToDatatable(makeResponse([{ name: '_id', type: 'keyword' }]), {
      query: 'FROM index METADATA _id',
    });

    expect(result.columns[0].isComputedColumn).toBe(true);
    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('_id');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(true);
  });

  it('resolves chained RENAME pipeline for meta.sourceParams.sourceField', () => {
    const result = mapEsqlResponseToDatatable(makeResponse([{ name: 'c', type: 'keyword' }]), {
      query: 'FROM index | RENAME a AS b | RENAME b AS c',
    });

    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('a');
    expect(result.columns[0].name).toBe('c');
  });

  it('passes ES column _meta through to meta.esMeta', () => {
    const columnMeta = { approximation: { type: 'count_distinct', column: '@timestamp' } };
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'count', type: 'long', _meta: columnMeta }]),
      { query: 'FROM index | STATS COUNT(DISTINCT @timestamp)' }
    );

    expect(result.columns[0].meta.esMeta).toEqual(columnMeta);
  });

  it('omits meta.esMeta when ES column has no _meta', () => {
    const result = mapEsqlResponseToDatatable(makeResponse([{ name: 'host', type: 'keyword' }]), {
      query: 'FROM index',
    });

    expect(result.columns[0].meta.esMeta).toBeUndefined();
  });

  it('resolves meta.sourceParams.sourceField for STATS BY alias = column', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([
        { name: 'cnt', type: 'long' },
        { name: 'region', type: 'keyword' },
      ]),
      { query: 'FROM index | STATS cnt = COUNT(*) BY region = country' }
    );

    const regionColumn = result.columns.find((col) => col.name === 'region');
    expect(regionColumn?.meta.sourceParams?.sourceField).toBe('country');
    expect(result.columns.find((col) => col.name === 'cnt')?.meta.sourceParams?.sourceField).toBe(
      'cnt'
    );
  });

  it('sets appliedTimeRange for date columns when an input time range is provided', () => {
    const timeRange = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: '@timestamp', type: 'date' }]),
      { query: 'FROM index', timeRange }
    );

    expect(result.columns[0].meta.sourceParams?.appliedTimeRange).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
    });
  });

  it('normalizes all-empty value arrays to an empty result', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'host', type: 'keyword' }], [[]]),
      { query: 'FROM index' }
    );

    expect(result.rows).toHaveLength(0);
  });

  it('includes warning in the datatable', () => {
    const result = mapEsqlResponseToDatatable(makeResponse([{ name: 'host', type: 'keyword' }]), {
      query: 'FROM index',
      warning: 'some-warning',
    });

    expect(result.warning).toBe('some-warning');
  });

  it('keeps all-null columns on the column list and off each row', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'host', type: 'keyword' }], [['web']], {
        all_columns: [
          { name: 'empty', type: 'keyword' },
          { name: 'host', type: 'keyword' },
        ],
      }),
      { query: 'FROM logs-*' }
    );

    expect(result.columns.map((column) => ({ name: column.name, isNull: column.isNull }))).toEqual([
      { name: 'host', isNull: false },
      { name: 'empty', isNull: true },
    ]);
    expect(result.rows).toEqual([{ host: 'web' }]);
    expect('empty' in result.rows[0]).toBe(false);
  });

  it('pairs each value with its own column when all-null columns are spread across all_columns', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse(
        [
          { name: 'host', type: 'keyword' },
          { name: 'bytes', type: 'long' },
        ],
        [
          ['web', 10],
          ['db', 20],
        ],
        {
          all_columns: [
            { name: 'empty_a', type: 'keyword' },
            { name: 'host', type: 'keyword' },
            { name: 'empty_b', type: 'keyword' },
            { name: 'bytes', type: 'long' },
            { name: 'empty_c', type: 'keyword' },
          ],
        }
      ),
      { query: 'FROM logs-*' }
    );

    expect(result.columns.map(({ name, isNull }) => [name, isNull])).toEqual([
      ['host', false],
      ['bytes', false],
      ['empty_a', true],
      ['empty_b', true],
      ['empty_c', true],
    ]);
    expect(result.rows).toEqual([
      { host: 'web', bytes: 10 },
      { host: 'db', bytes: 20 },
    ]);
    result.rows.forEach((row) => expect(Object.keys(row)).toEqual(['host', 'bytes']));
  });

  it('includes meta.type = ESQL_TABLE_TYPE and statistics', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'host', type: 'keyword' }], [['web']]),
      { query: 'FROM index' }
    );

    expect(result.meta?.type).toBe('es_ql');
    expect(result.meta?.statistics?.totalCount).toBe(1);
  });
});

describe('extractEsqlErrorInfo', () => {
  it('extracts type and reason directly', () => {
    expect(extractEsqlErrorInfo({ type: 'parsing_exception', reason: 'bad query' })).toEqual({
      type: 'parsing_exception',
      reason: 'bad query',
    });
  });

  it('recurses into nested error objects', () => {
    expect(
      extractEsqlErrorInfo({ error: { type: 'parsing_exception', reason: 'nested' } })
    ).toEqual({ type: 'parsing_exception', reason: 'nested' });
  });

  it('returns empty object for non-matching input', () => {
    expect(extractEsqlErrorInfo({ foo: 'bar' })).toEqual({});
    expect(extractEsqlErrorInfo(null)).toEqual({});
  });
});

describe('getInspectorErrorJson', () => {
  it('returns the attributes of an Elasticsearch error', () => {
    const attributes = { type: 'parsing_exception', reason: 'bad syntax' };
    expect(getInspectorErrorJson(Object.assign(new Error('x'), { attributes }))).toBe(attributes);
  });

  it('returns the message of an error without attributes', () => {
    expect(getInspectorErrorJson(new Error('network down'))).toEqual({ message: 'network down' });
  });

  it.each([[null], [undefined], ['a string'], [42]])(
    'ignores attributes that are not an object: %p',
    (attributes) => {
      expect(getInspectorErrorJson(Object.assign(new Error('boom'), { attributes }))).toEqual({
        message: 'boom',
      });
    }
  );

  it.each([
    ['a string', 'plain failure', 'plain failure'],
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
  ])('does not assume a thrown value is an error: %s', (_label, thrown, message) => {
    expect(getInspectorErrorJson(thrown)).toEqual({ message });
  });
});

describe('formatAndRethrowEsqlError', () => {
  const caughtFrom = (thrown: unknown): unknown => {
    try {
      formatAndRethrowEsqlError(thrown);
    } catch (e) {
      return e;
    }
    throw new Error('expected formatAndRethrowEsqlError to throw');
  };

  describe('errors that Elasticsearch did not report', () => {
    it('rethrows an error without attributes as it is', () => {
      const err = new TypeError('Failed to fetch');
      expect(caughtFrom(err)).toBe(err);
      expect(err.message).toBe('Failed to fetch');
    });

    it.each([
      ['a string', 'plain failure', 'plain failure'],
      ['null', null, 'null'],
      ['undefined', undefined, 'undefined'],
    ])('rethrows %s as an error instead of failing on it', (_label, thrown, message) => {
      const caught = caughtFrom(thrown);
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe(message);
    });

    it.each([
      ['an AbortError', () => new AbortError('timeout')],
      ['a DOMException abort', () => new DOMException('The operation was aborted', 'AbortError')],
      [
        'an abort that carries attributes',
        () => Object.assign(new DOMException('aborted', 'AbortError'), { attributes: { a: 1 } }),
      ],
    ])('rethrows %s unchanged, so callers can still recognize it', (_label, makeError) => {
      const err = makeError();
      const message = err.message;
      const caught = caughtFrom(err);
      expect(caught).toBe(err);
      expect((caught as Error).name).toBe('AbortError');
      expect((caught as Error).message).toBe(message);
    });
  });

  describe('errors that Elasticsearch reported', () => {
    it('formats parsing_exception with a friendly message', () => {
      const err = Object.assign(new Error(''), {
        attributes: { type: 'parsing_exception', reason: 'bad syntax' },
      });
      expect(() => formatAndRethrowEsqlError(err)).toThrow(
        "Couldn't parse Elasticsearch ES|QL query. Check your query and try again. Error: bad syntax"
      );
    });

    it('formats other typed errors', () => {
      const err = Object.assign(new Error(''), {
        attributes: { type: 'index_not_found_exception', reason: 'index missing' },
      });
      expect(() => formatAndRethrowEsqlError(err)).toThrow(
        'Unexpected error from Elasticsearch: index_not_found_exception - index missing'
      );
    });
  });
});
