/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
  type DefaultDataControlState,
} from '../../../../common';
import { type ControlGroupRuntimeState, type ControlPanelsState } from '../../../../common';
import type { OptionsListControlState } from '../../../../common/options_list';
import { pluginServices } from '../../../services';
import { getDataControlFieldRegistry } from '../../controls/data_controls/data_control_editor_utils';
import type { RangesliderControlState } from '../../controls/data_controls/range_slider/types';

export type ControlGroupStateBuilder = typeof controlGroupStateBuilder;

export const controlGroupStateBuilder = {
  addDataControlFromField: async (
    controlGroupState: Partial<ControlGroupRuntimeState>,
    controlState: DefaultDataControlState,
    controlId?: string
  ) => {
    controlGroupState.initialChildControlState = {
      ...(controlGroupState.initialChildControlState ?? {}),
      [controlId ?? uuidv4()]: {
        type: await getCompatibleControlType(controlState.dataViewId, controlState.fieldName),
        order: getNextControlOrder(controlGroupState.initialChildControlState),
        ...controlState,
      },
    };
  },
  addOptionsListControl: (
    controlGroupState: Partial<ControlGroupRuntimeState>,
    controlState: OptionsListControlState,
    controlId?: string
  ) => {
    controlGroupState.initialChildControlState = {
      ...(controlGroupState.initialChildControlState ?? {}),
      [controlId ?? uuidv4()]: {
        type: OPTIONS_LIST_CONTROL,
        order: getNextControlOrder(controlGroupState.initialChildControlState),
        ...controlState,
      },
    };
  },
  addRangeSliderControl: (
    controlGroupState: Partial<ControlGroupRuntimeState>,
    controlState: RangesliderControlState,
    controlId?: string
  ) => {
    controlGroupState.initialChildControlState = {
      ...(controlGroupState.initialChildControlState ?? {}),
      [controlId ?? uuidv4()]: {
        type: RANGE_SLIDER_CONTROL,
        order: getNextControlOrder(controlGroupState.initialChildControlState),
        ...controlState,
      },
    };
  },
  addTimeSliderControl: (
    controlGroupState: Partial<ControlGroupRuntimeState>,
    controlId?: string
  ) => {
    controlGroupState.initialChildControlState = {
      ...(controlGroupState.initialChildControlState ?? {}),
      [controlId ?? uuidv4()]: {
        type: TIME_SLIDER_CONTROL,
        order: getNextControlOrder(controlGroupState.initialChildControlState),
        width: 'large',
      },
    };
  },
};

async function getCompatibleControlType(dataViewId: string, fieldName: string) {
  const dataView = await pluginServices.getServices().dataViews.get(dataViewId);
  const fieldRegistry = await getDataControlFieldRegistry(dataView);
  const field = fieldRegistry[fieldName];
  if (field.compatibleControlTypes.length === 0) {
    throw new Error(`No compatible control type found for field: ${fieldName}`);
  }
  return field.compatibleControlTypes[0];
}

function getNextControlOrder(controlPanelsState?: ControlPanelsState) {
  if (!controlPanelsState) {
    return 0;
  }

  const values = Object.values(controlPanelsState);

  if (values.length === 0) {
    return 0;
  }

  let highestOrder = 0;
  values.forEach((controlPanelState) => {
    if (controlPanelState.order > highestOrder) {
      highestOrder = controlPanelState.order;
    }
  });
  return highestOrder + 1;
}
