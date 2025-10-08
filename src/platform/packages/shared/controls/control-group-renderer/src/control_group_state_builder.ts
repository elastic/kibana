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
  CONTROL_MENU_TRIGGER,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { TemporaryControlsLayout } from '@kbn/controls-renderer/src/types';
import type {
  DataControlState,
  OptionsListDSLControlState,
  RangeSliderControlState,
  StickyControlState,
} from '@kbn/controls-schemas';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';

import type { ControlGroupRuntimeState } from './types';

export const controlGroupStateBuilder = {
  addDataControlFromField: async (
    controlGroupState: Partial<ControlGroupRuntimeState>,
    controlState: Omit<DataControlState & StickyControlState, 'type'>,
    uiActionsService: UiActionsStart,
    controlId?: string
  ) => {
    const type = await getCompatibleControlType(
      controlState.dataViewId,
      controlState.fieldName,
      uiActionsService
    );
    if (!type)
      throw new Error(
        i18n.translate('controls.controlGroupRenderer.addDataControlFromField.error', {
          defaultMessage: 'No control type is compatible with this field.',
        })
      );
    controlGroupState.initialChildControlState = {
      ...(controlGroupState.initialChildControlState ?? {}),
      [controlId ?? uuidv4()]: {
        type,
        order: getNextControlOrder(controlGroupState.initialChildControlState),
        ...controlState,
      },
    };
  },
  addOptionsListControl: (
    controlGroupState: Partial<ControlGroupRuntimeState>,
    controlState: Omit<
      Omit<StickyControlState, keyof OptionsListDSLControlState> & OptionsListDSLControlState,
      'type'
    >,
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
    controlState: Omit<
      Omit<StickyControlState, keyof RangeSliderControlState> & RangeSliderControlState,
      'type'
    >,
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

async function getCompatibleControlType(
  dataViewId: string,
  fieldName: string,
  uiActionsService: UiActionsStart
): Promise<StickyControlState['type'] | undefined> {
  const controlTypes = (await uiActionsService.getTriggerActions(CONTROL_MENU_TRIGGER)) as Array<
    Action<EmbeddableApiContext & { state: unknown }> // This is CreateControlTypeAction but I cannot import it due to circular dependencies
  >;

  for (const action of controlTypes) {
    const trigger = uiActionsService.getTrigger(CONTROL_MENU_TRIGGER);
    const compatible = await action.isCompatible({
      trigger,
      embeddable: undefined, // parentApi isn't necessary for this
      state: { dataViewId, fieldName },
    });
    if (compatible) return action.type as StickyControlState['type'];
  }
  return undefined;
}

function getNextControlOrder(controlPanelsState?: TemporaryControlsLayout['controls']) {
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
