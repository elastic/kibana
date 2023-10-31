/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupInput } from '../../../common';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { storybookFlightsDataView } from '@kbn/presentation-util-plugin/public/mocks';
import { OPTIONS_LIST_CONTROL } from '../../../common';
import { ControlGroupContainer } from '../../control_group/embeddable/control_group_container';
import { pluginServices } from '../../services';
import { injectStorybookDataView } from '../../services/data_views/data_views.story';
import { OptionsListEmbeddableFactory } from './options_list_embeddable_factory';
import { OptionsListEmbeddable } from './options_list_embeddable';

pluginServices.getServices().controls.getControlFactory = jest
  .fn()
  .mockImplementation((type: string) => {
    if (type === OPTIONS_LIST_CONTROL) return new OptionsListEmbeddableFactory();
  });

describe('initialize', () => {
  describe('without selected options', () => {
    test('should notify control group when initialization is finished', async () => {
      const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = new ControlGroupContainer(reduxEmbeddablePackage, controlGroupInput);

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
      const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = new ControlGroupContainer(reduxEmbeddablePackage, controlGroupInput);

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
      const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = new ControlGroupContainer(reduxEmbeddablePackage, controlGroupInput);

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
      const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
      const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
      const container = new ControlGroupContainer(reduxEmbeddablePackage, controlGroupInput);

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
