/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { ESQLCallbacks, ESQLFieldWithMetadata } from '@kbn/esql-types';
import { QueryColumns } from '.';

const sourceColumns: ESQLFieldWithMetadata[] = [
  { name: 'message', type: 'text', userDefined: false },
  { name: 'bytes', type: 'long', userDefined: false },
  { name: 'host', type: 'keyword', userDefined: false },
];

const mockGetColumnsFor = (columnsByQuery: Record<string, ESQLFieldWithMetadata[]>) =>
  jest.fn(async (ctx?: { query: string }) => columnsByQuery[ctx?.query ?? ''] ?? []);

const getColumns = async (query: string, getColumnsFor: ESQLCallbacks['getColumnsFor']) => {
  const { root } = Parser.parse(query);
  const columns = await new QueryColumns(
    root,
    query,
    { getColumnsFor },
    { invalidateColumnsCache: true }
  ).asMap();

  return [...columns.values()];
};

describe('named subquery columns', () => {
  it.each([
    'LET selected = (TS metrics-* | STATS rate = AVG(requests)); FROM selected',
    'FROM (TS metrics-* | STATS rate = AVG(requests))',
  ])('uses the subquery TS context in %s', async (query) => {
    const getColumnsFor = mockGetColumnsFor({
      'TS metrics-*': [{ name: 'requests', type: 'counter_integer', userDefined: false }],
    });

    const columns = await getColumns(query, getColumnsFor);

    expect(columns.map(({ name, type }) => ({ name, type }))).toEqual([
      { name: 'rate', type: 'double' },
    ]);
    expect(getColumnsFor).toHaveBeenCalledTimes(1);
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'TS metrics-*' });
  });

  it('resolves a LET source and applies its pipeline', async () => {
    const getColumnsFor = mockGetColumnsFor({ 'FROM logs-*': sourceColumns });

    const columns = await getColumns(
      'LET selected = (FROM logs-* | KEEP message, host); FROM selected',
      getColumnsFor
    );

    expect(columns.map(({ name }) => name)).toEqual(['message', 'host']);
    expect(getColumnsFor).toHaveBeenCalledTimes(1);
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM logs-*' });
  });

  it('resolves references to earlier LET bindings', async () => {
    const getColumnsFor = mockGetColumnsFor({ 'FROM logs-*': sourceColumns });

    const columns = await getColumns(
      'LET base = (FROM logs-*); LET enriched = (FROM base | EVAL size = TO_STRING(bytes)); FROM enriched | KEEP host, size',
      getColumnsFor
    );

    expect(columns.map(({ name }) => name)).toEqual(['host', 'size']);
    expect(getColumnsFor).toHaveBeenCalledTimes(1);
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM logs-*' });
  });

  it('merges fields from named subqueries and regular sources', async () => {
    const getColumnsFor = mockGetColumnsFor({
      'FROM logs-*': sourceColumns,
      'FROM metrics-*': [{ name: 'cpu', type: 'double', userDefined: false }],
    });

    const columns = await getColumns(
      'LET selected = (FROM logs-* | KEEP message); FROM selected, metrics-*',
      getColumnsFor
    );

    expect(columns.map(({ name }) => name)).toEqual(['cpu', 'message']);
    expect(getColumnsFor).toHaveBeenCalledTimes(2);
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM logs-*' });
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM metrics-*' });
  });

  it('resolves each LET binding once when bindings share dependencies', async () => {
    const getColumnsFor = mockGetColumnsFor({ 'FROM logs-*': sourceColumns });

    const columns = await getColumns(
      'LET base = (FROM logs-*); LET first = (FROM base, base); LET second = (FROM first, base); FROM first, second, second',
      getColumnsFor
    );

    expect(columns.map(({ name }) => name)).toEqual(['message', 'bytes', 'host']);
    expect(getColumnsFor).toHaveBeenCalledTimes(1);
  });

  it('does not resolve a remote source as a named subquery', async () => {
    const remoteColumns: ESQLFieldWithMetadata[] = [
      { name: 'remoteField', type: 'keyword', userDefined: false },
    ];
    const getColumnsFor = mockGetColumnsFor({ 'FROM remote:selected': remoteColumns });

    const columns = await getColumns(
      'LET selected = (FROM logs-*); FROM remote:selected',
      getColumnsFor
    );

    expect(columns).toEqual(remoteColumns);
    expect(getColumnsFor).toHaveBeenCalledTimes(1);
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM remote:selected' });
  });

  it('adds outer METADATA columns when named subqueries share dependencies', async () => {
    const getColumnsFor = mockGetColumnsFor({
      'FROM logs-*': sourceColumns,
      'FROM logs-* METADATA _id': [
        ...sourceColumns,
        { name: '_id', type: 'keyword', userDefined: false },
      ],
    });

    const columns = await getColumns(
      'LET base = (FROM logs-* | KEEP message); LET first = (FROM base, base); LET second = (FROM first, base); FROM first, second METADATA _id',
      getColumnsFor
    );

    expect(columns.map(({ name }) => name)).toEqual(['message', '_id']);
    expect(getColumnsFor).toHaveBeenCalledTimes(2);
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM logs-*' });
    expect(getColumnsFor).toHaveBeenCalledWith({ query: 'FROM logs-* METADATA _id' });
  });
});
