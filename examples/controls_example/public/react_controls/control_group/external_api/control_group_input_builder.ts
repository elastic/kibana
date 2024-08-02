/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ControlWidth,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-plugin/common';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { getDataControlFieldRegistry } from '../../data_controls/data_control_editor_utils';
import { OptionsListControlState } from '../../data_controls/options_list_control/types';
import { RangeValue } from '../../data_controls/range_slider/types';
import { DefaultDataControlState } from '../../data_controls/types';
import { untilPluginStartServicesReady, dataService } from '../../services/kibana_services';
import { ControlPanelsState, ControlPanelState, SerializedControlPanelState } from '../types';
import { ControlGroupInput } from './types';

export interface AddDataControlProps {
  controlId?: string;
  dataViewId: string;
  fieldName: string;
  grow?: boolean;
  title?: string;
  width?: ControlWidth;
}

export type AddOptionsListControlProps = AddDataControlProps & Partial<OptionsListControlState>;

export type AddRangeSliderControlProps = AddDataControlProps & {
  value?: RangeValue;
};

export type ControlGroupInputBuilder = typeof controlGroupInputBuilder;

export const controlGroupInputBuilder = {
  addDataControlFromField: async (
    initialInput: Partial<ControlGroupInput>,
    controlProps: AddDataControlProps
  ) => {
    const panelState = await getDataControlPanelState(initialInput, controlProps);
    initialInput.panels = {
      ...initialInput.panels,
      [panelState.explicitInput.id]: panelState,
    };
  },
  addOptionsListControl: (
    initialInput: Partial<ControlGroupInput>,
    controlProps: AddOptionsListControlProps
  ) => {
    const panelState = getOptionsListPanelState(initialInput, controlProps);
    initialInput.panels = {
      ...initialInput.panels,
      [panelState.explicitInput.id]: panelState,
    };
  },
  addRangeSliderControl: (
    initialInput: Partial<ControlGroupInput>,
    controlProps: AddRangeSliderControlProps
  ) => {
    const panelState = getRangeSliderPanelState(initialInput, controlProps);
    initialInput.panels = {
      ...initialInput.panels,
      [panelState.explicitInput.id]: panelState,
    };
  },
  addTimeSliderControl: (initialInput: Partial<ControlGroupInput>) => {
    const panelState = getTimeSliderPanelState(initialInput);
    initialInput.panels = {
      ...initialInput.panels,
      [panelState.explicitInput.id]: panelState,
    };
  },
};

export async function getDataControlPanelState(
  input: Partial<ControlGroupInput>,
  controlProps: AddDataControlProps
) {
  const { controlId, dataViewId, fieldName, title } = controlProps;
  return {
    type: await getCompatibleControlType({ dataViewId, fieldName }),
    ...getPanelState(input, controlProps),
    explicitInput: {
      id: controlId ? controlId : uuidv4(),
      dataViewId,
      fieldName,
      title: title ?? fieldName,
    },
  } as SerializedControlPanelState<DefaultDataControlState>;
}

export function getOptionsListPanelState(
  input: Partial<ControlGroupInput>,
  controlProps: AddOptionsListControlProps
) {
  const { controlId, dataViewId, fieldName, title, ...rest } = controlProps;
  return {
    type: OPTIONS_LIST_CONTROL,
    ...getPanelState(input, controlProps),
    explicitInput: {
      id: controlId ? controlId : uuidv4(),
      dataViewId,
      fieldName,
      title: title ?? fieldName,
      ...rest,
    },
  } as SerializedControlPanelState<DefaultDataControlState>;
}

export function getRangeSliderPanelState(
  input: Partial<ControlGroupInput>,
  controlProps: AddRangeSliderControlProps
) {
  const { controlId, dataViewId, fieldName, title, ...rest } = controlProps;
  return {
    type: RANGE_SLIDER_CONTROL,
    ...getPanelState(input, controlProps),
    explicitInput: {
      id: controlId ? controlId : uuidv4(),
      dataViewId,
      fieldName,
      title: title ?? fieldName,
      ...rest,
    },
  } as SerializedControlPanelState<DefaultDataControlState>;
}

export function getTimeSliderPanelState(input: Partial<ControlGroupInput>) {
  return {
    type: TIME_SLIDER_CONTROL,
    order: getNextPanelOrder(input.panels),
    grow: true,
    width: 'large',
    explicitInput: {
      id: uuidv4(),
      title: i18n.translate('controls.controlGroup.timeSlider.title', {
        defaultMessage: 'Time slider',
      }),
    },
  } as SerializedControlPanelState;
}

function getPanelState(input: Partial<ControlGroupInput>, controlProps: AddDataControlProps) {
  return {
    order: getNextPanelOrder(input.panels),
    grow: controlProps.grow ?? input.defaultControlGrow ?? DEFAULT_CONTROL_GROW,
    width: controlProps.width ?? input.defaultControlWidth ?? DEFAULT_CONTROL_WIDTH,
  };
}

export const getNextPanelOrder = (panels?: ControlPanelsState<ControlPanelState>) => {
  let nextOrder = 0;
  if (Object.keys(panels ?? {}).length > 0) {
    nextOrder =
      Object.values(panels ?? {}).reduce((highestSoFar, panel) => {
        if (panel.order > highestSoFar) highestSoFar = panel.order;
        return highestSoFar;
      }, 0) + 1;
  }
  return nextOrder;
};

export const getCompatibleControlType = async ({
  dataViewId,
  fieldName,
}: {
  dataViewId: string;
  fieldName: string;
}) => {
  await untilPluginStartServicesReady();
  const dataView = await dataService.dataViews.get(dataViewId);
  const fieldRegistry = await getDataControlFieldRegistry(dataView);
  const field = fieldRegistry[fieldName];
  return field.compatibleControlTypes[0];
};
