/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { TimeRange } from '@kbn/es-query';
import { BehaviorSubject, first, of, skip } from 'rxjs';
import { render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { ControlGroupApi, DataControlFetchContext } from '../../control_group/types';
import { getRangesliderControlFactory } from './get_range_slider_control_factory';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { ControlApiRegistration } from '../../types';
import { RangesliderControlApi, RangesliderControlState } from './types';
import { StateComparators } from '@kbn/presentation-publishing';
import { SerializedPanelState } from '@kbn/presentation-containers';

const DEFAULT_TOTAL_RESULTS = 20;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1000;

describe('RangesliderControlApi', () => {
  const uuid = 'myControl1';
  const dashboardApi = {
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  };
  const controlGroupApi = {
    dataControlFetch$: new BehaviorSubject<DataControlFetchContext>({}),
    ignoreParentSettings$: new BehaviorSubject(undefined),
    parentApi: dashboardApi,
  } as unknown as ControlGroupApi;
  const dataStartServiceMock = dataPluginMock.createStartContract();
  let totalResults = DEFAULT_TOTAL_RESULTS;
  let min: estypes.AggregationsSingleMetricAggregateBase['value'] = DEFAULT_MIN;
  let max: estypes.AggregationsSingleMetricAggregateBase['value'] = DEFAULT_MAX;
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
              rawResponse: { aggregations: { minAgg: { value: min }, maxAgg: { value: max } } },
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
      getFormatterForField: () => {
        return {
          getConverterFor: () => {
            return (value: string) => `${value} myUnits`;
          },
        };
      },
    } as unknown as DataView;
  };
  const factory = getRangesliderControlFactory({
    core: coreMock.createStart(),
    data: dataStartServiceMock,
    dataViews: mockDataViews,
  });

  beforeEach(() => {
    totalResults = DEFAULT_TOTAL_RESULTS;
    min = DEFAULT_MIN;
    max = DEFAULT_MAX;
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

  describe('selected range has no results', () => {
    test('should display invalid state', async () => {
      totalResults = 0; // simulate no results by returning hits total of zero
      min = null; // simulate no results by returning min aggregation value of null
      max = null; // simulate no results by returning max aggregation value of null
      const { Component } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          value: ['5', '10'],
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      const { findByTestId } = render(<Component />);
      await waitFor(async () => {
        await findByTestId('range-slider-control-invalid-append-myControl1');
      });
    });
  });

  describe('min max', () => {
    test('bounds inputs should display min and max placeholders when there is no selected range', async () => {
      const { Component } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      const { findByTestId } = render(<Component />);
      await waitFor(async () => {
        const minInput = await findByTestId('rangeSlider__lowerBoundFieldNumber');
        expect(minInput).toHaveAttribute('placeholder', String(DEFAULT_MIN));
        const maxInput = await findByTestId('rangeSlider__upperBoundFieldNumber');
        expect(maxInput).toHaveAttribute('placeholder', String(DEFAULT_MAX));
      });
    });
  });

  describe('step state', () => {
    test('default value provided when state.step is undefined', () => {
      const { api } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      const serializedState = api.serializeState() as SerializedPanelState<RangesliderControlState>;
      expect(serializedState.rawState.step).toBe(1);
    });

    test('retains value from initial state', () => {
      const { api } = factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          step: 1024,
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      const serializedState = api.serializeState() as SerializedPanelState<RangesliderControlState>;
      expect(serializedState.rawState.step).toBe(1024);
    });
  });
});
