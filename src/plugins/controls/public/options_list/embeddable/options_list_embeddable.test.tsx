/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storybookFlightsDataView } from '@kbn/presentation-util-plugin/public/mocks';
import { ControlGroupInput, OPTIONS_LIST_CONTROL } from '../../../common';
import { mockControlGroupContainer } from '../../../common/mocks';
import { pluginServices } from '../../services';
import { injectStorybookDataView } from '../../services/data_views/data_views.story';
import { OptionsListEmbeddable } from './options_list_embeddable';
import { OptionsListEmbeddableFactory } from './options_list_embeddable_factory';

pluginServices.getServices().controls.getControlFactory = jest
  .fn()
  .mockImplementation((type: string) => {
    if (type === OPTIONS_LIST_CONTROL) return new OptionsListEmbeddableFactory();
  });

describe('initialize', () => {
  describe('without selected options', () => {
    test('should notify control group when initialization is finished', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      // data view not required for test case
      // setInitializationFinished is called before fetching options when value is not provided
      injectStorybookDataView(undefined);

      const control = await container.addOptionsListControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'OriginCityName',
      });

      expect(container.getInput().panels[control.getInput().id].type).toBe(OPTIONS_LIST_CONTROL);
      expect(container.getOutput().embeddableLoaded[control.getInput().id]).toBe(true);
    });
  });

  describe('with selected options', () => {
    test('should set error message when data view can not be found', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(undefined);

      const control = (await container.addOptionsListControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'OriginCityName',
        selectedOptions: ['Seoul', 'Tokyo'],
      })) as OptionsListEmbeddable;

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

      const control = (await container.addOptionsListControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'myField',
        selectedOptions: ['Seoul', 'Tokyo'],
      })) as OptionsListEmbeddable;

      // await redux dispatch
      await new Promise((resolve) => process.nextTick(resolve));

      const reduxState = control.getState();
      expect(reduxState.output.loading).toBe(false);
      expect(reduxState.componentState.error).toBe('Could not locate field: myField');
    });

    test('should notify control group when initialization is finished', async () => {
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = await mockControlGroupContainer(controlGroupInput);

      injectStorybookDataView(storybookFlightsDataView);

      const control = await container.addOptionsListControl({
        dataViewId: 'demoDataFlights',
        fieldName: 'OriginCityName',
        selectedOptions: ['Seoul', 'Tokyo'],
      });

      expect(container.getInput().panels[control.getInput().id].type).toBe(OPTIONS_LIST_CONTROL);
      expect(container.getOutput().embeddableLoaded[control.getInput().id]).toBe(true);
    });
  });
});
