/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';
import { BehaviorSubject, first, of, skip } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { ControlGroupApi, DataControlFetchContext } from '../../control_group/types';
import { getRangesliderControlFactory } from './get_range_slider_control_factory';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { ControlApiRegistration } from '../../types';
import { RangesliderControlApi, RangesliderControlState } from './types';
import { StateComparators } from '@kbn/presentation-publishing';

describe('RangesliderControlApi', () => {
  const uuid = 'myControl1';
  const dashboardApi = {
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  };
  const controlGroupApi = {
    dataControlFetch$: new BehaviorSubject<DataControlFetchContext>({}),
    parentApi: dashboardApi,
  } as unknown as ControlGroupApi;
  const dataStartServiceMock = dataPluginMock.createStartContract();
  const totalResults = 20;
  dataStartServiceMock.search.searchSource.create = jest.fn().mockImplementation(() => {
    let isAggsRequest = false;
    return {
      setField: (key: string) => {
        if (key === 'aggs') {
          isAggsRequest = true;
        }
      },
      fetch$: () => {
        return isAggsRequest
          ? of({
              rawResponse: { aggregations: { minAgg: { value: 0 }, maxAgg: { value: 1000 } } },
            })
          : of({
              rawResponse: { hits: { total: { value: totalResults } } },
            });
      },
    };
  });
  const mockDataViews = dataViewPluginMocks.createStartContract();
  // @ts-ignore
  mockDataViews.get = async (id: string): Promise<DataView> => {
    if (id !== 'myDataViewId') {
      throw new Error(`Simulated error: no data view found for id ${id}`);
    }
    return {
      id,
      getFieldByName: (fieldName: string) => {
        return [
          {
            displayName: 'My field name',
            name: 'myFieldName',
            type: 'string',
          },
        ].find((field) => fieldName === field.name);
      },
    } as unknown as DataView;
  };
  const factory = getRangesliderControlFactory({
    core: coreMock.createStart(),
    data: dataStartServiceMock,
    dataViews: mockDataViews,
  });

  function buildApiMock(
    api: ControlApiRegistration<RangesliderControlApi>,
    nextComparitors: StateComparators<RangesliderControlState>
  ) {
    return {
      ...api,
      uuid,
      parentApi: controlGroupApi,
      unsavedChanges: new BehaviorSubject<Partial<RangesliderControlState> | undefined>(undefined),
      resetUnsavedChanges: () => {},
      type: factory.type,
    };
  }

  describe('filters$', () => {
    test('should not set filters$ when value is not provided', (done) => {
      const { api } = factory.buildControl(
        {
          dataViewId: 'myDataView',
          fieldName: 'myFieldName',
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      api.filters$.pipe(skip(1), first()).subscribe((filter) => {
        expect(filter).toBeUndefined();
        done();
      });
    });

    test('should set filters$ when value is provided', (done) => {
      const { api } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          value: ['5', '10'],
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      api.filters$.pipe(skip(1), first()).subscribe((filter) => {
        expect(filter).toEqual([
          {
            meta: {
              field: 'myFieldName',
              index: 'myDataViewId',
              key: 'myFieldName',
              params: {
                gte: 5,
                lte: 10,
              },
              type: 'range',
            },
            query: {
              range: {
                myFieldName: {
                  gte: 5,
                  lte: 10,
                },
              },
            },
          },
        ]);
        done();
      });
    });
  });
});
