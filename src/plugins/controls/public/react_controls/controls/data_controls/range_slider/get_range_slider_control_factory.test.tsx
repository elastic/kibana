/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of } from 'rxjs';

import { estypes } from '@elastic/elasticsearch';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { dataService, dataViewsService } from '../../../../services/kibana_services';
import { getMockedBuildApi, getMockedControlGroupApi } from '../../mocks/control_mocks';
import { getRangesliderControlFactory } from './get_range_slider_control_factory';
import { RangesliderControlState } from './types';

const DEFAULT_TOTAL_RESULTS = 20;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1000;

describe('RangesliderControlApi', () => {
  const uuid = 'myControl1';

  const controlGroupApi = getMockedControlGroupApi();

  let totalResults = DEFAULT_TOTAL_RESULTS;
  let min: estypes.AggregationsSingleMetricAggregateBase['value'] = DEFAULT_MIN;
  let max: estypes.AggregationsSingleMetricAggregateBase['value'] = DEFAULT_MAX;
  dataService.search.searchSource.create = jest.fn().mockImplementation(() => {
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

  dataViewsService.get = jest.fn().mockImplementation(async (id: string): Promise<DataView> => {
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
            type: 'number',
            toSpec: jest.fn(),
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
  });

  const factory = getRangesliderControlFactory();

  beforeEach(() => {
    totalResults = DEFAULT_TOTAL_RESULTS;
    min = DEFAULT_MIN;
    max = DEFAULT_MAX;
  });

  describe('filters$', () => {
    test('should not set filters$ when value is not provided', async () => {
      const { api } = await factory.buildControl(
        {
          dataViewId: 'myDataView',
          fieldName: 'myFieldName',
        },
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
        getMockedBuildApi(uuid, factory, controlGroupApi),
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
          initialState={{} as RangesliderControlState}
          field={{} as DataViewField}
          updateState={jest.fn()}
          setControlEditorValid={jest.fn()}
          controlGroupApi={controlGroupApi}
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
          initialState={{} as RangesliderControlState}
          field={{} as DataViewField}
          updateState={jest.fn()}
          setControlEditorValid={setControlEditorValid}
          controlGroupApi={controlGroupApi}
        />
      );

      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { valueAsNumber: -1 },
      });
      expect(setControlEditorValid).toBeCalledWith(false);
      fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
        target: { value: undefined },
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
