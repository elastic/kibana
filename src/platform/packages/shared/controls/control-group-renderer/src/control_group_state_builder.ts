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
} from '@kbn/controls-constants';
import type {
  // ControlsGroupState,
  OptionsListDSLControlState,
  RangeSliderControlState,
  StickyControlState,
} from '@kbn/controls-schemas';
import type { DashboardLayout } from '@kbn/dashboard-plugin/public/dashboard_api/layout_manager';
import type { ControlGroupRuntimeState } from './types';
// import { i18n } from '@kbn/i18n';

// import {
//   CONTROL_MENU_TRIGGER,
//   addControlMenuTrigger,
//   type CreateControlTypeAction,
// } from '@kbn/controls-plugin/public/actions/control_panel_actions';

export const controlGroupStateBuilder = {
  // addDataControlFromField: async (
  //   controlGroupState: Partial<ControlGroupRuntimeState>,,
  //   controlState: Omit<ControlsGroupState['controls'][number], 'type'>,
  //   controlId?: string
  // ) => {
  //   const type = await getCompatibleControlType(controlState.dataViewId, controlState.fieldName);
  //   if (!type)
  //     throw new Error(
  //       i18n.translate('controls.controlGroupRenderer.addDataControlFromField.error', {
  //         defaultMessage: 'No control type is compatible with this field.',
  //       })
  //     );
  //   controlGroupState.initialChildControlState = {
  //     ...(controlGroupState.initialChildControlState ?? {}),
  //     [controlId ?? uuidv4()]: {
  //       type,
  //       order: getNextControlOrder(controlGroupState.initialChildControlState),
  //       ...controlState,
  //     },
  //   };
  // },
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

// async function getCompatibleControlType(
//   dataViewId: string,
//   fieldName: string
// ): Promise<ControlsGroupState['controls'][number]['type'] | undefined> {
//   const controlTypes = (await uiActionsService.getTriggerActions(
//     CONTROL_MENU_TRIGGER
//   )) as CreateControlTypeAction[];

//   for (const action of controlTypes) {
//     const compatible = await action.isCompatible({
//       trigger: addControlMenuTrigger,
//       embeddable: undefined, // parentApi isn't necessary for this
//       state: { dataViewId, fieldName },
//     });
//     if (compatible) return action.type as ControlsGroupState['controls'][number]['type'];
//   }
//   return undefined;
// }

function getNextControlOrder(controlPanelsState?: DashboardLayout['controls']) {
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
