/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataService } from '../../../services/kibana_services';
import { fetchEsqlOptions } from './fetch_esql_options';

const mockGetESQLSingleColumnValues = jest.fn();
jest.mock('../../../../common/options_list/get_esql_single_column_values', () => {
  const actual = jest.requireActual(
    '../../../../common/options_list/get_esql_single_column_values'
  );
  return {
    getESQLSingleColumnValues: Object.assign(
      (...args: unknown[]) => mockGetESQLSingleColumnValues(...args),
      { isSuccess: actual.getESQLSingleColumnValues.isSuccess }
    ),
  };
});

describe('fetchEsqlOptions', () => {
  const request = {
    kind: 'esql' as const,
    esql: 'FROM logs-* | STATS BY host',
    filter: {
      bool: {
        filter: [{ match_phrase: { host: 'mainframe' } }],
        must: [],
        must_not: [],
        should: [],
      },
    },
    searchString: 'MA',
    searchTechnique: 'prefix' as const,
    sort: { by: '_key' as const, direction: 'asc' as const },
    selectedOptions: ['gone'],
    projectRouting: '_alias:*',
  };
  const column = { name: 'host', type: 'keyword' };

  beforeEach(() => mockGetESQLSingleColumnValues.mockReset());

  it('runs the query with the filter, the abort signal and the project routing', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({
      values: ['mainframe'],
      column,
      indexPattern: 'logs-*',
    });
    const { signal } = new AbortController();

    await fetchEsqlOptions(request, signal);

    expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-* | STATS BY host',
        filter: request.filter,
        signal,
        search: dataService.search.search,
        projectRouting: '_alias:*',
      })
    );
  });

  it('returns the values that match the search, sorted, and the selections that are not among them', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({
      values: ['mainframe', 'macbook', 'other'],
      column,
      indexPattern: 'logs-*',
    });

    expect(await fetchEsqlOptions(request, new AbortController().signal)).toEqual({
      suggestions: [{ value: 'macbook' }, { value: 'mainframe' }],
      totalCardinality: 2,
      invalidSelections: ['gone'],
      isPartial: false,
    });
  });

  it('returns the error of a failed query', async () => {
    const error = new Error('query failed');
    mockGetESQLSingleColumnValues.mockResolvedValue({ errors: [error] });

    expect(await fetchEsqlOptions(request, new AbortController().signal)).toEqual({ error });
  });
});
