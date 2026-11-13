/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { ControlValuesSource } from '@kbn/controls-constants';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { FetchContext } from '@kbn/presentation-publishing';
import { dataViewsService } from '../../../services/kibana_services';
import { minMax$ } from './min_max';

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

describe('minMax$ of a field of an ES|QL source', () => {
  const field: FilterableField = { name: 'bytes', type: 'number', aggregatable: true };
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'dataset-id',
    title: 'logs-*',
    fields: [field],
    getFieldByName: () => field,
    isTimeBased: () => false,
  };
  const column = { name: 'bytes', type: 'long' };

  const run = () =>
    firstValueFrom(
      minMax$({
        controlFetch$: of({ projectRouting: '_alias:*' } as FetchContext),
        dataSources$: new BehaviorSubject([esqlSource]),
        fieldName$: new BehaviorSubject<string | undefined>('bytes'),
        useGlobalFilters$: new BehaviorSubject<boolean | undefined>(true),
        esqlQuery$: new BehaviorSubject<string | undefined>(undefined),
        valuesSource$: new BehaviorSubject<ControlValuesSource | undefined>(
          ControlValuesSource.FIELD
        ),
        setIsLoading: jest.fn(),
      }).minMax$
    );

  beforeEach(() => {
    mockGetESQLSingleColumnValues.mockReset();
    dataViewsService.get = jest.fn();
  });

  it('takes the bounds from the values of a query on the FROM target, as for a query of the user', async () => {
    mockGetESQLSingleColumnValues.mockResolvedValue({
      values: [40, 5, 90],
      column,
      indexPattern: 'logs-*',
    });

    expect(await run()).toEqual({ min: 5, max: 90 });
    expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-* | STATS BY bytes',
        projectRouting: '_alias:*',
        signal: expect.any(AbortSignal),
      })
    );
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('has the error of a failed query', async () => {
    const error = new Error('query failed');
    mockGetESQLSingleColumnValues.mockResolvedValue({ errors: [error] });

    expect(await run()).toEqual({ error, min: undefined, max: undefined });
  });
});
