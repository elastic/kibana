/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { ControlPanelState, OptionsListEmbeddableInput } from '../../common';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../common/control_group/control_group_constants';
import { RangeValue } from '../../common/range_slider/types';
import {
  ControlInput,
  ControlWidth,
  DataControlInput,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '..';
import { ControlGroupInput } from './types';
import { getCompatibleControlType, getNextPanelOrder } from './embeddable/control_group_helpers';

export interface AddDataControlProps {
  controlId?: string;
  dataViewId: string;
  fieldName: string;
  grow?: boolean;
  title?: string;
  width?: ControlWidth;
}

export type AddOptionsListControlProps = AddDataControlProps & Partial<OptionsListEmbeddableInput>;

export type AddRangeSliderControlProps = AddDataControlProps & {
  value?: RangeValue;
};

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
  } as ControlPanelState<DataControlInput>;
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
  } as ControlPanelState<DataControlInput>;
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
  } as ControlPanelState<DataControlInput>;
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
  } as ControlPanelState<ControlInput>;
}

function getPanelState(input: Partial<ControlGroupInput>, controlProps: AddDataControlProps) {
  return {
    order: getNextPanelOrder(input.panels),
    grow: controlProps.grow ?? input.defaultControlGrow ?? DEFAULT_CONTROL_GROW,
    width: controlProps.width ?? input.defaultControlWidth ?? DEFAULT_CONTROL_WIDTH,
  };
}
