/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid';
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
  ): Promise<string> => {
    const { controlId, dataViewId, fieldName, title } = controlProps;
    const panelId = controlId ? controlId : uuid.v4();
    initialInput.panels = {
      ...initialInput.panels,
      [panelId]: {
        order: getNextPanelOrder(initialInput),
        type: await getCompatibleControlType({ dataViewId, fieldName }),
        grow: getGrow(initialInput, controlProps),
        width: getWidth(initialInput, controlProps),
        explicitInput: {
          id: panelId,
          dataViewId,
          fieldName,
          title: title ?? fieldName,
        },
      } as ControlPanelState<DataControlInput>,
    };
    return panelId;
  },
  addOptionsListControl: (
    initialInput: Partial<ControlGroupInput>,
    controlProps: AddOptionsListControlProps
  ): string => {
    const { controlId, dataViewId, fieldName, title, ...rest } = controlProps;
    const panelId = controlId ? controlId : uuid.v4();
    initialInput.panels = {
      ...initialInput.panels,
      [panelId]: {
        order: getNextPanelOrder(initialInput),
        type: OPTIONS_LIST_CONTROL,
        grow: getGrow(initialInput, controlProps),
        width: getWidth(initialInput, controlProps),
        explicitInput: {
          id: panelId,
          dataViewId,
          fieldName,
          title: title ?? fieldName,
          ...rest,
        },
      } as ControlPanelState<DataControlInput>,
    };
    return panelId;
  },
  addRangeSliderControl: (
    initialInput: Partial<ControlGroupInput>,
    controlProps: AddRangeSliderControlProps
  ): string => {
    const { controlId, dataViewId, fieldName, title, ...rest } = controlProps;
    const panelId = controlId ? controlId : uuid.v4();
    initialInput.panels = {
      ...initialInput.panels,
      [panelId]: {
        order: getNextPanelOrder(initialInput),
        type: RANGE_SLIDER_CONTROL,
        grow: getGrow(initialInput, controlProps),
        width: getWidth(initialInput, controlProps),
        explicitInput: {
          id: panelId,
          dataViewId,
          fieldName,
          title: title ?? fieldName,
          ...rest,
        },
      } as ControlPanelState<DataControlInput>,
    };
    return panelId;
  },
  addTimeSliderControl: (initialInput: Partial<ControlGroupInput>): string => {
    const panelId = uuid.v4();
    initialInput.panels = {
      ...initialInput.panels,
      [panelId]: {
        order: getNextPanelOrder(initialInput),
        type: TIME_SLIDER_CONTROL,
        grow: true,
        width: 'large',
        explicitInput: {
          id: panelId,
          title: i18n.translate('controls.controlGroup.timeSlider.title', {
            defaultMessage: 'Time slider',
          }),
        },
      } as ControlPanelState<ControlInput>,
    };
    return panelId;
  },
};

function getGrow(initialInput: Partial<ControlGroupInput>, controlProps: AddDataControlProps) {
  if (typeof controlProps.grow === 'boolean') {
    return controlProps.grow;
  }

  return typeof initialInput.defaultControlGrow === 'boolean'
    ? initialInput.defaultControlGrow
    : DEFAULT_CONTROL_GROW;
}

function getWidth(initialInput: Partial<ControlGroupInput>, controlProps: AddDataControlProps) {
  if (controlProps.width) {
    return controlProps.width;
  }

  return initialInput.defaultControlWidth
    ? initialInput.defaultControlWidth
    : DEFAULT_CONTROL_WIDTH;
}
