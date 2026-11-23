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
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { ValuesSourceFetchPlan } from '../types';
import type { DataControlStateManager } from '../data_control_manager';
import { hasNoEsqlResults, hasNoResults$ } from './has_no_results';

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
        hasNoResults: actual.getESQLSingleColumnValues.hasNoResults,
      }
    ),
  };
});

describe('hasNoEsqlResults', () => {
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
  const request = () => ({
    abortSignal: new AbortController().signal,
    dataSource: esqlSource,
    esqlQuery: 'FROM logs-*\n| STATS BY bytes',
    rangeFilter,
  });
  const column = { name: 'bytes', type: 'long' };

  beforeEach(() => {
    mockGetESQLSingleColumnValues.mockReset();
    dataViewsService.get = jest.fn();
  });

  it('is false when the query has a value in the range, which the range filter asks for', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({
      values: [3],
      column,
      indexPattern: 'logs-*',
    });

    expect(await hasNoEsqlResults(request())).toBe(false);
    expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-*\n| STATS BY bytes\n| LIMIT 1',
        filter: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ range: { bytes: { gte: 1, lte: 5 } } }]),
          }),
        }),
      })
    );
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('uses the ES|QL variables and the time range, as the query that fetches the bounds does', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({
      values: [3],
      column,
      indexPattern: 'logs-*',
    });
    const esqlVariables = [{ key: 'host', value: 'a', type: 'values' }] as never;
    const timeRange = { from: 'now-15m', to: 'now' };

    await hasNoEsqlResults({ ...request(), esqlVariables, timeRange });

    expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
      expect.objectContaining({ esqlVariables, timeRange })
    );
  });

  it('is true when the range has no values', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({ values: [], column, indexPattern: 'logs-*' });

    expect(await hasNoEsqlResults(request())).toBe(true);
  });

  it('fails with the error of a failed query', async () => {
    const error = new Error('query failed');
    mockGetESQLSingleColumnValues.mockResolvedValue({ errors: [error] });

    await expect(hasNoEsqlResults(request())).rejects.toBe(error);
  });

  describe('hasNoResults$', () => {
    const run = (plan: ValuesSourceFetchPlan) =>
      firstValueFrom(
        hasNoResults$({
          api: {
            appliedFilters$: new BehaviorSubject<Filter[] | undefined>([rangeFilter]),
            useGlobalFilters$: new BehaviorSubject<boolean | undefined>(true),
            ignoreValidations$: new BehaviorSubject<boolean | undefined>(false),
            valuesSourceFetchPlan$: new BehaviorSubject<ValuesSourceFetchPlan | undefined>(plan),
            dataSources$: new BehaviorSubject<FilterableSource[] | undefined>([esqlSource]),
          } as unknown as DataControlStateManager['api'],
          controlFetch$: of({} as FetchContext),
          setIsLoading: jest.fn(),
        }).hasNoResults$
      );

    it('flags an empty range with the ES|QL query of an ES|QL plan, and not as DSL on a data view', async () => {
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: [],
        column,
        indexPattern: 'logs-*',
      });

      expect(
        await run({ fetchMode: 'esql', query: 'FROM logs-* | STATS BY bytes | LIMIT 5' })
      ).toBe(true);
      expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'FROM logs-* | STATS BY bytes | LIMIT 5\n| LIMIT 1' })
      );
      expect(dataViewsService.get).not.toHaveBeenCalled();
    });
  });
});
