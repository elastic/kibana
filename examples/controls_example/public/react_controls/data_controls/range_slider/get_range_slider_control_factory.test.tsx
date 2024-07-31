/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';

import { estypes } from '@elastic/elasticsearch';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { TimeRange } from '@kbn/es-query';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ControlFetchContext } from '../../control_group/control_fetch';
import { ControlGroupApi } from '../../control_group/types';
import { ControlApiRegistration } from '../../types';
import { getRangesliderControlFactory } from './get_range_slider_control_factory';
import { RangesliderControlApi, RangesliderControlState } from './types';

const DEFAULT_TOTAL_RESULTS = 20;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1000;

describe('RangesliderControlApi', () => {
  const uuid = 'myControl1';
  const dashboardApi = {
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  };
  const controlGroupApi = {
    controlFetch$: () => new BehaviorSubject<ControlFetchContext>({}),
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
      throw new Error(`no data view found for id ${id}`);
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

  describe('on initialize', () => {
    test('should not set filters$ when value is not provided', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataView',
          fieldName: 'myFieldName',
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toBeUndefined();
    });

    test('should set filters$ when value is provided', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          value: ['5', '10'],
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toEqual([
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
    });

    test('should set blocking error when data view is not found', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'notGonnaFindMeDataView',
          fieldName: 'myFieldName',
          value: ['5', '10'],
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      expect(api.filters$.value).toBeUndefined();
      expect(api.blockingError.value?.message).toEqual(
        'no data view found for id notGonnaFindMeDataView'
      );
    });
  });

  describe('selected range has no results', () => {
    test('should display invalid state', async () => {
      totalResults = 0; // simulate no results by returning hits total of zero
      min = null; // simulate no results by returning min aggregation value of null
      max = null; // simulate no results by returning max aggregation value of null
      const { Component } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
          value: ['5', '10'],
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      const { findByTestId } = render(<Component className={'controlPanel'} />);
      await waitFor(async () => {
        await findByTestId('range-slider-control-invalid-append-myControl1');
      });
    });
  });

  describe('min max', () => {
    test('bounds inputs should display min and max placeholders when there is no selected range', async () => {
      const { Component } = await factory.buildControl(
        {
          dataViewId: 'myDataViewId',
          fieldName: 'myFieldName',
        },
        buildApiMock,
        uuid,
        controlGroupApi
      );
      const { findByTestId } = render(<Component className={'controlPanel'} />);
      await waitFor(async () => {
        const minInput = await findByTestId('rangeSlider__lowerBoundFieldNumber');
        expect(minInput).toHaveAttribute('placeholder', String(DEFAULT_MIN));
        const maxInput = await findByTestId('rangeSlider__upperBoundFieldNumber');
        expect(maxInput).toHaveAttribute('placeholder', String(DEFAULT_MAX));
      });
    });
  });

  describe('step state', () => {
    test('default value provided when state.step is undefined', async () => {
      const { api } = await factory.buildControl(
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

    test('retains value from initial state', async () => {
      const { api } = await factory.buildControl(
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

  describe('custom options component', () => {
    test('defaults to step size of 1', async () => {
      const CustomSettings = factory.CustomOptionsComponent!;
      const component = render(
        <CustomSettings
          currentState={{}}
          updateState={jest.fn()}
          setControlEditorValid={jest.fn()}
        />
      );
      expect(
        component.getByTestId('rangeSliderControl__stepAdditionalSetting').getAttribute('value')
      ).toBe('1');
    });

    test('validates step setting is greater than 0', async () => {
      const setControlEditorValid = jest.fn();
      const CustomSettings = factory.CustomOptionsComponent!;
      const component = render(
        <CustomSettings
          currentState={{}}
          updateState={jest.fn()}
          setControlEditorValid={setControlEditorValid}
        />
      );

      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { valueAsNumber: -1 },
      });
      expect(setControlEditorValid).toBeCalledWith(false);
      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { value: '' },
      });
      expect(setControlEditorValid).toBeCalledWith(false);
      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { valueAsNumber: 0 },
      });
      expect(setControlEditorValid).toBeCalledWith(false);
      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { valueAsNumber: 0.5 },
      });
      expect(setControlEditorValid).toBeCalledWith(true);
      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { valueAsNumber: 10 },
      });
      expect(setControlEditorValid).toBeCalledWith(true);
    });
  });
});
