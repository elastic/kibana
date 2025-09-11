/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ADD_PANEL_TRIGGER, type UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ACTION_CLEAR_CONTROL,
  ACTION_CREATE_CONTROL,
  ACTION_CREATE_ESQL_CONTROL,
  ACTION_DELETE_CONTROL,
  ACTION_EDIT_CONTROL,
  OPTIONS_LIST_ACTION,
  RANGE_SLIDER_ACTION,
} from './constants';
import { CONTROL_MENU_TRIGGER } from './control_panel_actions';
import { CONTROL_HOVER_TRIGGER, controlHoverTrigger } from './controls_hover_trigger';

export function registerActions(uiActions: UiActionsStart) {
  uiActions.registerTrigger(controlHoverTrigger);

  uiActions.registerActionAsync(ACTION_DELETE_CONTROL, async () => {
    const { DeleteControlAction } = await import('../controls_module');
    return new DeleteControlAction();
  });
  uiActions.attachAction(CONTROL_HOVER_TRIGGER, ACTION_DELETE_CONTROL);

  uiActions.registerActionAsync(ACTION_EDIT_CONTROL, async () => {
    const { EditControlAction } = await import('../controls_module');
    return new EditControlAction();
  });
  uiActions.attachAction(CONTROL_HOVER_TRIGGER, ACTION_EDIT_CONTROL);

  uiActions.registerActionAsync(ACTION_CLEAR_CONTROL, async () => {
    const { ClearControlAction } = await import('../controls_module');
    return new ClearControlAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_CLEAR_CONTROL);

  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ACTION_CREATE_CONTROL, async () => {
    const { createControlAction } = await import('../controls_module');
    return createControlAction();
  });

  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ACTION_CREATE_ESQL_CONTROL, async () => {
    const { createESQLControlAction } = await import('../controls_module');
    return createESQLControlAction();
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
