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

const mockGetESQLResults = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: (...args: unknown[]) => mockGetESQLResults(...args),
}));

describe('fetchEsqlOptions', () => {
  const request = {
    kind: 'esql' as const,
    esql: 'FROM logs-* | STATS BY host',
    filter: { bool: { filter: [{ prefix: { host: { value: 'ma', case_insensitive: true } } }] } },
    sort: { by: '_key' as const, direction: 'asc' as const },
    selectedOptions: ['gone'],
    projectRouting: '_alias:*',
  };
  const column = { name: 'host', type: 'keyword' };

  beforeEach(() => mockGetESQLResults.mockReset());

  it('runs the query with the filter, the abort signal and the project routing', async () => {
    mockGetESQLResults.mockResolvedValue({
      response: { columns: [column], values: [['mainframe']] },
    });
    const { signal } = new AbortController();

    await fetchEsqlOptions(request, signal);

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM logs-* | STATS BY host',
        filter: request.filter,
        signal,
        search: dataService.search.search,
        projectRouting: '_alias:*',
      })
    );
  });

  it('returns the values as suggestions, sorted, and the selections that are not among them', async () => {
    mockGetESQLResults.mockResolvedValue({
      response: { columns: [column], values: [['mainframe'], ['macbook']] },
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
    mockGetESQLResults.mockRejectedValue(error);

    expect(await fetchEsqlOptions(request, new AbortController().signal)).toEqual({ error });
  });
});
