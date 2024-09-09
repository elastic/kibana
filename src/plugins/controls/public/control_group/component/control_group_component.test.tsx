/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { pluginServices as presentationUtilPluginServices } from '@kbn/presentation-util-plugin/public/services';
import { registry as presentationUtilServicesRegistry } from '@kbn/presentation-util-plugin/public/services/plugin_services.story';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Provider } from 'react-redux';
import { OptionsListEmbeddableFactory } from '../..';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '../../../common';
import { mockControlGroupContainer, mockControlGroupInput } from '../../../common/mocks';
import { RangeSliderEmbeddableFactory } from '../../range_slider';
import { pluginServices } from '../../services';
import { ControlGroupContainerContext } from '../embeddable/control_group_container';
import { ControlGroupComponentState, ControlGroupInput } from '../types';
import { ControlGroup } from './control_group_component';

jest.mock('@dnd-kit/core', () => ({
  /** DnD kit has a memory leak based on this layout measuring strategy on unmount; setting it to undefined prevents this */
  ...jest.requireActual('@dnd-kit/core'),
  LayoutMeasuringStrategy: { Always: undefined },
}));

describe('Control group component', () => {
  interface MountOptions {
    explicitInput?: Partial<ControlGroupInput>;
    initialComponentState?: Partial<ControlGroupComponentState>;
  }

  presentationUtilServicesRegistry.start({});
  presentationUtilPluginServices.setRegistry(presentationUtilServicesRegistry);

  pluginServices.getServices().dataViews.get = jest.fn().mockResolvedValue(stubDataView);
  pluginServices.getServices().dataViews.getIdsWithTitle = jest
    .fn()
    .mockResolvedValue([{ id: stubDataView.id, title: stubDataView.getIndexPattern() }]);
  pluginServices.getServices().controls.getControlTypes = jest
    .fn()
    .mockReturnValue([OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL]);
  pluginServices.getServices().controls.getControlFactory = jest
    .fn()
    .mockImplementation((type: string) => {
      if (type === OPTIONS_LIST_CONTROL) return new OptionsListEmbeddableFactory();
      if (type === RANGE_SLIDER_CONTROL) return new RangeSliderEmbeddableFactory();
    });

  async function mountComponent(options?: MountOptions) {
    const controlGroupContainer = await mockControlGroupContainer(
      mockControlGroupInput(options?.explicitInput),
      options?.initialComponentState
    );

    const controlGroupComponent = render(
      <Provider
        // this store is ugly, but necessary because we are using controlGroupSelector rather than controlGroup.select
        store={
          {
            subscribe: controlGroupContainer.onStateChange,
            getState: controlGroupContainer.getState,
            dispatch: jest.fn(),
          } as any
        }
      >
        <ControlGroupContainerContext.Provider value={controlGroupContainer}>
          <ControlGroup />
        </ControlGroupContainerContext.Provider>
      </Provider>
    );

    await waitFor(() => {
      // wait for control group to render all 3 controls before returning
      expect(controlGroupComponent.queryAllByTestId('control-frame').length).toBe(3);
    });

    return { controlGroupComponent, controlGroupContainer };
  }

  test('does not render end button group by default', async () => {
    const { controlGroupComponent } = await mountComponent();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--endButtonGroup')
    ).not.toBeInTheDocument();
  });

  test('can render **just** add control button', async () => {
    const { controlGroupComponent } = await mountComponent({
      initialComponentState: { showAddButton: true },
    });
    expect(controlGroupComponent.queryByTestId('controlGroup--endButtonGroup')).toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--addControlButton')
    ).toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--applyFiltersButton')
    ).not.toBeInTheDocument();
  });

  test('can render **just** apply button', async () => {
    const { controlGroupComponent } = await mountComponent({
      explicitInput: { showApplySelections: true },
    });
    expect(controlGroupComponent.queryByTestId('controlGroup--endButtonGroup')).toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--addControlButton')
    ).not.toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--applyFiltersButton')
    ).toBeInTheDocument();
  });

  test('can render both buttons in the end button group', async () => {
    const { controlGroupComponent } = await mountComponent({
      explicitInput: { showApplySelections: true },
      initialComponentState: { showAddButton: true },
    });
    expect(controlGroupComponent.queryByTestId('controlGroup--endButtonGroup')).toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--addControlButton')
    ).toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('controlGroup--applyFiltersButton')
    ).toBeInTheDocument();
  });

  test('enables apply button based on unpublished filters', async () => {
    const { controlGroupComponent, controlGroupContainer } = await mountComponent({
      explicitInput: { showApplySelections: true },
    });
    expect(controlGroupComponent.getByTestId('controlGroup--applyFiltersButton')).toBeDisabled();

    act(() => controlGroupContainer.dispatch.setUnpublishedFilters({ filters: [] }));
    expect(controlGroupComponent.getByTestId('controlGroup--applyFiltersButton')).toBeEnabled();

    act(() => controlGroupContainer.dispatch.setUnpublishedFilters(undefined));
    expect(controlGroupComponent.getByTestId('controlGroup--applyFiltersButton')).toBeDisabled();

    act(() => controlGroupContainer.dispatch.setUnpublishedFilters({ timeslice: [0, 1] }));
    expect(controlGroupComponent.getByTestId('controlGroup--applyFiltersButton')).toBeEnabled();
  });

  test('calls publish when apply button is clicked', async () => {
    const { controlGroupComponent, controlGroupContainer } = await mountComponent({
      explicitInput: { showApplySelections: true },
    });
    let applyButton = controlGroupComponent.getByTestId('controlGroup--applyFiltersButton');
    expect(applyButton).toBeDisabled();
    controlGroupContainer.publishFilters = jest.fn();

    const unpublishedFilters: ControlGroupComponentState['unpublishedFilters'] = {
      filters: [
        {
          query: { exists: { field: 'foo' } },
          meta: { type: 'exists' },
        },
      ],
      timeslice: [0, 1],
    };
    act(() => controlGroupContainer.dispatch.setUnpublishedFilters(unpublishedFilters));
    applyButton = controlGroupComponent.getByTestId('controlGroup--applyFiltersButton');
    expect(applyButton).toBeEnabled();

    userEvent.click(applyButton);
    expect(controlGroupContainer.publishFilters).toBeCalledWith(unpublishedFilters);
  });

  test('ensure actions get rendered', async () => {
    presentationUtilPluginServices.getServices().uiActions.getTriggerCompatibleActions = jest
      .fn()
      .mockImplementation(() => {
        return [
          {
            isCompatible: jest.fn().mockResolvedValue(true),
            id: 'testAction',
            MenuItem: () => <div>test1</div>,
          },

          {
            isCompatible: jest.fn().mockResolvedValue(true),
            id: 'testAction2',
            MenuItem: () => <div>test2</div>,
          },
        ];
      });

    const { controlGroupComponent } = await mountComponent();
    expect(
      controlGroupComponent.queryByTestId('presentationUtil__floatingActions__control1')
    ).toBeInTheDocument();
    expect(
      controlGroupComponent.queryByTestId('presentationUtil__floatingActions__control2')
    ).toBeInTheDocument();
  });
});
