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
} from './datatable_mapper';
import type { ESQLSearchResponse } from '@kbn/es-types';

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
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'host', type: 'keyword' }]),
      { query: 'FROM index' }
    );

    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('host');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(true);
  });

  it('treats an EVAL-computed field with no rename as not filterable', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'doubled', type: 'long' }]),
      { query: 'FROM index | EVAL doubled = bytes * 2' }
    );

    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('doubled');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(false);
  });

  it('treats a METADATA column as filterable, even though it was never renamed', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: '_id', type: 'keyword' }]),
      { query: 'FROM index METADATA _id' }
    );

    expect(result.columns[0].isComputedColumn).toBe(true);
    expect(result.columns[0].meta.sourceParams?.sourceField).toBe('_id');
    expect(result.columns[0].meta.sourceParams?.isSourceFieldFilterable).toBe(true);
  });

  it('resolves chained RENAME pipeline for meta.sourceParams.sourceField', () => {
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'c', type: 'keyword' }]),
      { query: 'FROM index | RENAME a AS b | RENAME b AS c' }
    );

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
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'host', type: 'keyword' }]),
      { query: 'FROM index' }
    );

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
    const result = mapEsqlResponseToDatatable(
      makeResponse([{ name: 'host', type: 'keyword' }]),
      { query: 'FROM index', warning: 'some-warning' }
    );

    expect(result.warning).toBe('some-warning');
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

describe('formatAndRethrowEsqlError', () => {
  it('prefixes unexpected errors', () => {
    const err = Object.assign(new Error('connection refused'), { message: 'connection refused' });
    expect(() => formatAndRethrowEsqlError(err)).toThrow(
      'Unexpected error from Elasticsearch: connection refused'
    );
  });

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
