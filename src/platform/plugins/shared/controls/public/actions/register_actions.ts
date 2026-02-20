/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACTION_CREATE_CONTROL,
  ACTION_CREATE_ESQL_CONTROL,
  ACTION_CREATE_TIME_SLIDER,
} from '@kbn/controls-constants';
import { ACTION_EDIT_PANEL, ACTION_REMOVE_PANEL } from '@kbn/presentation-panel-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ADD_PANEL_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  CONTROL_HOVER_TRIGGER_ID,
  CONTROL_MENU_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  ACTION_CLEAR_CONTROL,
  ACTION_EDIT_CONTROL_DISPLAY_SETTINGS,
  ACTION_PIN_CONTROL,
  OPTIONS_LIST_ACTION,
  RANGE_SLIDER_ACTION,
} from './constants';

export function registerActions(uiActions: UiActionsStart) {
  uiActions.registerActionAsync(ACTION_CLEAR_CONTROL, async () => {
    const { ClearControlAction } = await import('../controls_module');
    return new ClearControlAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_CLEAR_CONTROL);
  uiActions.attachAction(CONTROL_HOVER_TRIGGER_ID, ACTION_CLEAR_CONTROL);
  uiActions.registerActionAsync(ACTION_PIN_CONTROL, async () => {
    const { PinControlAction } = await import('../controls_module');
    return new PinControlAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_PIN_CONTROL);
  uiActions.attachAction(CONTROL_HOVER_TRIGGER_ID, ACTION_PIN_CONTROL);

  uiActions.registerActionAsync(ACTION_EDIT_CONTROL_DISPLAY_SETTINGS, async () => {
    const { EditControlDisplaySettingsAction } = await import('../controls_module');
    return new EditControlDisplaySettingsAction();
  });
  uiActions.attachAction(CONTROL_HOVER_TRIGGER_ID, ACTION_EDIT_CONTROL_DISPLAY_SETTINGS);

  uiActions.attachAction(CONTROL_HOVER_TRIGGER_ID, ACTION_REMOVE_PANEL);
  uiActions.attachAction(CONTROL_HOVER_TRIGGER_ID, ACTION_EDIT_PANEL);

  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ACTION_CREATE_CONTROL, async () => {
    const { createDataControlPanelAction } = await import('../controls_module');
    return createDataControlPanelAction();
  });

  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ACTION_CREATE_ESQL_CONTROL, async () => {
    const { createESQLControlAction } = await import('../controls_module');
    return createESQLControlAction();
  });

  uiActions.registerActionAsync(ACTION_CREATE_TIME_SLIDER, async () => {
    const { createTimeSliderAction } = await import('../controls_module');
    return createTimeSliderAction();
  });

  uiActions.addTriggerActionAsync(CONTROL_MENU_TRIGGER, OPTIONS_LIST_ACTION, async () => {
    const { createOptionsListControlAction } = await import('./create_options_list_action');
    return createOptionsListControlAction();
  });
  uiActions.addTriggerActionAsync(CONTROL_MENU_TRIGGER, RANGE_SLIDER_ACTION, async () => {
    const { createRangeSliderControlAction } = await import('./create_range_slider_action');
    return createRangeSliderControlAction();
  });
}
