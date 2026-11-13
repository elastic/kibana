/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { FilterableSource } from '@kbn/data-source';
import { dataViewsService } from '../../../services/kibana_services';
import { hasNoResults } from './has_no_results';

const mockGetESQLSingleColumnValues = jest.fn();
jest.mock('../../../../common/options_list/get_esql_single_column_values', () => {
  const actual = jest.requireActual(
    '../../../../common/options_list/get_esql_single_column_values'
  );
  return {
    getESQLSingleColumnValues: Object.assign(
      (...args: unknown[]) => mockGetESQLSingleColumnValues(...args),
      {
        isSuccess: actual.getESQLSingleColumnValues.isSuccess,
        isNumericResult: actual.getESQLSingleColumnValues.isNumericResult,
        hasNoResults: actual.getESQLSingleColumnValues.hasNoResults,
      }
    ),
  };
});

describe('hasNoResults of a field of an ES|QL source', () => {
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'dataset-id',
    title: 'logs-*',
    fields: [{ name: 'bytes', type: 'number' }],
    getFieldByName: () => undefined,
    isTimeBased: () => false,
  };
  const rangeFilter = {
    meta: { type: 'range', key: 'bytes', params: { gte: 1, lte: 5 } },
    query: { range: { bytes: { gte: 1, lte: 5 } } },
  } as unknown as Filter;
  const params = () => ({
    abortSignal: new AbortController().signal,
    dataSource: esqlSource,
    fieldName: 'bytes',
    rangeFilter,
    projectRouting: '_alias:*',
  });
  const column = { name: 'bytes', type: 'long' };

  beforeEach(() => {
    mockGetESQLSingleColumnValues.mockReset();
    dataViewsService.get = jest.fn();
  });

  it('is false when the FROM target has a value in the range, which the range filter asks for', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({
      values: [3],
      column,
      indexPattern: 'logs-*',
    });
    const request = params();

    expect(await hasNoResults(request)).toBe(false);
    expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-* | KEEP bytes | LIMIT 1',
        signal: request.abortSignal,
        projectRouting: '_alias:*',
        filter: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ range: { bytes: { gte: 1, lte: 5 } } }]),
          }),
        }),
      })
    );
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('is true when the range has no values', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({ values: [], column, indexPattern: 'logs-*' });

    expect(await hasNoResults(params())).toBe(true);
  });

  it('fails with the error of a failed query', async () => {
    const error = new Error('query failed');
    mockGetESQLSingleColumnValues.mockResolvedValue({ errors: [error] });

    await expect(hasNoResults(params())).rejects.toBe(error);
  });
});
