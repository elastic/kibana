/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storybookFlightsDataView } from '@kbn/presentation-util-plugin/public/mocks';
import { of } from 'rxjs';
import { ControlGroupInput, RANGE_SLIDER_CONTROL } from '../../../common';
import { mockControlGroupContainer } from '../../../common/mocks';
import { pluginServices } from '../../services';
import { injectStorybookDataView } from '../../services/data_views/data_views.story';
import { RangeSliderEmbeddable } from './range_slider_embeddable';
import { RangeSliderEmbeddableFactory } from './range_slider_embeddable_factory';

let totalResults = 20;
beforeEach(() => {
  totalResults = 20;

  pluginServices.getServices().controls.getControlFactory = jest
    .fn()
    .mockImplementation((type: string) => {
      if (type === RANGE_SLIDER_CONTROL) return new RangeSliderEmbeddableFactory();
    });

  pluginServices.getServices().data.searchSource.create = jest.fn().mockImplementation(() => {
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
});

describe('initialize', () => {
  describe('without selected range', () => {
    test('should notify control group when initialization is finished', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      // data view not required for test case
      // setInitializationFinished is called before fetching slider range when value is not provided
      injectStorybookDataView(undefined);

      const control = await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'AvgTicketPrice',
      });

      expect(container.getInput().panels[control.getInput().id].type).toBe(RANGE_SLIDER_CONTROL);
      expect(container.getOutput().embeddableLoaded[control.getInput().id]).toBe(true);
    });
  });

  describe('with selected range', () => {
    test('should set error message when data view can not be found', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(undefined);

      const control = (await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'AvgTicketPrice',
        value: ['150', '300'],
      })) as RangeSliderEmbeddable;

      // await redux dispatch
      await new Promise((resolve) => process.nextTick(resolve));

      const reduxState = control.getState();
      expect(reduxState.output.loading).toBe(false);
      expect(reduxState.componentState.error).toBe(
        'mock DataViews service currentDataView is undefined, call injectStorybookDataView to set'
      );
    });

    test('should set error message when field can not be found', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(storybookFlightsDataView);

      const control = (await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'myField',
        value: ['150', '300'],
      })) as RangeSliderEmbeddable;

      // await redux dispatch
      await new Promise((resolve) => process.nextTick(resolve));

      const reduxState = control.getState();
      expect(reduxState.output.loading).toBe(false);
      expect(reduxState.componentState.error).toBe('Could not locate field: myField');
    });

    test('should set invalid state when filter returns zero results', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(storybookFlightsDataView);
      totalResults = 0;

      const control = (await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'AvgTicketPrice',
        value: ['150', '300'],
      })) as RangeSliderEmbeddable;

      // await redux dispatch
      await new Promise((resolve) => process.nextTick(resolve));

      const reduxState = control.getState();
      expect(reduxState.output.filters?.length).toBe(1);
      expect(reduxState.componentState.isInvalid).toBe(true);
    });

    test('should set range and filter', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(storybookFlightsDataView);

      const control = (await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'AvgTicketPrice',
        value: ['150', '300'],
      })) as RangeSliderEmbeddable;

      // await redux dispatch
      await new Promise((resolve) => process.nextTick(resolve));

      const reduxState = control.getState();
      expect(reduxState.output.filters?.length).toBe(1);
      expect(reduxState.output.filters?.[0].query).toEqual({
        range: {
          AvgTicketPrice: {
            gte: 150,
            lte: 300,
          },
        },
      });
      expect(reduxState.componentState.isInvalid).toBe(false);
      expect(reduxState.componentState.min).toBe(0);
      expect(reduxState.componentState.max).toBe(1000);
    });

    test('should notify control group when initialization is finished', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(storybookFlightsDataView);

      const control = await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'AvgTicketPrice',
        value: ['150', '300'],
      });

      expect(container.getInput().panels[control.getInput().id].type).toBe(RANGE_SLIDER_CONTROL);
      expect(container.getOutput().embeddableLoaded[control.getInput().id]).toBe(true);
    });

    test('should notify control group when initialization throws', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(storybookFlightsDataView);

      pluginServices.getServices().data.searchSource.create = jest.fn().mockImplementation(() => ({
        setField: () => {},
        fetch$: () => {
          throw new Error('Simulated _search request error');
        },
      }));

      const control = await container.addRangeSliderControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'AvgTicketPrice',
        value: ['150', '300'],
      });

      expect(container.getInput().panels[control.getInput().id].type).toBe(RANGE_SLIDER_CONTROL);
      expect(container.getOutput().embeddableLoaded[control.getInput().id]).toBe(true);
    });
  });
});
